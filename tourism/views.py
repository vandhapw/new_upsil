from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
# mongoclient 
from pymongo import MongoClient
import requests
from django.views.decorators.csrf import csrf_exempt
import json, datetime
import uuid
import pandas as pd 

from tourism.optimization import dummy_schedule

client = MongoClient("mongodb://localhost:27017/")
db = client["server_db"]
korean_provinces_collection = db["korean_provinces"]
korean_attractions_collection = db["tourism_attraction"]
trip_optimization_collection = db["trip_optimization"]
graph_ml_collection = db["map_graph_ml"]

geopify_api_key = "a5edd953082d4f209e8ef29fdeedb0a1"
limit = 100
categories = "accommodation.hotel"
geopify_api_url = f"https://api.geoapify.com/v2/places?categories={categories}&filter=rect:${{bounds.minLng}},${{bounds.minLat}},${{bounds.maxLng}},${{bounds.maxLat}}&limit={limit}&apiKey={geopify_api_key}"

from tourism.crud_api import crud_map

# Create your views here.
def korean_tourism_page(request):
    provinces = korean_provinces_collection.find()
    return render(request, 'dashboard/tourism/korean_tourism/index.html', {'provinces': provinces})

# Insert GraphML file into MongoDB
@csrf_exempt
def api_insert_graphml(request):
    if request.method == 'POST':
        try:
            # Parse the incoming JSON data
            data = json.loads(request.body)
            country = data.get('country')
            province = data.get('province')
            username = request.session.get('username', 'Guest')
            user_id = request.session.get('id', None)

            data = {
                'username': username,
                'user_id': user_id,
                'country': country,
                'province': province,
                'created_at': datetime.datetime.now(),
                'updated_at': datetime.datetime.now()
            }
            map_crud = crud_map.MapCRUD(data)

            graphml_file_id = map_crud.insert_graphml()

            return JsonResponse({"message": "GraphML file inserted successfully", "file_id": str(graphml_file_id)}, status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
        

# API endpoint to retrieve GraphML file
@csrf_exempt
def api_get_graphml(request, file_id):
    """Retrieve a GraphML file from GridFS"""
    try:
        map_crud = crud_map.MapCRUD({})
        
        # Get file metadata first
        metadata = map_crud.get_graphml_metadata(file_id)
        if not metadata:
            return JsonResponse({"error": "File not found"}, status=404)
        
        # Get the actual file data
        file_data = map_crud.get_graphml_file(file_id)
        
        # Return the file as a download
        response = HttpResponse(file_data, content_type='application/xml')
        response['Content-Disposition'] = f'attachment; filename="{metadata["filename"]}"'
        response['Content-Length'] = str(len(file_data))
        
        return response
        
    except ValueError as e:
        return JsonResponse({"error": str(e)}, status=404)
    except Exception as e:
        return JsonResponse({"error": f"Internal server error: {str(e)}"}, status=500)


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
    
def convert_keys_to_strings(obj):
    """
    Recursively convert all dictionary keys to strings for MongoDB compatibility
    """
    if isinstance(obj, dict):
        return {str(key): convert_keys_to_strings(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_keys_to_strings(item) for item in obj]
    elif hasattr(obj, '__dict__'):
        # Handle custom objects by converting to dict first
        return convert_keys_to_strings(obj.__dict__)
    else:
        return obj

def serialize_for_mongodb(data):
    """
    Convert data structure to be MongoDB-compatible
    """
    import json
    from datetime import datetime
    import numpy as np
    
    def json_serializer(obj):
        """Handle non-serializable objects"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif hasattr(obj, '__dict__'):
            return obj.__dict__
        else:
            return str(obj)
    
    # First convert to JSON and back to handle non-serializable objects
    json_str = json.dumps(data, default=json_serializer)
    clean_data = json.loads(json_str)
    
    # Then convert all keys to strings
    return convert_keys_to_strings(clean_data)
    

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
            # user_id = request.session.get('id')
            # username = request.session.get('username')
            user_id = "test"
            username = "test"

            # if not user_id:
            #     return JsonResponse({'error': 'User not authenticated'}, status=401)
            
            # Extract trip optimization data
            trip_data = {
                # 'user_id': user_id,
                # 'username': username,
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
            
            final_data = final_data_used(trip_data)

            from tourism.optimization.distance_matrix import DistanceMatrix
            # from tourism.optimization.dummy_data import final_data 

            dm = DistanceMatrix(final_data)

            # Solve
            results, _, _, _, optimized_routes, optimized_gantt_chart = dm.solve_multi_day_route_optimization()
            # Serialize the optimization results for MongoDB
            mongodb_safe_results = serialize_for_mongodb(results)
            mongodb_safe_routes = serialize_for_mongodb(optimized_routes)
            mongodb_safe_gantt = serialize_for_mongodb(optimized_gantt_chart)
            
            # Add to trip data
            trip_data['optimization_results'] = mongodb_safe_results
            trip_data['optimized_routes'] = mongodb_safe_routes
            trip_data['optimized_gantt_chart'] = mongodb_safe_gantt

            # Store in MongoDB
            result = trip_optimization_collection.insert_one(trip_data)

            if result.inserted_id:
                # Prepare response data
                return JsonResponse({
                    'success': True,
                    # 'final_data': final_data,
                    # 'trip_data': trip_data,
                    'optimized_routes': optimized_routes,
                    'optimized_gantt_chart': optimized_gantt_chart,
                }, status=200)
            else:
                return JsonResponse({'error': 'Failed to store optimization data'}, status=500)
                
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
        except Exception as e:
            return JsonResponse({'error': f'Server error: {str(e)}'}, status=500)

        #     return JsonResponse({
        #         'success': True,
        #         # 'final_data': final_data,
        #         # 'trip_data': trip_data,
        #         'optimized_routes': optimized_routes,
        #         'optimized_gantt_chart': optimized_gantt_chart,
        # #     }, status=200)
            
        # except json.JSONDecodeError as e:
        #     return JsonResponse({
        #         'success': False,
        #         'error': f'Invalid JSON data: {str(e)}'
        #     }, status=400)
        # except Exception as e:
        #     print(f"Error in trip_optimization_api: {str(e)}")
        #     print(f"Request body: {request.body}")
        #     return JsonResponse({
        #         'success': False,
        #         'error': f'Server error: {str(e)}'
        #     }, status=500)
            
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

    final_data = {
        'user': {
            'user_id': data['user_id'],
            'username': data['username']
        },
        'schedule': {
            'start_date': data['schedule']['start_date'],
            'end_date': data['schedule']['end_date'],
            'start_time': data['schedule']['start_time'],
            'end_time': data['schedule']['end_time'],
            'duration_days': data['schedule']['duration_days']
        },
        'province': {
            'province_name': data['province']['name'],
            'province_code': data['province']['code'],
        },
        'hotels': {
            'bookings': [
                {
                    'hotel_id': booking['hotelId'],
                    'hotel_name': booking['name'],
                    'hotel_address': booking['address'],
                    'hotel_coordinates': booking['coordinates'],
                    'days': booking['days'],
                } for booking in data['hotels']['bookings']
            ]
        },
        'attractions': {
            'selections': [
                {
                    'attraction_id': attraction['id'],
                    'attraction_name': attraction['name'],
                    'attraction_hours': attraction['hours'],
                    'attraction_coordinates': attraction['coordinates']
                } for attraction in data['attractions']['selections']
            ]
        },
    }

    return final_data

def calculate_distance_matrix(request, data=None):
    from tourism.optimization.distance_matrix import DistanceMatrix
    from tourism.optimization.dummy_data import final_data 

    dm = DistanceMatrix(final_data)

    # Solve
    results, G, distance_matrix, day_hotels, all_locations, optimize_route = dm.solve_multi_day_route_optimization()

    # route_map, gantt_chart = complete_visualization_workflow(data_dict)

    # Access best solution
    best_result = min(results.items(), key=lambda x: x[1]['total_metrics']['total_time'])
    print(f"\nBest method: {best_result[0]}")
    print(f"Total optimization time: {best_result[1]['total_metrics']['total_time']:.2f} hours")
    # print(f"distance matrix:", distance_matrix)
    # print(f"all_locations:", all_locations)
    return results, G, distance_matrix, day_hotels, all_locations, optimize_route
    # return JsonResponse({
    #     'success': True,
    #     'message': 'Distance matrix calculation placeholder',
    #     # 'final_data': final_data[0],
    #     'best_method': best_result[0],
    #     'total_optimization_time_hours': round(best_result[1]['total_metrics']['total_time'], 2),
    #     'optimize_route': optimize_route,
    # })

# Autocomplete API Function 
def autocomplete_country(request):
    from tourism.external_api.geopify import GeopifyAPI

    geopify = GeopifyAPI()
    if request.method == 'GET':
        autocomplete_query = request.GET.get('text', None)
        if not autocomplete_query:
            return JsonResponse({"error": "Missing 'text' query parameter"}, status=400)
        suggestions = geopify.autocomplete_country({"text": autocomplete_query})
        return JsonResponse(suggestions)

def autocomplete_province(request):
    from tourism.external_api.geopify import GeopifyAPI

    geopify = GeopifyAPI()
    # country_code = 
    if request.method == 'GET':
        autocomplete_query = request.GET.get('text', None)
        country_code = request.GET.get('countrycode', None)
        if not autocomplete_query:
            return JsonResponse({"error": "Missing 'text' query parameter"}, status=400)
        suggestions = geopify.autocomplete_province({"text": autocomplete_query, "countrycode": country_code})
        print(suggestions)
        return JsonResponse(suggestions)
    
def get_hotel_list(request):
    from tourism.external_api.geopify import GeopifyAPI

    geopify = GeopifyAPI()
    # country_code = 
    if request.method == 'GET':
        place_id = request.GET.get('place_id', None)
        if not place_id:
            return JsonResponse({"error": "Missing 'place_id' query parameter"}, status=400)
        results = geopify.get_hotel_list({"place_id": place_id})
        # print(suggestions)
        return JsonResponse(results)

def get_attraction_list(request):
    from tourism.external_api.geopify import GeopifyAPI

    geopify = GeopifyAPI()
    # country_code = 
    if request.method == 'GET':
        place_id = request.GET.get('place_id', None)
        if not place_id:
            return JsonResponse({"error": "Missing 'place_id' query parameter"}, status=400)
        results = geopify.get_attraction_list({"place_id": place_id})
        # print(suggestions)
        return JsonResponse(results)



def calling_test_api(data=None):
    from tourism.crud_api import crud_map
    from tourism.optimization.dummy_data import final_data
    from tourism.optimization.distance_matrix import DistanceMatrix

    dm = DistanceMatrix(final_data)

    results = dm.create_gantt_json()

    # cm = crud_map.MapCRUD(final_data)
    # cm.store_graphml_to_pickle()

    return JsonResponse({
        'success': True,
        'message': 'Test API called successfully',
        'results': results,
        # 'graph': G,
        # 'distance_matrix': distance_matrix,
        # 'day_hotels': day_hotels,
        # 'all_locations': all_locations,
        # 'path_matrix': path_matrix,
    })

def test_api_call(request):
    # from tourism.optimization.dummy_schedule import dummy_schedule
    # call mongodb collection of trip_optimization based on user_id
    user_id = "test"
    # user_id = request.user.id if request.user.is_authenticated else "test"
    result = trip_optimization_collection.find_one({'user_id': user_id}, sort=[('created_at', -1)])
    gantt_chart = result.get('optimized_gantt_chart') if result else None

    return JsonResponse(gantt_chart if gantt_chart else {"message": "No data found"})

def test_api_call_2(request):
    # from tourism.crud_api.call_route_example import call_route_api
    # from tourism.optimization.dummy_route import dummy_route
    # user_id = request.user.id if request.user.is_authenticated else "test"
    user_id = "test"
    result = trip_optimization_collection.find_one({'user_id': user_id}, sort=[('created_at', -1)])
    routes = result.get('optimized_routes') if result else None

    return JsonResponse(routes if routes else {"message": "No data found"})

@csrf_exempt
def test_api_call_3(request):
    if request.method == 'POST':
        try:
            # Parse the incoming JSON data
            data = json.loads(request.body)

            # username = request.session.get('username', 'test')
            # user_id = request.session.get('id', 'test')

            save_data = {
                'destination': {
                    'city': data.get('destination', {}).get('properties', {}).get('city', 'Unknown'),
                    'country': data.get('destination', {}).get('country', 'Unknown'),
                    'country_code': data.get('destination', {}).get('country_code', {}),
                    'country_place_id': data.get('destination', {}).get('place_id', 'Unknown'),
                    'city_place_id': data.get('destination', {}).get('properties', {}).get('place_id', 'Unknown'),
                    'city_coordinates': (data.get('destination', {}).get('properties', {}).get('lat', 0), data.get('destination', {}).get('properties', {}).get('lon', 0))
                },
                'dates': {
                    'start_date': data.get('dates', {}).get('start_date', 'Not set'),
                    'end_date': data.get('dates', {}).get('end_date', 'Not set'),
                    'start_time': data.get('dates', {}).get('start_time', 'Not set'),
                    'end_time': data.get('dates', {}).get('end_time', 'Not set'),
                },
                'hotels': data.get('hotels', []),
                'attractions': data.get('attractions', [])
            }

            optimize_data = {
                'destination': {
                    'city': data.get('destination', {}).get('properties', {}).get('city', 'Unknown'),
                    'country': data.get('destination', {}).get('country', 'Unknown'),
                    'country_code': data.get('destination', {}).get('country_code', {}),
                    'country_place_id': data.get('destination', {}).get('place_id', 'Unknown'),
                    'city_place_id': data.get('destination', {}).get('properties', {}).get('place_id', 'Unknown'),
                    'city_coordinates': (data.get('destination', {}).get('properties', {}).get('lat', 0), data.get('destination', {}).get('properties', {}).get('lon', 0))
                },
                'dates': {
                    'start_date': data.get('dates', {}).get('start_date', 'Not set'),
                    'end_date': data.get('dates', {}).get('end_date', 'Not set'),
                    'start_time': data.get('dates', {}).get('start_time', 'Not set'),
                    'end_time': data.get('dates', {}).get('end_time', 'Not set'),
                },
                'hotels': data.get('hotels', []),
                'attractions': data.get('attractions', [])
            }

            distance_matrix_data = calculate_distance_matrix_test(data=optimize_data)

            # # Store the distance matrix data in MongoDB
            # storage_document = {
            #     'user_id': user_id,
            #     'username': username,
            #     'timestamp': datetime.datetime.now(),
            #     'destination': optimize_data['destination'],
            #     'dates': optimize_data['dates'],
            #     'hotels_count': len(optimize_data['hotels']),
            #     'attractions_count': len(optimize_data['attractions']),
            #     'distance_matrix_data': distance_matrix_data,
            #     'status': 'calculated',
            #     'created_at': datetime.datetime.now()
            # }

            # result = trip_optimization_collection.insert_one(storage_document)

            # if not result.inserted_id:
            #     return JsonResponse({'error': 'Failed to store distance matrix data'}, status=500)

            
            return JsonResponse({
                'success': True,
                # 'data_received': data,
                # 'data_saved': optimize_data
                'results': distance_matrix_data    
            }, status=200)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
    else:
        return JsonResponse({'error': 'Method not allowed'}, status=405)

def calculate_distance_matrix_test(data=None):
    from tourism.external_api.geopify import GeopifyAPI 

    geo = GeopifyAPI()

    distance_matrix_data = geo.calculate_distance_matrix(data)
    return distance_matrix_data

