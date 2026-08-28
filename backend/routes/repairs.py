"""
RoadRakshak — Repair Routes

POST  /api/repairs              — upload after-photo for a report
POST  /api/repairs/<id>/verify  — mark repair as verified (manual verification)
GET   /api/repairs/<id>         — get repair details
"""

import os
import uuid
from datetime import datetime, timezone

from flask import Blueprint, current_app, g, jsonify, request

from database.models import Repair, Report, db
from services.auth_service import login_required

repairs_bp = Blueprint("repairs", __name__, url_prefix="/api/repairs")

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ---------------------------------------------------------------------------
# POST /api/repairs — upload after-photo
# ---------------------------------------------------------------------------
@repairs_bp.route("", methods=["POST"])
@login_required
def create_repair():
    report_id = request.form.get("report_id", type=int)
    if not report_id:
        return jsonify({"error": "report_id is required"}), 400

    report = Report.query.get(report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404

    if report.repair:
        return jsonify({"error": "Repair record already exists for this report"}), 409

    if "after_image" not in request.files:
        return jsonify({"error": "No after_image file provided"}), 400

    file = request.files["after_image"]
    if not file.filename or not _allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Allowed: png, jpg, jpeg, webp"}), 400

    # Save after image
    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"after_{uuid.uuid4().hex[:8]}.{ext}"
    repair_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "repairs")
    os.makedirs(repair_dir, exist_ok=True)
    filepath = os.path.join(repair_dir, filename)
    file.save(filepath)

    repair = Repair(
        report_id=report_id,
        before_image_path=report.image_path,
        after_image_path=f"repairs/{filename}",
        verified=False,
        verification_method="manual",  # Honest: no AI verification pretense
    )
    db.session.add(repair)

    # Update report status
    report.status = "repaired"
    db.session.commit()

    return jsonify(repair.to_dict()), 201


# ---------------------------------------------------------------------------
# POST /api/repairs/<id>/verify — manual verification
# ---------------------------------------------------------------------------
@repairs_bp.route("/<int:repair_id>/verify", methods=["POST"])
@login_required
def verify_repair(repair_id):
    repair = Repair.query.get(repair_id)
    if not repair:
        return jsonify({"error": "Repair not found"}), 404

    if repair.verified:
        return jsonify({"error": "Repair is already verified"}), 409

    # Mark as verified
    repair.verified = True
    repair.verification_method = "manual"
    repair.verified_by = str(g.current_user_id)
    repair.verified_at = datetime.now(timezone.utc)

    # Update report status to VERIFIED FIXED
    report = Report.query.get(repair.report_id)
    if report:
        report.status = "verified"

    db.session.commit()

    return jsonify({
        "repair": repair.to_dict(),
        "report_status": "verified",
        "message": "Repair manually verified — status set to VERIFIED FIXED",
    }), 200


# ---------------------------------------------------------------------------
# GET /api/repairs/<id>
# ---------------------------------------------------------------------------
@repairs_bp.route("/<int:repair_id>", methods=["GET"])
@login_required
def get_repair(repair_id):
    repair = Repair.query.get(repair_id)
    if not repair:
        return jsonify({"error": "Repair not found"}), 404
    return jsonify(repair.to_dict()), 200
