import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from bson import ObjectId
from ..utils import serialize, bus_klaen_security_collection, bus_klaen_mqtt

@csrf_exempt
def security_list(request):
    webSocket = (
        bus_klaen_mqtt
        .find({})
        .sort("created_at", -1)
        .limit(1)
    )
    mqtt = next(webSocket, None)
    mqtt = serialize(mqtt)
    mqtt = mqtt['address']
    bus_api = mqtt+'plalion/security/create'
    
    if request.method == 'GET':
        data = [serialize(d) for d in bus_klaen_security_collection.find()]
        return JsonResponse(data, safe=False)

    if request.method == 'POST':
        payload = json.loads(request.body)
        bus_klaen_security_collection.insert_one({
            "sid": payload["sid"],
            "access_key": payload["access_key"],
            "name": payload["name"],
            "valid_time": payload["valid_time"]
        })
        return JsonResponse({"status": "created"})


@csrf_exempt
def security_detail(request, sid):
    if request.method == 'PUT':
        payload = json.loads(request.body)
        bus_klaen_security_collection.update_one(
            {"sid": int(sid)},
            {"$set": payload}
        )
        return JsonResponse({"status": "updated"})

    if request.method == 'DELETE':
        bus_klaen_security_collection.delete_one({"sid": int(sid)})
        return JsonResponse({"status": "deleted"})
