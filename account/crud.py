import uuid
from django.views.decorators.csrf import csrf_exempt
import json
from django.utils.timezone import now
from django.contrib.auth.hashers import make_password
from django.http import JsonResponse
from datetime import datetime
from bson import ObjectId
from .utils import serialize_user
from production.utils import get_mongo_client


client = get_mongo_client()
db = client['server_db']
user_collection = db['user']
user_log_collection = db['userlog']
user_group_collection = db['user_group']

def getUsers(request):
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    page = int(request.GET.get("page", 1))
    page_size = int(request.GET.get("page_size", 10))
    skip = (page - 1) * page_size

    cursor = (
        user_collection
        .find({})
        .sort("created_at", -1)
        .skip(skip)
        .limit(page_size)
    )

    users = [serialize_user(u) for u in cursor]
    total = user_collection.count_documents({})

    return JsonResponse({
        "results": users,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total
        }
    })

@csrf_exempt
def createUser(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    body = json.loads(request.body)

    user = {
        "id": str(uuid.uuid4()),
        "firstName": body.get("firstName"),
        "lastName": body.get("lastName"),
        "username": body.get("username"),
        "email": body.get("email"),
        "password": make_password(body.get("password")),  
        "photo": body.get("photo"),
        "user_group": body.get("user_group", "user"),
        "type": body.get("type", "manual"),
        "is_active": True,
        "created_at": now(),
        "updated_at": now(),
        "registered_at": now(),
        "user_category": body.get("user_category", None),
    }

    user_collection.insert_one(user)

    return JsonResponse({
        "message": "User created successfully",
        "user": serialize_user(user)
    }, status=201)
    

def getUserById(request, user_id):
    user = user_collection.find_one({"id": user_id})

    if not user:
        return JsonResponse({"error": "User not found"}, status=404)

    return JsonResponse(serialize_user(user))

@csrf_exempt
def updateUser(request, user_id):
    if request.method != 'PUT':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    body = json.loads(request.body)

    update_fields = {
        "firstName": body.get("firstName"),
        "lastName": body.get("lastName"),
        "email": body.get("email"),
        "photo": body.get("photo"),
        "user_group": body.get("user_group"),
        "user_category": body.get("user_category"),
        "type": body.get("type"),
        "is_active": body.get("is_active"),
        "updated_at": now(),
    }
    
    if body.get("password"):
        update_fields["password"] = make_password(body["password"])

    user_collection.update_one(
        {"id": user_id},
        {"$set": update_fields}
    )

    user = user_collection.find_one({"id": user_id})

    return JsonResponse({
        "message": "User updated",
        "user": serialize_user(user)
    })

@csrf_exempt
def deleteUser(request, user_id):
    if request.method != 'DELETE':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    result = user_collection.delete_one({"id": user_id})

    if result.deleted_count == 0:
        return JsonResponse({"error": "User not found"}, status=404)

    return JsonResponse({"message": "User deleted successfully"})
