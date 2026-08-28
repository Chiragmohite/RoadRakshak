"""
RoadRakshak — AI Detector Service

Interchangeable Ultralytics YOLO inference service.

- When backend/models/best.pt exists → real YOLO inference
- When best.pt is absent → clearly-labelled DEMO fallback

This module is NOT hard-coded to a specific YOLO generation.
Any Ultralytics-compatible model (.pt) placed at the configured
MODEL_PATH will be loaded and used for inference.
"""

import os
import random
import uuid
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# Try to import ultralytics — may not be installed during early dev
try:
    from ultralytics import YOLO

    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False


# ---------------------------------------------------------------------------
# Damage class labels  (RDD2022-style, will match whatever the trained model
# outputs — the model's own class names take precedence when real inference runs)
# ---------------------------------------------------------------------------
DAMAGE_CLASSES = {
    "D00": "Longitudinal Crack",
    "D10": "Transverse Crack",
    "D20": "Alligator Crack",
    "D40": "Pothole",
}

# Human-friendly names used by the demo fallback
DEMO_DAMAGE_TYPES = list(DAMAGE_CLASSES.values())

# Crack classes get a higher confidence bar before being shown/reported —
# they're currently the weakest-performing classes in training.
CRACK_MIN_CONFIDENCE = 0.55
CRACK_CLASSES = {"Longitudinal Crack", "Transverse Crack"}


class DetectorService:
    """
    Unified detector interface.

    Usage:
        detector = DetectorService(model_path, confidence_threshold)
        result   = detector.detect(image_path, save_dir)
    """

    def __init__(self, model_path: str, confidence_threshold: float = 0.25):
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
            self.is_real = False
            return

        if not ULTRALYTICS_AVAILABLE:
            print(
                "[DetectorService] WARNING: best.pt found but ultralytics "
                "is not installed. Falling back to demo mode."
            )
            self.is_real = False
            return

        try:
            self.model = YOLO(self.model_path)
            self.is_real = True
            print(f"[DetectorService] Loaded REAL model from {self.model_path}")
        except Exception as exc:
            print(f"[DetectorService] Failed to load model: {exc}")
            self.is_real = False

    def reload_model(self):
        """Re-check for the model file (e.g. after deployment of new weights)."""
        self._try_load_model()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def detect(self, image_path: str, save_dir: str) -> dict:
        """
        Run detection on a single image.

        Returns a dict with:
            engine        : "real" | "demo"
            is_demo       : bool
            detections    : list of {class, label, confidence, bbox}
            annotated_path: path to the annotated image (or None)
            image_width   : int
            image_height  : int
        """
        if self.is_real and self.model is not None:
            return self._real_inference(image_path, save_dir)
        return self._demo_inference(image_path, save_dir)

    # ------------------------------------------------------------------
    # Real YOLO inference
    # ------------------------------------------------------------------
    def _real_inference(self, image_path: str, save_dir: str) -> dict:
        """Run actual YOLO inference."""
        results = self.model.predict(
    source=image_path,
    conf=self.confidence_threshold,
    iou=0.45,
    imgsz=416,
    device="cpu",
    save=False,
    verbose=False,
)

        result = results[0]
        img = Image.open(image_path)
        img_w, img_h = img.size

        detections = []
        for box in result.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            x1, y1, x2, y2 = [float(c) for c in box.xyxy[0]]

            class_name = result.names.get(cls_id, f"class_{cls_id}")
            label = DAMAGE_CLASSES.get(class_name, class_name)

            detections.append({
                "class": class_name,
                "label": label,
                "confidence": round(conf, 4),
                "bbox": {
                    "x1": round(x1, 2),
                    "y1": round(y1, 2),
                    "x2": round(x2, 2),
                    "y2": round(y2, 2),
                },
            })

        # Filter out low-confidence crack detections — D00/D10 are the
        # weakest classes right now, so anything under this bar is more
        # noise than signal.
        detections = [
            d for d in detections
            if d["label"] not in CRACK_CLASSES or d["confidence"] >= CRACK_MIN_CONFIDENCE
        ]

        # Save annotated image
        annotated_path = None
        if detections:
            annotated_img = result.plot()  # numpy array BGR
            annotated_pil = Image.fromarray(annotated_img[..., ::-1])  # BGR→RGB
            fname = f"annotated_{uuid.uuid4().hex[:8]}.jpg"
            annotated_path = str(Path(save_dir) / fname)
            os.makedirs(save_dir, exist_ok=True)
            annotated_pil.save(annotated_path, quality=90)

        return {
            "engine": "real",
            "is_demo": False,
            "detections": detections,
            "annotated_path": annotated_path,
            "image_width": img_w,
            "image_height": img_h,
        }

    # ------------------------------------------------------------------
    # Demo fallback  — CLEARLY LABELLED
    # ------------------------------------------------------------------
    def _demo_inference(self, image_path: str, save_dir: str) -> dict:
        """
        Generate simulated detections for development/demo purposes.

        Every output is tagged with is_demo=True and engine="demo".
        These results must NEVER be presented as real AI predictions.
        """
        img = Image.open(image_path)
        img_w, img_h = img.size

        # Generate 1-3 random detections
        num_detections = random.randint(1, 3)
        detections = []

        for _ in range(num_detections):
            damage_type = random.choice(DEMO_DAMAGE_TYPES)

            # Random bounding box (at least 10% of image, at most 40%)
            box_w = random.uniform(0.10, 0.40) * img_w
            box_h = random.uniform(0.10, 0.40) * img_h
            x1 = random.uniform(0, img_w - box_w)
            y1 = random.uniform(0, img_h - box_h)
            x2 = x1 + box_w
            y2 = y1 + box_h

            detections.append({
                "class": damage_type,
                "label": damage_type,
                "confidence": round(random.uniform(0.55, 0.95), 4),
                "bbox": {
                    "x1": round(x1, 2),
                    "y1": round(y1, 2),
                    "x2": round(x2, 2),
                    "y2": round(y2, 2),
                },
            })

        # Draw demo annotations on the image
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

            for det in detections:
                bbox = det["bbox"]
                color = colors.get(det["label"], "#FF4444")
                draw.rectangle(
                    [bbox["x1"], bbox["y1"], bbox["x2"], bbox["y2"]],
                    outline=color,
                    width=3,
                )
                label_text = f"[DEMO] {det['label']} {det['confidence']:.0%}"
                try:
                    font = ImageFont.truetype("arial.ttf", 16)
                except OSError:
                    font = ImageFont.load_default()
                text_bbox = draw.textbbox(
                    (bbox["x1"], bbox["y1"] - 20), label_text, font=font
                )
                draw.rectangle(text_bbox, fill=color)
                draw.text(
                    (bbox["x1"], bbox["y1"] - 20),
                    label_text,
                    fill="white",
                    font=font,
                )

            try:
                watermark_font = ImageFont.truetype("arial.ttf", 28)
            except OSError:
                watermark_font = ImageFont.load_default()
            watermark_text = "DEMO MODE — Simulated Results"
            draw.text(
                (10, 10), watermark_text, fill="#FF0000", font=watermark_font
            )

            fname = f"demo_annotated_{uuid.uuid4().hex[:8]}.jpg"
            annotated_path = str(Path(save_dir) / fname)
            os.makedirs(save_dir, exist_ok=True)
            draw_img.save(annotated_path, quality=90)

        except Exception as exc:
            print(f"[DetectorService] Demo annotation failed: {exc}")

        return {
            "engine": "demo",
            "is_demo": True,
            "detections": detections,
            "annotated_path": annotated_path,
            "image_width": img_w,
            "image_height": img_h,
        }