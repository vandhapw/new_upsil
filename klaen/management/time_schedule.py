import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from ..utils import serialize, bus_klaen_time_schedule_collection

@csrf_exempt
def time_schedule_list(request):
    if request.method == 'GET':
        data = [serialize(d) for d in bus_klaen_time_schedule_collection.find()]
        return JsonResponse(data, safe=False)

    if request.method == 'POST':
        payload = json.loads(request.body)
        bus_klaen_time_schedule_collection.insert_one(payload)
        return JsonResponse({"status": "created"})
