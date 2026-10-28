"""
LabPulse — Data Migration Utility to MongoDB Atlas
Course: CSE494 Intelligent NoSQL Databases

Usage:
    python backend/migrate_to_atlas.py "mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority"
"""

import sys
import os
from pymongo import MongoClient

LOCAL_URI = "mongodb://localhost:27017"
DB_NAME = "labpulse_db"

def migrate(atlas_uri):
    if not atlas_uri or not atlas_uri.startswith("mongodb"):
        print("Error: Please provide a valid MongoDB Atlas connection string.")
        print("Example: python backend/migrate_to_atlas.py 'mongodb+srv://user:pass@cluster0.xxx.mongodb.net/?retryWrites=true&w=majority'")
        sys.exit(1)

    print(f"Connecting to local MongoDB ({LOCAL_URI})...")
    local_client = MongoClient(LOCAL_URI, serverSelectionTimeoutMS=3000)
    local_db = local_client[DB_NAME]

    print(f"Connecting to target MongoDB Atlas cluster...")
    atlas_client = MongoClient(atlas_uri, serverSelectionTimeoutMS=8000)
    atlas_db = atlas_client[DB_NAME]

    # Test ping on Atlas
    try:
        atlas_client.admin.command('ping')
        print("✓ Connected successfully to MongoDB Atlas!")
    except Exception as e:
        print(f"✗ Failed to connect to MongoDB Atlas: {e}")
        sys.exit(1)

    collections = ["equipment", "faults", "maintenance", "predictions", "model_metrics"]

    for col_name in collections:
        local_col = local_db[col_name]
        atlas_col = atlas_db[col_name]
        
        docs = list(local_col.find())
        if not docs:
            print(f"Collection '{col_name}': 0 documents in local DB, skipping.")
            continue

        print(f"Migrating '{col_name}' ({len(docs)} documents)...")
        # Clear existing in Atlas target to prevent duplicate key conflicts
        atlas_col.delete_many({})
        atlas_col.insert_many(docs)
        print(f"✓ '{col_name}' successfully migrated ({atlas_col.count_documents({})} documents in Atlas).")

    print("\n✓ Full database migration completed successfully!")
    print(f"Your MongoDB Atlas database '{DB_NAME}' is now fully populated and ready for cloud deployment.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        target_uri = sys.argv[1]
    else:
        target_uri = os.getenv("MONGODB_ATLAS_URI", "")
        if not target_uri:
            print("Please pass the MongoDB Atlas URI as an argument:")
            print("python backend/migrate_to_atlas.py \"mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority\"")
            sys.exit(1)
    migrate(target_uri)
