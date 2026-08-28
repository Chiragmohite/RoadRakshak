"""
RoadRakshak — AI Detector Service

Interchangeable Ultralytics YOLO inference service.

- When backend/models/best.pt exists → real YOLO inference
- When best.pt is absent/unavailable → clearly-labelled DEMO fallback

Designed for low-memory CPU deployment on Render.
"""

import gc
import os
import random
import uuid
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# Try to import Ultralytics.
try:
    from ultralytics import YOLO

    ULTRALYTICS_AVAILABLE = True
except ImportError:
    YOLO = None
    ULTRALYTICS_AVAILABLE = False


# ---------------------------------------------------------------------------
# Damage class labels
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
    Unified detector interface.

    Uses one YOLO model instance and CPU inference.

    Usage:
        detector = DetectorService(model_path, confidence_threshold)
        result = detector.detect(image_path, save_dir)
    """

    def __init__(
        self,
        model_path: str,
        confidence_threshold: float = 0.25,
    ):
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold

        self.model = None
        self.is_real = False

        self._try_load_model()

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------

    def _try_load_model(self):
        """Attempt to load the YOLO model from disk."""

        if not os.path.exists(self.model_path):
            print(
                f"[DetectorService] Model not found: {self.model_path}"
            )
            self.is_real = False
            return

        if not ULTRALYTICS_AVAILABLE:
            print(
                "[DetectorService] WARNING: best.pt found but "
                "ultralytics is not installed. Using demo mode."
            )
            self.is_real = False
            return

        try:
            print(
                f"[DetectorService] Loading YOLO model: "
                f"{self.model_path}"
            )

            # Load the model exactly once.
            self.model = YOLO(self.model_path)

            # Force CPU.
            try:
                self.model.to("cpu")
            except Exception as exc:
                print(
                    f"[DetectorService] CPU device setup warning: {exc}"
                )

            self.is_real = True

            print(
                f"[DetectorService] Loaded REAL model from "
                f"{self.model_path}"
            )

        except Exception as exc:
            print(
                f"[DetectorService] Failed to load model: {exc}"
            )

            self.model = None
            self.is_real = False

            # Release anything partially allocated.
            gc.collect()

    def reload_model(self):
        """Re-check for the model file and reload it."""

        # Release old model before reloading.
        self.model = None
        self.is_real = False

        gc.collect()

        self._try_load_model()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def detect(self, image_path: str, save_dir: str) -> dict:
        """
        Run detection on a single image.

        Returns:
            {
                "engine": "real" | "demo",
                "is_demo": bool,
                "detections": list,
                "annotated_path": str | None,
                "image_width": int,
                "image_height": int,
            }
        """

        if self.is_real and self.model is not None:
            return self._real_inference(
                image_path,
                save_dir,
            )

        return self._demo_inference(
            image_path,
            save_dir,
        )

    # ------------------------------------------------------------------
    # Real YOLO inference
    # ------------------------------------------------------------------

    def _real_inference(
        self,
        image_path: str,
        save_dir: str,
    ) -> dict:
        """Run actual YOLO inference using CPU."""

        results = None
        result = None
        img = None

        try:
            # Small inference resolution to reduce RAM usage.
            results = self.model.predict(
                source=image_path,
                conf=self.confidence_threshold,
                iou=0.45,
                imgsz=320,
                max_det=20,
                device="cpu",
                half=False,
                verbose=False,
                save=False,
            )

            result = results[0]

            # Read dimensions without keeping a large image in memory.
            with Image.open(image_path) as opened_img:
                img_w, img_h = opened_img.size

            detections = []

            if result.boxes is not None:
                for box in result.boxes:

                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])

                    x1, y1, x2, y2 = [
                        float(c)
                        for c in box.xyxy[0]
                    ]

                    class_name = result.names.get(
                        cls_id,
                        f"class_{cls_id}",
                    )

                    label = DAMAGE_CLASSES.get(
                        class_name,
                        class_name,
                    )

                    detections.append(
                        {
                            "class": class_name,
                            "label": label,
                            "confidence": round(conf, 4),
                            "bbox": {
                                "x1": round(x1, 2),
                                "y1": round(y1, 2),
                                "x2": round(x2, 2),
                                "y2": round(y2, 2),
                            },
                        }
                    )

            # Filter weak crack detections.
            detections = [
                detection
                for detection in detections
                if (
                    detection["label"] not in CRACK_CLASSES
                    or detection["confidence"] >= CRACK_MIN_CONFIDENCE
                )
            ]

            annotated_path = None

            # Only create annotated output when something was detected.
            if detections:
                try:
                    annotated_img = result.plot()

                    annotated_pil = Image.fromarray(
                        annotated_img[..., ::-1]
                    )

                    os.makedirs(
                        save_dir,
                        exist_ok=True,
                    )

                    filename = (
                        f"annotated_"
                        f"{uuid.uuid4().hex[:8]}"
                        f".jpg"
                    )

                    annotated_path = str(
                        Path(save_dir) / filename
                    )

                    annotated_pil.save(
                        annotated_path,
                        quality=85,
                        optimize=True,
                    )

                    # Explicitly release annotation image.
                    annotated_pil.close()
                    del annotated_pil
                    del annotated_img

                except Exception as exc:
                    print(
                        "[DetectorService] "
                        f"Annotation failed: {exc}"
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
            # Release inference result objects.
            results = None
            result = None
            img = None

            gc.collect()

    # ------------------------------------------------------------------
    # Demo fallback
    # ------------------------------------------------------------------

    def _demo_inference(
        self,
        image_path: str,
        save_dir: str,
    ) -> dict:
        """
        Generate simulated detections for development/demo purposes.

        Every output is tagged with is_demo=True and engine="demo".
        """

        with Image.open(image_path) as opened_img:
            img = opened_img.convert("RGB")
            img_w, img_h = img.size

            num_detections = random.randint(1, 3)
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
                draw_img = img.copy()
                draw = ImageDraw.Draw(draw_img)

                colors = {
                    "Pothole": "#FF4444",
                    "Longitudinal Crack": "#FF8800",
                    "Transverse Crack": "#FFCC00",
                    "Alligator Crack": "#FF6600",
                }

                for detection in detections:
                    bbox = detection["bbox"]

                    color = colors.get(
                        detection["label"],
                        "#FF4444",
                    )

                    draw.rectangle(
                        [
                            bbox["x1"],
                            bbox["y1"],
                            bbox["x2"],
                            bbox["y2"],
                        ],
                        outline=color,
                        width=3,
                    )

                    label_text = (
                        f"[DEMO] "
                        f"{detection['label']} "
                        f"{detection['confidence']:.0%}"
                    )

                    try:
                        font = ImageFont.truetype(
                            "arial.ttf",
                            16,
                        )
                    except OSError:
                        font = ImageFont.load_default()

                    text_bbox = draw.textbbox(
                        (
                            bbox["x1"],
                            max(bbox["y1"] - 20, 0),
                        ),
                        label_text,
                        font=font,
                    )

                    draw.rectangle(
                        text_bbox,
                        fill=color,
                    )

                    draw.text(
                        (
                            bbox["x1"],
                            max(bbox["y1"] - 20, 0),
                        ),
                        label_text,
                        fill="white",
                        font=font,
                    )

                try:
                    watermark_font = ImageFont.truetype(
                        "arial.ttf",
                        28,
                    )
                except OSError:
                    watermark_font = ImageFont.load_default()

                draw.text(
                    (10, 10),
                    "DEMO MODE — Simulated Results",
                    fill="#FF0000",
                    font=watermark_font,
                )

                os.makedirs(
                    save_dir,
                    exist_ok=True,
                )

                filename = (
                    f"demo_annotated_"
                    f"{uuid.uuid4().hex[:8]}"
                    f".jpg"
                )

                annotated_path = str(
                    Path(save_dir) / filename
                )

                draw_img.save(
                    annotated_path,
                    quality=85,
                    optimize=True,
                )

                draw_img.close()

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