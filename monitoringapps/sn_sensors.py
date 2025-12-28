import uuid
from django.views.decorators.csrf import csrf_exempt
import json
from django.utils.timezone import now
from django.contrib.auth.hashers import make_password
from django.http import JsonResponse
from datetime import datetime
from bson import ObjectId
from .util import serialize_sensor_sn
import requests
from klaen.utils import serialize, bus_klaen_mqtt, bus_klaen_logs, register_plalion_sensor,plalion_company_data_collection
import threading
import time
import requests
import logging
from bson import ObjectId



logger = logging.getLogger(__name__)

sns_collection = plalion_company_data_collection

def getAllSensors(request):
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    # ===== FETCH ALL SENSOR DATA =====
    cursor = sns_collection.find({}).sort("timestamp", -1)
    sensors = [serialize_sensor_sn(doc) for doc in cursor]

    # ===== UNIQUE SERIAL NUMBERS =====
    unique_serials = sns_collection.distinct("serial_number")
    
    # =========== START and END Dates ===========
    if sensors:
        start_date = sensors[-1]['timestamp']
        end_date = sensors[0]['timestamp']
    else:
        start_date = None
        end_date = None

    return JsonResponse(
        {
            "results": sensors,
            "total_records": len(sensors),
            "unique_serial_count": len(unique_serials),
            "unique_serials": unique_serials,
            "start_date": start_date,
            "end_date": end_date,
            "mode": "all"
        },
        safe=False
    )
    
def getSensorBySerialNumber(request, serial_number):
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    # ===== FETCH SENSOR DATA BY SERIAL NUMBER =====
    cursor = sns_collection.find({"serial_number": serial_number}).sort("timestamp", -1)
    sensors = [serialize_sensor_sn(doc) for doc in cursor]

    if not sensors:
        return JsonResponse({"error": "No data found for the given serial number"}, status=404)

    return JsonResponse(
        {
            "results": sensors,
            "total_records": len(sensors),
            "serial_number": serial_number,
            "mode": "by_serial_number"
        },
        safe=False
    )

@csrf_exempt    
def getAllActiveSensors(request):
    webSocket = (
        bus_klaen_mqtt
        .find({})
        .sort("created_at", -1)
        .limit(1)
    )
    mqtt = next(webSocket, None)
    mqtt = serialize(mqtt)
    mqtt = mqtt['address']
    sensor_status = mqtt+'plalion/status/get'
    sensor_exist = mqtt+'plalion/device/exist/serial_number'
    # ===== FETCH ALL SENSOR DATA =====
    # cursor = register_plalion_sensor.find({}).sort("timestamp", -1)
    # sensors = [serialize_sensor_sn(doc) for doc in cursor]
    
    if request.method == 'GET':
        data = [serialize(d) for d in register_plalion_sensor.find()]
        status_data = []
        for d in data:
            if "serial_number" in d:
                try:
                    serial_num = str(d['serial_number'])  # force to string
                    response = requests.post(sensor_status, {"serial_num":d['serial_number']})
                    existing_sensor = requests.post(sensor_exist, {"serial_num":d['serial_number']})
                    # MERGE SNS COLLECTION DATA
                    total_raw = sns_collection.count_documents({"serial_number": serial_num})
                    status_data.append({
                        "serial_number": d['serial_number'],
                        "total_raw": total_raw,
                        "sensor_status": d['sensor_status'],
                        "status":response.json(),
                        "existing_sensor":existing_sensor.json()
                        })
                except requests.RequestException as e :
                    status_data.append({"error":str(e)})
        
        # ===== UNIQUE SERIAL NUMBERS =====
        # unique_serials = list({item.get("serial_number") for item in status_data if "serial_number" in item})
        unique_serials = list({
            item["serial_number"]
            for item in status_data
            if "serial_number" in item
            and item.get("status") is not None
            and item["status"].get("rows")  # only include if rows is not empty
        })

        # print("Unique Serials:", unique_serials)

    
        return JsonResponse(
            {   
                "results": status_data,
                "total_records": len(status_data),
                "mode": "all_active_sensors",
                "unique_serials" : unique_serials
            },
            safe=False
        )
    
    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            serial_number = body.get("serial_number")
            print('serial_number', serial_number)
            response = requests.post(sensor_exist, {"serial_num":serial_number})
            existing_sensor = requests.post(sensor_exist, {"serial_num":serial_number})
            results = response.json()
            sensor_data = []
            if results.get("rows") is None or len(results.get("rows")) == 0:
                register_plalion_sensor.insert_one({
                        "serial_number": serial_number,
                        "sensor_status": False,
                        "data":{
                            "serial_num": serial_number,
                            "did": None,
                            "mac_address": None,
                            "location": None,
                            "space": None,
                            },
                        "created_at": now(),
                        "updated_at": now(),
                    })
                return JsonResponse({"message":"New Sensor registered "}, status=200)
            if results.get("rows"):
                sensor_data = results["rows"][0]
                cursor = register_plalion_sensor.find({"serial_number": sensor_data['serial_num']})
                data = [serialize(d) for d in cursor]
                print("DATA:",len(data))
                if len(data) == 0 or data is None:
                    register_plalion_sensor.insert_one({
                        "serial_number": sensor_data['serial_num'],
                        "sensor_status": False,
                        "data":results.get("rows")[0],
                        "created_at": now(),
                        "updated_at": now(),
                    })
                    return JsonResponse({"message":"Sensor registered"}, status=200)
                else :
                    return JsonResponse({"message":"Sensor already registered"}, status=200)

            status_data.append({
                "results": response.json(),
                # "status":response.json()
                })
        except requests.RequestException as e :
            return JsonResponse({"error": str(e), "message":"Fetching sensor status failed"}, status=500, )
            # status_data.append({"error":str(e)})
        
        return JsonResponse({"results": results,"sensor_data":sensor_data["serial_num"], "data":data}, status=200)
    
@csrf_exempt    
def checkExistingSensor(request):
    webSocket = (
        bus_klaen_mqtt
        .find({})
        .sort("created_at", -1)
        .limit(1)
    )
    mqtt = next(webSocket, None)
    mqtt = serialize(mqtt)
    mqtt = mqtt['address']
    sensor_exist = mqtt+'plalion/device/exist/serial_number'
    
    if request.method == 'POST':
        try:
            # register_plalion_sensor
            body = json.loads(request.body)
            serial_number = body.get("serial_number")
            serial_number = int(serial_number)  # force to string
            sensorCheck= register_plalion_sensor.find({"serial_number": serial_number})
            data = [serialize(d) for d in sensorCheck]
            print("DATA:",len(data))
            # print("SN:",serial_number)
            print("data", data)
            if len(data) > 0:
                return JsonResponse({"results":"Serial Number already exist", "exist":True}, status=200)
            else :
                # return JsonResponse({"results":"Sensor not found", "exist":False}, status=200)
                existing_sensor = requests.post(sensor_exist, {"serial_num":serial_number})
                results = existing_sensor.json()
            
        except requests.RequestException as e :
            return JsonResponse({"error": str(e), "message":"Fetching sensor status failed"}, status=500, )
            # status_data.append({"error":str(e)})
        
        return JsonResponse({"results": results, "exist":False}, status=200)

@csrf_exempt
def insertSensor(serial_number):
    webSocket = (
        bus_klaen_mqtt
        .find({})
        .sort("created_at", -1)
        .limit(1)
    )
    mqtt = next(webSocket, None)
    mqtt = serialize(mqtt)
    mqtt = mqtt['address']
    data_sensor = mqtt+'plalion/status/get'
    try:
        # body = json.loads(request.body)
        # serial_number = body.get("serial_number")
        # print('serial_number', serial_number)
        response = requests.post(data_sensor, {"serial_num":serial_number})
        response = response.json()
        
        row = response.get("rows", [{}])[0]
        from zoneinfo import ZoneInfo   # Python 3.9+

        utc_now = now()  # UTC datetime
        seoul_now = utc_now.astimezone(ZoneInfo("Asia/Seoul"))
       
        data_stored = {
            "ozone": row.get("ozone_val"),
            "co2": row.get("co2_val"),
            "temperature": row.get("temp_val"),
            "humidity": row.get("humi_val"),
            "dust": row.get("dust_val"),
            "voc": row.get("voc_val"),
            "serial_number": serial_number,
            "timestamp": seoul_now,
            "last_time": row.get("last_time"),
            "active": row.get("active"),
            "m_enable": row.get("m_enable"),
            "s_enable": row.get("s_enable"),  # adjusted from r_enable → s_enable
        }
        
        result = sns_collection.insert_one(data_stored)

        return JsonResponse({
            "status": "inserted",
            "id": str(result.inserted_id)  # convert ObjectId → string
        })
    except Exception as e:
        logger.exception("Failed to insert sensor %s: %s", serial_number, str(e))
        return JsonResponse({"error": str(e), "message":"Inserting sensor failed"}, status=500, )

    
def activate_sensor():
    """
    Fetch active sensor serial numbers safely.
    """
    try:
        cursor = register_plalion_sensor.find(
            {"sensor_status": True},
            {"_id": 0, "serial_number": 1}
        )

        serial_numbers = [
            doc["serial_number"]
            for doc in cursor
            if "serial_number" in doc
        ]

        return serial_numbers

    except Exception as e:
        logger.exception("Failed to fetch active sensors")
        return []

    
# ============================= Schedule / Real Time =======================================
FETCH_INTERVAL = 5  # seconds

def schedule_data_fetch(stop_event):
    logger.info("Sensor schedule thread started")

    while not stop_event.is_set():
        try:
            serial_numbers = activate_sensor()

            logger.info("Active sensors: %s", serial_numbers)
            
            for sn in serial_numbers:
                try:
                    logger.info("Fetching data for %s", sn)
                    # print("Fetching data for ", sn)
                    insertSensor(sn)
                    # plalion_fromRESTAPI(serial_number)
                except Exception:
                    logger.exception(
                        "Failed to fetch data for %s", sn
                    )

            stop_event.wait(FETCH_INTERVAL)

        except Exception:
            logger.exception("Unexpected scheduler error")
            stop_event.wait(30)

    logger.info("Sensor schedule thread stopped")
