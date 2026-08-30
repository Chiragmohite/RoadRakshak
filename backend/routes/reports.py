"""
RoadRakshak — Report Routes

POST   /api/reports         — upload image, run AI, create report
GET    /api/reports         — list reports (with filters)
GET    /api/reports/<id>    — get single report
PATCH  /api/reports/<id>    — update status/priority
DELETE /api/reports/<id>    — delete report (admin only)
"""

import json
import os
import uuid

from flask import Blueprint, current_app, g, jsonify, request

from database.models import Report, db
from services.auth_service import login_required, role_required
from services.clustering import assign_to_cluster
from services.cloudinary_service import upload_image
from services.detector import DetectorService
from services.severity import compute_severity

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")

# Shared detector singleton
_detector: DetectorService | None = None


def _get_detector() -> DetectorService:
    global _detector

    if _detector is None:
        _detector = DetectorService(
            model_path=current_app.config["MODEL_PATH"],
            confidence_threshold=current_app.config[
                "DETECTION_CONFIDENCE_THRESHOLD"
            ],
        )

    return _detector


ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}


def _allowed_file(filename: str) -> bool:
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_EXTENSIONS
    )


# ---------------------------------------------------------------------------
# POST /api/reports — full pipeline:
# upload → detect → score → cluster → Cloudinary → save
# ---------------------------------------------------------------------------
@reports_bp.route("", methods=["POST"])
@login_required
def create_report():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files["image"]

    if not file.filename or not _allowed_file(file.filename):
        return jsonify({
            "error": "Invalid file type. Allowed: png, jpg, jpeg, webp"
        }), 400

    # Parse location data
    latitude = request.form.get("latitude", type=float)
    longitude = request.form.get("longitude", type=float)
    address = request.form.get("address", "")

    # ------------------------------------------------------------------
    # Save uploaded image temporarily
    # ------------------------------------------------------------------

    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"

    upload_dir = os.path.join(
        current_app.config["UPLOAD_FOLDER"],
        "reports",
    )

    os.makedirs(upload_dir, exist_ok=True)

    filepath = os.path.join(
        upload_dir,
        filename,
    )

    file.save(filepath)

    # ------------------------------------------------------------------
    # AI Detection
    # ------------------------------------------------------------------

    detector = _get_detector()

    annotated_dir = os.path.join(
        current_app.config["UPLOAD_FOLDER"],
        "annotated",
    )

    detection_result = detector.detect(
        filepath,
        annotated_dir,
    )

    # ------------------------------------------------------------------
    # Cloudinary Storage
    # ------------------------------------------------------------------

    # Upload original image
    cloudinary_image_url = upload_image(
        filepath,
        folder="roadrakshak/reports",
    )

    # Upload annotated image if detection created one
    cloudinary_annotated_url = None

    if detection_result["annotated_path"]:
        cloudinary_annotated_url = upload_image(
            detection_result["annotated_path"],
            folder="roadrakshak/annotated",
        )

    # ------------------------------------------------------------------
    # Severity Scoring
    # ------------------------------------------------------------------

    severity = compute_severity(
        detection_result["detections"],
        detection_result["image_width"],
        detection_result["image_height"],
    )

    # ------------------------------------------------------------------
    # Determine primary damage type
    # ------------------------------------------------------------------

    primary_damage = None
    primary_confidence = 0.0

    if detection_result["detections"]:
        best_det = max(
            detection_result["detections"],
            key=lambda d: d["confidence"],
        )

        primary_damage = (
            best_det.get("label")
            or best_det.get("class")
        )

        primary_confidence = best_det["confidence"]

    # ------------------------------------------------------------------
    # Create Report
    # ------------------------------------------------------------------

    report = Report(
        user_id=g.current_user_id,

        # Permanent Cloudinary URL
        image_path=cloudinary_image_url,

        # Permanent Cloudinary URL for annotated image
        annotated_image_path=cloudinary_annotated_url,

        latitude=latitude,
        longitude=longitude,
        address=address,

        damage_type=primary_damage,
        confidence=round(
            primary_confidence,
            4,
        ),

        bounding_boxes=json.dumps(
            detection_result["detections"]
        ),

        severity_score=severity["severity_score"],
        severity_level=severity["severity_level"],
        priority=severity["priority"],

        status="pending",

        is_demo=detection_result["is_demo"],
    )

    db.session.add(report)

    db.session.flush()

    # ------------------------------------------------------------------
    # Duplicate Clustering
    # ------------------------------------------------------------------

    cluster = assign_to_cluster(
        report,
        radius_meters=current_app.config.get(
            "CLUSTER_RADIUS_METERS",
            50,
        ),
    )

    db.session.commit()

    # ------------------------------------------------------------------
    # Response
    # ------------------------------------------------------------------

    response = report.to_dict()

    response["engine"] = detection_result["engine"]

    response["scoring_factors"] = (
        severity["scoring_factors"]
    )

    if cluster:
        response["cluster"] = cluster.to_dict()

    return jsonify(response), 201


# ---------------------------------------------------------------------------
# GET /api/reports — list with filters
# ---------------------------------------------------------------------------
@reports_bp.route("", methods=["GET"])
@login_required
def list_reports():
    query = Report.query

    # Filters
    status = request.args.get("status")

    if status:
        query = query.filter_by(
            status=status
        )

    priority = request.args.get("priority")

    if priority:
        query = query.filter_by(
            priority=priority
        )

    damage_type = request.args.get("damage_type")

    if damage_type:
        query = query.filter_by(
            damage_type=damage_type
        )

    is_demo = request.args.get("is_demo")

    if is_demo is not None:
        query = query.filter_by(
            is_demo=is_demo.lower() == "true"
        )

    # ------------------------------------------------------------------
    # Sorting
    # ------------------------------------------------------------------

    sort = request.args.get(
        "sort",
        "newest",
    )

    if sort == "priority":
        query = query.order_by(
            Report.priority.asc(),
            Report.created_at.desc(),
        )

    elif sort == "severity":
        query = query.order_by(
            Report.severity_score.desc(),
            Report.created_at.desc(),
        )

    else:
        query = query.order_by(
            Report.created_at.desc()
        )

    # ------------------------------------------------------------------
    # Pagination
    # ------------------------------------------------------------------

    page = request.args.get(
        "page",
        1,
        type=int,
    )

    per_page = request.args.get(
        "per_page",
        20,
        type=int,
    )

    per_page = min(
        per_page,
        100,
    )

    paginated = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False,
    )

    return jsonify({
        "reports": [
            r.to_dict()
            for r in paginated.items
        ],
        "total": paginated.total,
        "page": paginated.page,
        "per_page": paginated.per_page,
        "pages": paginated.pages,
    }), 200


# ---------------------------------------------------------------------------
# GET /api/reports/<id>
# ---------------------------------------------------------------------------
@reports_bp.route(
    "/<int:report_id>",
    methods=["GET"],
)
@login_required
def get_report(report_id):
    report = Report.query.get(
        report_id
    )

    if not report:
        return jsonify({
            "error": "Report not found"
        }), 404

    return jsonify(
        report.to_dict()
    ), 200


# ---------------------------------------------------------------------------
# PATCH /api/reports/<id> — update status/priority
# ---------------------------------------------------------------------------
@reports_bp.route(
    "/<int:report_id>",
    methods=["PATCH"],
)
@login_required
def update_report(report_id):
    report = Report.query.get(
        report_id
    )

    if not report:
        return jsonify({
            "error": "Report not found"
        }), 404

    data = request.get_json(
        silent=True
    )

    if not data:
        return jsonify({
            "error": "Request body must be JSON"
        }), 400

    allowed_fields = {
        "status",
        "priority",
        "address",
    }

    for field in allowed_fields:
        if field in data:
            setattr(
                report,
                field,
                data[field],
            )

    db.session.commit()

    return jsonify(
        report.to_dict()
    ), 200


# ---------------------------------------------------------------------------
# DELETE /api/reports/<id> — admin only
# ---------------------------------------------------------------------------
@reports_bp.route(
    "/<int:report_id>",
    methods=["DELETE"],
)
@role_required("admin")
def delete_report(report_id):
    report = Report.query.get(
        report_id
    )

    if not report:
        return jsonify({
            "error": "Report not found"
        }), 404

    db.session.delete(report)

    db.session.commit()

    return jsonify({
        "message": f"Report {report_id} deleted"
    }), 200