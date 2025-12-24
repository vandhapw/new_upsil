from django.shortcuts import render, redirect
from datetime import timedelta
import time
import json, datetime
from bson import ObjectId
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
from ..tokens import idn_generate_verification_link
from django.core.mail import send_mail

from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator

from django.shortcuts import redirect
from django.contrib import messages


client = get_mongo_client()
db = client['indonesia_db']
user_collection = db['users']
user_log_collection = db['user_logs']


@csrf_exempt
def login_api(request):

    # ✅ HANDLE PREFLIGHT (INI KUNCI UTAMA)
    if request.method == "OPTIONS":
        response = JsonResponse({}, status=200)
        origin = request.headers.get("Origin")

        response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response["Access-Control-Allow-Credentials"] = "true"

        return response

    # ✅ HANDLE LOGIN
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        username = data.get('username')
        email = data.get('username')
        password = data.get('password')

        if not username or not password:
            return JsonResponse({'message': 'Username and password are required'}, status=400)

        request.session['username'] = username
        logging.info(f"Received login attempt for username: {username}")

        try:
            userinfo = user_collection.find_one({
                '$or': [
                    {'username': username},
                    {'email': email}
                ]
            })
        except Exception as e:
            logging.error(f"Error fetching user info: {e}")
            return JsonResponse(
                {'error': 'Database error'},
                status=500
            )

        if not userinfo:
            return JsonResponse({'message': 'User not found'}, status=404)

        # password check
        if not check_password(password, userinfo['password']):
            return JsonResponse({'message': 'Invalid credentials'}, status=401)

        # update session
        request.session['id'] = userinfo['id']

        # log user activity
        user_log_collection.update_one(
            {'id': userinfo['id']},
            {
                '$set': {
                    'activity': 'login',
                    'time_at': datetime.datetime.now()
                },
                '$inc': {'visitcount': 1}
            },
            upsert=True
        )

        user_data = {
            'id': userinfo['id'],
            'username': userinfo['username'],
            'email': userinfo['email'],
            'photo': userinfo.get('photo'),
            'user_group': userinfo.get('user_group'),
        }

        return JsonResponse(
            {'message': 'Login successful', 'userinfo': user_data},
            status=200
        )

    # ❌ METHOD TIDAK DIIZINKAN
    return JsonResponse({'error': 'Method not allowed'}, status=405)
       
        
@csrf_exempt
def logout_api(request):
    if request.method != 'POST':
        return JsonResponse(
            {'error': 'Method not allowed'},
            status=405
        )

    user_id = request.session.get('id')  # atau request.user.id

    if user_id:
        # PyMongo: find_one TIDAK throw exception
        user_log = user_log_collection.find_one({'id': user_id})

        if user_log:
            user_log_collection.update_one(
                {'id': user_id},
                {'$set': {'logout_at': datetime.utcnow()}}
            )

    logout(request)

    return JsonResponse({
        'message': 'Logout successful',
        'redirect_url': '/'
    })
        
    
    
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

                    verification_link = idn_generate_verification_link(user_data, request)

                    send_mail(
                        'Verify your email',
                        f'Please click the following link to verify your email: {verification_link}',
                        'upsil@mail.com',
                        [email],
                        fail_silently=False,
                    )

                    if result:
                        return JsonResponse({'message': 'Register successful! Please Check your email to verify your account.!', 'redirect_url':'account/idn/verification_page/'})
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
            # return redirect('/tourism/korean-tourism/')
            return JsonResponse({'message': 'Email verified successfully! You can now log in.', 'redirect_url':'/tourism/korean-tourism/'})
            # })
        else:
            return JsonResponse({'error': 'Verification link is invalid or expired!'}, status=400)
            
    except (TypeError, ValueError, OverflowError) as e:
        return JsonResponse({'error': 'Invalid verification link!'}, status=400)

def verification_page(request):
    return render(request, 'landingPage/verification_page.html')



# # Create your views here.
