"""
RoadRakshak — Assignment Routes

POST  /api/assignments          — assign a report to a municipal worker
PATCH /api/assignments/<id>     — update assignment status
GET   /api/assignments          — list assignments (filterable)
"""

from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from database.models import Assignment, Report, User, db
from services.auth_service import login_required, role_required

assignments_bp = Blueprint("assignments", __name__, url_prefix="/api/assignments")


# ---------------------------------------------------------------------------
# POST /api/assignments
# ---------------------------------------------------------------------------
@assignments_bp.route("", methods=["POST"])
@role_required("municipal", "admin")
def create_assignment():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    report_id = data.get("report_id")
    assigned_to = data.get("assigned_to")
    notes = data.get("notes", "")

    if not report_id or not assigned_to:
        return jsonify({"error": "report_id and assigned_to are required"}), 400

    # Validate report exists
    report = Report.query.get(report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404

    # Check if already assigned
    if report.assignment:
        return jsonify({"error": "Report is already assigned"}), 409

    # Validate assignee exists and is municipal
    assignee = User.query.get(assigned_to)
    if not assignee:
        return jsonify({"error": "Assigned user not found"}), 404
    if assignee.role not in ("municipal", "admin"):
        return jsonify({"error": "Can only assign to municipal or admin users"}), 400

    assignment = Assignment(
        report_id=report_id,
        assigned_to=assigned_to,
        notes=notes,
    )
    db.session.add(assignment)

    # Update report status
    report.status = "assigned"
    db.session.commit()

    return jsonify(assignment.to_dict()), 201


# ---------------------------------------------------------------------------
# PATCH /api/assignments/<id>
# ---------------------------------------------------------------------------
@assignments_bp.route("/<int:assignment_id>", methods=["PATCH"])
@login_required
def update_assignment(assignment_id):
    assignment = Assignment.query.get(assignment_id)
    if not assignment:
        return jsonify({"error": "Assignment not found"}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    new_status = data.get("status")
    valid_statuses = {"assigned", "in_progress", "completed"}

    if new_status and new_status in valid_statuses:
        assignment.status = new_status

        # Sync report status
        report = assignment.report
        if new_status == "in_progress":
            report.status = "in_progress"
        elif new_status == "completed":
            assignment.completed_at = datetime.now(timezone.utc)
            report.status = "repaired"

    if "notes" in data:
        assignment.notes = data["notes"]

    db.session.commit()
    return jsonify(assignment.to_dict()), 200


# ---------------------------------------------------------------------------
# GET /api/assignments
# ---------------------------------------------------------------------------
@assignments_bp.route("", methods=["GET"])
@login_required
def list_assignments():
    query = Assignment.query

    status = request.args.get("status")
    if status:
        query = query.filter_by(status=status)

    assigned_to = request.args.get("assigned_to", type=int)
    if assigned_to:
        query = query.filter_by(assigned_to=assigned_to)

    assignments = query.order_by(Assignment.assigned_at.desc()).all()
    return jsonify([a.to_dict() for a in assignments]), 200
