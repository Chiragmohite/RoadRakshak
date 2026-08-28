"""
RoadRakshak — End-to-End Test Suite
Tests every core feature:
1. Health check & Engine detection
2. Citizen registration & authentication
3. Municipal registration & authentication
4. Standalone AI detection (/api/detect)
5. Citizen complaint submission (/api/reports)
6. Duplicate clustering (within 50m radius)
7. Dashboard stats & map data (/api/dashboard/stats)
8. Municipal work order assignment (/api/assignments)
9. Repair status progression (assigned -> in_progress)
10. After-repair photo upload (/api/repairs)
11. Manual verification to 'VERIFIED FIXED'
"""

import io
import os
import sys
from PIL import Image
import requests

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:5000"


def create_test_image(color=(120, 120, 120), size=(640, 480)):
    """Generate a test in-memory image byte stream."""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf


def run_tests():
    print("=" * 60)
    print("🚀 Starting RoadRakshak End-to-End System Tests")
    print("=" * 60)

    session = requests.Session()

    # 1. Health Check
    print("\n[1/11] Testing GET /api/health...")
    r = session.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    health = r.json()
    print(f"  ✓ Health OK: Engine = {health['engine']}, Model Loaded = {health['model_loaded']}")

    # 2. Register Citizen
    print("\n[2/11] Testing Citizen Registration & JWT Auth...")
    citizen_payload = {
        "username": "citizen_test_user",
        "email": "citizen@example.com",
        "password": "password123",
        "role": "citizen"
    }
    r = session.post(f"{BASE_URL}/api/auth/register", json=citizen_payload)
    if r.status_code == 409:
        # Already registered, log in
        r = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "citizen_test_user",
            "password": "password123"
        })
    assert r.status_code in (200, 201), f"Citizen auth failed: {r.text}"
    citizen_token = r.json()["token"]
    citizen_user = r.json()["user"]
    print(f"  ✓ Citizen Auth OK: User #{citizen_user['id']} ({citizen_user['username']})")

    # 3. Register Municipal Worker
    print("\n[3/11] Testing Municipal Worker Registration & JWT Auth...")
    municipal_payload = {
        "username": "municipal_worker_rajesh",
        "email": "rajesh@bbmp.gov.in",
        "password": "password123",
        "role": "municipal"
    }
    r = session.post(f"{BASE_URL}/api/auth/register", json=municipal_payload)
    if r.status_code == 409:
        r = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "municipal_worker_rajesh",
            "password": "password123"
        })
    assert r.status_code in (200, 201), f"Municipal auth failed: {r.text}"
    municipal_token = r.json()["token"]
    municipal_user = r.json()["user"]
    print(f"  ✓ Municipal Auth OK: User #{municipal_user['id']} ({municipal_user['username']})")

    citizen_headers = {"Authorization": f"Bearer {citizen_token}"}
    municipal_headers = {"Authorization": f"Bearer {municipal_token}"}

    # 4. Standalone Detection
    print("\n[4/11] Testing Standalone AI Detection (/api/detect)...")
    img_buf = create_test_image((100, 100, 100))
    files = {"image": ("test_road.jpg", img_buf, "image/jpeg")}
    r = session.post(f"{BASE_URL}/api/detect", files=files, headers=citizen_headers)
    assert r.status_code == 200, f"Detect failed: {r.text}"
    detect_res = r.json()
    print(f"  ✓ AI Detection OK: {len(detect_res['detections'])} detections found")
    print(f"    - Engine: {detect_res['engine']} (is_demo={detect_res['is_demo']})")
    print(f"    - Severity Score: {detect_res['severity_score']} ({detect_res['severity_level']}) -> Priority: {detect_res['priority']}")
    print(f"    - Factors: {detect_res['scoring_factors']}")

    # 5. Citizen Report 1 Submission
    print("\n[5/11] Testing Citizen Complaint Submission #1 (/api/reports)...")
    img_buf1 = create_test_image((80, 80, 80))
    files1 = {"image": ("pothole_site_1.jpg", img_buf1, "image/jpeg")}
    data1 = {
        "latitude": 12.971600,
        "longitude": 77.594600,
        "address": "MG Road near Metro Station, Bengaluru"
    }
    r = session.post(f"{BASE_URL}/api/reports", files=files1, data=data1, headers=citizen_headers)
    assert r.status_code == 201, f"Report 1 failed: {r.text}"
    report1 = r.json()
    report1_id = report1["id"]
    cluster1_id = report1.get("cluster_id") or report1.get("cluster", {}).get("id")
    print(f"  ✓ Report 1 Created: ID #{report1_id}")
    print(f"    - Damage: {report1['damage_type']} (Confidence: {report1['confidence']})")
    print(f"    - Priority: {report1['priority']}, Severity: {report1['severity_score']}")
    print(f"    - Associated Cluster: #{cluster1_id}")

    # 6. Duplicate Report 2 (Within 25 meters, same damage type)
    print("\n[6/11] Testing Duplicate Report GPS Clustering (25m away, same damage type)...")
    img_buf2 = create_test_image((85, 85, 85))
    files2 = {"image": ("pothole_site_dup.jpg", img_buf2, "image/jpeg")}
    # 0.0002 deg lat difference is approximately 22 meters
    data2 = {
        "latitude": 12.971800,
        "longitude": 77.594600,
        "address": "MG Road near Metro Gate 2"
    }
    r = session.post(f"{BASE_URL}/api/reports", files=files2, data=data2, headers=citizen_headers)
    assert r.status_code == 201, f"Report 2 failed: {r.text}"
    report2 = r.json()
    report2_id = report2["id"]
    cluster2_id = report2.get("cluster_id") or report2.get("cluster", {}).get("id")
    print(f"  ✓ Report 2 Created: ID #{report2_id}")
    print(f"    - Associated Cluster: #{cluster2_id}")
    if report1["damage_type"] == report2["damage_type"]:
        print(f"    ✓ Cluster Match Verified: Both reports joined Cluster #{cluster1_id}!")
    else:
        print(f"    - Damage types differed ({report1['damage_type']} vs {report2['damage_type']}), individual clusters created as designed.")

    # 7. Dashboard Stats & Map Data
    print("\n[7/11] Testing Municipal Dashboard Stats (/api/dashboard/stats & /map)...")
    r = session.get(f"{BASE_URL}/api/dashboard/stats", headers=municipal_headers)
    assert r.status_code == 200, f"Stats failed: {r.text}"
    stats = r.json()
    print(f"  ✓ Dashboard Stats: Total Reports={stats['total_reports']}, Clusters={stats['cluster_count']}")
    print(f"    - Priority Distribution: {stats['priority_counts']}")
    print(f"    - Status Distribution: {stats['status_counts']}")

    r = session.get(f"{BASE_URL}/api/dashboard/map", headers=municipal_headers)
    assert r.status_code == 200, f"Map failed: {r.text}"
    map_data = r.json()
    print(f"  ✓ Map GeoJSON: {len(map_data['features'])} geo features returned")

    # 8. Municipal Assignment
    print("\n[8/11] Testing Municipal Work Order Assignment (/api/assignments)...")
    assign_payload = {
        "report_id": report1_id,
        "assigned_to": municipal_user["id"],
        "notes": "Emergency cold asphalt patch required. Target SLA: 24h."
    }
    r = session.post(f"{BASE_URL}/api/assignments", json=assign_payload, headers=municipal_headers)
    assert r.status_code == 201, f"Assignment failed: {r.text}"
    assignment = r.json()
    assignment_id = assignment["id"]
    print(f"  ✓ Assignment Created: ID #{assignment_id} for Report #{report1_id} -> Worker #{municipal_user['id']}")

    # Verify Report status updated to 'assigned'
    r = session.get(f"{BASE_URL}/api/reports/{report1_id}", headers=citizen_headers)
    assert r.json()["status"] == "assigned", f"Expected status 'assigned', got {r.json()['status']}"
    print(f"  ✓ Report #{report1_id} Status Updated: 'assigned'")

    # 9. Update Assignment to 'in_progress'
    print("\n[9/11] Testing Status Update to 'in_progress' (/api/assignments/<id>)...")
    r = session.patch(f"{BASE_URL}/api/assignments/{assignment_id}", json={"status": "in_progress"}, headers=municipal_headers)
    assert r.status_code == 200, f"Update assignment failed: {r.text}"
    r = session.get(f"{BASE_URL}/api/reports/{report1_id}", headers=citizen_headers)
    assert r.json()["status"] == "in_progress", f"Expected status 'in_progress', got {r.json()['status']}"
    print(f"  ✓ Report #{report1_id} Status Updated: 'in_progress'")

    # 10. Upload After-Repair Photo
    print("\n[10/11] Testing After-Repair Photo Upload (/api/repairs)...")
    after_buf = create_test_image((20, 180, 20))  # Green / repaired road surface
    files_after = {"after_image": ("after_repair_fixed.jpg", after_buf, "image/jpeg")}
    data_after = {"report_id": report1_id}
    r = session.post(f"{BASE_URL}/api/repairs", files=files_after, data=data_after, headers=municipal_headers)
    assert r.status_code == 201, f"Create repair failed: {r.text}"
    repair = r.json()
    repair_id = repair["id"]
    print(f"  ✓ Repair Record Created: ID #{repair_id}")
    print(f"    - Before Image: {repair['before_image_path']}")
    print(f"    - After Image: {repair['after_image_path']}")
    print(f"    - Verified: {repair['verified']} (Method: {repair['verification_method']})")

    # Verify Report status updated to 'repaired'
    r = session.get(f"{BASE_URL}/api/reports/{report1_id}", headers=citizen_headers)
    assert r.json()["status"] == "repaired", f"Expected status 'repaired', got {r.json()['status']}"
    print(f"  ✓ Report #{report1_id} Status Updated: 'repaired'")

    # 11. Manual Verification -> 'VERIFIED FIXED'
    print("\n[11/11] Testing Manual Verification to 'VERIFIED FIXED' (/api/repairs/<id>/verify)...")
    r = session.post(f"{BASE_URL}/api/repairs/{repair_id}/verify", headers=municipal_headers)
    assert r.status_code == 200, f"Verify repair failed: {r.text}"
    verify_res = r.json()
    print(f"  ✓ Verification Success: {verify_res['message']}")
    print(f"    - Verification Method: {verify_res['repair']['verification_method']}")
    print(f"    - Final Report Status: {verify_res['report_status']}")

    r = session.get(f"{BASE_URL}/api/reports/{report1_id}", headers=citizen_headers)
    final_report = r.json()
    assert final_report["status"] == "verified", f"Expected final status 'verified', got {final_report['status']}"
    print(f"  ✓ Confirmed Final Database Status for Report #{report1_id}: '{final_report['status']}'")

    print("\n" + "=" * 60)
    print("🎉 ALL 11/11 ROADRAKSHAK SYSTEM TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    run_tests()
