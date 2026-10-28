# LabPulse — Step 6: Machine Learning Prediction Engine & API Documentation
**Course:** CSE494 Intelligent NoSQL Databases  
**Subsystem:** Machine Learning Telemetry Failure Classification & Repair Estimation Engine  
**Framework:** scikit-learn, pandas, NumPy, joblib, PyMongo, Flask

---

## 1. Executive Summary & Objective

The LabPulse Machine Learning subsystem addresses two fundamental predictive maintenance objectives for college computer and networking laboratories:

1. **Classification Task:** Predict whether an equipment unit is likely to experience a repeat failure within the next 7 days (`repeat_failure_within_7_days`: binary `0` or `1`).
   - **Algorithm:** `RandomForestClassifier` (100 estimators, `max_depth=8`, `min_samples_leaf=3`)
   - **Target Definition:** Binary indicator. `1` indicates an elevated likelihood of operational failure or critical stress requiring preventive intervention within 7 days; `0` indicates normal, stable operation.

2. **Regression Task:** Estimate the required repair duration in technician hours for an equipment incident (`repair_duration_hours`: continuous float).
   - **Algorithm:** `RandomForestRegressor` (100 estimators, `max_depth=8`, `min_samples_leaf=2`)
   - **Operational Rule:** **Conditioned strictly on active faults.** Repair time is estimated ONLY when an equipment unit has an unresolved incident with an active severity and category. Equipment in normal operation receives `null` (`"Not applicable — no active fault"`).

---

## 2. Dataset Transparency & Synthetic Demonstration Data

### Why is the training dataset synthetic?
The operational MongoDB database (`labpulse_db`) contains ~24 laboratory equipment units and ~13 logged fault incidents. In machine learning, a small sample of ~13 incidents is statistically insufficient to train high-capacity ensemble models or perform meaningful train/test validation without massive overfitting.

To demonstrate disciplined, rigorous machine learning:
- We generate a **reproducible synthetic demonstration dataset** of **1,200 equipment scenarios** using a fixed random seed (`RANDOM_SEED = 42`).
- The synthetic dataset is stored on disk at `backend/data/labpulse_ml_training.csv` and documented in `backend/data/dataset_metadata.json`.
- **Isolation Guarantee:** The synthetic training dataset is **NEVER inserted into the real MongoDB `equipment`, `faults`, or `maintenance` collections.**
- **Real-Time Inference:** When generating live predictions, the engine queries **actual MongoDB documents** (`equipment`, `faults`, `maintenance`), transforms live telemetry and incident history into a 12-feature vector, and passes it to the trained scikit-learn pipelines.

---

## 3. Feature Selection & Preprocessing Pipeline

The model ingests 12 operational features (8 numerical, 4 categorical):

### Numerical Features
| Feature | Range / Units | Description & Source in MongoDB |
| :--- | :--- | :--- |
| `cpu_usage` | 5% – 100% | Real-time processor utilization (`equipment.cpu`) |
| `ram_usage` | 10% – 100% | Real-time memory consumption (`equipment.ram`) |
| `temperature` | 28°C – 96°C | Operating thermal sensor reading (`equipment.temp`) |
| `uptime` | 60% – 100% | System availability ratio (`equipment.uptime`) |
| `previous_fault_count` | 0 – 12 | Total historical incidents logged for this `equipId` in `faults` |
| `unresolved_fault_count` | 0 – 5 | Count of active faults (`status != 'Resolved'`) for this unit |
| `days_since_last_maintenance` | 1 – 365 days | Days elapsed since `equipment.lastMaintenance` |
| `avg_historical_repair_hours` | 0.5h – 24h | Mean repair hours from past resolved faults (or median imputed) |

### Categorical Features
| Feature | Categories | Description |
| :--- | :--- | :--- |
| `equipment_type` | Desktop PC, Laptop, Network Switch, Network Router, Projector | Equipment hardware class |
| `lab_id` | LAB-A, LAB-B, LAB-C | Facility location |
| `fault_category` | Hardware, Software, Network, Power, Thermal, Other, None | Active incident category |
| `fault_severity` | Critical, High, Medium, Low, None | Highest severity among active incidents |

### Preprocessing Architecture (`ColumnTransformer` & `Pipeline`)
To avoid data leakage, preprocessing is bundled directly inside the scikit-learn `Pipeline` and fitted **only on training data**:
- **Numerical Pipeline:** `SimpleImputer(strategy='median')` ensures missing readings or unrecorded historical repair times are imputed using the training median.
- **Categorical Pipeline:** `SimpleImputer(strategy='most_frequent')` followed by `OneHotEncoder(handle_unknown='ignore', sparse_output=False)` to gracefully handle novel categories.

---

## 4. Train / Test Split & Held-Out Evaluation Results

We execute a strict **80/20 train/test split** (`random_state=42`) with stratified sampling for the classification target.

### Classification Performance (`RandomForestClassifier`)
- **Training Set:** 960 records | **Held-Out Test Set:** 240 records
- **Accuracy:** **88.33%** (overall correct predictions on unseen scenarios)
- **Precision:** **79.38%** (proportion of predicted failure risks that were actual failures)
- **Recall (Sensitivity):** **90.59%** (proportion of actual failures correctly flagged — vital for lab safety)
- **F1-Score:** **0.8462** (harmonic balance between Precision and Recall)
- **Confusion Matrix:**
  ```text
                  Predicted No Failure (0)    Predicted Repeat Failure (1)
  Actual No Failure (0)         135 (TN)                     20 (FP)
  Actual Failure (1)              8 (FN)                     77 (TP)
  ```
  - **Negative Support (0):** 155 test cases
  - **Positive Support (1):** 85 test cases

### Regression Performance (`RandomForestRegressor`)
- **Training Set:** 438 active fault records | **Held-Out Test Set:** 110 active fault records
- **R² Score:** **0.7054** (explains 70.5% of the total variance in repair hours)
- **Mean Absolute Error (MAE):** **1.39 hours** (predictions are within ~1.4 hours on average)

---

## 5. Risk Tiers and Decision Thresholds

For the classification model, raw predicted probability $P(\text{failure})$ is mapped to documented operational risk tiers:
- **Low Risk:** $P < 35.0\%$ — Equipment operating within standard parameters; routine preventive maintenance.
- **Moderate Risk:** $35.0\% \le P \le 65.0\%$ — Elevated telemetry load or overdue maintenance; scheduled inspection recommended.
- **Elevated Risk:** $P > 65.0\%$ — High core temperature, active incidents, or repeat failure history; immediate technician inspection required.

---

## 6. How Real MongoDB Data is Transformed for Inference

When an inference request arrives:
1. `db.equipment_col.find_one({'id': equipment_id})` retrieves the equipment document.
2. `db.faults_col.find({'equipId': equipment_id})` queries all past and active incidents.
3. Feature extraction calculates:
   - Operating telemetry (`cpu`, `ram`, `temp`, `uptime`)
   - `previous_fault_count` and `unresolved_fault_count`
   - Days elapsed since `lastMaintenance`
   - Active fault category and severity (selected from the highest-priority active fault: Critical > High > Medium > Low)
4. A single-row DataFrame is passed to `clf_pipeline.predict_proba()` and `clf_pipeline.predict()`.
5. If `unresolved_fault_count > 0` and `fault_severity != 'None'`, `reg_pipeline.predict()` estimates repair hours. Otherwise, repair hours is set to `null` with `"Not applicable — no active fault"`.
6. The prediction document is upserted into `db.predictions_col` on `equipmentId`.

---

## 7. Model Persistence & API Endpoints

### Saved Artifacts on Disk
- `backend/models/classifier_pipeline.joblib`
- `backend/models/regressor_pipeline.joblib`
- `backend/models/model_metadata.json`
- `backend/reports/ml_evaluation_results.json`
- `backend/data/labpulse_ml_training.csv`

### REST Endpoints
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/ml/status` | Readiness status, model versions, training sample counts, and load status |
| `GET` | `/api/ml/metrics` | Held-out test split evaluation metrics (Accuracy, P, R, F1, Confusion Matrix, R², MAE) |
| `POST` | `/api/ml/predict-all` | Batch inference across all MongoDB equipment with automatic upsert |
| `GET` | `/api/ml/predictions` | Query stored predictions with optional filters (`?labId=...&risk=...&search=...`) |
| `POST` | `/api/ml/predict/<equipment_id>` | Fresh prediction for a single equipment unit by ID |
| `POST` | `/api/ml/retrain` | Controlled endpoint to regenerate synthetic data, retrain pipelines, and save models |

---

## 8. Workflow Commands

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Generate Dataset & Train Models
```bash
# Generate synthetic dataset (Seed 42)
python ml/generate_training_data.py

# Train both pipelines and evaluate on held-out test split
python ml/train_models.py
```

### 3. Run Backend API Server
```bash
python app.py
```

### 4. Execute Full Verification Test Suite (Steps 1–6)
```bash
python test_api.py
```

---

## 9. Academic Limitations & Real-World Considerations

1. **Synthetic Training Baseline:** Evaluation metrics represent performance on held-out synthetic test splits, not validated historical physical wear. In an enterprise production deployment, telemetry logs would be recorded over multiple academic semesters to establish empirical baselines.
2. **Probabilistic Nature:** An "Elevated Risk" output indicates relative statistical probability under simulated stress, not a guarantee that equipment will fail at a specific moment.
