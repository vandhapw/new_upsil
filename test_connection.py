#!/usr/bin/env python
import sys
import os

# Add the Django project to the path
sys.path.append('/var/www/upsil_project/new_upsil')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'production.settings')

import django
django.setup()

from pymongo import MongoClient
from account.views import user_collection, user_log_collection

def test_mongodb_connection():
    """Test MongoDB connection on port 27019"""
    try:
        client = MongoClient('mongodb://127.0.0.1:27019/')
        result = client.admin.command('ping')
        print("✅ MongoDB connection successful on port 27019")
        print(f"Ping result: {result}")
        
        # Test database access
        db = client['server_db']
        collections = db.list_collection_names()
        print(f"Available collections: {collections}")
        
        return True
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return False

def test_user_collections():
    """Test user collection access"""
    try:
        if user_collection is None:
            print("❌ user_collection is None")
            return False
            
        # Try to access the collection
        count = user_collection.count_documents({})
        print(f"✅ User collection accessible. Total users: {count}")
        
        if user_log_collection is not None:
            log_count = user_log_collection.count_documents({})
            print(f"✅ User log collection accessible. Total logs: {log_count}")
        else:
            print("⚠️  User log collection is None")
            
        return True
    except Exception as e:
        print(f"❌ User collection access failed: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Testing MongoDB and Django setup...")
    print("=" * 50)
    
    mongodb_ok = test_mongodb_connection()
    collections_ok = test_user_collections()
    
    print("=" * 50)
    if mongodb_ok and collections_ok:
        print("✅ All tests passed! The login API should work now.")
        print("🔑 Key fixes applied:")
        print("   - Updated all MongoDB connections to use port 27019")
        print("   - Added database connection error handling")
        print("   - Fixed JavaScript error handling for API responses")
        print("   - Added fallback connection logic")
    else:
        print("❌ Some tests failed. Please check the configuration.")