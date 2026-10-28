# backend/app.py
# ─────────────────────────────────────────────────────────────────────────────
# LabPulse — Flask REST API Server
# Course: CSE494 Intelligent NoSQL Databases
# ─────────────────────────────────────────────────────────────────────────────
#
# Step 5 Endpoints Added:
#   GET  /api/faults?q=<keyword>         — Full-text search using $text / $search
#   GET  /api/analytics/equipment-by-lab — Aggregation: group equipment by lab
#   GET  /api/analytics/fault-analysis   — Aggregation: fault severity/category stats
#   GET  /api/analytics/maintenance-summary — Aggregation: maintenance status counts
#   GET  /api/analytics/overview-summary — Aggregation: overall system health
#   GET  /api/database/query-performance — explain('executionStats') for compound query
#   GET  /api/database/indexes           — List all indexes on all collections
#   GET  /api/database/validation        — Schema validator metadata per collection
# ─────────────────────────────────────────────────────────────────────────────

import os
import sys
import re
import json
from datetime import datetime, timedelta

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

# Load environment configuration from backend/.env or root .env
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

import db

# Path to static frontend dist folder (if built for production)
FRONTEND_DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist"))

app = Flask(
    __name__,
    static_folder=FRONTEND_DIST_DIR if os.path.exists(FRONTEND_DIST_DIR) else None,
    static_url_path=""
)
# Enable CORS for all routes so frontend development server can connect seamlessly
CORS(app, resources={r"/api/*": {"origins": "*"}})

PORT = int(os.getenv("PORT", 5000))


# ─── 0. Root & Frontend / API Documentation Endpoints ────────────────────────

@app.route("/api", methods=["GET"])
@app.route("/api/", methods=["GET"])
def api_docs():
    """
    API documentation endpoint providing service state and available endpoints.
    """
    return jsonify({
        "service": "LabPulse REST API",
        "status": "online",
        "course": "CSE494: Intelligent NoSQL Databases",
        "endpoints": {
            "health": "/api/health",
            "equipment": "/api/equipment",
            "faults": "/api/faults",
            "maintenance": "/api/maintenance",
            "predictions": "/api/predictions",
            "insights_aggregation": "/api/insights/aggregation",
            "insights_schema": "/api/insights/schema",
            "insights_indexes": "/api/insights/indexes"
        }
    }), 200


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    """
    Serve static files from the React frontend 'dist' directory.
    Enables single-container fullstack deployment without separate web server.
    """
    # Let /api routes return 404 if not matched by explicit endpoints
    if path.startswith("api/") or path == "api":
        return jsonify({"error": "API endpoint not found"}), 404

    if os.path.exists(FRONTEND_DIST_DIR):
        file_path = os.path.join(FRONTEND_DIST_DIR, path)
        if path != "" and os.path.exists(file_path) and os.path.isfile(file_path):
            return send_from_directory(FRONTEND_DIST_DIR, path)
        return send_from_directory(FRONTEND_DIST_DIR, "index.html")

    return jsonify({
        "service": "LabPulse REST API",
        "status": "online",
        "message": "Frontend build not found in dist/. Run 'npm run build' or run 'npm run dev' on port 5173."
    }), 200


# ─── 1. Health & Connection Endpoint ─────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    """
    Check MongoDB connectivity using client admin ping command.
    Returns connection status, database name, and collection counts.
    Never reports connected when ping fails.
    """
    health_info = db.check_health()
    status_code = 200 if health_info["connected"] else 503
    return jsonify(health_info), status_code


# ─── 2. Migration & Seeding Endpoint ─────────────────────────────────────────

@app.route("/api/migrate", methods=["POST"])
def migrate_data():
    """
    One-time migration endpoint:
    If database collections are empty, seeds from browser localStorage records
    or falls back to initial demo data.
    Never overwrites nonempty database collections or duplicates records.
    """
    try:
        payload = request.get_json(silent=True) or {}
        custom_equipment = payload.get("equipment")
        custom_faults = payload.get("faults")
        custom_maintenance = payload.get("maintenance")

        seeded_info = db.seed_database(
            custom_equipment=custom_equipment,
            custom_faults=custom_faults,
            custom_maintenance=custom_maintenance
        )

        counts = {
            "equipment": db.equipment_col.count_documents({}),
            "faults": db.faults_col.count_documents({}),
            "maintenance": db.maintenance_col.count_documents({}),
        }

        return jsonify({
            "success": True,
            "message": "Migration check completed.",
            "seeded": seeded_info,
            "counts": counts,
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/reset-demo", methods=["POST"])
def reset_demo():
    """
    Admin helper to reset database collections back to initial demo data.
    """
    try:
        db.equipment_col.delete_many({})
        db.faults_col.delete_many({})
        db.maintenance_col.delete_many({})
        seeded = db.seed_database()
        return jsonify({"success": True, "message": "Database reset to initial demo state", "seeded": seeded}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ─── 3. Equipment CRUD Endpoints ─────────────────────────────────────────────

@app.route("/api/equipment", methods=["GET"])
def list_equipment():
    """List all equipment documents from MongoDB."""
    try:
        cursor = db.equipment_col.find({}, {"_id": 0})
        equipment_list = list(cursor)
        return jsonify(equipment_list), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve equipment: {str(e)}"}), 500


@app.route("/api/equipment/<equipment_id>", methods=["GET"])
def get_equipment(equipment_id):
    """Retrieve one equipment document by ID."""
    try:
        regex_id = re.compile(f"^{re.escape(equipment_id)}$", re.IGNORECASE)
        doc = db.equipment_col.find_one({"id": regex_id}, {"_id": 0})
        if not doc:
            return jsonify({"error": f"Equipment '{equipment_id}' not found"}), 404
        return jsonify(doc), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/equipment", methods=["POST"])
def create_equipment():
    """Create a new equipment document with validation and uniqueness enforcement."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        equip_id = data.get("id", "").strip().upper()
        if not equip_id:
            return jsonify({"error": "Equipment ID is required"}), 400

        equip_type = data.get("type", "").strip()
        if not equip_type:
            return jsonify({"error": "Equipment type is required"}), 400

        lab_id = data.get("labId", "").strip()
        if not lab_id:
            return jsonify({"error": "Laboratory ID is required"}), 400

        # Enforce unique equipment ID
        regex_id = re.compile(f"^{re.escape(equip_id)}$", re.IGNORECASE)
        existing = db.equipment_col.find_one({"id": regex_id})
        if existing:
            return jsonify({"error": f"Equipment ID '{equip_id}' already exists. ID must be unique."}), 400

        # Construct sanitized document
        new_equipment = {
            "id": equip_id,
            "type": equip_type,
            "labId": lab_id,
            "labName": data.get("labName", f"Lab {lab_id}"),
            "status": data.get("status", "healthy"),
            "riskLevel": data.get("riskLevel", "low"),
            "fault": data.get("fault") or None,
            "faultType": data.get("faultType") or None,
            "lastMaintenance": data.get("lastMaintenance") or datetime.now().strftime("%Y-%m-%d"),
            "nextMaintenance": data.get("nextMaintenance") or None,
            "cpu": int(data["cpu"]) if (data.get("cpu") not in (None, "")) else None,
            "ram": int(data["ram"]) if (data.get("ram") not in (None, "")) else None,
            "temp": int(data["temp"]) if (data.get("temp") not in (None, "")) else None,
            "uptime": data.get("uptime") or "99.9%",
            "notes": (data.get("notes") or "").strip(),
        }

        db.equipment_col.insert_one(new_equipment)
        return jsonify(db.clean_doc(new_equipment)), 201
    except Exception as e:
        return jsonify({"error": f"Failed to create equipment: {str(e)}"}), 500


@app.route("/api/equipment/<equipment_id>", methods=["PUT"])
def update_equipment(equipment_id):
    """Update equipment fields."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        regex_id = re.compile(f"^{re.escape(equipment_id)}$", re.IGNORECASE)
        existing = db.equipment_col.find_one({"id": regex_id})
        if not existing:
            return jsonify({"error": f"Equipment '{equipment_id}' not found"}), 404

        # Disallow changing the primary ID in update
        updates = dict(data)
        updates.pop("id", None)
        updates.pop("_id", None)

        # Normalize numeric fields
        for num_field in ["cpu", "ram", "temp"]:
            if num_field in updates:
                val = updates[num_field]
                updates[num_field] = int(val) if val not in (None, "") else None

        db.equipment_col.update_one({"id": regex_id}, {"$set": updates})
        updated = db.equipment_col.find_one({"id": regex_id}, {"_id": 0})
        return jsonify(updated), 200
    except Exception as e:
        return jsonify({"error": f"Failed to update equipment: {str(e)}"}), 500


@app.route("/api/equipment/<equipment_id>", methods=["DELETE"])
def delete_equipment(equipment_id):
    """
    Safely delete equipment:
    Prevents deletion when active unresolved faults or scheduled maintenance
    would be orphaned.
    """
    try:
        regex_id = re.compile(f"^{re.escape(equipment_id)}$", re.IGNORECASE)
        existing = db.equipment_col.find_one({"id": regex_id})
        if not existing:
            return jsonify({"error": f"Equipment '{equipment_id}' not found"}), 404

        # Restriction check 1: Active faults
        active_faults_count = db.faults_col.count_documents({
            "equipId": regex_id,
            "status": {"$ne": "Resolved"}
        })
        if active_faults_count > 0:
            return jsonify({
                "error": f"Cannot delete equipment '{equipment_id}' because it has {active_faults_count} active unresolved fault incident(s). Please resolve or dismiss all active incidents before removing this equipment."
            }), 400

        # Restriction check 2: Scheduled or overdue maintenance
        pending_maintenance_count = db.maintenance_col.count_documents({
            "equipId": regex_id,
            "status": {"$in": ["Due", "Overdue", "Scheduled"]}
        })
        if pending_maintenance_count > 0:
            return jsonify({
                "error": f"Cannot delete equipment '{equipment_id}' because it has {pending_maintenance_count} pending or overdue maintenance schedule(s). Complete or cancel scheduled maintenance before deletion."
            }), 400

        # Safe to delete
        db.equipment_col.delete_one({"id": regex_id})
        return jsonify({
            "success": True,
            "message": f"Equipment '{equipment_id}' deleted successfully."
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to delete equipment: {str(e)}"}), 500


# ─── 4. Fault Incidents Endpoints ────────────────────────────────────────────

@app.route("/api/faults", methods=["GET"])
def list_faults():
    """
    List all fault reports from MongoDB.

    Full-Text Search (Step 5):
      If ?q=<keyword> query parameter is provided, MongoDB's $text operator
      is used to search across the indexed 'description' field.

      MongoDB Text Search works as follows:
        1. The $text operator requires a text index on the collection.
        2. $search splits the query into tokens (words).
        3. MongoDB matches documents where ANY indexed field contains the token.
        4. Results can be sorted by relevance score using { $meta: 'textScore' }.

      Example URL: GET /api/faults?q=overheating
      This would return faults mentioning overheating in their description.
    """
    try:
        search_query = request.args.get("q", "").strip()

        if search_query:
            # $text/$search uses the text index we created on 'description'
            # $meta textScore sorts results by relevance (most relevant first)
            cursor = db.faults_col.find(
                {"$text": {"$search": search_query}},
                {"_id": 0, "score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})])
            faults_list = list(cursor)
            # Remove the score field (it's only for sorting)
            for f in faults_list:
                f.pop("score", None)
            return jsonify({"results": faults_list, "query": search_query, "count": len(faults_list)}), 200

        cursor = db.faults_col.find({}, {"_id": 0})
        faults_list = list(cursor)
        return jsonify(faults_list), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve faults: {str(e)}"}), 500


@app.route("/api/faults/<fault_id>", methods=["GET"])
def get_fault(fault_id):
    """Retrieve one fault record by ID."""
    try:
        regex_id = re.compile(f"^{re.escape(fault_id)}$", re.IGNORECASE)
        doc = db.faults_col.find_one({"id": regex_id}, {"_id": 0})
        if not doc:
            return jsonify({"error": f"Fault incident '{fault_id}' not found"}), 404
        return jsonify(doc), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/faults", methods=["POST"])
def create_fault():
    """
    Report a new fault incident.
    Validates referenced equipment, creates fault document,
    and synchronizes equipment operational status in MongoDB.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        equip_id = data.get("equipId", "").strip().upper()
        if not equip_id:
            return jsonify({"error": "Target equipment ID is required"}), 400

        # Validate that referenced equipment exists
        equip_regex = re.compile(f"^{re.escape(equip_id)}$", re.IGNORECASE)
        equip = db.equipment_col.find_one({"id": equip_regex})
        if not equip:
            return jsonify({"error": f"Referenced equipment '{equip_id}' does not exist in registry."}), 400

        description = (data.get("description") or "").strip()
        if not description:
            return jsonify({"error": "Fault description is required."}), 400

        category = data.get("category", "Hardware")
        severity = data.get("severity", "High")

        # Auto-generate unique ID: FL-010, FL-011, etc.
        fault_id = data.get("id", "").strip().upper()
        if not fault_id:
            all_faults = list(db.faults_col.find({}, {"id": 1}))
            max_num = 0
            for f in all_faults:
                m = re.match(r"^FL-(\d+)$", f.get("id", ""))
                if m:
                    max_num = max(max_num, int(m.group(1)))
            fault_id = f"FL-{str(max_num + 1).zfill(3)}"

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

        new_fault = {
            "id": fault_id,
            "equipId": equip["id"],
            "labId": equip.get("labId", "LAB-A"),
            "labName": equip.get("labName", "Computer Lab A"),
            "category": category,
            "severity": severity,
            "description": description,
            "reportedDate": data.get("reportedDate") or now_str,
            "reportedBy": data.get("reportedBy") or "Lab Assistant",
            "status": "Open",
            "technician": "",
            "repairNotes": "",
            "startedAt": None,
            "resolvedDate": None,
            "resolvedBy": None,
            "resolution": None,
            "repairHours": None,
        }

        # Insert fault
        db.faults_col.insert_one(new_fault)

        # Synchronize equipment status in MongoDB according to severity
        new_status = equip.get("status", "healthy")
        new_risk = equip.get("riskLevel", "low")

        if severity == "Critical":
            new_status = "critical"
            new_risk = "high"
        elif severity == "High":
            new_status = "critical" if equip.get("status") == "critical" else "warning"
            new_risk = "high"
        elif severity == "Medium":
            new_status = "critical" if equip.get("status") == "critical" else "warning"
            new_risk = "high" if equip.get("riskLevel") == "high" else "medium"
        else: # Low
            if equip.get("status") == "healthy":
                new_status = "warning"
            new_risk = equip.get("riskLevel", "low")

        db.equipment_col.update_one(
            {"id": equip_regex},
            {"$set": {
                "status": new_status,
                "riskLevel": new_risk,
                "fault": description,
                "faultType": category,
            }}
        )

        return jsonify(db.clean_doc(new_fault)), 201
    except Exception as e:
        return jsonify({"error": f"Failed to report fault: {str(e)}"}), 500


@app.route("/api/faults/<fault_id>", methods=["PUT"])
def update_fault(fault_id):
    """
    Update fault incident (start repair, update notes, resolve incident).
    Synchronizes equipment operational status upon resolution.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        regex_id = re.compile(f"^{re.escape(fault_id)}$", re.IGNORECASE)
        existing_fault = db.faults_col.find_one({"id": regex_id})
        if not existing_fault:
            return jsonify({"error": f"Fault incident '{fault_id}' not found"}), 404

        updates = dict(data)
        updates.pop("id", None)
        updates.pop("_id", None)

        is_marking_resolved = (updates.get("status") == "Resolved") or (
            existing_fault.get("status") == "Resolved" and "resolution" in updates
        )

        if updates.get("status") == "Resolved":
            resolution = (updates.get("resolution") or existing_fault.get("resolution") or "").strip()
            if not resolution:
                return jsonify({"error": "Resolution description is required to resolve incident."}), 400

            repair_hours = updates.get("repairHours")
            if repair_hours is not None:
                try:
                    hours_float = float(repair_hours)
                    if hours_float < 0:
                        return jsonify({"error": "Repair duration must be non-negative."}), 400
                    updates["repairHours"] = hours_float
                except ValueError:
                    return jsonify({"error": "Repair duration must be a valid number."}), 400

            if not updates.get("resolvedDate"):
                updates["resolvedDate"] = datetime.now().strftime("%Y-%m-%d %H:%M")

        # Update fault document
        db.faults_col.update_one({"id": regex_id}, {"$set": updates})
        updated_fault = db.faults_col.find_one({"id": regex_id}, {"_id": 0})

        # Equipment synchronization if status changed to Resolved
        if updates.get("status") == "Resolved":
            equip_id = existing_fault.get("equipId")
            equip_regex = re.compile(f"^{re.escape(equip_id)}$", re.IGNORECASE)

            # Check if there are other active faults remaining on this equipment
            other_active = list(db.faults_col.find({
                "equipId": equip_regex,
                "id": {"$ne": existing_fault["id"]},
                "status": {"$ne": "Resolved"}
            }))

            if other_active:
                # Still has active faults: do not mark healthy!
                sev_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
                highest_fault = sorted(other_active, key=lambda f: sev_order.get(f.get("severity"), 9))[0]

                is_critical = highest_fault.get("severity") == "Critical"
                is_high = highest_fault.get("severity") == "High"

                db.equipment_col.update_one(
                    {"id": equip_regex},
                    {"$set": {
                        "status": "critical" if is_critical else "warning",
                        "riskLevel": "high" if (is_critical or is_high) else ("medium" if highest_fault.get("severity") == "Medium" else "low"),
                        "fault": highest_fault.get("description"),
                        "faultType": highest_fault.get("category"),
                    }}
                )
            else:
                # All active faults resolved: mark equipment healthy!
                db.equipment_col.update_one(
                    {"id": equip_regex},
                    {"$set": {
                        "status": "healthy",
                        "riskLevel": "low",
                        "fault": None,
                        "faultType": None,
                    }}
                )

        return jsonify(updated_fault), 200
    except Exception as e:
        return jsonify({"error": f"Failed to update fault incident: {str(e)}"}), 500


# ─── 5. Maintenance Scheduling Endpoints ─────────────────────────────────────

@app.route("/api/maintenance", methods=["GET"])
def list_maintenance():
    """List all maintenance schedule documents from MongoDB."""
    try:
        cursor = db.maintenance_col.find({}, {"_id": 0})
        maint_list = list(cursor)
        return jsonify(maint_list), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve maintenance tasks: {str(e)}"}), 500


@app.route("/api/maintenance", methods=["POST"])
def schedule_maintenance():
    """
    Schedule a new preventive maintenance task.
    Validates referenced equipment and updates equipment's nextMaintenance.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        equip_id = data.get("equipId", "").strip().upper()
        if not equip_id:
            return jsonify({"error": "Target equipment ID is required"}), 400

        equip_regex = re.compile(f"^{re.escape(equip_id)}$", re.IGNORECASE)
        equip = db.equipment_col.find_one({"id": equip_regex})
        if not equip:
            return jsonify({"error": f"Referenced equipment '{equip_id}' not found in registry."}), 400

        scheduled_date = (data.get("scheduledDate") or "").strip()
        if not scheduled_date:
            return jsonify({"error": "Scheduled maintenance date is required."}), 400

        # Auto-generate unique ID: PM-009, PM-010, etc.
        task_id = data.get("id", "").strip().upper()
        if not task_id:
            all_tasks = list(db.maintenance_col.find({}, {"id": 1}))
            max_num = 0
            for t in all_tasks:
                m = re.match(r"^PM-(\d+)$", t.get("id", ""))
                if m:
                    max_num = max(max_num, int(m.group(1)))
            task_id = f"PM-{str(max_num + 1).zfill(3)}"

        # Compute initial status based on date
        today_str = datetime.now().strftime("%Y-%m-%d")
        seven_days_later = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")

        status = "Scheduled"
        if scheduled_date < today_str:
            status = "Overdue"
        elif scheduled_date <= seven_days_later:
            status = "Due"

        new_task = {
            "id": task_id,
            "equipId": equip["id"],
            "labId": equip.get("labId", "LAB-A"),
            "labName": equip.get("labName", "Computer Lab A"),
            "taskType": data.get("taskType", "Preventive Maintenance"),
            "scheduledDate": scheduled_date,
            "lastMaintenance": equip.get("lastMaintenance", "Not recorded"),
            "assignedTo": data.get("assignedTo", "Assigned Technician"),
            "notes": (data.get("notes") or "").strip(),
            "status": status,
            "completedDate": None,
            "completedBy": None,
            "completionNotes": None,
        }

        db.maintenance_col.insert_one(new_task)

        # Update equipment nextMaintenance date
        db.equipment_col.update_one(
            {"id": equip_regex},
            {"$set": {"nextMaintenance": scheduled_date}}
        )

        return jsonify(db.clean_doc(new_task)), 201
    except Exception as e:
        return jsonify({"error": f"Failed to schedule maintenance: {str(e)}"}), 500


@app.route("/api/maintenance/<maintenance_id>", methods=["PUT"])
def update_maintenance(maintenance_id):
    """
    Reschedule maintenance or mark maintenance completed.
    When completed, updates equipment's lastMaintenance to completion date
    and resets nextMaintenance.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        regex_id = re.compile(f"^{re.escape(maintenance_id)}$", re.IGNORECASE)
        existing = db.maintenance_col.find_one({"id": regex_id})
        if not existing:
            return jsonify({"error": f"Maintenance task '{maintenance_id}' not found"}), 404

        updates = dict(data)
        updates.pop("id", None)
        updates.pop("_id", None)

        equip_id = existing.get("equipId")
        equip_regex = re.compile(f"^{re.escape(equip_id)}$", re.IGNORECASE)

        # CASE 1: Marking maintenance completed
        if updates.get("status") == "Completed":
            completion_date = updates.get("completedDate") or datetime.now().strftime("%Y-%m-%d")
            updates["completedDate"] = completion_date
            updates["completedBy"] = updates.get("completedBy") or existing.get("assignedTo") or "Lab Technician"
            updates["completionNotes"] = updates.get("completionNotes") or "Maintenance completed successfully."

            # Calculate next cycle: default 90 days if not provided
            next_date = updates.pop("nextScheduledDate", None)
            if not next_date:
                try:
                    c_dt = datetime.strptime(completion_date, "%Y-%m-%d")
                    next_date = (c_dt + timedelta(days=90)).strftime("%Y-%m-%d")
                except Exception:
                    next_date = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")

            # Update equipment in MongoDB
            db.equipment_col.update_one(
                {"id": equip_regex},
                {"$set": {
                    "lastMaintenance": completion_date,
                    "nextMaintenance": next_date,
                }}
            )

        # CASE 2: Rescheduling date
        elif "scheduledDate" in updates:
            new_date = updates["scheduledDate"]
            today_str = datetime.now().strftime("%Y-%m-%d")
            seven_days = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")

            if new_date < today_str:
                updates["status"] = "Overdue"
            elif new_date <= seven_days:
                updates["status"] = "Due"
            else:
                updates["status"] = "Scheduled"

            # Sync equipment nextMaintenance
            db.equipment_col.update_one(
                {"id": equip_regex},
                {"$set": {"nextMaintenance": new_date}}
            )

        db.maintenance_col.update_one({"id": regex_id}, {"$set": updates})
        updated = db.maintenance_col.find_one({"id": regex_id}, {"_id": 0})
        return jsonify(updated), 200
    except Exception as e:
        return jsonify({"error": f"Failed to update maintenance: {str(e)}"}), 500


# ─── 6. Analytics & Database Insight Endpoints (Step 5) ──────────────────────
#
# MongoDB Aggregation Pipelines:
#   Aggregation is MongoDB's way of processing and transforming data.
#   Think of it like SQL's GROUP BY + SUM + AVG, but much more powerful.
#
#   An aggregation pipeline is an ARRAY of stages. Each stage transforms
#   the documents as they flow through (like Unix pipes).
#
#   Common pipeline stages used here:
#     $match  — Filter documents (like SQL WHERE). Always put early for efficiency!
#     $group  — Group documents by a key and compute aggregates (_id is the group key)
#     $sort   — Sort documents (ASCENDING = 1, DESCENDING = -1)
#     $project — Reshape output documents (include/exclude fields, rename fields)
#     $avg    — Compute the average of a numeric field within each group
#     $sum    — Compute the sum (can also count documents with {$sum: 1})
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/analytics/equipment-by-lab", methods=["GET"])
def analytics_equipment_by_lab():
    """
    Aggregation: Equipment count and health breakdown grouped by laboratory.

    Pipeline stages:
      $group  → Group all equipment documents by labId
                Compute: total count, healthy count, warning count, critical count
      $project → Rename _id to labId, add labName, keep computed fields
      $sort   → Sort by labId alphabetically for consistent display

    SQL Equivalent:
      SELECT labId, COUNT(*) as total,
             SUM(CASE WHEN status='healthy' THEN 1 ELSE 0 END) as healthy,
             SUM(CASE WHEN status='warning' THEN 1 ELSE 0 END) as warning,
             SUM(CASE WHEN status='critical' THEN 1 ELSE 0 END) as critical
      FROM equipment
      GROUP BY labId
      ORDER BY labId;
    """
    try:
        pipeline = [
            # Stage 1: $group — Group by labId, count equipment per status
            {
                "$group": {
                    "_id": "$labId",
                    "labName":  {"$first": "$labName"},
                    "total":    {"$sum": 1},
                    "healthy":  {"$sum": {"$cond": [{"$eq": ["$status", "healthy"]},  1, 0]}},
                    "warning":  {"$sum": {"$cond": [{"$eq": ["$status", "warning"]},  1, 0]}},
                    "critical": {"$sum": {"$cond": [{"$eq": ["$status", "critical"]}, 1, 0]}},
                    "avgCpu":   {"$avg": "$cpu"},
                    "avgTemp":  {"$avg": "$temp"},
                }
            },
            # Stage 2: $project — Reshape the output document
            {
                "$project": {
                    "_id": 0,
                    "labId":   "$_id",
                    "labName": 1,
                    "total":   1,
                    "healthy": 1,
                    "warning": 1,
                    "critical":1,
                    "avgCpu":  {"$round": ["$avgCpu", 1]},
                    "avgTemp": {"$round": ["$avgTemp", 1]},
                }
            },
            # Stage 3: $sort — Sort alphabetically by labId
            {"$sort": {"labId": 1}}
        ]
        result = list(db.equipment_col.aggregate(pipeline))
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": f"Aggregation failed: {str(e)}"}), 500


@app.route("/api/analytics/fault-analysis", methods=["GET"])
def analytics_fault_analysis():
    """
    Aggregation: Fault statistics grouped by severity level.

    For each severity (Critical, High, Medium, Low) compute:
      - total faults reported
      - how many are open, in-progress, or resolved
      - average repair hours (only for resolved faults with repairHours recorded)

    Pipeline:
      $group by severity → compute counts and average repair hours
      $sort by severity order (Critical first)
    """
    try:
        # Fault severity pipeline
        severity_pipeline = [
            {
                "$group": {
                    "_id": "$severity",
                    "total":      {"$sum": 1},
                    "open":       {"$sum": {"$cond": [{"$eq": ["$status", "Open"]},        1, 0]}},
                    "inProgress": {"$sum": {"$cond": [{"$eq": ["$status", "In Progress"]}, 1, 0]}},
                    "resolved":   {"$sum": {"$cond": [{"$eq": ["$status", "Resolved"]},    1, 0]}},
                    "avgRepairHours": {"$avg": "$repairHours"},
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "severity":       "$_id",
                    "total":          1,
                    "open":           1,
                    "inProgress":     1,
                    "resolved":       1,
                    "avgRepairHours": {"$round": ["$avgRepairHours", 2]},
                }
            },
            {"$sort": {"total": -1}}  # Sort by most faults first
        ]

        # Category pipeline
        category_pipeline = [
            {
                "$group": {
                    "_id": "$category",
                    "count": {"$sum": 1},
                    "resolved": {"$sum": {"$cond": [{"$eq": ["$status", "Resolved"]}, 1, 0]}},
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "category": "$_id",
                    "count":    1,
                    "resolved": 1,
                }
            },
            {"$sort": {"count": -1}}
        ]

        severity_result  = list(db.faults_col.aggregate(severity_pipeline))
        category_result  = list(db.faults_col.aggregate(category_pipeline))
        total_faults     = db.faults_col.count_documents({})
        open_faults      = db.faults_col.count_documents({"status": {"$ne": "Resolved"}})
        resolved_faults  = db.faults_col.count_documents({"status": "Resolved"})

        return jsonify({
            "bySeverity": severity_result,
            "byCategory": category_result,
            "totals": {
                "total": total_faults,
                "open": open_faults,
                "resolved": resolved_faults,
            }
        }), 200
    except Exception as e:
        return jsonify({"error": f"Fault analysis aggregation failed: {str(e)}"}), 500


@app.route("/api/analytics/maintenance-summary", methods=["GET"])
def analytics_maintenance_summary():
    """
    Aggregation: Maintenance task counts grouped by status.

    Pipeline:
      $group by status → count tasks per status
      $sort alphabetically

    Also returns a per-lab breakdown of pending maintenance.
    """
    try:
        # Status breakdown
        status_pipeline = [
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "status": "$_id",
                    "count":  1
                }
            },
            {"$sort": {"status": 1}}
        ]

        # Per-lab pending maintenance
        lab_pipeline = [
            # $match: only include non-completed tasks (early filter saves work)
            {"$match": {"status": {"$in": ["Due", "Overdue", "Scheduled"]}}},
            {
                "$group": {
                    "_id": "$labId",
                    "labName": {"$first": "$labName"},
                    "pending": {"$sum": 1},
                    "overdue": {"$sum": {"$cond": [{"$eq": ["$status", "Overdue"]}, 1, 0]}},
                    "due":     {"$sum": {"$cond": [{"$eq": ["$status", "Due"]},     1, 0]}},
                }
            },
            {"$project": {"_id": 0, "labId": "$_id", "labName": 1, "pending": 1, "overdue": 1, "due": 1}},
            {"$sort": {"overdue": -1, "pending": -1}}
        ]

        status_result = list(db.maintenance_col.aggregate(status_pipeline))
        lab_result    = list(db.maintenance_col.aggregate(lab_pipeline))
        total_tasks   = db.maintenance_col.count_documents({})

        return jsonify({
            "byStatus": status_result,
            "byLab": lab_result,
            "total": total_tasks,
        }), 200
    except Exception as e:
        return jsonify({"error": f"Maintenance summary aggregation failed: {str(e)}"}), 500


@app.route("/api/analytics/overview-summary", methods=["GET"])
def analytics_overview_summary():
    """
    Aggregation: High-level system health overview.

    Uses $group with $sum: 1 (count documents) and conditional sums
    across all three collections to build a dashboard summary.
    """
    try:
        # Equipment health pipeline
        eq_pipeline = [
            {
                "$group": {
                    "_id": None,   # _id: null means group ALL documents together
                    "total":    {"$sum": 1},
                    "healthy":  {"$sum": {"$cond": [{"$eq": ["$status", "healthy"]},  1, 0]}},
                    "warning":  {"$sum": {"$cond": [{"$eq": ["$status", "warning"]},  1, 0]}},
                    "critical": {"$sum": {"$cond": [{"$eq": ["$status", "critical"]}, 1, 0]}},
                    "avgCpu":   {"$avg": "$cpu"},
                    "avgTemp":  {"$avg": "$temp"},
                    "avgRam":   {"$avg": "$ram"},
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "total": 1, "healthy": 1, "warning": 1, "critical": 1,
                    "avgCpu":  {"$round": ["$avgCpu", 1]},
                    "avgTemp": {"$round": ["$avgTemp", 1]},
                    "avgRam":  {"$round": ["$avgRam", 1]},
                }
            }
        ]

        eq_result = list(db.equipment_col.aggregate(eq_pipeline))
        eq_summary = eq_result[0] if eq_result else {}

        # Fault quick summary (simple counts — not a pipeline, just direct queries)
        open_faults      = db.faults_col.count_documents({"status": {"$ne": "Resolved"}})
        critical_faults  = db.faults_col.count_documents({"severity": "Critical", "status": {"$ne": "Resolved"}})
        resolved_faults  = db.faults_col.count_documents({"status": "Resolved"})

        # Maintenance quick summary
        overdue_tasks    = db.maintenance_col.count_documents({"status": "Overdue"})
        due_tasks        = db.maintenance_col.count_documents({"status": "Due"})
        completed_tasks  = db.maintenance_col.count_documents({"status": "Completed"})

        return jsonify({
            "equipment": eq_summary,
            "faults": {
                "open": open_faults,
                "critical": critical_faults,
                "resolved": resolved_faults,
            },
            "maintenance": {
                "overdue": overdue_tasks,
                "due": due_tasks,
                "completed": completed_tasks,
            }
        }), 200
    except Exception as e:
        return jsonify({"error": f"Overview aggregation failed: {str(e)}"}), 500


# ─── 7. Database Insight Endpoints (Step 5) ───────────────────────────────────

@app.route("/api/database/query-performance", methods=["GET"])
def query_performance():
    """
    Run explain('executionStats') on a representative compound-index query.

    MongoDB's explain() method shows HOW a query was executed:
      - winningPlan     : The query plan MongoDB chose (e.g. IXSCAN vs COLLSCAN)
      - IXSCAN          : Index Scan  — fast, uses an index to locate documents
      - COLLSCAN        : Collection Scan — slow, scans EVERY document
      - totalDocsExamined  : How many documents were checked
      - totalKeysExamined  : How many index keys were scanned
      - executionTimeMillis: Query runtime in milliseconds
      - nReturned          : How many documents matched and were returned

    A good query will show IXSCAN with nReturned ≈ totalDocsExamined
    (meaning the index filtered data efficiently with minimal waste).

    We run two queries: one using the compound index and one without,
    so the frontend can show the difference.
    """
    try:
        # Query 1: Uses compound index idx_equipment_lab_status
        # find({labId: ..., status: ...}) should show IXSCAN
        eq_explain = db.equipment_col.find(
            {"labId": "LAB-A", "status": "critical"},
            {"_id": 0}
        ).explain()

        # Query 2: Uses compound index idx_faults_equip_status
        fault_explain = db.faults_col.find(
            {"equipId": "PC-07", "status": {"$ne": "Resolved"}},
            {"_id": 0}
        ).explain()

        # Query 3: Text search explain
        text_explain = db.faults_col.find(
            {"$text": {"$search": "temperature"}},
            {"_id": 0, "score": {"$meta": "textScore"}}
        ).explain()

        def extract_stats(explain_doc):
            """Extract the key metrics from an explain() result for display."""
            exec_stats = explain_doc.get("executionStats", {})
            winning_plan = explain_doc.get("queryPlanner", {}).get("winningPlan", {})

            # Traverse the plan hierarchy to locate IXSCAN, TEXT, or COLLSCAN
            def get_scan_type(plan):
                if not plan or not isinstance(plan, dict):
                    return "UNKNOWN"
                stage = plan.get("stage", "UNKNOWN")
                if stage in ("IXSCAN", "COLLSCAN"):
                    return stage
                if stage.startswith("TEXT"):
                    return "TEXT"
                # Inspect nested input stage(s)
                if "inputStage" in plan:
                    sub = get_scan_type(plan["inputStage"])
                    if sub != "UNKNOWN":
                        return sub
                if "inputStages" in plan and plan["inputStages"]:
                    for s in plan["inputStages"]:
                        sub = get_scan_type(s)
                        if sub != "UNKNOWN":
                            return sub
                return stage

            scan_type = get_scan_type(winning_plan)
            # If still FETCH or UNKNOWN, verify keys examined
            if scan_type in ("FETCH", "UNKNOWN") and exec_stats.get("totalKeysExamined", 0) > 0:
                scan_type = "IXSCAN"

            return {
                "executionTimeMillis":  exec_stats.get("executionTimeMillis", 0),
                "nReturned":           exec_stats.get("nReturned", 0),
                "totalDocsExamined":   exec_stats.get("totalDocsExamined", 0),
                "totalKeysExamined":   exec_stats.get("totalKeysExamined", 0),
                "scanType":            scan_type,
                "indexUsed":           scan_type in ("IXSCAN", "TEXT"),
            }

        return jsonify({
            "queries": [
                {
                    "name": "Equipment by Lab + Status (Compound Index)",
                    "filter": {"labId": "LAB-A", "status": "critical"},
                    "collection": "equipment",
                    "indexName": "idx_equipment_lab_status",
                    "stats": extract_stats(eq_explain),
                },
                {
                    "name": "Faults by Equipment + Status (Compound Index)",
                    "filter": {"equipId": "PC-07", "status": {"$ne": "Resolved"}},
                    "collection": "faults",
                    "indexName": "idx_faults_equip_status",
                    "stats": extract_stats(fault_explain),
                },
                {
                    "name": "Fault Full-Text Search (Text Index)",
                    "filter": {"$text": {"$search": "temperature"}},
                    "collection": "faults",
                    "indexName": "idx_faults_description_text",
                    "stats": extract_stats(text_explain),
                },
            ]
        }), 200
    except Exception as e:
        return jsonify({"error": f"explain() failed: {str(e)}"}), 500


@app.route("/api/database/indexes", methods=["GET"])
def database_indexes():
    """
    Return all index definitions from all three LabPulse collections.
    Used by the Database Insights UI to display index information.
    """
    try:
        indexes = db.get_all_indexes()
        return jsonify(indexes), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch indexes: {str(e)}"}), 500


@app.route("/api/database/validation", methods=["GET"])
def database_validation():
    """
    Return the schema validation metadata for all three collections.
    Shows whether validators are applied and what level of enforcement is used.
    """
    try:
        validation_info = db.get_validation_info()
        return jsonify(validation_info), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch validation info: {str(e)}"}), 500


@app.route("/api/database/apply-validation", methods=["POST"])
def apply_validation():
    """
    Admin endpoint to (re-)apply JSON Schema validators.
    Safe to call multiple times — MongoDB collMod replaces the existing validator.
    """
    try:
        result = db.apply_schema_validation()
        return jsonify({"success": True, "result": result}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ─── 8. Machine Learning Prediction Endpoints (Step 6) ─────────────────────────

@app.route("/api/ml/status", methods=["GET"])
def ml_status():
    """
    Check the status and availability of the trained ML models.
    Returns model names, versions, training dataset metadata, and readiness.
    """
    try:
        from ml.predictor import check_models_status
        status = check_models_status()
        return jsonify(status), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "modelsAvailable": False,
            "error": f"Failed to check ML model status: {str(e)}"
        }), 500


@app.route("/api/ml/metrics", methods=["GET"])
def ml_metrics():
    """
    Retrieve classification and regression evaluation metrics from the held-out test split.
    Reads the stored evaluation report from disk or MongoDB model_metrics collection.
    """
    try:
        reports_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports", "ml_evaluation_results.json")
        if os.path.exists(reports_path):
            with open(reports_path, "r", encoding="utf-8") as f:
                report = json.load(f)
            return jsonify(report), 200

        doc = db.model_metrics_col.find_one({"report_type": "latest_evaluation"}, {"_id": 0})
        if doc and "metrics" in doc:
            return jsonify(doc["metrics"]), 200

        return jsonify({
            "error": "No evaluation metrics found. Please train models first using POST /api/ml/retrain or python ml/train_models.py."
        }), 404
    except Exception as e:
        return jsonify({"error": f"Failed to fetch ML evaluation metrics: {str(e)}"}), 500


@app.route("/api/ml/predict-all", methods=["POST"])
def ml_predict_all():
    """
    Run the prediction engine on all equipment currently stored in MongoDB.
    Extracts real telemetry, fault history, and maintenance recency.
    Upserts predictions into the 'predictions' collection.
    """
    try:
        from ml.predictor import predict_all_equipment, check_models_status
        status = check_models_status()
        if not status.get("modelsAvailable"):
            return jsonify({
                "error": "ML models are not trained yet. Run 'python ml/train_models.py' or call POST /api/ml/retrain."
            }), 400

        result = predict_all_equipment()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": f"Batch prediction failed: {str(e)}"}), 500


@app.route("/api/ml/predictions", methods=["GET"])
def ml_get_predictions():
    """
    Retrieve stored equipment predictions from MongoDB with optional query filtering.
    Query params:
      - labId: e.g. "LAB-A"
      - risk: "elevated", "moderate", "low"
      - search: keyword search against equipmentId, type, labId
    If no predictions exist yet, runs a fresh batch prediction automatically.
    """
    try:
        from ml.predictor import get_stored_predictions, predict_all_equipment, check_models_status
        lab_id = request.args.get("labId")
        risk = request.args.get("risk")
        search = request.args.get("search")

        preds = get_stored_predictions(lab_id=lab_id, risk=risk, search=search)

        # If database is empty of predictions and no filters applied, generate initial batch
        if not preds and not lab_id and not risk and not search:
            status = check_models_status()
            if status.get("modelsAvailable"):
                batch_res = predict_all_equipment()
                preds = batch_res.get("predictions", [])

        # Calculate quick summary statistics from stored predictions
        all_stored = list(db.predictions_col.find({}, {"_id": 0}))
        summary = {
            "total": len(all_stored),
            "elevated": sum(1 for p in all_stored if p.get("riskBadge") == "elevated"),
            "moderate": sum(1 for p in all_stored if p.get("riskBadge") == "moderate"),
            "low": sum(1 for p in all_stored if p.get("riskBadge") == "low"),
            "withActiveFaults": sum(1 for p in all_stored if p.get("hasActiveFault")),
            "filtered": len(preds),
        }

        return jsonify({
            "predictions": preds,
            "summary": summary
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve predictions: {str(e)}"}), 500


@app.route("/api/ml/predict/<equipment_id>", methods=["POST"])
def ml_predict_single(equipment_id):
    """
    Generate and persist a fresh prediction for a single equipment item by ID.
    """
    try:
        from ml.predictor import generate_equipment_prediction, check_models_status
        status = check_models_status()
        if not status.get("modelsAvailable"):
            return jsonify({
                "error": "ML models are not trained yet. Run 'python ml/train_models.py' or call POST /api/ml/retrain."
            }), 400

        eq = db.equipment_col.find_one({"id": equipment_id}, {"_id": 0})
        if not eq:
            return jsonify({"error": f"Equipment '{equipment_id}' not found in database."}), 404

        prediction = generate_equipment_prediction(eq, persist=True)
        return jsonify(prediction), 200
    except Exception as e:
        return jsonify({"error": f"Single prediction failed: {str(e)}"}), 500


@app.route("/api/ml/retrain", methods=["POST"])
def ml_retrain():
    """
    Regenerate the reproducible synthetic training dataset, retrain both RandomForest
    pipelines, calculate test set metrics, save model artifacts to disk, and update MongoDB.
    """
    try:
        from ml.generate_training_data import generate_synthetic_data, save_dataset_and_metadata
        from ml.train_models import train_and_evaluate
        from ml.predictor import load_models

        # Step 1: Generate synthetic dataset
        df = generate_synthetic_data()
        save_dataset_and_metadata(df)

        # Step 2: Train and evaluate both models
        report = train_and_evaluate()

        # Step 3: Force reload in-memory singleton pipelines
        load_models(force_reload=True)

        return jsonify({
            "success": True,
            "message": "Models successfully retrained and evaluated on held-out test split.",
            "report": report
        }), 200
    except Exception as e:
        return jsonify({"error": f"Retraining failed: {str(e)}"}), 500


# ─── 9. Application Startup ──────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"[*] Starting LabPulse Flask Backend on port {PORT}...")
    print(f"[*] Connected MongoDB URI: {db.MONGODB_URI}")
    print(f"[*] Database: {db.MONGODB_DB_NAME}")
    # Perform startup health check & initial seeding if empty
    health = db.check_health()
    if health["connected"]:
        print("[OK] MongoDB ping successful! Initializing database collections if empty...")
        db.seed_database()
    else:
        print(f"[!] Warning: MongoDB ping failed on startup: {health.get('error')}")

    app.run(host="0.0.0.0", port=PORT, debug=True)
