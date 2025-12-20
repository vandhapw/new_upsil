from django.shortcuts import render
from django.http import JsonResponse
from pymongo import MongoClient
from production.utils import get_mongo_client
import json
from datetime import datetime,timedelta
import math
from django.utils.dateparse import parse_datetime
import csv
from django.http import StreamingHttpResponse 

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


def iaq_realtime_view(request):
    doc = collection.find_one(
        {},
        sort=[('timestamp', -1)],
        projection={'_id': 0}
    )

    if not doc:
        return JsonResponse({'data': None})

    return JsonResponse({
        'data': {
            'co2': doc['co2'],
            'voc': doc['voc'],
            'temperature': doc['temperature'],
            'humidity': doc['humidity'],
            'dust': doc['dust'],
            'ozone': doc['ozone'],
            'timestamp': doc['timestamp'],
        }
    })

def calculate_iaq(doc):
    """
    Versi 'penalty-based':
    - CO2: penalti maks 30 poin (>= 3000 ppm)
    - VOC: penalti maks 30 poin (>= 3000 unit)
    - Dust: penalti maks 20 poin (>= 20 µg/m3)
    - Ozone: penalti maks 20 poin (>= 20 unit, misal *1000 dari ppm)
    """
    co2 = doc.get('co2', 0)
    voc = doc.get('voc', 0)
    dust = doc.get('dust', 0)
    ozone = doc.get('ozone', 0)

    score = 100.0
    score -= min(co2 / 100.0, 30.0)   # 1000 ppm -> -10, 3000+ -> -30
    score -= min(voc / 100.0, 30.0)
    score -= min(dust, 20.0)          # 1 µg/m3 -> -1, 20+ -> -20
    score -= min(ozone, 20.0)

    return max(int(round(score)), 0)


def iaq_index_view(request):
    now = datetime.utcnow()
    one_hour_ago = now - timedelta(hours=1)

    latest = collection.find_one(
        {},
        sort=[('timestamp', -1)]
    )

    prev = collection.find_one(
        {'timestamp': {'$lte': one_hour_ago}},
        sort=[('timestamp', -1)]
    )

    if not latest:
        return JsonResponse({'data': None})

    current_score = calculate_iaq(latest)
    prev_score = calculate_iaq(prev) if prev else None

    status = (
        'Good' if current_score >= 80
        else 'Moderate' if current_score >= 50
        else 'Poor'
    )

    return JsonResponse({
        'data': {
            'current': current_score,
            'previous_hour': prev_score,
            'status': status
        }
    })

def iaq_trends_view(request):
    hours = int(request.GET.get('hours', 24))
    since = datetime.utcnow() - timedelta(hours=hours)

    pipeline = [
        {'$match': {'timestamp': {'$gte': since}}},
        {
            '$group': {
                '_id': {
                    '$dateToString': {
                        'format': '%Y-%m-%d %H:%M',
                        'date': '$timestamp'
                    }
                },
                'co2': {'$avg': '$co2'},
                'voc': {'$avg': '$voc'},
                'temperature': {'$avg': '$temperature'},
                'humidity': {'$avg': '$humidity'},
                'dust': {'$avg': '$dust'},
                'ozone': {'$avg': '$ozone'},
            }
        },
        {'$sort': {'_id': 1}},
        {'$limit': 500}
    ]

    data = list(collection.aggregate(pipeline))

    return JsonResponse({'data': data})
    
def iaq_latest_table_view(request):
    limit = int(request.GET.get('limit', 50))

    cursor = (
        collection
        .find({}, {'_id': 0})
        .sort('timestamp', -1)
        .limit(limit)
    )

    data = []
    for doc in cursor:
        iaq = calculate_iaq(doc)
        status = (
            'Good' if iaq >= 80
            else 'Moderate' if iaq >= 50
            else 'Poor'
        )

        data.append({
            'timestamp': doc['timestamp'],
            'co2': doc['co2'],
            'voc': doc['voc'],
            'temperature': doc['temperature'],
            'humidity': doc['humidity'],
            'dust': doc['dust'],
            'ozone': doc['ozone'],
            'status': status
        })

    return JsonResponse({'data': data})

def iaq_filtered_data(request):
    # ---- Query params ----
    start = request.GET.get("start")
    end = request.GET.get("end")
    page = int(request.GET.get("page", 1))
    page_size = int(request.GET.get("page_size", 50))

    # ---- Build filter ----
    query = {}

    if start and end:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
        query["timestamp"] = {
            "$gte": start_dt,
            "$lte": end_dt
        }

    # ---- Pagination ----
    skip = (page - 1) * page_size

    cursor = (
        collection
        .find(query, {"_id": 0})
        .sort("timestamp", -1)
        .skip(skip)
        .limit(page_size)
    )

    data = list(cursor)
    total = collection.count_documents(query)

    return JsonResponse({
        "meta": {
            "page": page,
            "page_size": page_size,
            "total_records": total,
            "total_pages": math.ceil(total / page_size)
        },
        "data": data
    })

def iaq_export_csv(request):
    
    start = request.GET.get("start")
    end = request.GET.get("end")

    query = {}

    if start and end:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
        query["timestamp"] = {
            "$gte": start_dt,
            "$lte": end_dt
        }

    cursor = (
        collection
        .find(query, {"_id": 0})
        .sort("timestamp", 1)
    )

    def csv_generator():
        header_written = False

        for row in cursor:
            if not header_written:
                yield ','.join(row.keys()) + '\n'
                header_written = True

            yield ','.join(str(v) for v in row.values()) + '\n'

    response = StreamingHttpResponse(
        csv_generator(),
        content_type="text/csv"
    )

    response["Content-Disposition"] = (
        'attachment; filename="iaq_data.csv"'
    )

    return response