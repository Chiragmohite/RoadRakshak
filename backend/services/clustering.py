"""
RoadRakshak — Duplicate Report Clustering

Groups reports that are geographically close AND share the same damage type.

Algorithm:
  1. For each new report, find all existing clusters with matching damage_type
  2. Compute Haversine distance to each cluster centroid
  3. If distance ≤ CLUSTER_RADIUS_METERS → associate with the closest cluster
  4. Otherwise → create a new cluster
  5. The new citizen report is ALWAYS preserved (never silently discarded)
  6. Cluster centroid is recomputed as the average of all member reports

Default radius: 50 meters (configurable via Config.CLUSTER_RADIUS_METERS)
"""

import math

from database.models import Cluster, Report, db
from services.severity import get_priority_order


# ---------------------------------------------------------------------------
# Haversine distance (meters)
# ---------------------------------------------------------------------------
def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two GPS points in meters.
    """
    R = 6_371_000  # Earth radius in meters

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


# ---------------------------------------------------------------------------
# Cluster assignment
# ---------------------------------------------------------------------------
def assign_to_cluster(
    report: "Report",
    radius_meters: float = 50.0,
) -> "Cluster | None":
    """
    Try to assign a report to an existing cluster.

    - If a matching cluster is found → attach report, update cluster stats
    - If no match → create a new cluster
    - The report is NEVER discarded

    Returns the Cluster the report was assigned to.
    """
    if report.latitude is None or report.longitude is None:
        # No GPS data — cannot cluster
        return None

    if not report.damage_type:
        # No damage type — cannot cluster
        return None

    # Find clusters with matching damage type
    candidate_clusters = Cluster.query.filter_by(
        damage_type=report.damage_type
    ).all()

    best_cluster = None
    best_distance = float("inf")

    for cluster in candidate_clusters:
        dist = haversine_distance(
            report.latitude,
            report.longitude,
            cluster.centroid_lat,
            cluster.centroid_lng,
        )
        if dist <= radius_meters and dist < best_distance:
            best_cluster = cluster
            best_distance = dist

    if best_cluster:
        # Attach to existing cluster
        report.cluster_id = best_cluster.id

        # Recompute centroid (running average)
        n = best_cluster.report_count
        best_cluster.centroid_lat = (
            best_cluster.centroid_lat * n + report.latitude
        ) / (n + 1)
        best_cluster.centroid_lng = (
            best_cluster.centroid_lng * n + report.longitude
        ) / (n + 1)
        best_cluster.report_count = n + 1

        # Update worst priority
        if report.priority:
            if best_cluster.worst_priority is None or get_priority_order(
                report.priority
            ) < get_priority_order(best_cluster.worst_priority):
                best_cluster.worst_priority = report.priority

        db.session.commit()
        return best_cluster

    # No match — create new cluster
    new_cluster = Cluster(
        centroid_lat=report.latitude,
        centroid_lng=report.longitude,
        radius_meters=radius_meters,
        damage_type=report.damage_type,
        report_count=1,
        worst_priority=report.priority,
    )
    db.session.add(new_cluster)
    db.session.flush()  # Get the ID

    report.cluster_id = new_cluster.id
    db.session.commit()

    return new_cluster
