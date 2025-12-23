import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import requests
from ..utils import serialize,bus_klaen_devices_collection,bus_klaen_mqtt

@csrf_exempt
def device_list(request):
    webSocket = (
        bus_klaen_mqtt
        .find({})
        .sort("created_at", -1)
        .limit(1)
    )
    mqtt = next(webSocket, None)
    mqtt = serialize(mqtt)
    mqtt = mqtt['address']
    bus_api = mqtt+'plalion/device/register'
    bus_api_verification = mqtt+'plalion/device/exist/serial_number'
    
    if request.method == 'GET':
        data = [serialize(d) for d in bus_klaen_devices_collection.find()]
        return JsonResponse(data, safe=False)

    if request.method == 'POST':
        payload = json.loads(request.body)
        try:
            response = requests.post(bus_api, json=payload)
            response.raise_for_status()
            if(response.status_code == 200):
                response2 = requests.post(bus_api_verification,json={'serial_num': payload['serial_num']})
                response2.raise_for_status()      
                response2_data = response2.json()      
                rows = response2_data.get("rows", [])
   
            
        except requests.RequestException as e:
            return JsonResponse({"error": str(e), "message":"Registering device failed"}, status=500, )

        # Save to Mongodb Database
        bus_klaen_devices_collection.insert_one({
            "did": rows[0].get("did"),
            "serial_num": payload["serial_num"],
            "mac_address": payload["mac_address"],
            "name": payload["name"],
            "space": payload["space"],
            "location": payload["location"],
            "sid": payload["sid"],
        })
        return JsonResponse({"status": "created", "message":"Registering device successful"})
    
@csrf_exempt
def device_detail(request, did, sn):
    webSocket = (
        bus_klaen_mqtt
        .find({})
        .sort("created_at", -1)
        .limit(1)
    )
    mqtt = next(webSocket, None)
    mqtt = serialize(mqtt)
    mqtt = mqtt['address']
    bus_api_edit = mqtt+'plalion/device/edit/data'
    bus_api_delete = mqtt+'plalion/device/delete'
    
    if request.method == 'POST':
        try:
            payload = json.loads(request.body.decode('utf-8')) if request.body else {}
            print(payload)
        except json.JSONDecodeError:
            return JsonResponse(
                {'error': 'Invalid JSON body'},
                status=400
            )
        
        try:
            response = requests.post(bus_api_edit, json=payload)
            response.raise_for_status()
            print(response)
            
        except requests.RequestException as e:
            return JsonResponse({"error": str(e), "message":"Updating device failed"}, status=500, )
        
        bus_klaen_devices_collection.update_one(
            {"did": int(did)},
            {"$set": payload}
        )
        return JsonResponse({"status": "updated"})

    if request.method == 'DELETE':
        try:
            response = requests.post(bus_api_delete, {"serial_num": sn })
            response.raise_for_status()
            print(response)
            
        except requests.RequestException as e:
            return JsonResponse({"error": str(e), "message":"Delete device failed"}, status=500, )
        
        bus_klaen_devices_collection.delete_one({"serial_num": sn})
        return JsonResponse({"status": "deleted"})

@csrf_exempt
def delete_device(request, sn):
    webSocket = (
        bus_klaen_mqtt
        .find({})
        .sort("created_at", -1)
        .limit(1)
    )
    mqtt = next(webSocket, None)
    mqtt = serialize(mqtt)
    mqtt = mqtt['address']
    bus_api_delete = mqtt+'plalion/device/delete'
    
    if request.method == 'DELETE':
        try:
            response = requests.post(bus_api_delete, {"serial_num": sn })
            response.raise_for_status()
            print(response)
            
        except requests.RequestException as e:
            return JsonResponse({"error": str(e), "message":"Delete device failed"}, status=500, )
        
        bus_klaen_devices_collection.delete_one({"serial_num": sn})
        return JsonResponse({"status": "deleted"})
    
@csrf_exempt
def detail_device(request, did):
    webSocket = (
        bus_klaen_mqtt
        .find({})
        .sort("created_at", -1)
        .limit(1)
    )
    mqtt = next(webSocket, None)
    mqtt = serialize(mqtt)
    mqtt = mqtt['address']
    bus_api_detail = mqtt+'plalion/device/get/data'
    
    if request.method == 'POST':
        try:
            response = requests.post(bus_api_detail, {"did": did })
            response.raise_for_status()
            # print(response)
            return JsonResponse({"data": response.json()}, safe=False)

            
        except requests.RequestException as e:
            return JsonResponse({"error": str(e), "message":"Delete device failed"}, status=500, )
                
        