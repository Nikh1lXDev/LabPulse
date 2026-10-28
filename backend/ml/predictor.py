"""
LabPulse — ML Prediction Engine (Step 6)
=========================================
Extracts live features from real MongoDB collections (`equipment`, `faults`, `maintenance`),
runs the fitted scikit-learn pipelines, and formats standardized prediction documents.

Core Functionality:
  - Feature extraction from live MongoDB records with defensive parsing & fallback defaults.
  - Classification: Predicts repeat failure probability (%) and risk tier (Low / Moderate / Elevated).
  - Regression: Predicts estimated repair duration (hours) ONLY when an active fault exists.
    If no active fault is logged, repair duration is explicitly None ("Not applicable — no active fault").
  - Upserts predictions to MongoDB `predictions` collection (prevents duplicates).
"""

import os
import sys
from datetime import datetime
import numpy as np
import pandas as pd
import joblib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import db

MODELS_DIR = os.path.join(BASE_DIR, "models")
CLASSIFIER_PATH = os.path.join(MODELS_DIR, "classifier_pipeline.joblib")
REGRESSOR_PATH = os.path.join(MODELS_DIR, "regressor_pipeline.joblib")
METADATA_PATH = os.path.join(MODELS_DIR, "model_metadata.json")

# Severity priority ranking for selecting the most severe active fault
SEVERITY_RANK = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}

# Singleton cached pipelines in memory
_cached_classifier = None
_cached_regressor = None


def load_models(force_reload=False):
    """
    Load trained pipelines from disk.
    Caches pipelines in module memory to avoid reloading on every single API call.
    """
    global _cached_classifier, _cached_regressor

    if force_reload or _cached_classifier is None or _cached_regressor is None:
        if not os.path.exists(CLASSIFIER_PATH) or not os.path.exists(REGRESSOR_PATH):
            raise FileNotFoundError(
                f"Trained model pipelines not found. Run 'python ml/train_models.py' "
                f"from the backend directory to train and generate models first."
            )
        _cached_classifier = joblib.load(CLASSIFIER_PATH)
        _cached_regressor = joblib.load(REGRESSOR_PATH)

    return _cached_classifier, _cached_regressor


def check_models_status():
    """
    Check availability and metadata of both models on disk.
    Returns status dict for the /api/ml/status endpoint.
    """
    classifier_exists = os.path.exists(CLASSIFIER_PATH)
    regressor_exists = os.path.exists(REGRESSOR_PATH)
    all_ready = classifier_exists and regressor_exists

    metadata = {}
    if os.path.exists(METADATA_PATH):
        try:
            import json
            with open(METADATA_PATH, "r", encoding="utf-8") as f:
                metadata = json.load(f)
        except Exception:
            metadata = {}

    loadable = False
    load_error = None
    if all_ready:
        try:
            load_models()
            loadable = True
        except Exception as e:
            load_error = str(e)

    return {
        "status": "ready" if (all_ready and loadable) else "not_ready",
        "modelsAvailable": all_ready,
        "modelsLoadable": loadable,
        "loadError": load_error,
        "classifier": {
            "name": "RandomForestClassifier",
            "version": metadata.get("models", {}).get("classifier", {}).get("version", "1.0.0"),
            "path": CLASSIFIER_PATH,
            "exists": classifier_exists,
            "accuracy": metadata.get("models", {}).get("classifier", {}).get("accuracy"),
            "f1_score": metadata.get("models", {}).get("classifier", {}).get("f1_score"),
        },
        "regressor": {
            "name": "RandomForestRegressor",
            "version": metadata.get("models", {}).get("regressor", {}).get("version", "1.0.0"),
            "path": REGRESSOR_PATH,
            "exists": regressor_exists,
            "r2_score": metadata.get("models", {}).get("regressor", {}).get("r2_score"),
            "mae_hours": metadata.get("models", {}).get("regressor", {}).get("mae_hours"),
        },
        "dataset": metadata.get("dataset", {
            "source": "backend/data/labpulse_ml_training.csv",
            "type": "Synthetic Demonstration Data (Seed 42)",
            "total_samples": 1200,
        }),
        "trainedAt": metadata.get("trained_at"),
        "featuresCount": 12,
    }


def extract_equipment_features(eq_doc):
    """
    Extract a normalized 12-feature vector for an equipment document from MongoDB.
    Cross-references `faults` and `maintenance` collections in real-time.
    """
    eq_id = eq_doc.get("id")
    eq_type = eq_doc.get("type", "Desktop PC")
    lab_id = eq_doc.get("labId", "LAB-A")

    # 1. Telemetry parsing with robust null & type safety
    def _to_float(v, default):
        if v is None:
            return default
        try:
            if isinstance(v, str):
                v = v.replace("%", "").strip()
            return float(v)
        except (ValueError, TypeError):
            return default

    cpu_val = _to_float(eq_doc.get("cpu"), 45.0)
    ram_val = _to_float(eq_doc.get("ram"), 50.0)
    temp_val = _to_float(eq_doc.get("temp"), 50.0)
    uptime_val = _to_float(eq_doc.get("uptime"), 98.5)

    # 2. Days since last maintenance calculation
    # Checks equipment.lastMaintenance or maintenance_col
    last_maint_str = eq_doc.get("lastMaintenance")
    days_since_maint = 45  # fallback reasonable default
    if last_maint_str:
        try:
            # Handle YYYY-MM-DD or YYYY-MM-DD HH:MM
            date_part = last_maint_str.split()[0]
            maint_dt = datetime.strptime(date_part, "%Y-%m-%d")
            # Calculate difference from current date (or reference 2026-10-17)
            now_dt = datetime.now()
            diff_days = max(1, (now_dt - maint_dt).days)
            # If dates are in the future or same day, cap at positive reasonable count
            days_since_maint = min(365, max(1, diff_days))
        except Exception:
            days_since_maint = 45

    # 3. Query historical and active faults for this equipment
    all_faults = list(db.faults_col.find({"equipId": eq_id}))
    previous_fault_count = len(all_faults)

    # Active / unresolved faults
    active_faults = [f for f in all_faults if f.get("status") != "Resolved"]
    unresolved_fault_count = len(active_faults)

    # Determine dominant active fault category & severity
    if active_faults:
        # Pick the active fault with highest severity
        active_faults_sorted = sorted(
            active_faults,
            key=lambda x: SEVERITY_RANK.get(x.get("severity", "Low"), 0),
            reverse=True
        )
        dominant_fault = active_faults_sorted[0]
        fault_category = dominant_fault.get("category", "Hardware")
        fault_severity = dominant_fault.get("severity", "Medium")
        active_fault_info = {
            "id": dominant_fault.get("id"),
            "category": fault_category,
            "severity": fault_severity,
            "description": dominant_fault.get("description", ""),
            "reportedDate": dominant_fault.get("reportedDate"),
            "status": dominant_fault.get("status"),
        }
    else:
        fault_category = "None"
        fault_severity = "None"
        active_fault_info = None

    # Average historical repair hours for this equipment
    resolved_hours = [
        f.get("repairHours") for f in all_faults
        if f.get("status") == "Resolved" and f.get("repairHours") is not None
    ]
    if resolved_hours:
        avg_hist_repair = float(np.mean(resolved_hours))
    else:
        avg_hist_repair = np.nan  # Imputer handles NaN with training median

    feature_dict = {
        # Numerical
        "cpu_usage": round(cpu_val, 1),
        "ram_usage": round(ram_val, 1),
        "temperature": round(temp_val, 1),
        "uptime": round(uptime_val, 1),
        "previous_fault_count": int(previous_fault_count),
        "unresolved_fault_count": int(unresolved_fault_count),
        "days_since_last_maintenance": int(days_since_maint),
        "avg_historical_repair_hours": round(avg_hist_repair, 2) if not np.isnan(avg_hist_repair) else None,
        # Categorical
        "equipment_type": eq_type,
        "lab_id": lab_id,
        "fault_category": fault_category,
        "fault_severity": fault_severity,
    }

    return feature_dict, active_fault_info


def generate_equipment_prediction(eq_doc, persist=True):
    """
    Generate ML prediction for a single MongoDB equipment document.
    Returns the standardized prediction dictionary and optionally upserts to MongoDB.
    """
    clf_pipeline, reg_pipeline = load_models()
    eq_id = eq_doc.get("id")

    # Extract real features
    features, active_fault = extract_equipment_features(eq_doc)

    # Convert to DataFrame row for scikit-learn pipeline
    df_row = pd.DataFrame([{
        "cpu_usage": features["cpu_usage"],
        "ram_usage": features["ram_usage"],
        "temperature": features["temperature"],
        "uptime": features["uptime"],
        "previous_fault_count": features["previous_fault_count"],
        "unresolved_fault_count": features["unresolved_fault_count"],
        "days_since_last_maintenance": features["days_since_last_maintenance"],
        "avg_historical_repair_hours": features["avg_historical_repair_hours"] if features["avg_historical_repair_hours"] is not None else np.nan,
        "equipment_type": features["equipment_type"],
        "lab_id": features["lab_id"],
        "fault_category": features["fault_category"],
        "fault_severity": features["fault_severity"],
    }])

    # 1. Classification: Repeat failure within 7 days
    pred_class = int(clf_pipeline.predict(df_row)[0])
    pred_prob_raw = float(clf_pipeline.predict_proba(df_row)[0, 1])
    prob_pct = round(pred_prob_raw * 100, 1)

    # Assign risk tier based on documented thresholds
    if prob_pct >= 65.0:
        risk_level = "Elevated Risk"
        risk_badge = "elevated"
    elif prob_pct >= 35.0:
        risk_level = "Moderate Risk"
        risk_badge = "moderate"
    else:
        risk_level = "Low Risk"
        risk_badge = "low"

    # 2. Regression: Repair duration in hours (ONLY if active fault exists!)
    if active_fault is not None and features["fault_severity"] != "None":
        pred_hours_raw = float(reg_pipeline.predict(df_row)[0])
        pred_hours = round(max(0.5, pred_hours_raw), 1)
        repair_duration_display = f"{pred_hours} hrs"
        repair_duration_note = (
            f"Estimated repair duration based on active fault {active_fault['id']} "
            f"({active_fault['severity']} {active_fault['category']})."
        )
    else:
        pred_hours = None
        repair_duration_display = "Not applicable — no active fault"
        repair_duration_note = (
            "Equipment has no active unresolved fault. Repair duration estimation "
            "is only calculated when an active incident requiring repair is present."
        )

    now_iso = datetime.now().isoformat()

    prediction_doc = {
        "equipmentId": eq_id,
        "equipmentName": f"{eq_doc.get('type')} ({eq_id})",
        "equipmentType": eq_doc.get("type"),
        "labId": eq_doc.get("labId"),
        "labName": eq_doc.get("labName"),
        "operationalStatus": eq_doc.get("status"),
        # Classification results
        "predictedClass": pred_class,
        "repeatFailureProbability": prob_pct,
        "riskLevel": risk_level,
        "riskBadge": risk_badge,
        # Regression results
        "hasActiveFault": active_fault is not None,
        "activeFault": active_fault,
        "repairDurationHours": pred_hours,
        "repairDurationDisplay": repair_duration_display,
        "repairDurationNote": repair_duration_note,
        # Input features & telemetry snapshot
        "featuresUsed": features,
        # Metadata & disclaimers
        "predictedAt": now_iso,
        "modelVersion": "1.0.0",
        "modelName": "RandomForestClassifier + RandomForestRegressor",
        "trainingSource": "Synthetic demonstration dataset (1,200 scenarios, Seed 42)",
        "disclaimer": (
            "Prediction generated by statistical machine learning models trained on synthetic "
            "college laboratory equipment data. Risk percentage represents estimated relative likelihood, "
            "not a guaranteed failure event."
        )
    }

    # Upsert to MongoDB predictions collection
    if persist:
        db.predictions_col.update_one(
            {"equipmentId": eq_id},
            {"$set": prediction_doc},
            upsert=True
        )

    return prediction_doc


def predict_all_equipment():
    """
    Run prediction engine for all equipment currently stored in MongoDB.
    Returns list of updated predictions and summary counts.
    """
    all_eq = list(db.equipment_col.find({}, {"_id": 0}))
    if not all_eq:
        return {"predictions": [], "summary": {"total": 0}}

    predictions = []
    elevated_count = 0
    moderate_count = 0
    low_count = 0
    with_faults_count = 0

    for eq in all_eq:
        p = generate_equipment_prediction(eq, persist=True)
        predictions.append(p)
        if p["riskBadge"] == "elevated":
            elevated_count += 1
        elif p["riskBadge"] == "moderate":
            moderate_count += 1
        else:
            low_count += 1

        if p["hasActiveFault"]:
            with_faults_count += 1

    summary = {
        "totalEquipment": len(predictions),
        "elevatedRisk": elevated_count,
        "moderateRisk": moderate_count,
        "lowRisk": low_count,
        "withActiveFaults": with_faults_count,
        "lastPredictedAt": datetime.now().isoformat(),
    }

    return {
        "predictions": predictions,
        "summary": summary
    }


def get_stored_predictions(lab_id=None, risk=None, search=None):
    """
    Retrieve stored predictions from MongoDB with optional filtering.
    """
    query = {}
    if lab_id and lab_id != "all":
        query["labId"] = lab_id
    if risk and risk != "all":
        query["riskBadge"] = risk.lower()
    if search:
        s = search.strip()
        query["$or"] = [
            {"equipmentId": {"$regex": s, "$options": "i"}},
            {"equipmentType": {"$regex": s, "$options": "i"}},
            {"labId": {"$regex": s, "$options": "i"}},
        ]

    docs = list(db.predictions_col.find(query, {"_id": 0}).sort("repeatFailureProbability", -1))
    return docs
