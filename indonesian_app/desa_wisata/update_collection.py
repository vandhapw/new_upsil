from django.http import HttpResponse, JsonResponse
from pymongo import MongoClient
from production.utils import get_mongo_client
from datetime import datetime
client = get_mongo_client()
db = client['indonesia_db']
tourism_village_collection = db['desa_wisata']

# 3. Update semua dokumen, tambahkan kolom approval_display dengan nilai default
result = tourism_village_collection.update_many(
    {},  # filter kosong = semua dokumen
    {"$set": {
        "approval_display": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
        
        }}  # nilai default bisa True/False/string
)

print(f"Modified {result.modified_count} documents")