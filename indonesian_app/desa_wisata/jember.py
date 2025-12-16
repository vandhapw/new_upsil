from django.shortcuts import render, redirect
from datetime import timedelta, datetime
import time
import json
from bson import ObjectId
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from production.utils import dbLocation
from pymongo import MongoClient
import pytz
from django.utils import timezone
import logging
from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from production.utils import get_mongo_client

import uuid

from django.shortcuts import redirect
from django.contrib import messages


client = get_mongo_client()
db = client['indonesia_db']
tourism_village_collection = db['desa_wisata']

def get_jember_tourism_villages(request):
    if request.method != 'GET':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
    
    villages = list(tourism_village_collection.find({}, {'_id': 0}))
    return JsonResponse(villages, safe=False)

@csrf_exempt
def add_desa_wisata(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        document = {
            'nama_desa_wisata': data.get('nama_desa_wisata'),
            'koordinat': data.get('koordinat'),
            "tanggal_diresmikan": data.get("tanggal_diresmikan", ""),
            "kecamatan": data.get("kecamatan", ""),
            "desa": data.get("desa", ""),
            "image_url": data.get("image_url", ""),
            "video_url": data.get("video_url", ""),
            "testimonial": data.get("testimonial", ""),
            "approval_display": data.get("approval_display", False),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }

        result = tourism_village_collection.insert_one(document)
        return JsonResponse({'message': 'Desa wisata added', 'id': str(result.inserted_id)}, status=201)

@csrf_exempt    
def approval_desa_wisata(request, id):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method not allowed'}, status=405)

    try:
        object_id = ObjectId(id)   # konversi string ke ObjectId
    except Exception:
        return JsonResponse({'message': 'Invalid ID format'}, status=400)

    result = tourism_village_collection.update_one(
        {'_id': object_id},
        {'$set': {'approval_display': True}}
    )

    if result.matched_count == 0:
        return JsonResponse({'message': 'Desa wisata not found'}, status=404)

    return JsonResponse({'message': 'Desa wisata approved'})


def notifications(request):
    if request.method != 'GET':
        return JsonResponse({'message': 'Method not allowed'}, status=405)
    
    pending_villages = list(tourism_village_collection.find({'approval_display': False}))

    pending_data = []
    for village in pending_villages:
        pending_data.append({
            'id': str(village['_id']),  # konversi ObjectId ke string
            'nama_desa_wisata': village.get('nama_desa_wisata'),
            'approval_display': village.get('approval_display'),
            'created_at': village.get('created_at'),
            'updated_at': village.get('updated_at')
        })
    messages = []
    for village in pending_villages:
        messages.append(f"Desa Wisata '{village['nama_desa_wisata']}' is pending approval.")
    return JsonResponse({'message': messages, 'data':pending_data}, safe=False)
        