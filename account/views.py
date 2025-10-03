from django.shortcuts import render, redirect
from .forms import *
from .models import User, UserLog
from datetime import timedelta
import time
import json, datetime
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.hashers import check_password, make_password
# from production.utils import get_database_client, MONGO_DB
from production.utils import dbLocation
from pymongo import MongoClient
import pytz
from django.utils import timezone
import logging
from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from production.utils import get_mongo_client

from pymongo import MongoClient
from django.http import JsonResponse
import uuid
from .tokens import generate_verification_link
from django.core.mail import send_mail

from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator

from django.shortcuts import redirect
from django.contrib import messages



client = get_mongo_client()
db = client['server_db']
user_collection = db['user']
user_log_collection = db['userlog']
trip_optimization_collection = db['trip_optimization']

# @csrf_exempt
# def login_function(request):
#     if request.method == 'POST':
#         data = json.loads(request.body)
#         username = data.get('username')
#         password = data.get('password')

#         print(f"Received login attempt for username: {username}")        

#         if not username or not password:
#             return JsonResponse({'error': 'Username and password are required'}, status=400)

#         user = user_collection.find_one({'username': username})
#         if not user:
#             return JsonResponse({'error': 'User not found'}, status=404)

#         if check_password(password, user['password']):
#             request.session['user'] = username
#             return JsonResponse({'message': 'success'})
#         else:
#             return JsonResponse({'error': 'Incorrect password'}, status=401)
#     else:
#         return JsonResponse({'error': 'Invalid request method'}, status=405)
    
# @csrf_exempt
# def logout_function(request):
#     if request.method == 'POST':
#         if 'user' in request.session:
#             del request.session['user']
#             return JsonResponse({'message': 'Logout successful'})
#         else:
#             return JsonResponse({'error': 'No user is logged in'}, status=400)
#     else:
#         return JsonResponse({'error': 'Invalid request method'}, status=405)

def test_mongo_connection(request):
    try:
        client = MongoClient('mongodb://127.0.0.1:27017/')
        db = client['server_db']
        # Coba akses koleksi
        collections = db.list_collection_names()
        return JsonResponse({'status': 'connected', 'collections': collections})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})

def login_page(request):
    id = request.session.get('id')
    if id:
        return redirect('/dashboard/kaidashboard/')
    
    return render(request, 'landingPage/landingPage.html')
    # return JsonResponse(mongo_data)

# @login_required
def testing_dashboard(request):
    username = request.session.get('username')
    id = request.session.get('id')
    print('Session username:', username)  # Debugging line
    print('Session id:', id)  # Debugging line
    if username:
        user_data = user_collection.find_one({'id': id})
        print(user_data)
        if user_data and user_data.get('is_active'):
            mongo_status = test_mongo_connection(request)
            # If you want to show the status on the landing page, pass it to the template
            if hasattr(mongo_status, 'content'):
                mongo_data = json.loads(mongo_status.content)
            else:
                mongo_data = {"Error": "Could not connect to MongoDB"}
            return render(request, 'dashboard/kaiadmin/index.html', {'mongo_status': mongo_data, 'user_data': user_data})
        else:
            messages.error(request, 'Your account is not activated. Please verify your email.')
            return redirect('/')
    else:
        messages.error(request, 'You need to log in to access the dashboard.')
        return redirect('/')

# @login_required
# def check_page(request):
#     return render(request,'check.html')

# def dashboard_page(request):
#     context = {}
    
#     return render(request,'dashboard/kaiadmin/index.html', context)
        
    


@csrf_exempt
def login_api(request):
   
   if request.method == 'POST':
       
        data = json.loads(request.body)
       
        username = data.get('username')
        email = data.get('username')
        password = data.get('password')
       
        request.session['username'] = username
        print(f"Received login attempt for username: {username}")
        
        try:
            userinfo = user_collection.find_one({'username': username}) or user_collection.find_one({'email': email})
            if not userinfo:
                return JsonResponse({'message': 'User not found'}, status=404)
        except:
            return HttpResponse('incorrect id')

        request.session['id'] = userinfo['id']
        if check_password(password, userinfo['password']):
            visit_count = userinfo.get('visitcount', 0) + 1
            userLog = user_log_collection.find_one({'id': userinfo['id']})
            if not userLog:
                new_log = {
                    'id': userinfo['id'],
                    'visitcount': 1,
                    'activity': 'login',
                    'time_at': datetime.datetime.now(),
                    'logout_at': None
                }
                user_log_collection.insert_one(new_log)
            else:
                visit_count = userLog['visitcount'] + 1
                user_log_collection.update_one(
                {'username': username},
                {
                    '$set': {
                    'visitcount': visit_count,
                    'activity': 'login',
                    'time_at': datetime.datetime.now(),
                    # 'login_at': datetime.datetime.now()
                    }
                }
                )
            return JsonResponse({'message': 'Login successful', 'redirect_url':'/dashboard/kaidashboard/'})
        else:
            return JsonResponse({'message': 'Username and password are required'}, status=400)
       
        
@csrf_exempt
def logout_api(request):
    if request.method == 'POST':
        username = request.session.get('username')
        if username:
            try:
                userLog = user_log_collection.find_one({'id': request.session.get('id')})
                if userLog:
                    userLog['logout_at'] = datetime.datetime.now()
                    user_log_collection.update_one({'id': userLog['id']}, {'$set': userLog})
            except UserLog.DoesNotExist:
                pass  # Handle the case where the UserLog does not exist
            logout(request)
        return JsonResponse({'message': 'Logout successful', 'redirect_url':'/'})
        
    
    
@csrf_exempt
def register_api(request):
    if request.method == 'POST':
        try:
            # Parse the incoming JSON data
            data = json.loads(request.body)

            # print("Received registration data:", data)  # Debugging line

            firstName = data.get('firstName')
            lastName = data.get('lastName')
            username = data.get('username')  # This can also be used as the email
            email = data.get('email')
            password = data.get('password')
            re_password = data.get('re_password')
            
            res_data = {}

            # Validate input fields
            if not (username and password and re_password and email):
                res_data['error'] = '모든 값을 입력해야 합니다.'  # "All fields must be filled"
                return JsonResponse({'error': res_data['error']}, status=400)
            elif password != re_password:
                res_data['error'] = '비밀번호가 다릅니다.'  # "Passwords do not match"
                return JsonResponse({'error': res_data['error']}, status=400)
            else:
                # Connect to MongoDB
                # Check if the username or email already exists in the database
                if user_collection.find_one({'username': username}):
                    res_data['error'] = 'Username already exists.'
                    return JsonResponse({'error': res_data['error']}, status=400)
                elif user_collection.find_one({'email': email}):
                    res_data['error'] = 'Email already registered.'
                    return JsonResponse({'error': res_data['error']}, status=400)
                else:
                    
                    # Hash the password for security
                    hash_password = make_password(password)

                    # Prepare the data to be inserted
                    user_data = {
                        'id': str(uuid.uuid4()),
                        'firstName': firstName,
                        'lastName': lastName,
                        'username': username,
                        'password': hash_password,
                        'email': email,
                        'photo': "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIf4R5qPKHPNMyAqV-FjS_OTBB8pfUV29Phg&s",
                        'user_group': 'user',
                        'type':'manual',
                        'is_active': False,
                        'created_at': datetime.datetime.now(),
                        'updated_at': datetime.datetime.now(),
                        'registered_at': datetime.datetime.now()
                    }

                    # print(user_data)

                    # Insert data into MongoDB
                    result = user_collection.insert_one(user_data)
                    # result = user_data

                    verification_link = generate_verification_link(user_data, request)

                    send_mail(
                        'Verify your email',
                        f'Please click the following link to verify your email: {verification_link}',
                        'upsil@mail.com',
                        [email],
                        fail_silently=False,
                    )

                    if result:
                        return JsonResponse({'message': 'Register successful! Please Check your email to verify your account.!', 'redirect_url':'account/verification_page/'})
                    else:
                        return JsonResponse({'error': 'User registration failed'}, status=500)

        except Exception as e:
            # Handle any exceptions and provide error details
            return JsonResponse({'error': f'Error occurred : {str(e)}'}, status=500)

    else:
        return JsonResponse({'error': 'Invalid request method'}, status=400)
    

def verify_email(request, uidb64, token):
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = user_collection.find_one({'id': uid})  # Use 'id' field instead of 'username'
        
        if user is None:
            return JsonResponse({'error': 'User not found!'}, status=400)
            
        # Check if the token matches and is still valid (within 24 hours)
        stored_token = user.get('verification_token')
        token_created_at = user.get('token_created_at', 0)
        current_time = time.time()
        
        # Token expires after 24 hours (86400 seconds)
        if (stored_token == token and 
            current_time - token_created_at < 86400):
            
            # Activate the user and remove the verification token
            user_collection.update_one(
                {'id': uid}, 
                {
                    '$set': {'is_active': True},
                    '$unset': {'verification_token': '', 'token_created_at': ''}
                }
            )

            request.session['username'] = user.get('username')
            request.session['id'] = user.get('id')
            messages.success(request, 'Email verified successfully! You can now log in.')
            return redirect('/dashboard/kaidashboard/')
            # })
        else:
            return JsonResponse({'error': 'Verification link is invalid or expired!'}, status=400)
            
    except (TypeError, ValueError, OverflowError) as e:
        return JsonResponse({'error': 'Invalid verification link!'}, status=400)

def verification_page(request):
    return render(request, 'landingPage/verification_page.html')

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
            result = trip_optimization_collection.insert_one(trip_data)
            
            if result.inserted_id:
                # Prepare response data
                response_data = {
                    'success': True,
                    'message': 'Trip optimization data received and stored successfully',
                    'optimization_id': trip_data['optimization_id'],
                    'summary': {
                        'province': trip_data['province']['name'],
                        'duration': trip_data['schedule']['duration_days'],
                        'hotels': {
                            'count': trip_data['hotels']['count'],
                            'total_days': trip_data['hotels']['total_days']
                        },
                        'attractions': {
                            'count': trip_data['attractions']['count'],
                            'types': list(trip_data['attractions']['by_type'].keys()),
                            'provinces': list(trip_data['attractions']['by_province'].keys())
                        }
                    },
                    'recommendations': {
                        'budget_estimate': calculate_budget_estimate(trip_data),
                        'travel_tips': generate_travel_tips(trip_data),
                        'optimization_score': calculate_optimization_score(trip_data)
                    },
                    'data_insights': {
                        'trip_completeness': calculate_trip_completeness(trip_data),
                        'geographical_spread': calculate_geographical_spread(trip_data),
                        'time_optimization': calculate_time_optimization(trip_data)
                    },
                    'stored_at': trip_data['timestamp'].isoformat(),
                    'user_id': user_id
                }
                
                return JsonResponse(response_data, status=200)
            else:
                return JsonResponse({'error': 'Failed to store optimization data'}, status=500)
                
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
        except Exception as e:
            return JsonResponse({'error': f'Server error: {str(e)}'}, status=500)
    
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

# # Create your views here.
