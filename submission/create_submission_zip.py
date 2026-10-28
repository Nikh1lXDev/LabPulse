import os
import sys
import zipfile

BASE_DIR = r"d:\MongoProject"
SUBMISSION_DIR = os.path.join(BASE_DIR, "submission")
ZIP_PATH = os.path.join(SUBMISSION_DIR, "LabPulse_CSE494_Final_Submission.zip")
ROOT_ARC_FOLDER = "LabPulse_CSE494_Submission"

os.makedirs(SUBMISSION_DIR, exist_ok=True)

# Files to explicitly exclude
EXCLUDE_PATTERNS = [
    "node_modules",
    ".git",
    "__pycache__",
    ".pyc",
    ".env",       # Real .env file (we explicitly include .env.example)
    "venv",
    ".venv",
    "dist",
    "test_load.py"
]

def should_exclude(rel_path):
    parts = rel_path.replace("\\", "/").split("/")
    for part in parts:
        if part in ["node_modules", ".git", "__pycache__", "venv", ".venv", "dist"]:
            return True
        if part.endswith(".pyc"):
            return True
        if part == ".env":  # real secret file
            return True
        if part == "test_load.py":
            return True
        if part.endswith(".zip"):
            return True
    return False

# Files and directories to include
INCLUDE_TOP_ITEMS = [
    "README.md",
    "package.json",
    "package-lock.json",
    "vite.config.js",
    "index.html",
    ".oxlintrc.json",
    ".gitignore",
    "public",
    "src",
    "backend",
    "reports"
]

print(f"Creating submission ZIP: {ZIP_PATH}...")
added_count = 0
total_uncompressed_bytes = 0

with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
    for item in INCLUDE_TOP_ITEMS:
        item_path = os.path.join(BASE_DIR, item)
        if not os.path.exists(item_path):
            print(f"Warning: {item_path} does not exist, skipping.")
            continue
            
        if os.path.isfile(item_path):
            rel = os.path.relpath(item_path, BASE_DIR)
            if not should_exclude(rel):
                arcname = os.path.join(ROOT_ARC_FOLDER, rel).replace("\\", "/")
                zf.write(item_path, arcname)
                added_count += 1
                total_uncompressed_bytes += os.path.getsize(item_path)
        else:
            for root, dirs, files in os.walk(item_path):
                # Filter dirs in-place to avoid descending into excluded folders
                dirs[:] = [d for d in dirs if not should_exclude(os.path.join(os.path.relpath(root, BASE_DIR), d))]
                for file in files:
                    file_full = os.path.join(root, file)
                    rel = os.path.relpath(file_full, BASE_DIR)
                    if not should_exclude(rel):
                        arcname = os.path.join(ROOT_ARC_FOLDER, rel).replace("\\", "/")
                        zf.write(file_full, arcname)
                        added_count += 1
                        total_uncompressed_bytes += os.path.getsize(file_full)

print(f"Added {added_count} files ({total_uncompressed_bytes / (1024*1024):.2f} MB uncompressed).")
zip_size = os.path.getsize(ZIP_PATH)
print(f"Compressed ZIP size: {zip_size / (1024*1024):.2f} MB ({zip_size} bytes).")

# ── Programmatic Verification of ZIP ─────────────────────────────────────────
print("\n--- Running Programmatic Verification on Submission ZIP ---")
with zipfile.ZipFile(ZIP_PATH, "r") as zf:
    test_result = zf.testzip()
    if test_result is None:
        print("✓ ZIP integrity test PASSED (CRC-32 checksums valid, zero corruption).")
    else:
        print(f"✗ ZIP integrity test FAILED on file: {test_result}")
        sys.exit(1)
        
    namelist = zf.namelist()
    
    # Required files check
    critical_checks = [
        f"{ROOT_ARC_FOLDER}/reports/LabPulse_Project_Report.docx",
        f"{ROOT_ARC_FOLDER}/reports/LabPulse_Project_Report.pdf",
        f"{ROOT_ARC_FOLDER}/README.md",
        f"{ROOT_ARC_FOLDER}/package.json",
        f"{ROOT_ARC_FOLDER}/package-lock.json",
        f"{ROOT_ARC_FOLDER}/src/App.jsx",
        f"{ROOT_ARC_FOLDER}/src/components/LabScene.jsx",
        f"{ROOT_ARC_FOLDER}/src/pages/Overview.jsx",
        f"{ROOT_ARC_FOLDER}/src/pages/Predictions.jsx",
        f"{ROOT_ARC_FOLDER}/backend/app.py",
        f"{ROOT_ARC_FOLDER}/backend/db.py",
        f"{ROOT_ARC_FOLDER}/backend/requirements.txt",
        f"{ROOT_ARC_FOLDER}/backend/.env.example",
        f"{ROOT_ARC_FOLDER}/backend/models/classifier_pipeline.joblib",
        f"{ROOT_ARC_FOLDER}/backend/models/regressor_pipeline.joblib",
        f"{ROOT_ARC_FOLDER}/backend/models/model_metadata.json",
        f"{ROOT_ARC_FOLDER}/backend/reports/ml_evaluation_results.json",
        f"{ROOT_ARC_FOLDER}/backend/data/labpulse_ml_training.csv",
        f"{ROOT_ARC_FOLDER}/backend/data/dataset_metadata.json",
        f"{ROOT_ARC_FOLDER}/backend/test_api.py"
    ]
    
    all_critical_present = True
    for c in critical_checks:
        if c in namelist:
            print(f"✓ Found critical file: {c}")
        else:
            print(f"✗ MISSING critical file: {c}")
            all_critical_present = False
            
    # Blacklist check
    forbidden = ["node_modules", ".git/", "__pycache__", "backend/.env\b", ".pyc"]
    found_forbidden = []
    for name in namelist:
        if "node_modules" in name or ".git/" in name or "__pycache__" in name or name.endswith(".pyc"):
            found_forbidden.append(name)
        if name.endswith("/.env") or name == f"{ROOT_ARC_FOLDER}/backend/.env":
            found_forbidden.append(name)
            
    if not found_forbidden:
        print("✓ Zero forbidden items detected (no node_modules, .git, __pycache__, .pyc, or real .env).")
    else:
        print(f"✗ Found {len(found_forbidden)} forbidden items in ZIP! Examples: {found_forbidden[:5]}")
        sys.exit(1)

print("\nSubmission ZIP packaging completed successfully!")
