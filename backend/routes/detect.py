"""
RoadRakshak — Detection Route

POST /api/detect  — run AI detection on an uploaded image (standalone, no report creation)
"""

import os
import uuid

from flask import Blueprint, current_app, jsonify, request

from services.auth_service import login_required
from services.detector import DetectorService
from services.severity import compute_severity

detect_bp = Blueprint("detect", __name__, url_prefix="/api")

# Detector singleton — initialised on first request
_detector: DetectorService | None = None


def _get_detector() -> DetectorService:
    global _detector

    if _detector is None:
        _detector = DetectorService(
            model_path=current_app.config["MODEL_PATH"],
            confidence_threshold=current_app.config["DETECTION_CONFIDENCE_THRESHOLD"],
        )

    return _detector


ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ---------------------------------------------------------------------------
# POST /api/detect
# ---------------------------------------------------------------------------
@detect_bp.route("/detect", methods=["POST"])
@login_required
def detect():
    """
    Run AI detection on an uploaded image.
    Returns detection results + severity + priority without creating a report.
    """
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files["image"]
    if not file.filename or not _allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Allowed: png, jpg, jpeg, webp"}), 400

    # Save uploaded image
    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "reports")
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)

    # Run detection
    detector = _get_detector()
    annotated_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "annotated")
    result = detector.detect(filepath, annotated_dir)

    # Compute severity
    severity = compute_severity(
        result["detections"],
        result["image_width"],
        result["image_height"],
    )

    # Build response
    response = {
        "engine": result["engine"],
        "is_demo": result["is_demo"],
        "detections": result["detections"],
        "severity_score": severity["severity_score"],
        "severity_level": severity["severity_level"],
        "priority": severity["priority"],
        "scoring_factors": severity["scoring_factors"],
        "image_path": f"reports/{filename}",
        "annotated_image_path": (
            os.path.relpath(result["annotated_path"], current_app.config["UPLOAD_FOLDER"])
            if result["annotated_path"]
            else None
        ),
    }

    return jsonify(response), 200
