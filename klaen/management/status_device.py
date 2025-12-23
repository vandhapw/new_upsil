from django.http import JsonResponse
from ..utils import serialize,bus_klaen_status_collection, bus_klaen_mqtt, bus_klaen_devices_collection
import requests

def status_list(request):
    webSocket = (
        bus_klaen_mqtt
        .find({})
        .sort("created_at", -1)
        .limit(1)
    )
    mqtt = next(webSocket, None)
    mqtt = serialize(mqtt)
    mqtt = mqtt['address']
    bus_api_status = mqtt+'plalion/status/get'
    
    if request.method == 'GET':
        data = [serialize(d) for d in bus_klaen_devices_collection.find()]
        
        status_data = []
        for d in data:
            if "serial_num" in d:
                try:
                    response = requests.post(bus_api_status, {"serial_num":d['serial_num']})
                    status_data.append({
                        "serial_num": d['serial_num'],
                        "status":response.json()
                        })
                except requests.RequestException as e :
                    status_data.append({"error":str(e)})
                    
        
        return JsonResponse({"data": status_data}, safe=False)
                
    
    
    
    # try:
    #     response = requests.post(bus_api_status, {"serial_num": sn})
    #     response.raise_for_status()
        
    # except requests.RequestException as e:
    #         return JsonResponse({"error": str(e), "message":"Registering device failed"}, status=500, )
    
    # data = [
    #     serialize(d) for d in
    #     bus_klaen_status_collection.find().sort("last_time", -1)
    # ]
    return JsonResponse(data, safe=False)
