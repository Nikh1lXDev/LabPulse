"""
LabPulse — Model Training and Evaluation Pipeline (Step 6)
===========================================================
Trains two separate scikit-learn pipelines on the synthetic demonstration dataset:

  1. RandomForestClassifier: Predicts `repeat_failure_within_7_days` (0 or 1)
  2. RandomForestRegressor:  Predicts `repair_duration_hours` (for active faults)

Preprocessing & Rigor:
  - Numerical inputs: SimpleImputer(strategy='median')
  - Categorical inputs: SimpleImputer(strategy='most_frequent') + OneHotEncoder(handle_unknown='ignore')
  - Strict 80/20 train/test split with stratified sampling for classification.
  - Preprocessing is fitted ONLY on training data to prevent data leakage.
  - Held-out test set metrics calculated and saved to JSON report and MongoDB.
"""

import os
import json
from datetime import datetime
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, r2_score, mean_absolute_error
)

import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
DATA_PATH = os.path.join(BASE_DIR, "data", "labpulse_ml_training.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")

CLASSIFIER_PATH = os.path.join(MODELS_DIR, "classifier_pipeline.joblib")
REGRESSOR_PATH = os.path.join(MODELS_DIR, "regressor_pipeline.joblib")
METADATA_PATH = os.path.join(MODELS_DIR, "model_metadata.json")
EVAL_REPORT_PATH = os.path.join(REPORTS_DIR, "ml_evaluation_results.json")

RANDOM_SEED = 42

NUMERICAL_FEATURES = [
    "cpu_usage",
    "ram_usage",
    "temperature",
    "uptime",
    "previous_fault_count",
    "unresolved_fault_count",
    "days_since_last_maintenance",
    "avg_historical_repair_hours",
]

CATEGORICAL_FEATURES = [
    "equipment_type",
    "lab_id",
    "fault_category",
    "fault_severity",
]

ALL_FEATURES = NUMERICAL_FEATURES + CATEGORICAL_FEATURES


def build_preprocessor():
    """Build reusable scikit-learn preprocessing ColumnTransformer."""
    num_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
    ])

    cat_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", num_transformer, NUMERICAL_FEATURES),
            ("cat", cat_transformer, CATEGORICAL_FEATURES),
        ]
    )
    return preprocessor


def train_and_evaluate():
    """
    Train both models, evaluate on held-out test data, and save artifacts.
    """
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)

    if not os.path.exists(DATA_PATH):
        from ml.generate_training_data import generate_synthetic_data, save_dataset_and_metadata
        print("[*] Training data not found. Generating synthetic dataset...")
        df = generate_synthetic_data()
        save_dataset_and_metadata(df)
    else:
        df = pd.read_csv(DATA_PATH)

    print(f"[*] Loaded dataset: {len(df)} records from {DATA_PATH}")

    # ──────────────────────────────────────────────────────────────────────────
    # 1. Train Classification Model (repeat_failure_within_7_days)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- Training RandomForestClassifier (Repeat Failure in 7 Days) ---")
    X_clf = df[ALL_FEATURES]
    y_clf = df["repeat_failure_within_7_days"]

    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
        X_clf, y_clf,
        test_size=0.20,
        random_state=RANDOM_SEED,
        stratify=y_clf
    )

    clf_pipeline = Pipeline([
        ("preprocessor", build_preprocessor()),
        ("classifier", RandomForestClassifier(
            n_estimators=100,
            max_depth=8,
            min_samples_leaf=3,
            random_state=RANDOM_SEED,
            n_jobs=1
        ))
    ])

    # Fit on training data only
    clf_pipeline.fit(X_train_c, y_train_c)

    # Evaluate on held-out test set
    y_pred_c = clf_pipeline.predict(X_test_c)
    y_prob_c = clf_pipeline.predict_proba(X_test_c)[:, 1]

    acc = float(accuracy_score(y_test_c, y_pred_c))
    prec = float(precision_score(y_test_c, y_pred_c, zero_division=0))
    rec = float(recall_score(y_test_c, y_pred_c, zero_division=0))
    f1 = float(f1_score(y_test_c, y_pred_c, zero_division=0))
    cm = confusion_matrix(y_test_c, y_pred_c).tolist()

    tn, fp, fn, tp = int(cm[0][0]), int(cm[0][1]), int(cm[1][0]), int(cm[1][1])
    neg_support = int((y_test_c == 0).sum())
    pos_support = int((y_test_c == 1).sum())

    clf_metrics = {
        "model_name": "RandomForestClassifier",
        "algorithm": "Random Forest (100 estimators, max_depth=8)",
        "target": "repeat_failure_within_7_days",
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "confusion_matrix": {
            "matrix": cm,
            "true_negatives": tn,
            "false_positives": fp,
            "false_negatives": fn,
            "true_positives": tp,
        },
        "support": {
            "negative_class_0": neg_support,
            "positive_class_1": pos_support,
            "total_test": len(y_test_c),
        },
        "training_records": len(X_train_c),
        "test_records": len(X_test_c),
        "probability_thresholds": {
            "low_risk": "< 35%",
            "moderate_risk": "35% - 65%",
            "elevated_risk": "> 65%"
        }
    }

    print(f"  Accuracy:  {clf_metrics['accuracy'] * 100:.2f}%")
    print(f"  Precision: {clf_metrics['precision'] * 100:.2f}%")
    print(f"  Recall:    {clf_metrics['recall'] * 100:.2f}%")
    print(f"  F1 Score:  {clf_metrics['f1_score']:.4f}")
    print(f"  Confusion Matrix: TN={tn}, FP={fp}, FN={fn}, TP={tp}")

    # ──────────────────────────────────────────────────────────────────────────
    # 2. Train Regression Model (repair_duration_hours)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- Training RandomForestRegressor (Repair Duration in Hours) ---")
    reg_mask = df["repair_duration_hours"].notna()
    df_reg = df[reg_mask].copy()

    X_reg = df_reg[ALL_FEATURES]
    y_reg = df_reg["repair_duration_hours"]

    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(
        X_reg, y_reg,
        test_size=0.20,
        random_state=RANDOM_SEED
    )

    reg_pipeline = Pipeline([
        ("preprocessor", build_preprocessor()),
        ("regressor", RandomForestRegressor(
            n_estimators=100,
            max_depth=8,
            min_samples_leaf=2,
            random_state=RANDOM_SEED,
            n_jobs=1
        ))
    ])

    reg_pipeline.fit(X_train_r, y_train_r)

    y_pred_r = reg_pipeline.predict(X_test_r)

    r2 = float(r2_score(y_test_r, y_pred_r))
    mae = float(mean_absolute_error(y_test_r, y_pred_r))

    reg_metrics = {
        "model_name": "RandomForestRegressor",
        "algorithm": "Random Forest Regressor (100 estimators, max_depth=8)",
        "target": "repair_duration_hours",
        "r2_score": round(r2, 4),
        "mae_hours": round(mae, 2),
        "training_records": len(X_train_r),
        "test_records": len(X_test_r),
        "active_fault_requirement": (
            "Repair duration is ONLY estimated when equipment has an active fault "
            "with a known severity and category. Equipment without active faults "
            "receives null ('Not applicable — no active fault')."
        )
    }

    print(f"  R2 Score:  {reg_metrics['r2_score']:.4f}")
    print(f"  MAE:       {reg_metrics['mae_hours']} hours")

    # ──────────────────────────────────────────────────────────────────────────
    # 3. Save Artifacts with joblib and JSON
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[*] Saving trained model pipelines...")
    joblib.dump(clf_pipeline, CLASSIFIER_PATH)
    joblib.dump(reg_pipeline, REGRESSOR_PATH)
    print(f"[OK] Saved classifier: {CLASSIFIER_PATH}")
    print(f"[OK] Saved regressor:  {REGRESSOR_PATH}")

    now_iso = datetime.now().isoformat()

    full_report = {
        "report_title": "LabPulse Step 6 — Machine Learning Model Evaluation Report",
        "evaluation_timestamp": now_iso,
        "random_seed": RANDOM_SEED,
        "dataset_source": "backend/data/labpulse_ml_training.csv (Synthetic demonstration dataset)",
        "features": {
            "numerical": NUMERICAL_FEATURES,
            "categorical": CATEGORICAL_FEATURES,
            "total_count": len(ALL_FEATURES),
        },
        "classification": clf_metrics,
        "regression": reg_metrics,
        "transparency_statement": (
            "These models are trained on reproducible synthetic demonstration data (1,200 scenarios) "
            "designed for the CSE494 Intelligent NoSQL Databases coursework. The evaluation scores "
            "reflect performance on held-out synthetic test splits. For production laboratory use, "
            "longitudinal empirical sensor data would be collected over multiple semesters."
        )
    }

    with open(EVAL_REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(full_report, f, indent=2)
    print(f"[OK] Evaluation report saved: {EVAL_REPORT_PATH}")

    metadata = {
        "status": "ready",
        "trained_at": now_iso,
        "random_seed": RANDOM_SEED,
        "models": {
            "classifier": {
                "name": "RandomForestClassifier",
                "version": "1.0.0",
                "file": "classifier_pipeline.joblib",
                "accuracy": clf_metrics["accuracy"],
                "f1_score": clf_metrics["f1_score"],
            },
            "regressor": {
                "name": "RandomForestRegressor",
                "version": "1.0.0",
                "file": "regressor_pipeline.joblib",
                "r2_score": reg_metrics["r2_score"],
                "mae_hours": reg_metrics["mae_hours"],
            }
        },
        "dataset": {
            "source": "backend/data/labpulse_ml_training.csv",
            "type": "Synthetic Demonstration Data",
            "total_samples": len(df),
            "train_samples": len(X_train_c),
            "test_samples": len(X_test_c),
        }
    }

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"[OK] Model metadata saved: {METADATA_PATH}")

    # ──────────────────────────────────────────────────────────────────────────
    # 4. Save metadata to MongoDB model_metrics collection (if db accessible)
    # ──────────────────────────────────────────────────────────────────────────
    try:
        import db
        if hasattr(db, "db") and db.db is not None:
            db.db["model_metrics"].replace_one(
                {"report_type": "latest_evaluation"},
                {
                    "report_type": "latest_evaluation",
                    "updatedAt": now_iso,
                    "metadata": metadata,
                    "metrics": full_report
                },
                upsert=True
            )
            print("[OK] Persisted metrics report into MongoDB 'model_metrics' collection.")
    except Exception as e:
        print(f"[i] MongoDB metric persistence skipped (offline or not loaded): {e}")

    return full_report


if __name__ == "__main__":
    train_and_evaluate()
