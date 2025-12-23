import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from ..utils import serialize, bus_klaen_master_schedule_collection, bus_klaen_mqtt, bus_klaen_logs
import requests
from datetime import datetime


@csrf_exempt
def master_schedule(request):
    webSocket = (
        bus_klaen_mqtt
        .find({})
        .sort("created_at", -1)
        .limit(1)
    )
    mqtt = next(webSocket, None)
    mqtt = serialize(mqtt)
    mqtt = mqtt['address']
    bus_api_master_schedule = mqtt+'plalion/schedule/get'
    
    if request.method == 'POST':
        payload = json.loads(request.body)
        try:
            response = requests.post(bus_api_master_schedule, json=payload)
            response.raise_for_status()
            logs = {
                "user": "pknu",
                "log_type":"schedule",
                "payload": payload,
                "result":response.json(),
                "created_at": datetime.now().isoformat() 
            }
            bus_klaen_logs.insert_one(logs)
            return JsonResponse({"result":response.json()}, safe=False) 
            
        except requests.RequestException as e:
            return JsonResponse({"error": str(e), "message":"Registering device failed"}, status=500, )
