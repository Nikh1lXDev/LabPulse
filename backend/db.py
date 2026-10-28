# backend/db.py
# ─────────────────────────────────────────────────────────────────────────────
# LabPulse — MongoDB Database Layer using PyMongo
# Course: CSE494 Intelligent NoSQL Databases
# ─────────────────────────────────────────────────────────────────────────────
#
# Step 5 additions (MongoDB Concepts Demonstrated):
#   - JSON Schema Validation  ($jsonSchema validator on each collection)
#   - Single-field Indexes    (unique index on 'id' field)
#   - Compound Indexes        (labId + status, equipId + status)
#   - Text Index              (full-text search on fault descriptions)
#   - explain() support       (used from app.py to analyze query plans)
# ─────────────────────────────────────────────────────────────────────────────

import os
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING, TEXT
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError, OperationFailure

# Load environment variables from backend/.env or root .env
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "labpulse_db")

# Initialize MongoDB client with a 3-second server selection timeout
# so health checks and connection attempts fail fast if MongoDB is down
try:
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
    db = client[MONGODB_DB_NAME]
    equipment_col = db["equipment"]
    faults_col    = db["faults"]
    maintenance_col = db["maintenance"]
    predictions_col = db["predictions"]
    model_metrics_col = db["model_metrics"]
except Exception as e:
    print(f"[db] Notice: MongoDB client connection to '{MONGODB_URI}' deferred ({e})")
    # Fallback to local MongoDB if remote connection fails (e.g. offline/DNS issues)
    try:
        client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=1000)
        db = client[MONGODB_DB_NAME]
        equipment_col = db["equipment"]
        faults_col    = db["faults"]
        maintenance_col = db["maintenance"]
        predictions_col = db["predictions"]
        model_metrics_col = db["model_metrics"]
    except Exception as e2:
        print(f"[db] Warning: Local MongoDB fallback also unavailable ({e2})")


def clean_doc(doc):
    """
    Remove MongoDB internal _id or convert it to string
    so documents serialize cleanly to JSON.
    """
    if not doc:
        return None
    if isinstance(doc, list):
        return [clean_doc(d) for d in doc]
    cleaned = dict(doc)
    if "_id" in cleaned:
        del cleaned["_id"]
    return cleaned


# ─── JSON Schema Validators ───────────────────────────────────────────────────
# MongoDB supports JSON Schema (a standard format) to validate documents
# before they are inserted or updated.
#
# $jsonSchema lets us define:
#   - bsonType   : the MongoDB data type (string, int, double, array, etc.)
#   - required   : list of fields that must always be present
#   - properties : per-field rules (type, description, enum, minimum, etc.)
#
# validationLevel options:
#   "strict"   → validate ALL inserts AND updates (safer but more restrictive)
#   "moderate" → validate inserts + updates only on documents that already pass
#
# validationAction options:
#   "error" → reject invalid documents (we use this)
#   "warn"  → log warning but allow the document (useful during migration)

EQUIPMENT_SCHEMA_VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["id", "type", "labId", "status"],
        "properties": {
            "id": {
                "bsonType": "string",
                "description": "Unique equipment identifier (e.g. PC-01). Required."
            },
            "type": {
                "bsonType": "string",
                "description": "Equipment type (Desktop PC, Laptop, Projector, etc.). Required."
            },
            "labId": {
                "bsonType": "string",
                "description": "Laboratory identifier (e.g. LAB-A). Required."
            },
            "labName": {
                "bsonType": "string",
                "description": "Human-readable lab name."
            },
            "status": {
                "bsonType": "string",
                "enum": ["healthy", "warning", "critical"],
                "description": "Operational status. Must be one of: healthy, warning, critical."
            },
            "riskLevel": {
                "bsonType": "string",
                "enum": ["low", "medium", "high"],
                "description": "Failure risk classification."
            },
            "cpu": {
                "bsonType": ["int", "double", "null"],
                "minimum": 0,
                "maximum": 100,
                "description": "CPU usage percentage (0-100) or null for non-compute devices."
            },
            "ram": {
                "bsonType": ["int", "double", "null"],
                "minimum": 0,
                "maximum": 100,
                "description": "RAM usage percentage (0-100) or null."
            },
            "temp": {
                "bsonType": ["int", "double", "null"],
                "minimum": 0,
                "maximum": 150,
                "description": "Temperature in Celsius or null."
            },
            "uptime": {
                "bsonType": ["string", "null"],
                "description": "Uptime percentage string (e.g. 99.9%)."
            }
        }
    }
}

FAULTS_SCHEMA_VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["id", "equipId", "labId", "severity", "description", "status"],
        "properties": {
            "id": {
                "bsonType": "string",
                "description": "Unique fault ID (e.g. FL-001). Required."
            },
            "equipId": {
                "bsonType": "string",
                "description": "ID of the affected equipment. Required."
            },
            "labId": {
                "bsonType": "string",
                "description": "Lab where the fault occurred. Required."
            },
            "category": {
                "bsonType": "string",
                "enum": ["Hardware", "Software", "Network", "Power", "Other"],
                "description": "Fault category. Must be one of the defined categories."
            },
            "severity": {
                "bsonType": "string",
                "enum": ["Critical", "High", "Medium", "Low"],
                "description": "Fault severity level. Must be Critical, High, Medium, or Low."
            },
            "description": {
                "bsonType": "string",
                "minLength": 5,
                "description": "Fault description. Required, minimum 5 characters."
            },
            "status": {
                "bsonType": "string",
                "enum": ["Open", "In Progress", "Resolved"],
                "description": "Current incident status."
            },
            "repairHours": {
                "bsonType": ["double", "int", "null"],
                "minimum": 0,
                "description": "Repair time in hours. Must be non-negative when provided."
            }
        }
    }
}

MAINTENANCE_SCHEMA_VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["id", "equipId", "labId", "taskType", "scheduledDate", "status"],
        "properties": {
            "id": {
                "bsonType": "string",
                "description": "Unique maintenance task ID (e.g. PM-001). Required."
            },
            "equipId": {
                "bsonType": "string",
                "description": "Equipment this maintenance is for. Required."
            },
            "labId": {
                "bsonType": "string",
                "description": "Lab associated with the maintenance task. Required."
            },
            "taskType": {
                "bsonType": "string",
                "description": "Description of the maintenance type. Required."
            },
            "scheduledDate": {
                "bsonType": "string",
                "description": "ISO date string YYYY-MM-DD for the planned maintenance date."
            },
            "status": {
                "bsonType": "string",
                "enum": ["Scheduled", "Due", "Overdue", "Completed"],
                "description": "Maintenance scheduling status."
            }
        }
    }
}


def apply_schema_validation():
    """
    Apply JSON Schema validators to the three LabPulse collections.

    MongoDB's collMod command modifies an existing collection's properties.
    We use it here to attach a schema validator AFTER the collection is created.

    Why 'moderate' validation level?
      - "moderate" validates new inserts and updates only on documents that
        currently comply with the schema. This is safer for a live database
        that already contains seeded data during development.
      - In production, "strict" would be used to enforce validation on every write.

    Educational Note (CSE494):
      JSON Schema validation in MongoDB works very similarly to SQL constraints
      (NOT NULL, CHECK, ENUM), but for a document-oriented NoSQL database.
      The schema is stored as part of the collection definition in MongoDB.
    """
    results = {}

    for col_name, validator in [
        ("equipment",    EQUIPMENT_SCHEMA_VALIDATOR),
        ("faults",       FAULTS_SCHEMA_VALIDATOR),
        ("maintenance",  MAINTENANCE_SCHEMA_VALIDATOR),
    ]:
        try:
            db.command({
                "collMod": col_name,
                "validator": validator,
                "validationLevel": "moderate",   # validates inserts + compliant-doc updates
                "validationAction": "error",      # reject invalid documents with an error
            })
            results[col_name] = "applied"
            print(f"[db] JSON Schema validation applied to '{col_name}' collection.")
        except OperationFailure as e:
            results[col_name] = f"error: {str(e)}"
            print(f"[db] Warning: Could not apply validator to '{col_name}': {e}")
        except Exception as e:
            results[col_name] = f"error: {str(e)}"
            print(f"[db] Unexpected error applying validator to '{col_name}': {e}")

    return results


def get_validation_info():
    """
    Read back the validator stored on each collection using listCollections.

    MongoDB stores validators as part of the collection's 'options' metadata.
    We return this so the frontend can display the schema definition.
    """
    result = {}
    try:
        col_list = list(db.list_collections())
        for col_info in col_list:
            name = col_info.get("name")
            if name in ("equipment", "faults", "maintenance"):
                options = col_info.get("options", {})
                result[name] = {
                    "hasValidator":      "validator" in options,
                    "validationLevel":   options.get("validationLevel", "off"),
                    "validationAction":  options.get("validationAction", "error"),
                    "validatorPreview":  str(options.get("validator", {}))[:300]
                }
    except Exception as e:
        result["error"] = str(e)
    return result


def init_indexes():
    """
    Create all indexes for LabPulse collections.

    MongoDB Index Types Used:
    ──────────────────────────────────────────────────────
    1. UNIQUE SINGLE-FIELD INDEX
       Enforces uniqueness on the 'id' field (our application-level primary key).
       Speeds up all lookups by equipment/fault/maintenance ID.

    2. COMPOUND INDEX (multiple fields in one index)
       A compound index on (labId, status) lets MongoDB answer queries like:
         "Show all equipment in LAB-A with status 'critical'"
       with a single efficient B-tree scan instead of a full collection scan.
       Field ORDER matters: MongoDB uses the index for queries that match
       the leftmost prefix (labId only, or labId + status together).

    3. TEXT INDEX (full-text search)
       MongoDB's text index tokenizes and stems string fields so you can
       search for words anywhere in the description using $text / $search.
       Only ONE text index is allowed per collection.
       We create it on 'description' for faults so technicians can search
       by symptom keywords like "overheating" or "fan".
    """
    # Helper: drop old conflicting indexes (from Step 4 / unnamed versions)
    def safe_drop(col, target_name, old_names=None):
        """
        Drop old indexes by name so we can recreate them with new names.
        Also attempts to drop by key pattern for unnamed indexes.
        """
        # Drop any explicitly known old names
        if old_names:
            for old_name in old_names:
                try:
                    col.drop_index(old_name)
                    print(f"[db] Dropped old index '{old_name}' from {col.name}")
                except Exception:
                    pass  # Index may not exist, that's fine

        # Drop any existing index with the same target name (in case of partial setup)
        try:
            col.drop_index(target_name)
        except Exception:
            pass

    try:
        # ── equipment collection ─────────────────────────────
        # Drop any old unnamed id index before creating named one
        safe_drop(equipment_col, "idx_equipment_id_unique", old_names=["id_1"])
        equipment_col.create_index([("id", ASCENDING)], unique=True, name="idx_equipment_id_unique")

        # Compound index: lab + status (for filtered dashboard queries)
        equipment_col.create_index(
            [("labId", ASCENDING), ("status", ASCENDING)],
            name="idx_equipment_lab_status"
        )

        # Compound index: type + status (for type-filtered analytics)
        equipment_col.create_index(
            [("type", ASCENDING), ("status", ASCENDING)],
            name="idx_equipment_type_status"
        )

        # ── faults collection ────────────────────────────────
        safe_drop(faults_col, "idx_faults_id_unique", old_names=["id_1"])
        faults_col.create_index([("id", ASCENDING)], unique=True, name="idx_faults_id_unique")

        # Compound index: equipId + status (for fetching all faults of one equipment)
        faults_col.create_index(
            [("equipId", ASCENDING), ("status", ASCENDING)],
            name="idx_faults_equip_status"
        )

        # Compound index: labId + severity (for lab-level fault severity reports)
        faults_col.create_index(
            [("labId", ASCENDING), ("severity", ASCENDING)],
            name="idx_faults_lab_severity"
        )

        # TEXT INDEX on description field (full-text keyword search)
        # Allows: db.faults.find({$text: {$search: "overheating fan"}})
        # MongoDB tokenizes, lowercases, and stems each word automatically.
        faults_col.create_index(
            [("description", TEXT)],
            name="idx_faults_description_text",
            default_language="english"
        )

        # ── maintenance collection ───────────────────────────
        safe_drop(maintenance_col, "idx_maintenance_id_unique", old_names=["id_1"])
        maintenance_col.create_index([("id", ASCENDING)], unique=True, name="idx_maintenance_id_unique")

        # Compound index: equipId + status
        maintenance_col.create_index(
            [("equipId", ASCENDING), ("status", ASCENDING)],
            name="idx_maintenance_equip_status"
        )

        # Compound index: labId + scheduledDate (for upcoming maintenance calendar)
        maintenance_col.create_index(
            [("labId", ASCENDING), ("scheduledDate", ASCENDING)],
            name="idx_maintenance_lab_date"
        )

        # ── predictions collection (Step 6 ML) ───────────────
        safe_drop(predictions_col, "idx_predictions_equipment_unique", old_names=["equipmentId_1"])
        predictions_col.create_index(
            [("equipmentId", ASCENDING)],
            unique=True,
            name="idx_predictions_equipment_unique"
        )
        predictions_col.create_index(
            [("labId", ASCENDING), ("riskBadge", ASCENDING)],
            name="idx_predictions_lab_risk"
        )

        print("[db] All indexes initialized successfully (unique, compound, text).")
    except Exception as e:
        print(f"[db] Warning: Index initialization failed: {e}")


def get_all_indexes():
    """
    Return all index definitions for the three collections.
    Used by the /api/database/indexes endpoint so the frontend can display them.
    """
    result = {}
    try:
        for col_name, col_obj in [
            ("equipment", equipment_col),
            ("faults", faults_col),
            ("maintenance", maintenance_col),
            ("predictions", predictions_col)
        ]:
            indexes = list(col_obj.list_indexes())
            # Convert non-serializable objects
            serializable_indexes = []
            for idx in indexes:
                idx_dict = dict(idx)
                idx_dict.pop("_id", None)
                # Convert key document to plain dict
                if "key" in idx_dict:
                    idx_dict["key"] = dict(idx_dict["key"])
                serializable_indexes.append(idx_dict)
            result[col_name] = serializable_indexes
    except Exception as e:
        result["error"] = str(e)
    return result


def check_health():
    """
    Check MongoDB connectivity using client admin ping command.
    Returns connectivity status and collection statistics.
    Never reports connected if the ping fails.
    """
    try:
        # Ping command verifies active database connection
        client.admin.command("ping")
        eq_count = equipment_col.count_documents({})
        fl_count = faults_col.count_documents({})
        pm_count = maintenance_col.count_documents({})
        return {
            "status": "healthy",
            "connected": True,
            "database": MONGODB_DB_NAME,
            "uri": MONGODB_URI.split("@")[-1] if "@" in MONGODB_URI else MONGODB_URI,  # hide credentials if Atlas
            "counts": {
                "equipment": eq_count,
                "faults": fl_count,
                "maintenance": pm_count,
            },
        }
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        return {
            "status": "unhealthy",
            "connected": False,
            "database": MONGODB_DB_NAME,
            "error": f"MongoDB connection failed: {str(e)}",
            "counts": {"equipment": 0, "faults": 0, "maintenance": 0},
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "connected": False,
            "database": MONGODB_DB_NAME,
            "error": str(e),
            "counts": {"equipment": 0, "faults": 0, "maintenance": 0},
        }


# ─── Default Initial Datasets for Seeding ──────────────────────────────────
INITIAL_EQUIPMENT_DATA = [
  {"id": "PC-01", "type": "Desktop PC", "labId": "LAB-A", "labName": "Computer Lab A", "status": "healthy", "riskLevel": "low", "fault": None, "faultType": None, "lastMaintenance": "2026-09-10", "nextMaintenance": "2026-12-10", "cpu": 38, "ram": 45, "temp": 52, "uptime": "99.2%", "notes": "Operating within normal parameters."},
  {"id": "PC-02", "type": "Desktop PC", "labId": "LAB-A", "labName": "Computer Lab A", "status": "healthy", "riskLevel": "low", "fault": None, "faultType": None, "lastMaintenance": "2026-09-10", "nextMaintenance": "2026-12-10", "cpu": 42, "ram": 50, "temp": 55, "uptime": "98.7%", "notes": "Operating within normal parameters."},
  {"id": "PC-03", "type": "Desktop PC", "labId": "LAB-A", "labName": "Computer Lab A", "status": "healthy", "riskLevel": "low", "fault": None, "faultType": None, "lastMaintenance": "2026-08-22", "nextMaintenance": "2026-11-22", "cpu": 35, "ram": 40, "temp": 49, "uptime": "99.5%", "notes": "RAM recently upgraded."},
  {"id": "PC-04", "type": "Desktop PC", "labId": "LAB-A", "labName": "Computer Lab A", "status": "warning", "riskLevel": "medium", "fault": "Fan speed intermittently low", "faultType": "Cooling", "lastMaintenance": "2026-07-15", "nextMaintenance": "2026-10-20", "cpu": 61, "ram": 58, "temp": 72, "uptime": "96.1%", "notes": "Fan replacement scheduled."},
  {"id": "PC-05", "type": "Desktop PC", "labId": "LAB-A", "labName": "Computer Lab A", "status": "healthy", "riskLevel": "low", "fault": None, "faultType": None, "lastMaintenance": "2026-09-10", "nextMaintenance": "2026-12-10", "cpu": 44, "ram": 52, "temp": 57, "uptime": "98.9%", "notes": "Operating within normal parameters."},
  {"id": "PC-06", "type": "Desktop PC", "labId": "LAB-A", "labName": "Computer Lab A", "status": "healthy", "riskLevel": "low", "fault": None, "faultType": None, "lastMaintenance": "2026-09-10", "nextMaintenance": "2026-12-10", "cpu": 39, "ram": 48, "temp": 53, "uptime": "99.1%", "notes": "Operating within normal parameters."},
  {"id": "PC-07", "type": "Desktop PC", "labId": "LAB-A", "labName": "Computer Lab A", "status": "critical", "riskLevel": "high", "fault": "CPU temperature critically high — possible thermal paste failure", "faultType": "Overheating", "lastMaintenance": "2026-05-30", "nextMaintenance": "2026-10-17", "cpu": 94, "ram": 68, "temp": 91, "uptime": "81.3%", "notes": "Immediate inspection required. Do not power on without cooling check."},
  {"id": "PC-08", "type": "Desktop PC", "labId": "LAB-A", "labName": "Computer Lab A", "status": "healthy", "riskLevel": "low", "fault": None, "faultType": None, "lastMaintenance": "2026-09-10", "nextMaintenance": "2026-12-10", "cpu": 41, "ram": 46, "temp": 54, "uptime": "99.0%", "notes": "Operating within normal parameters."},
  {"id": "PC-09", "type": "Desktop PC", "labId": "LAB-B", "labName": "Computer Lab B", "status": "healthy", "riskLevel": "low", "fault": None, "faultType": None, "lastMaintenance": "2026-09-15", "nextMaintenance": "2026-12-15", "cpu": 36, "ram": 42, "temp": 50, "uptime": "99.4%", "notes": "Operating within normal parameters."},
  {"id": "PC-10", "type": "Desktop PC", "labId": "LAB-B", "labName": "Computer Lab B", "status": "healthy", "riskLevel": "low", "fault": None, "faultType": None, "lastMaintenance": "2026-09-15", "nextMaintenance": "2026-12-15", "cpu": 43, "ram": 49, "temp": 56, "uptime": "98.8%", "notes": "Operating within normal parameters."},
  {"id": "PC-11", "type": "Desktop PC", "labId": "LAB-B", "labName": "Computer Lab B", "status": "warning", "riskLevel": "medium", "fault": "HDD showing SMART pre-failure attribute", "faultType": "Storage", "lastMaintenance": "2026-06-20", "nextMaintenance": "2026-10-25", "cpu": 55, "ram": 60, "temp": 63, "uptime": "94.5%", "notes": "Back up user data; replace HDD at next maintenance window."},
  {"id": "PC-12", "type": "Desktop PC", "labId": "LAB-B", "labName": "Computer Lab B", "status": "healthy", "riskLevel": "low", "fault": None, "faultType": None, "lastMaintenance": "2026-09-15", "nextMaintenance": "2026-12-15", "cpu": 38, "ram": 44, "temp": 51, "uptime": "99.3%", "notes": "Fully operational. New SSD installed last cycle."},
  {"id": "PC-13", "type": "Desktop PC", "labId": "LAB-B", "labName": "Computer Lab B", "status": "healthy", "riskLevel": "low", "fault": None, "faultType": None, "lastMaintenance": "2026-09-15", "nextMaintenance": "2026-12-15", "cpu": 40, "ram": 47, "temp": 53, "uptime": "99.1%", "notes": "Operating within normal parameters."},
  {"id": "PC-14", "type": "Desktop PC", "labId": "LAB-B", "labName": "Computer Lab B", "status": "healthy", "riskLevel": "low", "fault": None, "faultType": None, "lastMaintenance": "2026-09-15", "nextMaintenance": "2026-12-15", "cpu": 37, "ram": 43, "temp": 50, "uptime": "99.5%", "notes": "Operating within normal parameters."},
  {"id": "PC-15", "type": "Desktop PC", "labId": "LAB-B", "labName": "Computer Lab B", "status": "warning", "riskLevel": "medium", "fault": "Intermittent freeze under high load — possible RAM issue", "faultType": "Performance", "lastMaintenance": "2026-07-01", "nextMaintenance": "2026-10-22", "cpu": 78, "ram": 87, "temp": 69, "uptime": "90.2%", "notes": "Run memtest86 at next available window."},
  {"id": "LAPTOP-01", "type": "Laptop", "labId": "LAB-A", "labName": "Computer Lab A", "status": "healthy", "riskLevel": "low", "fault": None, "faultType": None, "lastMaintenance": "2026-09-20", "nextMaintenance": "2026-12-20", "cpu": 33, "ram": 40, "temp": 48, "uptime": "99.0%", "notes": "Instructor demo laptop. OS recently updated."},
  {"id": "LAPTOP-02", "type": "Laptop", "labId": "LAB-B", "labName": "Computer Lab B", "status": "warning", "riskLevel": "medium", "fault": "Battery health at 62% — replacement recommended", "faultType": "Battery", "lastMaintenance": "2026-06-10", "nextMaintenance": "2026-10-18", "cpu": 48, "ram": 55, "temp": 61, "uptime": "95.0%", "notes": "Keep plugged in during use until battery replaced."},
  {"id": "PROJ-01", "type": "Projector", "labId": "LAB-A", "labName": "Computer Lab A", "status": "warning", "riskLevel": "medium", "fault": "Lamp hours approaching rated limit (3200 / 3500 hrs)", "faultType": "Lamp Life", "lastMaintenance": "2026-04-05", "nextMaintenance": "2026-10-19", "cpu": None, "ram": None, "temp": 74, "uptime": "93.1%", "notes": "Order replacement lamp. Current lamp may fail within 2–4 weeks."},
  {"id": "PROJ-02", "type": "Projector", "labId": "LAB-B", "labName": "Computer Lab B", "status": "healthy", "riskLevel": "low", "fault": None, "faultType": None, "lastMaintenance": "2026-08-30", "nextMaintenance": "2026-11-30", "cpu": None, "ram": None, "temp": 65, "uptime": "98.5%", "notes": "Lamp at 1800 hrs. Adequate life remaining."},
  {"id": "ROUTER-01", "type": "Network Router", "labId": "LAB-C", "labName": "Networking Lab", "status": "healthy", "riskLevel": "low", "fault": None, "faultType": None, "lastMaintenance": "2026-08-01", "nextMaintenance": "2026-11-01", "cpu": 25, "ram": 30, "temp": 42, "uptime": "99.9%", "notes": "Core lab router. Firmware up to date."},
  {"id": "ROUTER-02", "type": "Network Router", "labId": "LAB-A", "labName": "Computer Lab A", "status": "healthy", "riskLevel": "low", "fault": None, "faultType": None, "lastMaintenance": "2026-08-01", "nextMaintenance": "2026-11-01", "cpu": 22, "ram": 28, "temp": 40, "uptime": "99.8%", "notes": "Stable. Handles Lab A traffic distribution."},
  {"id": "ROUTER-03", "type": "Network Router", "labId": "LAB-C", "labName": "Networking Lab", "status": "critical", "riskLevel": "high", "fault": "Packet loss >12% on WAN interface — possible port failure", "faultType": "Network", "lastMaintenance": "2026-03-15", "nextMaintenance": "2026-10-16", "cpu": 88, "ram": 72, "temp": 78, "uptime": "72.4%", "notes": "Failover to backup router. Escalate to network admin."},
  {"id": "SWITCH-01", "type": "Network Switch", "labId": "LAB-C", "labName": "Networking Lab", "status": "healthy", "riskLevel": "low", "fault": None, "faultType": None, "lastMaintenance": "2026-08-01", "nextMaintenance": "2026-11-01", "cpu": 18, "ram": 20, "temp": 38, "uptime": "99.9%", "notes": "24-port managed switch. All ports operational."}
]

INITIAL_FAULTS_DATA = [
  {"id": "FL-001", "equipId": "PC-07", "labId": "LAB-A", "labName": "Computer Lab A", "category": "Hardware", "severity": "Critical", "description": "CPU temperature critically high (91 °C) — possible thermal paste breakdown under load.", "reportedDate": "2026-10-16 10:15", "reportedBy": "Prof. Rao (Lab Incharge)", "status": "Open", "technician": "", "repairNotes": "", "startedAt": None, "resolvedDate": None, "resolvedBy": None, "resolution": None, "repairHours": None},
  {"id": "FL-002", "equipId": "ROUTER-03", "labId": "LAB-C", "labName": "Networking Lab", "category": "Network", "severity": "Critical", "description": "Packet loss >12% on WAN interface — possible port failure or transceiver fault.", "reportedDate": "2026-10-16 09:30", "reportedBy": "Network Admin", "status": "Open", "technician": "", "repairNotes": "", "startedAt": None, "resolvedDate": None, "resolvedBy": None, "resolution": None, "repairHours": None},
  {"id": "FL-003", "equipId": "PC-04", "labId": "LAB-A", "labName": "Computer Lab A", "category": "Hardware", "severity": "Medium", "description": "Fan speed intermittently low and bearing noise observed during lab sessions.", "reportedDate": "2026-10-15 14:20", "reportedBy": "Lab Assistant (K. Sharma)", "status": "In Progress", "technician": "K. Sharma", "repairNotes": "Chassis opened. 92mm PWM cooling fan bearing is worn. Replacement fan requisitioned from hardware store.", "startedAt": "2026-10-15 16:00", "resolvedDate": None, "resolvedBy": None, "resolution": None, "repairHours": None},
  {"id": "FL-004", "equipId": "PC-11", "labId": "LAB-B", "labName": "Computer Lab B", "category": "Hardware", "severity": "High", "description": "HDD showing SMART pre-failure attribute (reallocated sector count > 45).", "reportedDate": "2026-10-15 16:45", "reportedBy": "Student (CSE Year 3)", "status": "Open", "technician": "", "repairNotes": "", "startedAt": None, "resolvedDate": None, "resolvedBy": None, "resolution": None, "repairHours": None},
  {"id": "FL-005", "equipId": "PC-15", "labId": "LAB-B", "labName": "Computer Lab B", "category": "Hardware", "severity": "Medium", "description": "Intermittent freeze under high compiler load — possible RAM address parity fault.", "reportedDate": "2026-10-14 11:10", "reportedBy": "Lab Assistant (M. Verma)", "status": "Open", "technician": "", "repairNotes": "", "startedAt": None, "resolvedDate": None, "resolvedBy": None, "resolution": None, "repairHours": None},
  {"id": "FL-006", "equipId": "LAPTOP-02", "labId": "LAB-B", "labName": "Computer Lab B", "category": "Power", "severity": "Medium", "description": "Battery health degraded to 62% — laptop shuts down abruptly when disconnected from AC.", "reportedDate": "2026-10-13 15:30", "reportedBy": "Faculty (Dr. S. Nair)", "status": "Open", "technician": "", "repairNotes": "", "startedAt": None, "resolvedDate": None, "resolvedBy": None, "resolution": None, "repairHours": None},
  {"id": "FL-007", "equipId": "PROJ-01", "labId": "LAB-A", "labName": "Computer Lab A", "category": "Other", "severity": "Low", "description": "Projector lamp hours approaching rated limit (3200 / 3500 hrs). Dimming visible.", "reportedDate": "2026-10-12 16:00", "reportedBy": "Prof. Rao (Lab Incharge)", "status": "Open", "technician": "", "repairNotes": "", "startedAt": None, "resolvedDate": None, "resolvedBy": None, "resolution": None, "repairHours": None},
  {"id": "FL-008", "equipId": "PC-12", "labId": "LAB-B", "labName": "Computer Lab B", "category": "Hardware", "severity": "High", "description": "Old mechanical hard drive throwing unrecoverable I/O errors during morning boot.", "reportedDate": "2026-10-08 09:00", "reportedBy": "Lab Assistant (M. Verma)", "status": "Resolved", "technician": "M. Verma", "repairNotes": "Cloned user volume to backup server before disk failed completely.", "startedAt": "2026-10-08 10:30", "resolvedDate": "2026-10-08 14:30", "resolvedBy": "M. Verma", "resolution": "Installed new Crucial 500GB NVMe SSD, flashed Windows 11 Education lab image, all health tests passed.", "repairHours": 3.5},
  {"id": "FL-009", "equipId": "LAPTOP-01", "labId": "LAB-A", "labName": "Computer Lab A", "category": "Software", "severity": "Low", "description": "External HDMI display resolution flickering when connected to ceiling projector.", "reportedDate": "2026-10-09 13:15", "reportedBy": "Instructor Demo", "status": "Resolved", "technician": "K. Sharma", "repairNotes": "Suspected display driver handshake issue over long HDMI extender cable.", "startedAt": "2026-10-09 14:00", "resolvedDate": "2026-10-09 15:00", "resolvedBy": "K. Sharma", "resolution": "Updated Intel UHD Graphics drivers to v31.0.101 and set EDID lock on HDMI extender.", "repairHours": 1.0}
]

INITIAL_MAINTENANCE_DATA = [
  {"id": "PM-001", "equipId": "ROUTER-03", "labId": "LAB-C", "labName": "Networking Lab", "taskType": "Network Port & Interface Inspection", "scheduledDate": "2026-10-16", "lastMaintenance": "2026-03-15", "assignedTo": "Network Admin", "notes": "Inspect WAN transceiver optics and test interface packet rate.", "status": "Overdue", "completedDate": None, "completedBy": None, "completionNotes": None},
  {"id": "PM-002", "equipId": "PC-07", "labId": "LAB-A", "labName": "Computer Lab A", "taskType": "Hardware Cleaning & Thermal Repaste", "scheduledDate": "2026-10-17", "lastMaintenance": "2026-05-30", "assignedTo": "K. Sharma", "notes": "Thermal paste renewal, dust heatsink and check fan tachometer pin.", "status": "Due", "completedDate": None, "completedBy": None, "completionNotes": None},
  {"id": "PM-003", "equipId": "LAPTOP-02", "labId": "LAB-B", "labName": "Computer Lab B", "taskType": "Battery Calibration / Replacement", "scheduledDate": "2026-10-18", "lastMaintenance": "2026-06-10", "assignedTo": "M. Verma", "notes": "Install replacement OEM 4-cell battery module and run discharge test.", "status": "Due", "completedDate": None, "completedBy": None, "completionNotes": None},
  {"id": "PM-004", "equipId": "PROJ-01", "labId": "LAB-A", "labName": "Computer Lab A", "taskType": "Lamp & Filter Servicing", "scheduledDate": "2026-10-19", "lastMaintenance": "2026-04-05", "assignedTo": "K. Sharma", "notes": "Replace projector lamp bulb and vacuum electrostatic air intake filters.", "status": "Due", "completedDate": None, "completedBy": None, "completionNotes": None},
  {"id": "PM-005", "equipId": "PC-04", "labId": "LAB-A", "labName": "Computer Lab A", "taskType": "Preventive Maintenance", "scheduledDate": "2026-10-20", "lastMaintenance": "2026-07-15", "assignedTo": "K. Sharma", "notes": "Install replacement chassis fan and verify RPM sensor feedback.", "status": "Due", "completedDate": None, "completedBy": None, "completionNotes": None},
  {"id": "PM-006", "equipId": "PC-15", "labId": "LAB-B", "labName": "Computer Lab B", "taskType": "Memory Diagnostic (MemTest)", "scheduledDate": "2026-10-22", "lastMaintenance": "2026-07-01", "assignedTo": "M. Verma", "notes": "Run 4 passes of MemTest86 on DDR4 dual-channel sticks.", "status": "Due", "completedDate": None, "completedBy": None, "completionNotes": None},
  {"id": "PM-007", "equipId": "PC-11", "labId": "LAB-B", "labName": "Computer Lab B", "taskType": "Storage / SSD Health Check", "scheduledDate": "2026-10-25", "lastMaintenance": "2026-06-20", "assignedTo": "M. Verma", "notes": "Replace degraded HDD with SATA SSD and verify SMART attributes.", "status": "Scheduled", "completedDate": None, "completedBy": None, "completionNotes": None},
  {"id": "PM-008", "equipId": "PC-12", "labId": "LAB-B", "labName": "Computer Lab B", "taskType": "Preventive Maintenance", "scheduledDate": "2026-09-15", "lastMaintenance": "2026-09-15", "assignedTo": "M. Verma", "notes": "SSD upgrade and system tuneup complete.", "status": "Completed", "completedDate": "2026-09-15", "completedBy": "M. Verma", "completionNotes": "Cleaned interior, installed SSD, booted to Windows, confirmed healthy."}
]


def seed_database(custom_equipment=None, custom_faults=None, custom_maintenance=None):
    """
    Safely seed empty MongoDB collections.
    If custom data (e.g. from browser localStorage migration) is provided,
    that data is used instead of static mock data.
    Does NOT overwrite non-empty collections or duplicate existing documents.
    """
    seeded_info = {"equipment": 0, "faults": 0, "maintenance": 0}

    # 1. Equipment Collection
    if equipment_col.count_documents({}) == 0:
        data_to_insert = custom_equipment if (custom_equipment and len(custom_equipment) > 0) else INITIAL_EQUIPMENT_DATA
        # Ensure no _id clashes
        cleaned_list = [dict(d) for d in data_to_insert]
        for d in cleaned_list:
            d.pop("_id", None)
        if cleaned_list:
            equipment_col.insert_many(cleaned_list)
            seeded_info["equipment"] = len(cleaned_list)
            print(f"[db] Seeded {len(cleaned_list)} equipment records into MongoDB.")

    # 2. Faults Collection
    if faults_col.count_documents({}) == 0:
        data_to_insert = custom_faults if (custom_faults and len(custom_faults) > 0) else INITIAL_FAULTS_DATA
        cleaned_list = [dict(d) for d in data_to_insert]
        for d in cleaned_list:
            d.pop("_id", None)
        if cleaned_list:
            faults_col.insert_many(cleaned_list)
            seeded_info["faults"] = len(cleaned_list)
            print(f"[db] Seeded {len(cleaned_list)} fault records into MongoDB.")

    # 3. Maintenance Collection
    if maintenance_col.count_documents({}) == 0:
        data_to_insert = custom_maintenance if (custom_maintenance and len(custom_maintenance) > 0) else INITIAL_MAINTENANCE_DATA
        cleaned_list = [dict(d) for d in data_to_insert]
        for d in cleaned_list:
            d.pop("_id", None)
        if cleaned_list:
            maintenance_col.insert_many(cleaned_list)
            seeded_info["maintenance"] = len(cleaned_list)
            print(f"[db] Seeded {len(cleaned_list)} maintenance records into MongoDB.")

    return seeded_info


# Try to initialize indexes on startup if connected
try:
    init_indexes()
    apply_schema_validation()
except Exception as e:
    print(f"[db] Note: Startup index/schema check deferred ({e})")
