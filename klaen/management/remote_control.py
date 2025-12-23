import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import requests
from ..utils import serialize,bus_klaen_devices_collection,bus_klaen_mqtt, bus_klaen_logs
from datetime import datetime

@csrf_exempt
def remote_power(request):
    webSocket = (
        bus_klaen_mqtt
        .find({})
        .sort("created_at", -1)
        .limit(1)
    )
    mqtt = next(webSocket, None)
    mqtt = serialize(mqtt)
    mqtt = mqtt['address']
    bus_api_power_control = mqtt+'plalion/remote/power/ctrl'
    
    if request.method == 'POST':
        try:
            payload = json.loads(request.body)
            response = requests.post(bus_api_power_control, payload)
            response.raise_for_status()
            logs = {
                "user": "pknu",
                "log_type":"remote power",
                "payload": payload,
                "result":response.json(),
                "created_at": datetime.now().isoformat() 
            }
            bus_klaen_logs.insert_one(logs)
            return JsonResponse({"result":response.json()}, safe=False)
                
        except requests.RequestException as e:
            return JsonResponse({"error": str(e), "message":"Registering device failed"}, status=500, )
        
def remote_mode(request):
    webSocket = (
        bus_klaen_mqtt
        .find({})
        .sort("created_at", -1)
        .limit(1)
    )
    mqtt = next(webSocket, None)
    mqtt = serialize(mqtt)
    mqtt = mqtt['address']
    bus_api_power_mode = mqtt+'plalion/remote/mode/ctrl'
    
    if request.method == 'POST':
        try:
            payload = json.loads(request.body)
            response = requests.post(bus_api_power_mode, payload)
            response.raise_for_status()
            logs = {
                "user": "pknu",
                "log_type":"remote mode",
                "payload": payload,
                "result":response.json(),
                "created_at": datetime.now().isoformat() 
            }
            bus_klaen_logs.insert_one(logs)
            return JsonResponse({"result":response.json()}, safe=False)
                
        except requests.RequestException as e:
            return JsonResponse({"error": str(e), "message":"Registering device failed"}, status=500, )
