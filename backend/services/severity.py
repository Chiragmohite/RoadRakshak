"""
RoadRakshak — Severity Scoring Module

Derives a severity score ONLY from demonstrable detection information:
  1. Damage type          (weight: 30%)
  2. Relative bbox area   (weight: 30%)
  3. Detection confidence  (weight: 20%)
  4. Detection count       (weight: 20%)

Does NOT claim to use road context, traffic density, weather, or any other
factors that are not actually implemented.

Output:
  severity_score : float 1.0 – 10.0
  severity_level : "critical" | "high" | "medium" | "low"
  priority       : "P1" | "P2" | "P3" | "P4"
"""


# ---------------------------------------------------------------------------
# Damage type weights  (higher = more severe)
# ---------------------------------------------------------------------------
DAMAGE_TYPE_SEVERITY = {
    # Potholes are the most dangerous to vehicles and pedestrians
    "Pothole": 1.0,
    "D40": 1.0,
    # Alligator cracks indicate deep structural failure
    "Alligator Crack": 0.8,
    "D20": 0.8,
    # Longitudinal cracks can widen and become dangerous
    "Longitudinal Crack": 0.5,
    "D00": 0.5,
    # Transverse cracks are the least severe initially
    "Transverse Crack": 0.3,
    "D10": 0.3,
}

# Default for unknown damage types
DEFAULT_DAMAGE_SEVERITY = 0.5


# ---------------------------------------------------------------------------
# Scoring weights
# ---------------------------------------------------------------------------
WEIGHT_DAMAGE_TYPE = 0.30
WEIGHT_BBOX_AREA = 0.30
WEIGHT_CONFIDENCE = 0.20
WEIGHT_DETECTION_COUNT = 0.20


def compute_severity(detections: list, image_width: int, image_height: int) -> dict:
    """
    Compute severity from a list of detections.

    Each detection must have:
        - class or label  : str
        - confidence      : float 0–1
        - bbox            : dict with x1, y1, x2, y2

    Returns:
        {
            "severity_score": float,    # 1.0 – 10.0
            "severity_level": str,      # critical / high / medium / low
            "priority": str,            # P1 / P2 / P3 / P4
            "scoring_factors": { ... }  # transparency: show what went into the score
        }
    """
    if not detections:
        return {
            "severity_score": 0.0,
            "severity_level": "none",
            "priority": "P4",
            "scoring_factors": {
                "damage_type_score": 0,
                "bbox_area_score": 0,
                "confidence_score": 0,
                "count_score": 0,
                "note": "No detections found",
            },
        }

    image_area = max(image_width * image_height, 1)  # avoid div-by-zero

    # --- Factor 1: Worst damage type ---
    damage_type_scores = []
    for det in detections:
        label = det.get("label") or det.get("class", "")
        score = DAMAGE_TYPE_SEVERITY.get(label, DEFAULT_DAMAGE_SEVERITY)
        damage_type_scores.append(score)
    damage_type_raw = max(damage_type_scores)  # worst type determines score

    # --- Factor 2: Total relative bounding box area ---
    total_bbox_area = 0
    for det in detections:
        bbox = det.get("bbox", {})
        w = abs(bbox.get("x2", 0) - bbox.get("x1", 0))
        h = abs(bbox.get("y2", 0) - bbox.get("y1", 0))
        total_bbox_area += w * h
    bbox_area_ratio = min(total_bbox_area / image_area, 1.0)
    # Normalize: 0–5% → low, 5–15% → medium, 15–30% → high, 30%+ → critical
    bbox_area_raw = min(bbox_area_ratio / 0.30, 1.0)

    # --- Factor 3: Highest detection confidence ---
    confidences = [det.get("confidence", 0) for det in detections]
    confidence_raw = max(confidences)

    # --- Factor 4: Number of detections ---
    count = len(detections)
    # Normalize: 1→0.25, 2→0.50, 3→0.75, 4+→1.0
    count_raw = min(count / 4.0, 1.0)

    # --- Weighted sum → 0.0 to 1.0 ---
    raw_score = (
        WEIGHT_DAMAGE_TYPE * damage_type_raw
        + WEIGHT_BBOX_AREA * bbox_area_raw
        + WEIGHT_CONFIDENCE * confidence_raw
        + WEIGHT_DETECTION_COUNT * count_raw
    )

    # --- Map to 1.0 – 10.0 ---
    severity_score = round(1.0 + raw_score * 9.0, 1)
    severity_score = max(1.0, min(10.0, severity_score))

    # --- Severity level & priority ---
    severity_level = _score_to_level(severity_score)
    priority = _level_to_priority(severity_level)

    return {
        "severity_score": severity_score,
        "severity_level": severity_level,
        "priority": priority,
        "scoring_factors": {
            "damage_type_score": round(damage_type_raw, 3),
            "bbox_area_score": round(bbox_area_raw, 3),
            "confidence_score": round(confidence_raw, 3),
            "count_score": round(count_raw, 3),
            "detection_count": count,
            "total_bbox_area_pct": round(bbox_area_ratio * 100, 2),
            "worst_damage_type": max(
                detections,
                key=lambda d: DAMAGE_TYPE_SEVERITY.get(
                    d.get("label", d.get("class", "")), DEFAULT_DAMAGE_SEVERITY
                ),
            ).get("label", "unknown"),
        },
    }


# ---------------------------------------------------------------------------
# Deterministic mapping:  score → level → priority
# ---------------------------------------------------------------------------
def _score_to_level(score: float) -> str:
    """Map severity score to severity level."""
    if score >= 8.0:
        return "critical"
    elif score >= 6.0:
        return "high"
    elif score >= 4.0:
        return "medium"
    else:
        return "low"


def _level_to_priority(level: str) -> str:
    """Map severity level to priority tag."""
    mapping = {
        "critical": "P1",
        "high": "P2",
        "medium": "P3",
        "low": "P4",
    }
    return mapping.get(level, "P4")


def get_priority_order(priority: str) -> int:
    """Return numeric order for sorting (lower = more urgent)."""
    return {"P1": 1, "P2": 2, "P3": 3, "P4": 4}.get(priority, 99)
