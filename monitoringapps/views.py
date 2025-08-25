from django.shortcuts import render
from django.http import JsonResponse
from pymongo import MongoClient
from production.utils import get_mongo_client
import json

client = get_mongo_client()
db = client['server_db']
collection = db['plalion_klaen_sensor']

@staticmethod
def plalion_sensor_data_view(request):
    data = list(collection.find({}, {'_id': 0}).sort('timestamp', -1).limit(5))
    return JsonResponse({'data': data})

# Create your views here.
def iaq_sensor_monitoring(request):
    sensor_data = list(collection.find({}, {'_id': 0}).sort('timestamp', -1).limit(120))
    return render(request, 'dashboard/kaiadmin/partials/monitoring_sensor.html', 
                  {'sensor_data': sensor_data})

def get_latest_sensor_data(request):
    # Fetch the most recent sensor data
    latest_data = list(collection.find({}, {'_id': 0}).sort('timestamp', -1).limit(1))
    return JsonResponse({'data': latest_data})
    
def dashboard_content(request):

    response = plalion_sensor_data_view(None, request)
    data = response.content  # JsonResponse returns a HttpResponse, get content
    return render(request, 'dashboard/kaiadmin/partials/dashboard_content.html', {'sensor_data': data})

def under_construction(request):
    return render(request, 'dashboard/kaiadmin/partials/under_construction.html')

    
