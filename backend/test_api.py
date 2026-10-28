# backend/test_api.py
# ─────────────────────────────────────────────────────────────────────────────
# LabPulse — Backend API Test Suite
# Course: CSE494 Intelligent NoSQL Databases
#
# Tests covered:
#   Steps 1-4:  Health, Equipment CRUD, Fault reporting & resolution, Maintenance
#   Step 5:     Schema validation, Indexes, Text search, Aggregations, explain()
# ─────────────────────────────────────────────────────────────────────────────

import urllib.request
import urllib.error
import json
import requests

BASE = "http://127.0.0.1:5000/api"

# ─── HTTP helper functions ────────────────────────────────────────────────────

def post(url, data=None):
    body = json.dumps(data or {}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))

def put(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="PUT"
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))

def get(url):
    with urllib.request.urlopen(url) as res:
        return json.loads(res.read().decode("utf-8"))

def delete(url):
    req = urllib.request.Request(url, method="DELETE")
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))


# ─── STEPS 1–4 TESTS ─────────────────────────────────────────────────────────

def run_core_tests():
    print("=" * 60)
    print("STEPS 1-4 TESTS")
    print("=" * 60)

    print("\n--- 1. Testing Health Endpoint ---")
    health = get(f"{BASE}/health")
    print("Health:", health)
    assert health["connected"] is True
    assert health["database"] == "labpulse_db"
    print("PASS: MongoDB connected, database name verified.")

    print("\n--- 2. Testing Equipment Creation ---")
    new_eq = {
        "id": "PC-TEST-99",
        "type": "Desktop PC",
        "labId": "LAB-A",
        "labName": "Computer Lab A",
        "status": "healthy",
        "riskLevel": "low"
    }
    eq_res = post(f"{BASE}/equipment", new_eq)
    print("Created:", eq_res["id"])
    assert eq_res["id"] == "PC-TEST-99"
    print("PASS: Equipment created with correct ID.")

    print("\n--- 3. Testing Duplicate ID Restriction ---")
    try:
        post(f"{BASE}/equipment", new_eq)
        print("FAIL: Duplicate should have been rejected!")
    except urllib.error.HTTPError as e:
        err = json.loads(e.read().decode("utf-8"))
        print("PASS: Correctly rejected duplicate:", err["error"])

    print("\n--- 4. Testing Fault Reporting & Equipment Synchronization ---")
    fl_res = post(f"{BASE}/faults", {
        "equipId": "PC-TEST-99",
        "category": "Hardware",
        "severity": "Critical",
        "description": "Test fault: GPU artifacting on display under load"
    })
    print("Reported fault:", fl_res["id"])
    eq_synced = get(f"{BASE}/equipment/PC-TEST-99")
    print("Equipment status synchronized in MongoDB:", eq_synced["status"], eq_synced["riskLevel"])
    assert eq_synced["status"] == "critical"
    print("PASS: Equipment status updated to 'critical' on Critical fault.")

    print("\n--- 5. Testing Safe Deletion Block ---")
    try:
        delete(f"{BASE}/equipment/PC-TEST-99")
        print("FAIL: Should not delete equipment with active incident!")
    except urllib.error.HTTPError as e:
        err = json.loads(e.read().decode("utf-8"))
        print("PASS: Correctly blocked deletion:", err["error"])

    print("\n--- 6. Testing Fault Resolution & Equipment Re-synchronization ---")
    res_res = put(f"{BASE}/faults/{fl_res['id']}", {
        "status": "Resolved",
        "resolution": "Replaced faulty test GPU with spare card; burn-in test passed.",
        "repairHours": 1.5,
        "resolvedBy": "Test Tech"
    })
    print("Resolved fault:", res_res["id"], res_res["status"])
    eq_after_res = get(f"{BASE}/equipment/PC-TEST-99")
    print("Equipment status after resolution:", eq_after_res["status"], eq_after_res["riskLevel"])
    assert eq_after_res["status"] == "healthy"
    print("PASS: Equipment reverted to 'healthy' after all faults resolved.")

    print("\n--- 7. Testing Safe Deletion After Fault Resolution ---")
    del_res = delete(f"{BASE}/equipment/PC-TEST-99")
    print("Safe delete completed:", del_res)
    print("PASS: Equipment deleted successfully after clearing faults.")

    print("\n--- 8. Testing Maintenance Scheduling & Completion ---")
    pm_res = post(f"{BASE}/maintenance", {
        "equipId": "PC-01",
        "scheduledDate": "2026-11-15",
        "taskType": "Preventive Maintenance",
        "assignedTo": "M. Verma",
        "notes": "Semi-annual hardware tune-up test"
    })
    print("Scheduled PM:", pm_res["id"])
    assert pm_res["equipId"] == "PC-01"

    pm_done = put(f"{BASE}/maintenance/{pm_res['id']}", {
        "status": "Completed",
        "completedDate": "2026-10-17",
        "completionNotes": "Tune-up complete in test script.",
        "nextScheduledDate": "2027-01-17"
    })
    print("Completed PM:", pm_done["id"], pm_done["status"])
    assert pm_done["status"] == "Completed"
    print("PASS: Maintenance scheduled and completed successfully.")


# ─── STEP 5 TESTS ─────────────────────────────────────────────────────────────

def run_step5_tests():
    print("\n" + "=" * 60)
    print("STEP 5 TESTS — MongoDB Schema, Indexes, Aggregation, explain()")
    print("=" * 60)

    # ── Test 1: Schema Validation Status ────────────────────────────────────
    print("\n--- Step5-1. JSON Schema Validation Status ---")
    val_info = get(f"{BASE}/database/validation")
    print("Validation info:", json.dumps(val_info, indent=2))

    # Every collection should have a validator applied
    for col in ("equipment", "faults", "maintenance"):
        assert col in val_info, f"FAIL: '{col}' missing from validation response"
        col_info = val_info[col]
        assert col_info.get("hasValidator") is True, \
            f"FAIL: '{col}' has no JSON Schema validator applied!"
        assert col_info.get("validationLevel") == "moderate", \
            f"FAIL: Expected 'moderate' validation level on '{col}'"
        print(f"  PASS: '{col}' - hasValidator={col_info['hasValidator']}, "
              f"level={col_info['validationLevel']}, action={col_info['validationAction']}")

    print("PASS: All three collections have $jsonSchema validators active.")

    # ── Test 2: Indexes ──────────────────────────────────────────────────────
    print("\n--- Step5-2. Index Definitions ---")
    idx_info = get(f"{BASE}/database/indexes")

    for col in ("equipment", "faults", "maintenance"):
        assert col in idx_info, f"FAIL: '{col}' missing from index response"
        idx_names = [i["name"] for i in idx_info[col]]
        print(f"  {col} indexes: {idx_names}")

    # Verify key compound and text indexes exist
    fault_names = [i["name"] for i in idx_info["faults"]]
    assert "idx_faults_description_text" in fault_names, \
        "FAIL: Text index not found on faults collection!"
    assert "idx_faults_equip_status" in fault_names, \
        "FAIL: Compound index idx_faults_equip_status not found!"

    eq_names = [i["name"] for i in idx_info["equipment"]]
    assert "idx_equipment_lab_status" in eq_names, \
        "FAIL: Compound index idx_equipment_lab_status not found!"
    assert "idx_equipment_id_unique" in eq_names, \
        "FAIL: Unique index idx_equipment_id_unique not found!"

    print("PASS: All required indexes (unique, compound, text) are present.")

    # ── Test 3: Full-Text Search ──────────────────────────────────────────────
    print("\n--- Step5-3. Full-Text Search ($text / $search) ---")
    search_res = get(f"{BASE}/faults?q=temperature")
    print(f"  Text search 'temperature': {search_res.get('count', 0)} result(s)")
    assert search_res.get("count", 0) >= 1, \
        "FAIL: Expected at least 1 result for 'temperature' keyword search"
    assert all("description" in r for r in search_res.get("results", [])), \
        "FAIL: Search results missing 'description' field"
    print("PASS: Full-text search returned results for 'temperature'.")

    # Also test a search with no results
    no_res = get(f"{BASE}/faults?q=zzznomatchzzzxyz")
    assert no_res.get("count", 0) == 0, \
        "FAIL: Expected 0 results for nonsense query"
    print("PASS: Text search correctly returned 0 results for nonsense query.")

    # ── Test 4: Equipment by Lab Aggregation ──────────────────────────────────
    print("\n--- Step5-4. Aggregation: Equipment by Lab ---")
    lab_res = get(f"{BASE}/analytics/equipment-by-lab")
    print(f"  Lab count returned: {len(lab_res)}")
    assert len(lab_res) >= 1, "FAIL: Expected at least 1 lab in aggregation result"

    for lab in lab_res:
        assert "labId" in lab,   "FAIL: Missing 'labId' in aggregation result"
        assert "total" in lab,   "FAIL: Missing 'total' in aggregation result"
        assert "healthy" in lab, "FAIL: Missing 'healthy' in aggregation result"
        # total should equal sum of all status counts
        total_check = lab["healthy"] + lab.get("warning", 0) + lab.get("critical", 0)
        assert lab["total"] == total_check, \
            f"FAIL: total={lab['total']} != healthy+warning+critical={total_check}"
    print("PASS: Equipment-by-lab aggregation returned valid data with correct totals.")

    # ── Test 5: Fault Analysis Aggregation ────────────────────────────────────
    print("\n--- Step5-5. Aggregation: Fault Analysis ---")
    fault_res = get(f"{BASE}/analytics/fault-analysis")
    assert "bySeverity" in fault_res, "FAIL: Missing 'bySeverity' in fault analysis"
    assert "byCategory" in fault_res, "FAIL: Missing 'byCategory' in fault analysis"
    assert "totals"     in fault_res, "FAIL: Missing 'totals' in fault analysis"

    for entry in fault_res["bySeverity"]:
        assert "severity" in entry, "FAIL: Missing 'severity' field"
        assert "total"    in entry, "FAIL: Missing 'total' field"
        # open + inProgress + resolved should equal total
        accounted = entry.get("open", 0) + entry.get("inProgress", 0) + entry.get("resolved", 0)
        assert entry["total"] == accounted, \
            f"FAIL: Severity total mismatch for {entry['severity']}: {entry['total']} vs {accounted}"
    print("PASS: Fault analysis aggregation returned valid severity breakdown.")

    # ── Test 6: Maintenance Summary Aggregation ───────────────────────────────
    print("\n--- Step5-6. Aggregation: Maintenance Summary ---")
    maint_res = get(f"{BASE}/analytics/maintenance-summary")
    assert "byStatus" in maint_res, "FAIL: Missing 'byStatus' in maintenance summary"
    assert "total"    in maint_res, "FAIL: Missing 'total' in maintenance summary"
    total_from_groups = sum(g["count"] for g in maint_res["byStatus"])
    assert maint_res["total"] == total_from_groups, \
        f"FAIL: Maintenance total mismatch: {maint_res['total']} vs sum={total_from_groups}"
    print("PASS: Maintenance summary aggregation totals are consistent.")

    # ── Test 7: Overview Summary Aggregation ──────────────────────────────────
    print("\n--- Step5-7. Aggregation: Overview Summary ---")
    ov_res = get(f"{BASE}/analytics/overview-summary")
    assert "equipment"   in ov_res, "FAIL: Missing 'equipment' in overview"
    assert "faults"      in ov_res, "FAIL: Missing 'faults' in overview"
    assert "maintenance" in ov_res, "FAIL: Missing 'maintenance' in overview"
    assert ov_res["equipment"].get("total", 0) > 0, \
        "FAIL: Overview shows 0 equipment — database may be empty"
    eq = ov_res["equipment"]
    total_check = eq.get("healthy", 0) + eq.get("warning", 0) + eq.get("critical", 0)
    assert eq["total"] == total_check, \
        f"FAIL: Equipment total mismatch: {eq['total']} vs {total_check}"
    print("PASS: Overview summary aggregation is consistent and non-empty.")

    # ── Test 8: Query Performance (explain) ───────────────────────────────────
    print("\n--- Step5-8. Query Execution Analysis — explain('executionStats') ---")
    perf_res = get(f"{BASE}/database/query-performance")
    assert "queries" in perf_res, "FAIL: Missing 'queries' key in performance response"
    assert len(perf_res["queries"]) >= 2, "FAIL: Expected at least 2 explain() queries"

    for q in perf_res["queries"]:
        assert "name"    in q, "FAIL: Query result missing 'name'"
        assert "stats"   in q, "FAIL: Query result missing 'stats'"
        stats = q["stats"]
        assert "scanType"  in stats, "FAIL: Stats missing 'scanType'"
        assert "indexUsed" in stats, "FAIL: Stats missing 'indexUsed'"
        assert stats["indexUsed"] is True, \
            f"FAIL: Query '{q['name']}' used {stats['scanType']} instead of IXSCAN/TEXT. " \
            f"Index may not be created correctly."
        print(f"  Query: '{q['name']}' -> scanType={stats['scanType']}, "
              f"indexUsed={stats['indexUsed']}, time={stats['executionTimeMillis']}ms")

    print("PASS: All explain() queries are using indexes (IXSCAN/TEXT) as expected.")


# ─── Step 6 Tests: Machine Learning Engine & Predictions ─────────────────────

def run_step6_tests():
    print("\n" + "=" * 60)
    print("STEP 6 TESTS - Machine Learning Prediction Engine & Inference")
    print("=" * 60)

    # ── Test 1: Model Status ──────────────────────────────────────────────────
    print("\n--- Step6-1. ML Model Status & Availability ---")
    status = get(f"{BASE}/ml/status")
    assert status.get("status") == "ready", f"FAIL: Expected status 'ready', got {status.get('status')}"
    assert status.get("modelsAvailable") is True, "FAIL: modelsAvailable is not True"
    assert status.get("modelsLoadable") is True, "FAIL: modelsLoadable is not True"
    assert status["classifier"]["name"] == "RandomForestClassifier", "FAIL: Unexpected classifier name"
    assert status["regressor"]["name"] == "RandomForestRegressor", "FAIL: Unexpected regressor name"
    print(f"  Status: {status['status']}, Models Available: {status['modelsAvailable']}")
    print(f"  Classifier: {status['classifier']['name']} v{status['classifier']['version']}")
    print(f"  Regressor:  {status['regressor']['name']} v{status['regressor']['version']}")
    print("PASS: ML models are trained, verified, and loadable.")

    # ── Test 2: Evaluation Metrics Report ─────────────────────────────────────
    print("\n--- Step6-2. Evaluation Metrics on Held-Out Test Set ---")
    metrics = get(f"{BASE}/ml/metrics")
    assert "classification" in metrics, "FAIL: Missing classification metrics"
    assert "regression" in metrics, "FAIL: Missing regression metrics"

    clf = metrics["classification"]
    assert 0.70 <= clf["accuracy"] <= 1.0, f"FAIL: Accuracy out of expected range: {clf['accuracy']}"
    assert 0.60 <= clf["f1_score"] <= 1.0, f"FAIL: F1 out of expected range: {clf['f1_score']}"
    assert "confusion_matrix" in clf, "FAIL: Missing confusion matrix"
    cm = clf["confusion_matrix"]
    assert "true_positives" in cm and "true_negatives" in cm, "FAIL: Invalid confusion matrix structure"

    reg = metrics["regression"]
    assert reg["r2_score"] >= 0.50, f"FAIL: Regressor R2 score unexpectedly low: {reg['r2_score']}"
    assert reg["mae_hours"] <= 3.5, f"FAIL: Regressor MAE unexpectedly high: {reg['mae_hours']}h"

    print(f"  Classification: Accuracy={clf['accuracy']*100:.2f}%, Precision={clf['precision']*100:.2f}%, "
          f"Recall={clf['recall']*100:.2f}%, F1={clf['f1_score']:.4f}")
    print(f"  Confusion Matrix: TN={cm['true_negatives']}, FP={cm['false_positives']}, "
          f"FN={cm['false_negatives']}, TP={cm['true_positives']}")
    print(f"  Regression: R2={reg['r2_score']:.4f}, MAE={reg['mae_hours']} hours")
    print("PASS: Both models satisfy required evaluation metrics on held-out test data.")

    # ── Test 3: Batch Prediction on Real MongoDB Records ──────────────────────
    print("\n--- Step6-3. Batch Prediction (POST /api/ml/predict-all) ---")
    batch = post(f"{BASE}/ml/predict-all")
    assert "predictions" in batch, "FAIL: Missing predictions array in batch response"
    assert "summary" in batch, "FAIL: Missing summary in batch response"
    assert len(batch["predictions"]) >= 20, f"FAIL: Expected >= 20 predictions, got {len(batch['predictions'])}"

    summary = batch["summary"]
    print(f"  Total equipment predicted: {summary['totalEquipment']}")
    print(f"  Elevated risk: {summary['elevatedRisk']}, Moderate risk: {summary['moderateRisk']}, Low risk: {summary['lowRisk']}")
    print(f"  Equipment with active faults: {summary['withActiveFaults']}")
    print("PASS: Batch prediction executed successfully across MongoDB equipment.")

    # ── Test 4: Fault-Conditioned Repair Duration Logic ────────────────────────
    print("\n--- Step6-4. Fault-Conditioned Repair Duration Logic ---")
    preds = batch["predictions"]
    checked_without_fault = False
    checked_with_fault = False

    for p in preds:
        assert 0.0 <= p["repeatFailureProbability"] <= 100.0, "FAIL: Invalid probability range"
        assert p["riskLevel"] in ("Elevated Risk", "Moderate Risk", "Low Risk"), "FAIL: Invalid risk level"
        assert "featuresUsed" in p, "FAIL: Missing featuresUsed in prediction document"

        if not p["hasActiveFault"]:
            # Equipment with NO active fault must NOT have an invented repair duration
            assert p["repairDurationHours"] is None, \
                f"FAIL: Equipment {p['equipmentId']} has no active fault but received repair duration {p['repairDurationHours']}"
            assert "Not applicable" in p["repairDurationDisplay"], \
                f"FAIL: Expected 'Not applicable' display, got {p['repairDurationDisplay']}"
            checked_without_fault = True
        else:
            # Equipment WITH an active fault must have a positive estimated repair duration
            assert p["repairDurationHours"] is not None and p["repairDurationHours"] > 0, \
                f"FAIL: Equipment {p['equipmentId']} with active fault missing positive repair duration"
            checked_with_fault = True

    assert checked_without_fault, "FAIL: No equipment without active faults found in test verification"
    assert checked_with_fault, "FAIL: No equipment with active faults found in test verification"
    print("PASS: Repair duration is strictly conditioned on active faults (null when no active fault).")

    # ── Test 5: Query Filters & Search ────────────────────────────────────────
    print("\n--- Step6-5. Retrieve Predictions & Filtering ---")
    elevated_res = get(f"{BASE}/ml/predictions?risk=elevated")
    assert "predictions" in elevated_res, "FAIL: Missing predictions in filter response"
    for ep in elevated_res["predictions"]:
        assert ep["riskBadge"] == "elevated", f"FAIL: Expected elevated risk badge, got {ep['riskBadge']}"

    lab_res = get(f"{BASE}/ml/predictions?labId=LAB-A")
    for lp in lab_res["predictions"]:
        assert lp["labId"] == "LAB-A", f"FAIL: Expected LAB-A, got {lp['labId']}"

    print(f"  Filter by risk=elevated: {len(elevated_res['predictions'])} items")
    print(f"  Filter by labId=LAB-A:   {len(lab_res['predictions'])} items")
    print("PASS: Prediction filtering by risk tier and laboratory ID operates correctly.")

    # ── Test 6: Single Equipment Prediction & 404 Validation ──────────────────
    print("\n--- Step6-6. Single Prediction & 404 Error Handling ---")
    first_eq_id = preds[0]["equipmentId"]
    single_res = post(f"{BASE}/ml/predict/{first_eq_id}")
    assert single_res["equipmentId"] == first_eq_id, "FAIL: Equipment ID mismatch in single predict"

    # Test unknown ID returns 404
    r_404 = requests.post(f"{BASE}/ml/predict/NON_EXISTENT_999")
    assert r_404.status_code == 404, f"FAIL: Expected 404 for unknown ID, got {r_404.status_code}"
    print(f"  Single predict for '{first_eq_id}' succeeded -> risk={single_res['riskLevel']}")
    print(f"  Unknown ID returns HTTP 404 as expected.")
    print("PASS: Single prediction and 404 error handling verified.")

    # ── Test 7: Idempotence & No Duplicate Stored Predictions ──────────────────
    print("\n--- Step6-7. Idempotence & Deduplication ---")
    post(f"{BASE}/ml/predict-all")
    all_stored = get(f"{BASE}/ml/predictions")
    total_stored = all_stored["summary"]["total"]
    unique_ids = set(p["equipmentId"] for p in all_stored["predictions"])
    assert len(unique_ids) == len(all_stored["predictions"]), "FAIL: Duplicate equipment records found in predictions!"
    print(f"  Total stored records: {total_stored}, Unique IDs: {len(unique_ids)}")
    print("PASS: Predictions collection maintains strict 1-to-1 latest state per equipment.")


# ─── Main ─────────────────────────────────────────────────────────────────────

def run_tests():
    run_core_tests()
    run_step5_tests()
    run_step6_tests()
    print("\n" + "=" * 60)
    print("[ALL TESTS PASSED SUCCESSFULLY!]")
    print("Steps covered: 1, 2, 3, 4, 5, 6")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()

