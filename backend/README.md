# LabPulse Backend — Flask + PyMongo API

**Course:** CSE494 Intelligent NoSQL Databases  
**Project:** LabPulse — Smart Lab Equipment Monitoring and Failure Prediction System

---

## Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

MongoDB must be running locally on `mongodb://localhost:27017`.  
The Flask server starts on **port 5000** by default.

---

## Environment Configuration

Copy `.env.example` to `.env` and adjust as needed:

```ini
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=labpulse_db
PORT=5000
```

---

## API Endpoints

### Health & Migration

| Method | URL | Description |
|--------|-----|-------------|
| GET    | `/api/health`            | MongoDB connectivity check |
| POST   | `/api/migrate`           | Seed empty collections from localStorage or demo data |
| POST   | `/api/reset-demo`        | Reset all collections to initial demo data |

### Equipment

| Method | URL | Description |
|--------|-----|-------------|
| GET    | `/api/equipment`           | List all equipment |
| POST   | `/api/equipment`           | Create new equipment |
| GET    | `/api/equipment/<id>`      | Get one equipment record |
| PUT    | `/api/equipment/<id>`      | Update equipment fields |
| DELETE | `/api/equipment/<id>`      | Delete equipment (blocked if active faults/maintenance) |

### Faults

| Method | URL | Description |
|--------|-----|-------------|
| GET    | `/api/faults`              | List all faults (supports `?q=keyword` text search) |
| POST   | `/api/faults`              | Report a new fault incident |
| GET    | `/api/faults/<id>`         | Get one fault record |
| PUT    | `/api/faults/<id>`         | Update fault (start repair / resolve) |

### Maintenance

| Method | URL | Description |
|--------|-----|-------------|
| GET    | `/api/maintenance`         | List all maintenance tasks |
| POST   | `/api/maintenance`         | Schedule a new maintenance task |
| PUT    | `/api/maintenance/<id>`    | Complete or reschedule maintenance |

### Analytics — Aggregation Pipelines (Step 5)

| Method | URL | Description |
|--------|-----|-------------|
| GET    | `/api/analytics/equipment-by-lab`     | Equipment health breakdown per lab |
| GET    | `/api/analytics/fault-analysis`       | Fault counts and avg repair time by severity |
| GET    | `/api/analytics/maintenance-summary`  | Maintenance counts by status and lab |
| GET    | `/api/analytics/overview-summary`     | Fleet-wide summary with $avg aggregation |

### Database Insights (Step 5)

| Method | URL | Description |
|--------|-----|-------------|
| GET    | `/api/database/query-performance`   | explain('executionStats') on representative queries |
| GET    | `/api/database/indexes`             | List all index definitions |
| GET    | `/api/database/validation`          | Schema validator metadata per collection |
| POST   | `/api/database/apply-validation`    | (Re-)apply JSON Schema validators |

### Machine Learning & Predictions (Step 6)

| Method | URL | Description |
|--------|-----|-------------|
| GET    | `/api/ml/status`                    | Model status, versions, training dataset info |
| GET    | `/api/ml/metrics`                   | Held-out evaluation metrics (Accuracy, F1, R², MAE) |
| POST   | `/api/ml/predict-all`               | Batch prediction on all MongoDB equipment |
| GET    | `/api/ml/predictions`               | Retrieve stored predictions with optional filters |
| POST   | `/api/ml/predict/<equipment_id>`    | Generate prediction for single equipment item |
| POST   | `/api/ml/retrain`                   | Retrain models on synthetic training dataset |

---

## Step 5: MongoDB Concepts Implemented

### 1. JSON Schema Validation

MongoDB's `$jsonSchema` validator lets you enforce a document structure on a collection — similar to SQL column constraints.

**Applied via `collMod` command:**
```python
db.command({
    "collMod": "equipment",
    "validator": { "$jsonSchema": { ... } },
    "validationLevel": "moderate",   # validate inserts + updates on compliant docs
    "validationAction": "error",     # reject invalid documents
})
```

Each collection (`equipment`, `faults`, `maintenance`) has rules for:
- `required` fields (e.g. `id`, `type`, `labId`, `status`)
- `bsonType` (data type enforcement: string, int, null, etc.)
- `enum` values (e.g. `status` must be `healthy/warning/critical`)
- Numeric `minimum`/`maximum` (e.g. CPU % must be 0–100)

---

### 2. Indexes

Three types of indexes are created in `init_indexes()`:

#### Unique Single-Field Index
```python
equipment_col.create_index([("id", ASCENDING)], unique=True)
```
Enforces that no two documents share the same `id`. Makes ID lookups O(log n) instead of O(n).

#### Compound Index
```python
equipment_col.create_index([("labId", ASCENDING), ("status", ASCENDING)])
```
Efficient for queries that filter on **both** `labId` and `status`:
```python
equipment_col.find({"labId": "LAB-A", "status": "critical"})
```
MongoDB can walk the index directly without scanning the collection.

**Important:** Field order matters. A compound index `(labId, status)` supports:
- Queries on `labId` alone ✓
- Queries on `labId + status` ✓
- Queries on `status` alone ✗ (not the leftmost prefix)

#### Text Index
```python
faults_col.create_index([("description", TEXT)], default_language="english")
```
MongoDB tokenizes and stems the `description` field. Enables:
```python
faults_col.find({"$text": {"$search": "overheating fan"}})
```
Results can be sorted by relevance: `sort([("score", {"$meta": "textScore"})])`

Only **one text index** is allowed per collection.

---

### 3. Aggregation Pipelines

Aggregation = MongoDB's equivalent of SQL `GROUP BY + SUM + AVG`.

A pipeline is an **array of stage objects**. Each stage transforms the stream of documents.

**Equipment by Lab Example:**
```python
pipeline = [
    # Stage 1: Group all equipment by labId
    {
        "$group": {
            "_id": "$labId",
            "labName":  {"$first": "$labName"},
            "total":    {"$sum": 1},
            "healthy":  {"$sum": {"$cond": [{"$eq": ["$status", "healthy"]}, 1, 0]}},
            "avgCpu":   {"$avg": "$cpu"},
        }
    },
    # Stage 2: Reshape output (rename _id to labId)
    {
        "$project": {
            "_id": 0,
            "labId":   "$_id",
            "total":   1,
            "healthy": 1,
            "avgCpu":  {"$round": ["$avgCpu", 1]},
        }
    },
    # Stage 3: Sort results alphabetically
    {"$sort": {"labId": 1}}
]
result = equipment_col.aggregate(pipeline)
```

**SQL equivalent:**
```sql
SELECT labId, COUNT(*) as total,
       SUM(CASE WHEN status='healthy' THEN 1 ELSE 0 END) as healthy,
       AVG(cpu) as avgCpu
FROM equipment
GROUP BY labId
ORDER BY labId;
```

Key pipeline stages used in LabPulse:
| Stage | Purpose |
|-------|---------|
| `$match` | Filter documents early (like SQL WHERE) |
| `$group` | Group + compute aggregates (`$sum`, `$avg`, `$first`) |
| `$project` | Reshape output (include/exclude/rename fields) |
| `$sort` | Sort results (1 = ASC, -1 = DESC) |
| `$cond` | Conditional expression (like `IF/CASE` in SQL) |

---

### 4. Query Execution Analysis with `explain()`

`explain('executionStats')` reveals the query execution plan MongoDB chose.

```python
result = collection.find({"labId": "LAB-A", "status": "critical"}).explain("executionStats")
```

Key fields in the output:
| Field | Meaning |
|-------|---------|
| `winningPlan.stage` | `IXSCAN` (good) or `COLLSCAN` (slow) |
| `executionTimeMillis` | Query runtime in milliseconds |
| `nReturned` | Documents returned |
| `totalDocsExamined` | Documents scanned (should ≈ nReturned for efficient queries) |
| `totalKeysExamined` | Index entries scanned |

**IXSCAN** means MongoDB used an index to locate documents efficiently.  
**COLLSCAN** means MongoDB scanned every document — this should be avoided in production.

---

## Running Tests

```bash
# Start Flask backend first
python app.py

# In a separate terminal
python test_api.py
```

The test suite runs all Steps 1–4 tests, 8 Step 5 tests, and 7 Step 6 ML tests:
1. Steps 1-4: Health, Equipment CRUD, Fault synchronization, Safe deletion, Maintenance
2. Step 5: Schema validation, Indexes, Text search, Aggregations, explain()
3. Step 6: ML model availability, Held-out metrics, Batch prediction, Fault-conditioned repair duration, Filtering, 404 handling, Idempotence & deduplication

---

## File Structure

```
backend/
├── app.py           — Flask REST API (routes and request handling)
├── db.py            — MongoDB connection, schema validators, indexes, seed data
├── test_api.py      — Full test suite covering Steps 1-6
├── requirements.txt — Python dependencies (Flask, PyMongo, scikit-learn, pandas, joblib)
├── ml/
│   ├── __init__.py
│   ├── generate_training_data.py — Synthetic dataset generator (Seed 42)
│   ├── train_models.py           — Model training and held-out evaluation
│   ├── predictor.py              — Real MongoDB feature extraction & inference engine
│   └── README.md                 — Detailed ML documentation
├── data/
│   ├── labpulse_ml_training.csv  — 1,200 synthetic demonstration scenarios
│   └── dataset_metadata.json     — Dataset metadata and distributions
├── models/
│   ├── classifier_pipeline.joblib— Fitted classification pipeline
│   ├── regressor_pipeline.joblib — Fitted regression pipeline
│   └── model_metadata.json       — Model metadata and performance summary
├── reports/
│   └── ml_evaluation_results.json— Full evaluation metrics report
├── .env             — Environment configuration
├── .env.example     — Template for .env
└── README.md        — This file
```
