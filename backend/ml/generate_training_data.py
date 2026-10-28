"""
LabPulse — Synthetic Training Data Generator (Step 6)
======================================================
Generates a reproducible synthetic dataset of ~1,200 college laboratory
equipment scenarios for training two predictive models:

  1. Classification Target: `repeat_failure_within_7_days` (0 or 1)
     Predicts whether an equipment unit is likely to experience a repeat
     failure within the next 7 days based on telemetry, stress, active faults,
     and maintenance history.

  2. Regression Target: `repair_duration_hours` (float, hours)
     Estimates repair duration in hours when an active fault is present.
     Set to NaN / null when no active fault is present.

IMPORTANT TRANSPARENCY NOTICE:
------------------------------
This is a SYNTHETIC DEMONSTRATION DATASET generated using a fixed random seed (42).
The operational MongoDB database has only ~24 equipment units and ~13 fault records,
which is insufficient to train reliable statistical machine learning models.
This synthetic dataset simulates realistic college laboratory equipment patterns,
sensor telemetry, and failure mechanisms without fabricating real historical data.
It is stored on disk and NEVER inserted into the operational MongoDB collections.
"""

import os
import json
from datetime import datetime
import numpy as np
import pandas as pd

RANDOM_SEED = 42
DATASET_SIZE = 1200
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
CSV_PATH = os.path.join(OUTPUT_DIR, "labpulse_ml_training.csv")
METADATA_PATH = os.path.join(OUTPUT_DIR, "dataset_metadata.json")

EQUIPMENT_TYPES = ["Desktop PC", "Laptop", "Network Router", "Network Switch", "Projector"]
LAB_IDS = ["LAB-A", "LAB-B", "LAB-C"]
FAULT_CATEGORIES = ["Hardware", "Software", "Network", "Power", "Thermal", "Other"]
FAULT_SEVERITIES = ["Low", "Medium", "High", "Critical"]


def generate_synthetic_data(n_samples=DATASET_SIZE, seed=RANDOM_SEED):
    """
    Generate reproducible synthetic college laboratory equipment dataset.
    Returns a pandas DataFrame with features and dual targets.
    """
    np.random.seed(seed)

    # 1. Equipment identity and lab assignment
    # Plausible distribution: mostly desktop PCs (60%), followed by laptops, switches, routers, projectors
    type_probs = [0.55, 0.15, 0.10, 0.10, 0.10]
    equipment_types = np.random.choice(EQUIPMENT_TYPES, size=n_samples, p=type_probs)
    lab_ids = np.random.choice(LAB_IDS, size=n_samples, p=[0.40, 0.35, 0.25])

    # 2. Operating Telemetry
    # Baseline telemetry varies by equipment type
    # Desktop PCs & Laptops: wider CPU/RAM range
    # Routers & Switches: steady RAM, moderate CPU, higher uptime
    # Projectors: low CPU/RAM, higher running temperatures
    cpu_usage = []
    ram_usage = []
    temperature = []
    uptime = []

    for eq_type in equipment_types:
        if eq_type in ("Desktop PC", "Laptop"):
            cpu = np.clip(np.random.normal(loc=45, scale=22), 5, 100)
            ram = np.clip(np.random.normal(loc=55, scale=20), 10, 100)
            temp = np.clip(np.random.normal(loc=52, scale=14), 28, 96)
            up = np.clip(np.random.normal(loc=98.0, scale=3.5), 65.0, 100.0)
        elif eq_type in ("Network Router", "Network Switch"):
            cpu = np.clip(np.random.normal(loc=35, scale=15), 5, 95)
            ram = np.clip(np.random.normal(loc=60, scale=12), 20, 95)
            temp = np.clip(np.random.normal(loc=48, scale=10), 30, 85)
            up = np.clip(np.random.normal(loc=99.2, scale=1.5), 85.0, 100.0)
        else:  # Projector
            cpu = np.clip(np.random.normal(loc=20, scale=8), 5, 50)
            ram = np.clip(np.random.normal(loc=30, scale=10), 10, 60)
            temp = np.clip(np.random.normal(loc=65, scale=16), 35, 98)
            up = np.clip(np.random.normal(loc=96.5, scale=4.0), 60.0, 100.0)

        cpu_usage.append(round(float(cpu), 1))
        ram_usage.append(round(float(ram), 1))
        temperature.append(round(float(temp), 1))
        uptime.append(round(float(up), 1))

    # 3. Fault history and maintenance recency
    # Poisson distributed prior faults (mostly 0-3, tail up to 8)
    previous_fault_count = np.random.poisson(lam=1.6, size=n_samples)
    previous_fault_count = np.clip(previous_fault_count, 0, 12)

    # Days since last maintenance: uniform up to 180 days with spikes near overdue (>90)
    days_since_maint = np.random.exponential(scale=55, size=n_samples)
    days_since_maint = np.clip(days_since_maint, 2, 365).round().astype(int)

    # Historical average repair duration for this equipment in hours (from past faults)
    # Equipment with 0 prior faults has NaN (will be imputed via median during training)
    avg_hist_repair = []
    for pfc in previous_fault_count:
        if pfc == 0:
            avg_hist_repair.append(np.nan)
        else:
            base = np.random.gamma(shape=2.5, scale=1.4)
            avg_hist_repair.append(round(float(np.clip(base, 0.5, 18.0)), 1))

    # 4. Active Fault Scenario (approx 45% of scenarios have an active fault)
    has_active_fault = np.random.binomial(n=1, p=0.45, size=n_samples)
    unresolved_fault_count = []
    fault_category = []
    fault_severity = []

    for active in has_active_fault:
        if active == 1:
            # Active fault count: 1 to 3
            ufc = int(np.random.choice([1, 2, 3], p=[0.75, 0.20, 0.05]))
            cat = str(np.random.choice(FAULT_CATEGORIES, p=[0.35, 0.20, 0.15, 0.12, 0.12, 0.06]))
            sev = str(np.random.choice(FAULT_SEVERITIES, p=[0.25, 0.40, 0.22, 0.13]))
        else:
            ufc = 0
            cat = "None"
            sev = "None"
        unresolved_fault_count.append(ufc)
        fault_category.append(cat)
        fault_severity.append(sev)

    # 5. Generate Target 1: `repeat_failure_within_7_days` (Binary Classification)
    # Grounded simulation rule combining physical stress and history + noise:
    # High temp (>75°C), high load (>80%), unresolved faults, prior history, long time without maintenance
    repeat_failure = []
    severity_weights = {"None": 0.0, "Low": 0.4, "Medium": 0.9, "High": 1.7, "Critical": 2.8}

    for i in range(n_samples):
        # Normalized risk components (centered around 0)
        temp_risk = max(0, (temperature[i] - 65) / 15.0)       # kicks in above 65°C
        load_risk = max(0, (cpu_usage[i] + ram_usage[i] - 130) / 40.0) # kicks in above 130 sum
        maint_risk = min(1.5, max(0, (days_since_maint[i] - 90) / 60.0)) # kicks in above 90 days
        prior_risk = min(1.8, previous_fault_count[i] * 0.25)
        active_risk = unresolved_fault_count[i] * 0.85
        sev_risk = severity_weights[fault_severity[i]]
        uptime_penalty = max(0, (95.0 - uptime[i]) / 5.0)

        # Base logit combined score
        logit = (
            -1.8  # baseline bias -> creates approx 30-35% positive class
            + 0.95 * temp_risk
            + 0.70 * load_risk
            + 0.65 * maint_risk
            + 0.75 * prior_risk
            + 0.90 * active_risk
            + 0.85 * sev_risk
            + 0.50 * uptime_penalty
            + np.random.normal(loc=0.0, scale=0.55)  # Controlled realistic noise
        )

        prob = 1.0 / (1.0 + np.exp(-logit))
        label = 1 if prob >= 0.5 else 0
        repeat_failure.append(label)

    # 6. Generate Target 2: `repair_duration_hours` (Numeric Regression)
    # Applicable ONLY when there is an active fault! Otherwise NaN.
    repair_duration = []
    base_sev_hours = {"Critical": 9.5, "High": 5.5, "Medium": 3.0, "Low": 1.2}
    cat_offset = {
        "Hardware": 2.2, "Power": 1.8, "Thermal": 1.4,
        "Network": 1.0, "Software": -0.4, "Other": 0.5
    }
    type_offset = {
        "Desktop PC": 0.0, "Laptop": 0.6,
        "Network Router": 1.0, "Network Switch": 1.2, "Projector": 1.5
    }

    for i in range(n_samples):
        if has_active_fault[i] == 1 and fault_severity[i] != "None":
            base = base_sev_hours.get(fault_severity[i], 2.5)
            cat_adj = cat_offset.get(fault_category[i], 0.0)
            type_adj = type_offset.get(equipment_types[i], 0.0)
            multi_fault_adj = (unresolved_fault_count[i] - 1) * 1.2

            # Proportional log-normal noise to simulate real repair variance
            noise = np.random.normal(loc=0.0, scale=0.25)
            hours = (base + cat_adj + type_adj + multi_fault_adj) * np.exp(noise)
            hours = np.clip(hours, 0.5, 36.0)
            repair_duration.append(round(float(hours), 1))
        else:
            repair_duration.append(np.nan)

    # Build DataFrame
    df = pd.DataFrame({
        # Identifiers / Categorical features
        "equipment_type": equipment_types,
        "lab_id": lab_ids,
        "fault_category": fault_category,
        "fault_severity": fault_severity,
        # Numerical features
        "cpu_usage": cpu_usage,
        "ram_usage": ram_usage,
        "temperature": temperature,
        "uptime": uptime,
        "previous_fault_count": previous_fault_count,
        "unresolved_fault_count": unresolved_fault_count,
        "days_since_last_maintenance": days_since_maint,
        "avg_historical_repair_hours": avg_hist_repair,
        # Targets
        "repeat_failure_within_7_days": repeat_failure,
        "repair_duration_hours": repair_duration,
    })

    return df


def save_dataset_and_metadata(df, csv_path=CSV_PATH, metadata_path=METADATA_PATH):
    """Save dataset CSV and metadata JSON to disk."""
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    df.to_csv(csv_path, index=False)

    clf_pos = int((df["repeat_failure_within_7_days"] == 1).sum())
    clf_neg = int((df["repeat_failure_within_7_days"] == 0).sum())
    reg_valid = int(df["repair_duration_hours"].notna().sum())

    metadata = {
        "dataset_name": "LabPulse College Laboratory Equipment Synthetic ML Dataset",
        "dataset_type": "Synthetic demonstration data (Reproducible)",
        "purpose": "CSE494 Step 6: ML Failure Prediction and Repair Duration Estimation",
        "transparency_note": (
            "This synthetic dataset was generated locally using a fixed random seed (42) "
            "to demonstrate statistical machine learning techniques. It simulates realistic college "
            "laboratory operating telemetry, stress factors, and incident records. It is NEVER "
            "inserted into the real MongoDB equipment or faults collections."
        ),
        "generated_at": datetime.now().isoformat(),
        "random_seed": RANDOM_SEED,
        "total_records": len(df),
        "classification_target": "repeat_failure_within_7_days",
        "classification_distribution": {
            "negative_class_0 (no repeat failure)": clf_neg,
            "positive_class_1 (repeat failure likely)": clf_pos,
            "positive_rate_percent": round((clf_pos / len(df)) * 100, 2),
        },
        "regression_target": "repair_duration_hours",
        "regression_distribution": {
            "active_fault_samples (repair time present)": reg_valid,
            "no_active_fault_samples (NaN)": len(df) - reg_valid,
            "mean_repair_hours": round(float(df["repair_duration_hours"].mean()), 2),
            "median_repair_hours": round(float(df["repair_duration_hours"].median()), 2),
            "min_repair_hours": round(float(df["repair_duration_hours"].min()), 1),
            "max_repair_hours": round(float(df["repair_duration_hours"].max()), 1),
        },
        "features": {
            "numerical": [
                "cpu_usage", "ram_usage", "temperature", "uptime",
                "previous_fault_count", "unresolved_fault_count",
                "days_since_last_maintenance", "avg_historical_repair_hours"
            ],
            "categorical": [
                "equipment_type", "lab_id", "fault_category", "fault_severity"
            ]
        }
    }

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    return metadata


if __name__ == "__main__":
    print("[*] Generating synthetic training dataset for LabPulse Step 6...")
    dataset = generate_synthetic_data()
    meta = save_dataset_and_metadata(dataset)
    print(f"[OK] Generated {len(dataset)} records -> {CSV_PATH}")
    print(f"     Classification: {meta['classification_distribution']}")
    print(f"     Regression:     {meta['regression_distribution']}")
    print(f"[OK] Metadata saved -> {METADATA_PATH}")
