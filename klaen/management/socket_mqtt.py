import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from ..utils import serialize, bus_klaen_mqtt

@csrf_exempt
def mqtt_address(request):
    if request.method == 'GET':
        # Get the latest record
        doc = (
            bus_klaen_mqtt
            .find({})
            .sort("created_at", -1)
            .limit(1)
        )
        mqtt = next(doc, None)
        if mqtt:
            return JsonResponse(serialize(mqtt), safe=False)
        else:
            return JsonResponse({"error": "No MQTT address found"}, status=404)

    elif request.method == 'POST':
        # Update or insert a single MQTT address
        try:
            data = json.loads(request.body)
            # Example: update the latest record
            bus_klaen_mqtt.update_one(
                {},  # match first document
                {"$set": data},
                upsert=True
            )
            return JsonResponse({"success": True, "updated": data})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)