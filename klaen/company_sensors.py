from .utils import * 
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from django.utils import timezone
import pytz
from django.http import JsonResponse, HttpResponse
from rest_framework.response import Response
import requests
from rest_framework import status
import json
from .utils import *

def mqtt_address(request):
    if request.method == 'GET':
        # Get the latest record
        doc = (
            klaen_mqtt_collection
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
            klaen_mqtt_collection.update_one(
                {},  # match first document
                {"$set": data},
                upsert=True
            )
            return JsonResponse({"success": True, "updated": data})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


class PlalionSensorDataView(APIView):
    def post(self, request, format=None):
        data = request.data

        # Current timestamp (timezone-aware)
        timestamp = timezone.now()

        # Convert to UTC+9 (Asia/Seoul)
        target_timezone = pytz.timezone('Asia/Seoul')
        converted_datetime = timestamp.astimezone(target_timezone)
        converted_datetime = converted_datetime.replace(tzinfo=None)  # store naive datetime

        # Build dictionary for MongoDB
        data_dict = {
            'temperature': data.get('temp'),
            'humidity': data.get('hum'),
            'ozone': data.get('ozone'),
            'dust': data.get('dust'),
            'co2': data.get('co2'),
            'voc': data.get('voc'),
            'timestamp': converted_datetime
        }

        # Insert into MongoDB
        plalion_data_collection.insert_one(data_dict)

        return Response(data_dict, status=status.HTTP_201_CREATED)
    

def get_latest_sensor_mqtt(request):
    serial_numbers = [8545872, 2581352, 2581292, 2581308, 4200100]
    titles = [
        "1BAY 공장 실내 공기질 모니터링 현황",
        "2BAY 공장 실내 공기질 모니터링 현황",
        "3BAY 공장 실내 공기질 모니터링 현황",
        "4BAY 공장 실내 공기질 모니터링 현황",
        "5BAY 공장 실내 공기질 모니터링 현황"
    ]
    REST_API = jungrok_url + 'status/get'
    headers = {
        "Content-Type": "application/json"
    }
    
    results = []
    ozone_sum = 0
    co2_sum = 0
    voc_sum = 0
    temperature_sum = 0
    humidity_sum = 0
    particulate_matter_sum = 0
    count = 0
    latest_timestamp = None

    for i, serial_num in enumerate(serial_numbers):
        data = {
            "serial_num": [serial_num],
        }
        
        response = requests.post(REST_API, data=json.dumps(data), headers=headers)
        
        if response.status_code == 200:
            response_data = response.json()
            rows = response_data.get("rows", [])
            
            if rows:
                row = rows[0]
                row["title"] = titles[i] if i < len(titles) else f"Title for serial number {serial_num}"
                row["voc_val"] = round((row.get("voc_val") / 1000), 3)
                results.append(row)
                
                # Accumulate values
                ozone_sum += row.get("ozone_val", 0)
                co2_sum += row.get("co2_val", 0)
                voc_sum += row.get("voc_val", 0)
                temperature_sum += row.get("temp_val", 0)
                humidity_sum += row.get("humi_val", 0)
                particulate_matter_sum += row.get("dust_val", 0)
                count += 1
                
                # Update latest timestamp
                latest_timestamp = row.get("last_time", latest_timestamp)
            else:
                results.append({"serial_num": serial_num, "error": "No data from the REST API"})
        else:
            results.append({"serial_num": serial_num, "error": "Failed to fetch data from the REST API"})
    
    if count > 0:
        averages = {
            "title": "1공장 실내 공기질 모니터링 현황",
            "ozone_val": ozone_sum / count,
            "co2_val": co2_sum / count,
            "voc_val": voc_sum / count,
            "temp_val": temperature_sum / count,
            "humi_val": humidity_sum / count,
            "dust_val": particulate_matter_sum / count,
            "last_time": latest_timestamp
        }
        results.insert(0, averages)
    
    response_data = {
        "results": results,
        "latest_timestamp": latest_timestamp
    }
    
    return JsonResponse(response_data, status=status.HTTP_200_OK, safe=False)
