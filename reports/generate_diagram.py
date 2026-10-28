import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches

reports_img_dir = r"d:\MongoProject\reports\images"
os.makedirs(reports_img_dir, exist_ok=True)

fig, ax = plt.subplots(figsize=(12, 7.5), dpi=300)
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis("off")

# Title
ax.text(50, 96, "LabPulse System Architecture & Data Flow Pipeline", 
        fontsize=16, fontweight="bold", ha="center", va="center", color="#0f172a")
ax.text(50, 92.5, "CSE494: Intelligent NoSQL Databases — End-to-End Tiered Architecture", 
        fontsize=10.5, fontstyle="italic", ha="center", va="center", color="#475569")

# Color palette (clean modern academic slate/blue)
c_frontend = "#e0f2fe"  # light blue
c_api = "#f1f5f9"       # light slate
c_db = "#ecfdf5"        # light emerald
c_ml = "#fef3c7"        # light amber

# Tier 1: Frontend
rect1 = patches.FancyBboxPatch((4, 66), 42, 22, boxstyle="round,pad=1", fc=c_frontend, ec="#0284c7", lw=1.8)
ax.add_patch(rect1)
ax.text(25, 84, "PRESENTATION TIER (CLIENT)", fontsize=11, fontweight="bold", color="#0369a1", ha="center")
ax.text(25, 76, "React 18 + Vite SPA Framework\n• Three.js Interactive 3D Lab Simulation\n• Dynamic Recharts & Telemetry Gauges\n• Equipment Registry, Faults & Insights\n• Live ML Risk & Estimation Dashboard", 
        fontsize=9, color="#0f172a", ha="center", va="center", linespacing=1.3)

# Tier 2: Backend API
rect2 = patches.FancyBboxPatch((54, 66), 42, 22, boxstyle="round,pad=1", fc=c_api, ec="#475569", lw=1.8)
ax.add_patch(rect2)
ax.text(75, 84, "APPLICATION TIER (REST API)", fontsize=11, fontweight="bold", color="#334155", ha="center")
ax.text(75, 76, "Python 3.11 + Flask Framework\n• RESTful JSON Endpoints with CORS\n• CRUD Handlers (Equipment, Faults, PM)\n• PyMongo 4.x Database Abstraction\n• Query Optimization & explain() Endpoints\n• Online Inference Request Coordinator", 
        fontsize=9, color="#0f172a", ha="center", va="center", linespacing=1.3)

# Arrow between Frontend and Backend
ax.annotate("", xy=(53, 77), xytext=(47, 77),
            arrowprops=dict(arrowstyle="<->", color="#2563eb", lw=2.2))
ax.text(50, 79.5, "REST HTTP / JSON", fontsize=8, fontweight="bold", color="#1d4ed8", ha="center")

# Tier 3: MongoDB Database Layer
rect3 = patches.FancyBboxPatch((4, 18), 42, 42, boxstyle="round,pad=1", fc=c_db, ec="#059669", lw=1.8)
ax.add_patch(rect3)
ax.text(25, 56, "DATABASE TIER (MongoDB NoSQL)", fontsize=11, fontweight="bold", color="#047857", ha="center")
ax.text(25, 47, "Database: labpulse_db\n\nCollections:\n• equipment (24 docs, embedded specs)\n• faults (18 docs, referenced equipment_id)\n• maintenance (16 docs, referenced schedules)\n• predictions (24 docs, cached ML inferences)\n• model_metrics (1 doc, evaluation cache)", 
        fontsize=8.5, color="#064e3b", ha="center", va="center", linespacing=1.2)
ax.text(25, 27, "Core NoSQL Features:\n• $jsonSchema Validation Rules\n• Text Index ($text on searchable fields)\n• Compound Indexes (lab_id, status)\n• Aggregation Pipelines ($group, $facet)\n• explain('executionStats') Diagnostics", 
        fontsize=8.5, color="#065f46", ha="center", va="center", linespacing=1.2)

# Tier 4: Machine Learning Engine
rect4 = patches.FancyBboxPatch((54, 18), 42, 42, boxstyle="round,pad=1", fc=c_ml, ec="#d97706", lw=1.8)
ax.add_patch(rect4)
ax.text(75, 56, "INTELLIGENT ML ENGINE (scikit-learn)", fontsize=11, fontweight="bold", color="#b45309", ha="center")
ax.text(75, 47, "Synthetic Training Pipeline (Offline):\n• 1,200 Scenarios (Seed 42, CSV data)\n• 80/20 Train/Test Hold-out Split\n• Imputation & One-Hot Preprocessing\n• Classifier: RF (Acc 88.33%, F1 0.8462)\n• Regressor: RF (R2 0.7054, MAE 1.39h)", 
        fontsize=8.5, color="#78350f", ha="center", va="center", linespacing=1.2)
ax.text(75, 27, "Real-Time Inference Engine (Online):\n• Aggregates live operational MongoDB data\n• Extracts 12-dimensional feature vector\n• Predicts 7-day repeat failure probability\n• Fault-Conditioned repair hours estimate\n• Persists predictions to MongoDB collection", 
        fontsize=8.5, color="#92400e", ha="center", va="center", linespacing=1.2)

# Connector arrows: Backend <-> Database
ax.annotate("", xy=(30, 61), xytext=(63, 65),
            arrowprops=dict(arrowstyle="<->", color="#059669", lw=2, connectionstyle="arc3,rad=-0.12"))
ax.text(42, 63, "PyMongo Driver BSON/Query", fontsize=8, fontweight="bold", color="#047857", ha="center")

# Connector arrows: Backend <-> ML Engine
ax.annotate("", xy=(75, 61), xytext=(75, 65),
            arrowprops=dict(arrowstyle="<->", color="#d97706", lw=2))
ax.text(82, 63, "Model Inference / Joblib", fontsize=8, fontweight="bold", color="#b45309", ha="center")

# Connector arrows: DB -> ML Engine (Data flow)
ax.annotate("", xy=(53, 38), xytext=(47, 38),
            arrowprops=dict(arrowstyle="<->", color="#0284c7", lw=1.8, linestyle="--"))
ax.text(50, 40.5, "Live Operational Feature Extract", fontsize=7.5, fontstyle="italic", color="#0284c7", ha="center")

# Footer
ax.text(50, 8, "Figure 3.1: LabPulse 4-Tier Architectural Pipeline and Component Interaction Diagram", 
        fontsize=9.5, fontweight="bold", ha="center", va="center", color="#334155")

plt.tight_layout()
target_path = os.path.join(reports_img_dir, "architecture_diagram.png")
plt.savefig(target_path, dpi=300, bbox_inches="tight")
print(f"Architecture diagram successfully saved to {target_path}")
