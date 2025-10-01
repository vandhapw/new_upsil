from django.shortcuts import render
from django.http import JsonResponse
# mongoclient 
from pymongo import MongoClient
import requests

client = MongoClient("mongodb://localhost:27017/")
db = client["server_db"]
korean_provinces_collection = db["korean_provinces"]
korean_attractions_collection = db["tourism_attraction"]

geopify_api_key = "a5edd953082d4f209e8ef29fdeedb0a1"
limit = 100
categories = "accommodation.hotel"
geopify_api_url = f"https://api.geoapify.com/v2/places?categories={categories}&filter=rect:${{bounds.minLng}},${{bounds.minLat}},${{bounds.maxLng}},${{bounds.maxLat}}&limit={limit}&apiKey={geopify_api_key}"


# Create your views here.
def korean_tourism_page(request):
    provinces = korean_provinces_collection.find()
    return render(request, 'dashboard/tourism/korean_tourism/index.html', {'provinces': provinces})

# New API endpoint for provinces data
def get_provinces_api(request):
    try:
        provinces_cursor = korean_provinces_collection.find()
        provinces_list = []
        
        for province in provinces_cursor:
            # Convert MongoDB ObjectId to string for JSON serialization
            province['_id'] = str(province['_id'])
            provinces_list.append(province)
        
        return JsonResponse({
            'success': True,
            'provinces': provinces_list
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

# API endpoint for GeoJSON data if stored in MongoDB
def get_provinces_geojson_api(request):
    try:
        # Assuming you have GeoJSON data in MongoDB
        # If your korean_provinces collection contains GeoJSON data
        provinces_cursor = korean_provinces_collection.find()
        
        # Convert to GeoJSON format
        features = []
        for province in provinces_cursor:
            if 'geometry' in province and 'properties' in province:
                feature = {
                    "type": "Feature",
                    "geometry": province['geometry'],
                    "properties": province['properties']
                }
                features.append(feature)
        
        geojson_data = {
            "type": "FeatureCollection",
            "features": features
        }
        
        return JsonResponse(geojson_data)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
    
def get_provinces_by_code(request):
    code = request.GET.get('code')
    if not code:
        return JsonResponse({'error': 'Province code is required'}, status=400)

    province = korean_provinces_collection.find_one({'code': code}, {'_id': 0, 'geometry': 1})
    if not province:
        return JsonResponse({'error': 'Province not found'}, status=404)

    return JsonResponse(province)


    

def get_hotel_list(request):
    try:
        # Extract bounds from request parameters
        bounds = {
            'minLng': request.GET.get('minLng'),
            'minLat': request.GET.get('minLat'),
            'maxLng': request.GET.get('maxLng'),
            'maxLat': request.GET.get('maxLat')
        }

        # Validate bounds
        if not all(bounds.values()):
            return JsonResponse({
                'success': False,
                'error': 'Missing or invalid bounds parameters'
            }, status=400)

        # Format the Geoapify API URL with the bounds
        url = geopify_api_url.format(bounds=bounds)

        # Make a request to the Geoapify API
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            return JsonResponse({
                'success': True,
                'hotels': data.get('features', [])
            })
        else:
            return JsonResponse({
                'success': False,
                'error': f"Geoapify API error: {response.status_code} {response.text}"
            }, status=response.status_code)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
    
def get_attraction_list(request):
    try:
        # Extract province ID from request parameters
        province_id = request.GET.get('province_id')

        # Validate province ID
        if not province_id:
            return JsonResponse({
                'success': False,
                'error': 'Missing or invalid province_id parameter'
            }, status=400)

        # Query attractions based on the selected province
        elif province_id:
            attractions_cursor = korean_attractions_collection.find({"province_id": int(province_id)})
        else:
            attractions_cursor = korean_attractions_collection.find()
        attractions_list = []

        for attraction in attractions_cursor:
            # Convert MongoDB ObjectId to string for JSON serialization
            attraction['_id'] = str(attraction['_id'])
            
            attractions_list.append(attraction)

        return JsonResponse({
            'success': True,
            'attractions': attractions_list
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)