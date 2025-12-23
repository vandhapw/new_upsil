import uuid
from django.views.decorators.csrf import csrf_exempt
import json
from django.utils.timezone import now
from django.contrib.auth.hashers import make_password
from django.http import JsonResponse
from datetime import datetime
from bson import ObjectId
from .util import serialize_sensor_sn
from production.utils import get_mongo_client


client = get_mongo_client()
db = client['server_db']
sns_collection = db['plalion_company_sensor']

def getAllSensors(request):
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    # ===== FETCH ALL SENSOR DATA =====
    cursor = sns_collection.find({}).sort("created_at", -1)
    sensors = [serialize_sensor_sn(doc) for doc in cursor]

    # ===== UNIQUE SERIAL NUMBERS =====
    unique_serials = sns_collection.distinct("serial_num")

    return JsonResponse(
        {
            "results": sensors,
            "total_records": len(sensors),
            "unique_serial_count": len(unique_serials),
            "unique_serials": unique_serials,
            "mode": "all"
        },
        safe=False
    )

# def getAllSensors(request):
#     if request.method != 'GET':
#         return JsonResponse({"error": "Method not allowed"}, status=405)

#     # Query params
#     page = request.GET.get("page")
#     page_size = request.GET.get("page_size")
#     all_data = request.GET.get("all", "false").lower() == "true"

#     query = sns_collection.find({}).sort("created_at", -1)

#     # ===== UNIQUE SERIAL NUMBERS =====
#     unique_serials = sns_collection.distinct("serial_num")
#     unique_serial_count = len(unique_serials)

#     # ===== CASE 1: RETURN ALL DATA =====
#     if all_data:
#         sensors = [serialize_sensor_sn(u) for u in query]
#         return JsonResponse({
#             "results": sensors,
#             "total": len(sensors),
#             "unique_serial_count": unique_serial_count,
#             "unique_serials": unique_serials,
#             "mode": "all"
#         }, safe=False)

#     # ===== CASE 2: PAGINATED (DEFAULT) =====
#     page = int(page or 1)
#     page_size = int(page_size or 10)
#     skip = (page - 1) * page_size

#     cursor = query.skip(skip).limit(page_size)
#     sensors = [serialize_sensor_sn(u) for u in cursor]
#     total = sns_collection.count_documents({})

#     return JsonResponse({
#         "results": sensors,
#         "pagination": {
#             "page": page,
#             "page_size": page_size,
#             "total": total
#         },
#         "unique_serial_count": unique_serial_count,
#         "unique_serials": unique_serials,
#         "mode": "paginated"
#     })
# @csrf_exempt
# def createUser(request):
#     if request.method != 'POST':
#         return JsonResponse({"error": "Method not allowed"}, status=405)

#     body = json.loads(request.body)

#     user = {
#         "id": str(uuid.uuid4()),
#         "firstName": body.get("firstName"),
#         "lastName": body.get("lastName"),
#         "username": body.get("username"),
#         "email": body.get("email"),
#         "password": make_password(body.get("password")),  
#         "photo": body.get("photo"),
#         "user_group": body.get("user_group", "user"),
#         "type": body.get("type", "manual"),
#         "is_active": True,
#         "created_at": now(),
#         "updated_at": now(),
#         "registered_at": now(),
#         "user_category": body.get("user_category", None),
#     }

#     user_collection.insert_one(user)

#     return JsonResponse({
#         "message": "User created successfully",
#         "user": serialize_user(user)
#     }, status=201)
    

# def getUserById(request, user_id):
#     user = user_collection.find_one({"id": user_id})

#     if not user:
#         return JsonResponse({"error": "User not found"}, status=404)

#     return JsonResponse(serialize_user(user))

# @csrf_exempt
# def updateUser(request, user_id):
#     if request.method != 'PUT':
#         return JsonResponse({"error": "Method not allowed"}, status=405)

#     body = json.loads(request.body)

#     update_fields = {
#         "firstName": body.get("firstName"),
#         "lastName": body.get("lastName"),
#         "email": body.get("email"),
#         "photo": body.get("photo"),
#         "user_group": body.get("user_group"),
#         "user_category": body.get("user_category"),
#         "type": body.get("type"),
#         "is_active": body.get("is_active"),
#         "updated_at": now(),
#     }
    
#     if body.get("password"):
#         update_fields["password"] = make_password(body["password"])

#     user_collection.update_one(
#         {"id": user_id},
#         {"$set": update_fields}
#     )

#     user = user_collection.find_one({"id": user_id})

#     return JsonResponse({
#         "message": "User updated",
#         "user": serialize_user(user)
#     })

# @csrf_exempt
# def deleteUser(request, user_id):
#     if request.method != 'DELETE':
#         return JsonResponse({"error": "Method not allowed"}, status=405)

#     result = user_collection.delete_one({"id": user_id})

#     if result.deleted_count == 0:
#         return JsonResponse({"error": "User not found"}, status=404)

#     return JsonResponse({"message": "User deleted successfully"})
