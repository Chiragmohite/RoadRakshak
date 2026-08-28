"""
RoadRakshak — Dashboard Routes

GET /api/dashboard/stats  — summary counts by priority, status, damage type
GET /api/dashboard/map    — GeoJSON-like data for map display
"""

import os

from flask import Blueprint, current_app, jsonify, request

from database.models import Cluster, Report, db
from services.auth_service import login_required

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


# ---------------------------------------------------------------------------
# GET /api/dashboard/stats
# ---------------------------------------------------------------------------
@dashboard_bp.route("/stats", methods=["GET"])
@login_required
def stats():
    # Check if we have any real data or only demo data
    total = Report.query.count()
    demo_count = Report.query.filter_by(is_demo=True).count()
    all_demo = total > 0 and demo_count == total

    # Counts by status
    status_counts = {}
    for status in ["pending", "assigned", "in_progress", "repaired", "verified"]:
        status_counts[status] = Report.query.filter_by(status=status).count()

    # Counts by priority
    priority_counts = {}
    for priority in ["P1", "P2", "P3", "P4"]:
        priority_counts[priority] = Report.query.filter_by(priority=priority).count()

    # Counts by damage type
    damage_types = (
        db.session.query(Report.damage_type, db.func.count(Report.id))
        .filter(Report.damage_type.isnot(None))
        .group_by(Report.damage_type)
        .all()
    )
    damage_type_counts = {dt: count for dt, count in damage_types}

    # Average severity
    avg_severity = (
        db.session.query(db.func.avg(Report.severity_score))
        .filter(Report.severity_score.isnot(None))
        .scalar()
    )

    # Cluster count
    cluster_count = Cluster.query.count()

    # Model status
    model_exists = os.path.exists(current_app.config["MODEL_PATH"])

    return jsonify({
        "total_reports": total,
        "demo_reports": demo_count,
        "is_all_demo_data": all_demo,
        "engine": "real" if model_exists else "demo",
        "status_counts": status_counts,
        "priority_counts": priority_counts,
        "damage_type_counts": damage_type_counts,
        "average_severity": round(avg_severity, 1) if avg_severity else 0,
        "cluster_count": cluster_count,
    }), 200


# ---------------------------------------------------------------------------
# GET /api/dashboard/map
# ---------------------------------------------------------------------------
@dashboard_bp.route("/map", methods=["GET"])
@login_required
def map_data():
    # Return all reports with GPS coordinates
    reports = (
        Report.query.filter(
            Report.latitude.isnot(None),
            Report.longitude.isnot(None),
        )
        .order_by(Report.created_at.desc())
        .all()
    )

    features = []
    for r in reports:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [r.longitude, r.latitude],
            },
            "properties": {
                "id": r.id,
                "damage_type": r.damage_type,
                "severity_score": r.severity_score,
                "severity_level": r.severity_level,
                "priority": r.priority,
                "status": r.status,
                "cluster_id": r.cluster_id,
                "is_demo": r.is_demo,
                "created_at": r.created_at.isoformat(),
            },
        })

    # Also include cluster centroids
    clusters = Cluster.query.all()
    for c in clusters:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [c.centroid_lng, c.centroid_lat],
            },
            "properties": {
                "type": "cluster",
                "id": c.id,
                "damage_type": c.damage_type,
                "report_count": c.report_count,
                "worst_priority": c.worst_priority,
            },
        })

    return jsonify({
        "type": "FeatureCollection",
        "features": features,
    }), 200
