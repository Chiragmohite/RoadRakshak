"""
RoadRakshak — AI Detector Service

Low-memory ONNX Runtime inference service for Render.

Uses:
    backend/models/best.onnx

Falls back to demo mode if the ONNX model/runtime is unavailable.
"""

import gc
import os
import random
import uuid
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

try:
    import onnxruntime as ort

    ONNX_AVAILABLE = True
except ImportError:
    ort = None
    ONNX_AVAILABLE = False


# ---------------------------------------------------------------------------
# Damage classes
# ---------------------------------------------------------------------------

DAMAGE_CLASSES = {
    "D00": "Longitudinal Crack",
    "D10": "Transverse Crack",
    "D20": "Alligator Crack",
    "D40": "Pothole",
}

DEMO_DAMAGE_TYPES = list(DAMAGE_CLASSES.values())

CRACK_MIN_CONFIDENCE = 0.55

CRACK_CLASSES = {
    "Longitudinal Crack",
    "Transverse Crack",
}


class DetectorService:
    """
    Road damage detector using ONNX Runtime.

    ONNX Runtime is used instead of PyTorch/Ultralytics during inference
    to reduce RAM usage on low-memory Render instances.
    """

    def __init__(
        self,
        model_path: str,
        confidence_threshold: float = 0.10,
    ):
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold

        self.session = None
        self.is_real = False

        self.input_name = None
        self.input_shape = None

        self._try_load_model()

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------

    def _try_load_model(self):
        """Load the ONNX model once."""

        if not ONNX_AVAILABLE:
            print(
                "[DetectorService] ONNX Runtime is not installed. "
                "Using demo mode."
            )
            return

        if not os.path.exists(self.model_path):
            print(
                f"[DetectorService] ONNX model not found: "
                f"{self.model_path}"
            )
            return

        try:
            print(
                f"[DetectorService] Loading ONNX model: "
                f"{self.model_path}"
            )

            # CPU-only ONNX Runtime.
            session_options = ort.SessionOptions()

            # Reduce memory overhead.
            session_options.intra_op_num_threads = 1
            session_options.inter_op_num_threads = 1

            # Basic graph optimization.
            session_options.graph_optimization_level = (
                ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
            )

            self.session = ort.InferenceSession(
                self.model_path,
                sess_options=session_options,
                providers=["CPUExecutionProvider"],
            )

            inputs = self.session.get_inputs()

            if not inputs:
                raise RuntimeError(
                    "ONNX model has no input tensors."
                )

            self.input_name = inputs[0].name
            self.input_shape = inputs[0].shape

            self.is_real = True

            print(
                "[DetectorService] Loaded REAL ONNX model from "
                f"{self.model_path}"
            )

            print(
                f"[DetectorService] Input: "
                f"{self.input_name} {self.input_shape}"
            )

        except Exception as exc:
            print(
                "[DetectorService] Failed to load ONNX model: "
                f"{exc}"
            )

            self.session = None
            self.is_real = False

            gc.collect()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def detect(
        self,
        image_path: str,
        save_dir: str,
    ) -> dict:
        """
        Run detection.

        Returns the same general structure expected by the backend:
            engine
            is_demo
            detections
            annotated_path
            image_width
            image_height
        """

        if self.is_real and self.session is not None:
            try:
                return self._real_inference(
                    image_path,
                    save_dir,
                )

            except Exception as exc:
                print(
                    "[DetectorService] Real inference failed: "
                    f"{exc}"
                )

                gc.collect()

                # Do NOT silently pretend that a failed real inference
                # was successful.
                return {
                    "engine": "real",
                    "is_demo": False,
                    "detections": [],
                    "annotated_path": None,
                    "image_width": 0,
                    "image_height": 0,
                    "error": str(exc),
                }

        return self._demo_inference(
            image_path,
            save_dir,
        )

    # ------------------------------------------------------------------
    # Image preprocessing
    # ------------------------------------------------------------------

    @staticmethod
    def _preprocess_image(
        image_path: str,
        image_size: int = 320,
    ):
        """
        Load and preprocess image for YOLO ONNX.

        Returns:
            tensor, original_width, original_height,
            resized_width, resized_height
        """

        with Image.open(image_path) as source:
            image = source.convert("RGB")

            original_width, original_height = image.size

            # Letterbox resize while preserving aspect ratio.
            scale = min(
                image_size / original_width,
                image_size / original_height,
            )

            resized_width = max(
                1,
                int(round(original_width * scale)),
            )

            resized_height = max(
                1,
                int(round(original_height * scale)),
            )

            resized = image.resize(
                (resized_width, resized_height),
                Image.Resampling.BILINEAR,
            )

            # Create letterbox canvas.
            canvas = Image.new(
                "RGB",
                (image_size, image_size),
                (114, 114, 114),
            )

            pad_x = (image_size - resized_width) // 2
            pad_y = (image_size - resized_height) // 2

            canvas.paste(
                resized,
                (pad_x, pad_y),
            )

            # Convert to NumPy.
            array = np.asarray(
                canvas,
                dtype=np.float32,
            )

            # HWC → CHW.
            array = array.transpose(
                2,
                0,
                1,
            )

            # Normalize 0–255 → 0–1.
            array /= 255.0

            # Add batch dimension.
            tensor = np.expand_dims(
                array,
                axis=0,
            )

            # Explicitly release temporary PIL images.
            resized.close()
            canvas.close()

            return (
                tensor,
                original_width,
                original_height,
                scale,
                pad_x,
                pad_y,
            )

    # ------------------------------------------------------------------
    # ONNX inference
    # ------------------------------------------------------------------

    def _real_inference(
        self,
        image_path: str,
        save_dir: str,
    ) -> dict:
        """Run YOLO ONNX inference."""

        input_tensor = None
        outputs = None

        try:
            (
                input_tensor,
                img_w,
                img_h,
                scale,
                pad_x,
                pad_y,
            ) = self._preprocess_image(
                image_path,
                image_size=320,
            )

            # Run ONNX inference.
            outputs = self.session.run(
                None,
                {
                    self.input_name: input_tensor,
                },
            )

            # ----------------------------------------------------------
            # ONNX DEBUG
            # ----------------------------------------------------------

            print("========== ONNX DEBUG ==========")
            print("Input name:", self.input_name)
            print("Input shape:", self.input_shape)
            print("Number of outputs:", len(outputs))

            for i, output in enumerate(outputs):
                arr = np.asarray(output)

                print(
                    f"Output {i}:",
                    "shape =", arr.shape,
                    "dtype =", arr.dtype,
                    "min =", float(arr.min()),
                    "max =", float(arr.max()),
                )

                debug_arr = (
                    arr[0]
                    if arr.ndim == 3
                    else arr
                )

                if debug_arr.ndim == 2:

                    if debug_arr.shape[0] < debug_arr.shape[1]:
                        debug_predictions = debug_arr.T
                    else:
                        debug_predictions = debug_arr

                    print("Top 10 predictions:")

                    scored = []

                    for prediction in debug_predictions:

                        if len(prediction) >= 8:

                            class_scores = prediction[4:8]

                            class_id = int(
                                np.argmax(class_scores)
                            )

                            confidence = float(
                                class_scores[class_id]
                            )

                            scored.append(
                                (
                                    confidence,
                                    class_id,
                                    prediction[0],
                                    prediction[1],
                                    prediction[2],
                                    prediction[3],
                                    class_scores.tolist(),
                                )
                            )

                    scored.sort(
                        reverse=True,
                        key=lambda x: x[0],
                    )

                    for item in scored[:10]:

                        print(
                            "confidence =",
                            round(item[0], 4),
                            "class_id =",
                            item[1],
                            "class =",
                            self._class_name(item[1]),
                            "bbox =",
                            [
                                round(float(v), 2)
                                for v in item[2:6]
                            ],
                            "scores =",
                            [
                                round(float(v), 4)
                                for v in item[6]
                            ],
                        )

            print("================================")

            # ----------------------------------------------------------
            # Validate ONNX output
            # ----------------------------------------------------------

            if not outputs:
                raise RuntimeError(
                    "ONNX model returned no outputs."
                )

            raw_output = outputs[0]

            # ----------------------------------------------------------
            # Parse detections
            # ----------------------------------------------------------

            detections = self._parse_yolo_output(
                raw_output,
                img_w,
                img_h,
                scale,
                pad_x,
                pad_y,
            )

            annotated_path = None

            if detections:
                annotated_path = self._create_annotation(
                    image_path,
                    detections,
                    save_dir,
                )

            return {
                "engine": "real",
                "is_demo": False,
                "detections": detections,
                "annotated_path": annotated_path,
                "image_width": img_w,
                "image_height": img_h,
            }

        finally:
            # Release NumPy inference arrays.
            input_tensor = None
            outputs = None

            gc.collect()

    # ------------------------------------------------------------------
    # YOLO output parsing
    # ------------------------------------------------------------------

def _parse_yolo_output(
    self,
    output,
    original_width,
    original_height,
    scale,
    pad_x,
    pad_y,
):
    """
    Parse YOLO ONNX output.

    Expected output:
        [1, 8, 2100]

    Format:
        4 box values + 4 class scores

    Classes:
        0 = D00
        1 = D10
        2 = D20
        3 = D40
    """

    array = np.asarray(output, dtype=np.float32)

    # Remove batch dimension
    if array.ndim == 3:
        array = array[0]

    if array.ndim != 2:
        raise RuntimeError(
            f"Unexpected ONNX output shape: {array.shape}"
        )

    # [8, 2100] -> [2100, 8]
    if array.shape[0] < array.shape[1]:
        predictions = array.T
    else:
        predictions = array

    detections = []

    for prediction in predictions:

        if len(prediction) < 8:
            continue

        # ----------------------------------------------------------
        # Bounding box
        # ----------------------------------------------------------

        cx = float(prediction[0])
        cy = float(prediction[1])
        width = float(prediction[2])
        height = float(prediction[3])

        # ----------------------------------------------------------
        # Class scores
        # ----------------------------------------------------------

        class_scores = prediction[4:8]

        class_id = int(np.argmax(class_scores))
        confidence = float(class_scores[class_id])

        # Debug
        if confidence > 0.001:
            print(
                "[DetectorService] Candidate:",
                "class =", self._class_name(class_id),
                "confidence =", round(confidence, 6),
            )

        # Confidence filtering
        if confidence < self.confidence_threshold:
            continue

        # ----------------------------------------------------------
        # Convert letterbox coordinates back to original image
        # ----------------------------------------------------------

        x1 = (cx - width / 2 - pad_x) / scale
        y1 = (cy - height / 2 - pad_y) / scale

        x2 = (cx + width / 2 - pad_x) / scale
        y2 = (cy + height / 2 - pad_y) / scale

        # Clamp
        x1 = max(0.0, min(float(original_width), x1))
        y1 = max(0.0, min(float(original_height), y1))
        x2 = max(0.0, min(float(original_width), x2))
        y2 = max(0.0, min(float(original_height), y2))

        if x2 <= x1 or y2 <= y1:
            continue

        class_name = self._class_name(class_id)

        label = DAMAGE_CLASSES.get(
            class_name,
            class_name,
        )

        detections.append(
            {
                "class": class_name,
                "label": label,
                "confidence": round(confidence, 4),
                "bbox": {
                    "x1": round(x1, 2),
                    "y1": round(y1, 2),
                    "x2": round(x2, 2),
                    "y2": round(y2, 2),
                },
            }
        )

    # --------------------------------------------------------------
    # Crack confidence filtering
    # --------------------------------------------------------------

    detections = [
        detection
        for detection in detections
        if (
            detection["label"] not in CRACK_CLASSES
            or detection["confidence"] >= CRACK_MIN_CONFIDENCE
        )
    ]

    # --------------------------------------------------------------
    # Sort strongest first
    # --------------------------------------------------------------

    detections.sort(
        key=lambda detection: detection["confidence"],
        reverse=True,
    )

    # --------------------------------------------------------------
    # Keep strongest detections
    # --------------------------------------------------------------

    return detections[:20]

    # ------------------------------------------------------------------
    # Class-name handling
    # ------------------------------------------------------------------

    @staticmethod
    def _class_name(class_id: int) -> str:
        """
        Convert model class index to the project's class name.

        Expected model classes:
            0 = D00
            1 = D10
            2 = D20
            3 = D40

        If the model contains additional classes, return class_N.
        """

        class_ids = [
            "D00",
            "D10",
            "D20",
            "D40",
        ]

        if 0 <= class_id < len(class_ids):
            return class_ids[class_id]

        return f"class_{class_id}"

    # ------------------------------------------------------------------
    # Annotation
    # ------------------------------------------------------------------

    def _create_annotation(
        self,
        image_path: str,
        detections: list,
        save_dir: str,
    ):
        """Create an annotated image."""

        try:
            os.makedirs(
                save_dir,
                exist_ok=True,
            )

            with Image.open(image_path) as source:
                image = source.convert("RGB")

                draw = ImageDraw.Draw(image)

                for detection in detections:
                    bbox = detection["bbox"]

                    label = (
                        f"{detection['label']} "
                        f"{detection['confidence']:.0%}"
                    )

                    x1 = bbox["x1"]
                    y1 = bbox["y1"]
                    x2 = bbox["x2"]
                    y2 = bbox["y2"]

                    draw.rectangle(
                        [x1, y1, x2, y2],
                        outline="#FF4444",
                        width=3,
                    )

                    try:
                        font = ImageFont.truetype(
                            "arial.ttf",
                            16,
                        )
                    except OSError:
                        font = ImageFont.load_default()

                    text_y = max(
                        0,
                        y1 - 20,
                    )

                    text_bbox = draw.textbbox(
                        (x1, text_y),
                        label,
                        font=font,
                    )

                    draw.rectangle(
                        text_bbox,
                        fill="#FF4444",
                    )

                    draw.text(
                        (x1, text_y),
                        label,
                        fill="white",
                        font=font,
                    )

                filename = (
                    f"annotated_"
                    f"{uuid.uuid4().hex[:8]}"
                    f".jpg"
                )

                output_path = str(
                    Path(save_dir) / filename
                )

                image.save(
                    output_path,
                    format="JPEG",
                    quality=85,
                    optimize=True,
                )

                return output_path

        except Exception as exc:
            print(
                "[DetectorService] "
                f"Annotation failed: {exc}"
            )

            return None

    # ------------------------------------------------------------------
    # Demo fallback
    # ------------------------------------------------------------------

    def _demo_inference(
        self,
        image_path: str,
        save_dir: str,
    ) -> dict:
        """Generate clearly-labelled demo detections."""

        with Image.open(image_path) as source:
            image = source.convert("RGB")

            img_w, img_h = image.size

            num_detections = random.randint(
                1,
                3,
            )

            detections = []

            for _ in range(num_detections):

                damage_type = random.choice(
                    DEMO_DAMAGE_TYPES
                )

                box_w = random.uniform(
                    0.10,
                    0.40,
                ) * img_w

                box_h = random.uniform(
                    0.10,
                    0.40,
                ) * img_h

                x1 = random.uniform(
                    0,
                    max(img_w - box_w, 1),
                )

                y1 = random.uniform(
                    0,
                    max(img_h - box_h, 1),
                )

                x2 = x1 + box_w
                y2 = y1 + box_h

                detections.append(
                    {
                        "class": damage_type,
                        "label": damage_type,
                        "confidence": round(
                            random.uniform(
                                0.55,
                                0.95,
                            ),
                            4,
                        ),
                        "bbox": {
                            "x1": round(x1, 2),
                            "y1": round(y1, 2),
                            "x2": round(x2, 2),
                            "y2": round(y2, 2),
                        },
                    }
                )

            annotated_path = None

            try:
                draw_image = image.copy()
                draw = ImageDraw.Draw(
                    draw_image
                )

                try:
                    font = ImageFont.truetype(
                        "arial.ttf",
                        16,
                    )
                except OSError:
                    font = ImageFont.load_default()

                for detection in detections:
                    bbox = detection["bbox"]

                    draw.rectangle(
                        [
                            bbox["x1"],
                            bbox["y1"],
                            bbox["x2"],
                            bbox["y2"],
                        ],
                        outline="#FF4444",
                        width=3,
                    )

                    label = (
                        f"[DEMO] "
                        f"{detection['label']} "
                        f"{detection['confidence']:.0%}"
                    )

                    draw.text(
                        (
                            bbox["x1"],
                            max(
                                0,
                                bbox["y1"] - 20,
                            ),
                        ),
                        label,
                        fill="#FF4444",
                        font=font,
                    )

                os.makedirs(
                    save_dir,
                    exist_ok=True,
                )

                filename = (
                    f"demo_"
                    f"{uuid.uuid4().hex[:8]}"
                    f".jpg"
                )

                annotated_path = str(
                    Path(save_dir) / filename
                )

                draw_image.save(
                    annotated_path,
                    format="JPEG",
                    quality=85,
                    optimize=True,
                )

                draw_image.close()

            except Exception as exc:
                print(
                    "[DetectorService] "
                    f"Demo annotation failed: {exc}"
                )

        return {
            "engine": "demo",
            "is_demo": True,
            "detections": detections,
            "annotated_path": annotated_path,
            "image_width": img_w,
            "image_height": img_h,
        }
