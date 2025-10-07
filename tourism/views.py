from django.shortcuts import render
from django.http import JsonResponse
# mongoclient 
from pymongo import MongoClient
import requests
from django.views.decorators.csrf import csrf_exempt
import json, datetime
import uuid

client = MongoClient("mongodb://localhost:27017/")
db = client["server_db"]
korean_provinces_collection = db["korean_provinces"]
korean_attractions_collection = db["tourism_attraction"]
trip_optimization_collection = db["trip_optimization"]

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
    
def get_trip_optimization_data(request):
    try:
        # Fetch all trip optimization data from the collection
        trip_data_cursor = trip_optimization_collection.find()
        trip_data_list = []

        for trip in trip_data_cursor:
            # Convert MongoDB ObjectId to string for JSON serialization
            trip['_id'] = str(trip['_id'])
            trip_data_list.append(trip)

        return JsonResponse({
            'success': True,
            'trip_optimization_data': trip_data_list
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
    

@csrf_exempt
def trip_optimization_api(request):
    """
    API endpoint to receive trip optimization data from the frontend
    """
    if request.method == 'POST':
        try:
            # Parse the incoming JSON data
            data = json.loads(request.body)
            
            # Get user information from session
            user_id = request.session.get('id')
            username = request.session.get('username')
            
            # if not user_id:
            #     return JsonResponse({'error': 'User not authenticated'}, status=401)
            
            # Extract trip optimization data
            trip_data = {
                'user_id': user_id,
                'username': username,
                'optimization_id': str(uuid.uuid4()),
                'timestamp': datetime.datetime.now(),
                
                # Province information
                'province': {
                    'name': data.get('province', {}).get('name', 'Not selected'),
                    'code': data.get('province', {}).get('code', ''),
                    'coordinates': data.get('province', {}).get('coordinates', [])
                },
                
                # Date and time information
                'schedule': {
                    'start_date': data.get('dateTimeInfo', {}).get('startDate', 'Not set'),
                    'end_date': data.get('dateTimeInfo', {}).get('endDate', 'Not set'),
                    'start_time': data.get('dateTimeInfo', {}).get('startTime', 'Not set'),
                    'end_time': data.get('dateTimeInfo', {}).get('endTime', 'Not set'),
                    'duration_days': data.get('tripDuration', 0)
                },
                
                # Hotel information
                'hotels': {
                    'count': len(data.get('hotels', [])),
                    'total_days': sum(hotel.get('days', 0) for hotel in data.get('hotels', [])),
                    'bookings': data.get('hotels', []),
                    'coordinates': data.get('hotelCoordinates', [])
                },
                
                # Attraction information
                'attractions': {
                    'count': len(data.get('attractions', [])),
                    'selections': data.get('attractions', []),
                    'by_type': {},
                    'by_province': {}
                },
                
                # # Optimization metadata
                # 'optimization_metadata': {
                #     'map_focused': data.get('mapFocused', False),
                #     'history_preserved': data.get('historyPreserved', False),
                #     'validation_status': data.get('validationStatus', 'unknown'),
                #     'data_storage': data.get('dataStorage', {})
                # },
                
                # Status and flags
                'status': 'optimized',
                'is_complete': data.get('isComplete', False),
                'created_at': datetime.datetime.now(),
                'updated_at': datetime.datetime.now()
            }
            
            # Calculate attraction statistics
            attractions = data.get('attractions', [])
            if attractions:
                # Group by type
                for attraction in attractions:
                    attraction_type = attraction.get('type', 'unknown')
                    trip_data['attractions']['by_type'][attraction_type] = trip_data['attractions']['by_type'].get(attraction_type, 0) + 1
                
                # Group by province
                for attraction in attractions:
                    attraction_province = attraction.get('province', 'unknown')
                    trip_data['attractions']['by_province'][attraction_province] = trip_data['attractions']['by_province'].get(attraction_province, 0) + 1
            
            # Store in MongoDB
            # result = trip_optimization_collection.insert_one(trip_data)
            final_data = final_data_used(trip_data)

            return JsonResponse({
                'success': True,
                # 'final_data': final_data,
                'trip_data': trip_data
            }, status=200)
            
        except json.JSONDecodeError as e:
            return JsonResponse({
                'success': False,
                'error': f'Invalid JSON data: {str(e)}'
            }, status=400)
        except Exception as e:
            print(f"Error in trip_optimization_api: {str(e)}")
            print(f"Request body: {request.body}")
            return JsonResponse({
                'success': False,
                'error': f'Server error: {str(e)}'
            }, status=500)
            
            # if result.inserted_id:
            #     # Prepare response data
            #     response_data = {
            #         'success': True,
            #         'message': 'Trip optimization data received and stored successfully',
            #         'optimization_id': trip_data['optimization_id'],
            #         'summary': {
            #             'province': trip_data['province']['name'],
            #             'duration': trip_data['schedule']['duration_days'],
            #             'hotels': {
            #                 'count': trip_data['hotels']['count'],
            #                 'total_days': trip_data['hotels']['total_days']
            #             },
            #             'attractions': {
            #                 'count': trip_data['attractions']['count'],
            #                 'types': list(trip_data['attractions']['by_type'].keys()),
            #                 'provinces': list(trip_data['attractions']['by_province'].keys())
            #             }
            #         },
            #         'recommendations': {
            #             'budget_estimate': calculate_budget_estimate(trip_data),
            #             'travel_tips': generate_travel_tips(trip_data),
            #             'optimization_score': calculate_optimization_score(trip_data)
            #         },
            #         'data_insights': {
            #             'trip_completeness': calculate_trip_completeness(trip_data),
            #             'geographical_spread': calculate_geographical_spread(trip_data),
            #             'time_optimization': calculate_time_optimization(trip_data)
            #         },
            #         'stored_at': trip_data['timestamp'].isoformat(),
            #         'user_id': user_id
            #     }
                
            #     return JsonResponse(response_data, status=200)
            # else:
            #     return JsonResponse({'error': 'Failed to store optimization data'}, status=500)
                
        # except json.JSONDecodeError:
        #     return JsonResponse({'error': 'Invalid JSON data'}, status=400)
        # except Exception as e:
        #     return JsonResponse({'error': f'Server error: {str(e)}'}, status=500)
    
    elif request.method == 'GET':
        # Get user's optimization history
        user_id = request.session.get('id')
        if not user_id:
            return JsonResponse({'error': 'User not authenticated'}, status=401)
        
        try:
            # Get recent optimizations for the user
            optimizations = list(trip_optimization_collection.find(
                {'user_id': user_id},
                sort=[('created_at', -1)],
                limit=10
            ))
            
            # Convert ObjectId to string for JSON serialization
            for opt in optimizations:
                opt['_id'] = str(opt['_id'])
                opt['created_at'] = opt['created_at'].isoformat()
                opt['updated_at'] = opt['updated_at'].isoformat()
                opt['timestamp'] = opt['timestamp'].isoformat()
            
            return JsonResponse({
                'success': True,
                'optimizations': optimizations,
                'count': len(optimizations)
            }, status=200)
            
        except Exception as e:
            return JsonResponse({'error': f'Error retrieving optimization history: {str(e)}'}, status=500)
    
    else:
        return JsonResponse({'error': 'Method not allowed'}, status=405)

def calculate_budget_estimate(trip_data):
    """Calculate estimated budget for the trip"""
    base_daily_cost = 80  # USD per day base cost
    hotel_cost_multiplier = 1.5
    attraction_cost = 15  # USD per attraction
    
    duration = trip_data['schedule']['duration_days']
    hotel_days = trip_data['hotels']['total_days']
    attraction_count = trip_data['attractions']['count']
    
    estimated_cost = (duration * base_daily_cost) + (hotel_days * base_daily_cost * hotel_cost_multiplier) + (attraction_count * attraction_cost)
    
    return {
        'estimated_total_usd': round(estimated_cost, 2),
        'estimated_total_krw': round(estimated_cost * 1300, 0),  # Approximate USD to KRW
        'daily_average_usd': round(estimated_cost / max(duration, 1), 2),
        'breakdown': {
            'accommodation': round(hotel_days * base_daily_cost * hotel_cost_multiplier, 2),
            'attractions': round(attraction_count * attraction_cost, 2),
            'daily_expenses': round(duration * base_daily_cost, 2)
        }
    }

def generate_travel_tips(trip_data):
    """Generate personalized travel tips"""
    tips = []
    
    province = trip_data['province']['name']
    hotel_count = trip_data['hotels']['count']
    attraction_count = trip_data['attractions']['count']
    duration = trip_data['schedule']['duration_days']
    
    # Province-specific tips
    if province != 'Not selected':
        tips.append(f"Explore {province}'s local cuisine and traditional markets for an authentic experience.")
    
    # Hotel tips
    if hotel_count > 0:
        tips.append(f"With {hotel_count} hotels booked, consider staying near transportation hubs for easy travel.")
    else:
        tips.append("Consider booking accommodations near your planned attractions to save travel time.")
    
    # Attraction tips
    if attraction_count > 3:
        tips.append("You have many attractions planned - consider grouping them by location to optimize travel time.")
    elif attraction_count == 0:
        tips.append("Add some attractions to make your trip more memorable!")
    
    # Duration tips
    if duration > 7:
        tips.append("For longer trips, pack light and consider doing laundry every few days.")
    elif duration <= 3:
        tips.append("Short trip - focus on 2-3 must-see attractions to avoid rushing.")
    
    return tips

def calculate_optimization_score(trip_data):
    """Calculate how well-optimized the trip is"""
    score = 0
    max_score = 100
    
    # Province selected (20 points)
    if trip_data['province']['name'] != 'Not selected':
        score += 20
    
    # Valid dates (20 points)
    if (trip_data['schedule']['start_date'] != 'Not set' and 
        trip_data['schedule']['end_date'] != 'Not set'):
        score += 20
    
    # Hotels booked (25 points)
    if trip_data['hotels']['count'] > 0:
        score += 25
    
    # Attractions selected (20 points)
    if trip_data['attractions']['count'] > 0:
        score += 20
    
    # Good balance (15 points)
    if (trip_data['hotels']['count'] > 0 and 
        trip_data['attractions']['count'] > 0 and
        trip_data['schedule']['duration_days'] > 0):
        ratio = trip_data['attractions']['count'] / max(trip_data['schedule']['duration_days'], 1)
        if 0.5 <= ratio <= 2.0:  # Good attraction-to-day ratio
            score += 15
    
    return {
        'score': score,
        'max_score': max_score,
        'percentage': round((score / max_score) * 100, 1),
        'level': 'Excellent' if score >= 80 else 'Good' if score >= 60 else 'Fair' if score >= 40 else 'Needs Improvement'
    }

def calculate_trip_completeness(trip_data):
    """Calculate how complete the trip planning is"""
    components = {
        'destination': trip_data['province']['name'] != 'Not selected',
        'dates': (trip_data['schedule']['start_date'] != 'Not set' and 
                 trip_data['schedule']['end_date'] != 'Not set'),
        'accommodation': trip_data['hotels']['count'] > 0,
        'activities': trip_data['attractions']['count'] > 0,
        'schedule': trip_data['schedule']['duration_days'] > 0
    }
    
    completed = sum(components.values())
    total = len(components)
    
    return {
        'completed_components': completed,
        'total_components': total,
        'percentage': round((completed / total) * 100, 1),
        'missing_components': [key for key, value in components.items() if not value]
    }

def calculate_geographical_spread(trip_data):
    """Calculate the geographical distribution of the trip"""
    provinces = set()
    
    # Add main province
    if trip_data['province']['name'] != 'Not selected':
        provinces.add(trip_data['province']['name'])
    
    # Add hotel provinces
    for hotel in trip_data['hotels']['bookings']:
        if hotel.get('province'):
            provinces.add(hotel['province'])
    
    # Add attraction provinces
    for attraction in trip_data['attractions']['selections']:
        if attraction.get('province'):
            provinces.add(attraction['province'])
    
    return {
        'unique_provinces': len(provinces),
        'provinces_list': list(provinces),
        'is_multi_province': len(provinces) > 1,
        'concentration_level': 'Focused' if len(provinces) <= 1 else 'Regional' if len(provinces) <= 3 else 'Wide-spread'
    }

def calculate_time_optimization(trip_data):
    """Calculate time-related optimization metrics"""
    duration = trip_data['schedule']['duration_days']
    hotel_days = trip_data['hotels']['total_days']
    attraction_count = trip_data['attractions']['count']
    
    if duration == 0:
        return {'status': 'No duration set'}
    
    return {
        'accommodation_coverage': round((hotel_days / duration) * 100, 1) if duration > 0 else 0,
        'attractions_per_day': round(attraction_count / duration, 1) if duration > 0 else 0,
        'pace': ('Relaxed' if attraction_count / duration < 1 else 
                'Moderate' if attraction_count / duration <= 2 else 'Intensive'),
        'optimization_suggestions': {
            'hotel_coverage': 'Good' if hotel_days >= duration * 0.8 else 'Consider booking more nights',
            'activity_pace': ('Perfect pace' if 0.5 <= attraction_count / duration <= 2 else
                            'Consider adding more activities' if attraction_count / duration < 0.5 else
                            'Consider reducing activities to avoid rushing')
        }
    }

def final_data_used(data):
    try:
        start_date_str = data['schedule']['start_date']
        end_date_str = data['schedule']['end_date']
        duration_days = data['schedule']['duration_days']
        start_time_str = data['schedule']['start_time']
        end_time_str = data['schedule']['end_time']
        
        # Get province information
        province_name = data.get('province', {}).get('name', 'Not selected')
        
        # Get hotels data
        hotels_bookings = data.get('hotels', {}).get('bookings', [])
        processed_hotels = []
        
        if isinstance(hotels_bookings, list):
            for i, hotel in enumerate(hotels_bookings):
                if isinstance(hotel, dict):
                    # Extract coordinates properly
                    coordinates = hotel.get('coordinates', {})
                    if isinstance(coordinates, dict):
                        lat = coordinates.get('lat', 0)
                        lon = coordinates.get('lon', 0)
                    else:
                        lat, lon = 0, 0
                    
                    # Generate days array based on duration
                    hotel_days = hotel.get('days', list(range(1, duration_days + 1)))
                    if isinstance(hotel_days, int):
                        hotel_days = list(range(1, hotel_days + 1))
                    elif not isinstance(hotel_days, list):
                        hotel_days = list(range(1, duration_days + 1))
                    
                    processed_hotel = {
                        "id": hotel.get('id', f'hotel_{i}'),
                        "name": hotel.get('name', f'Hotel {i+1}'),
                        "coordinates": {
                            "lat": lat,
                            "lon": lon
                        },
                        "days": hotel_days
                    }
                    processed_hotels.append(processed_hotel)
        
        # Get attractions data
        attractions_selections = data.get('attractions', {}).get('selections', [])
        processed_attractions = []
        
        if isinstance(attractions_selections, list):
            for i, attraction in enumerate(attractions_selections):
                if isinstance(attraction, dict):
                    # Extract coordinates properly
                    coordinates = attraction.get('coordinates', {})
                    if isinstance(coordinates, dict):
                        lat = coordinates.get('lat', 0)
                        lon = coordinates.get('lon', 0)
                    else:
                        lat, lon = 0, 0
                    
                    processed_attraction = {
                        "id": attraction.get('id', f'attraction_{i}'),
                        "name": attraction.get('name', f'Attraction {i+1}'),
                        "coordinates": {
                            "lat": lat,
                            "lon": lon
                        },
                        "visitDuration": attraction.get('visitDuration', 60)
                    }
                    processed_attractions.append(processed_attraction)
        
        # Construct the final data structure
        final_data = {
            "province": {
                "name": province_name
            },
            "schedule": {
                "start_date": start_date_str,
                "end_date": end_date_str,
                "duration_days": duration_days,
                "start_time": start_time_str,
                "end_time": end_time_str
            },
            "hotels": {
                "bookings": processed_hotels
            },
            "attractions": {
                "selections": processed_attractions
            }
        }

        return final_data
        
    except Exception as e:
        print(f"Error in final_data_used: {str(e)}")
        print(f"Data structure: {data}")
        # Return a safe default structure matching the expected format
        return {
            "province": {
                "name": "Not selected"
            },
            "schedule": {
                "duration_days": 0,
                "start_time": "09:00",
                "end_time": "17:00"
            },
            "hotels": {
                "bookings": []
            },
            "attractions": {
                "selections": []
            },
            "error": str(e)
        }