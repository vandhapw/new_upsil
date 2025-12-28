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
import bson 
from .utils import serialize_user

client = get_mongo_client()
db = client['server_db']
user_collection = db['user']
user_log_collection = db['userlog']
user_group_collection = db['user_group']
paper_collection = db['upsil_papers']

def serialize_paper(doc):
    """
    Convert MongoDB document into JSON-serializable dict
    """
    return {
        "id": str(doc.get("_id")),
        "title": doc.get("title"),
        "journal_name": doc.get("journal_name"),
        "year": doc.get("year"),
        "citation_count": doc.get("citation_count", 0),
        "cited_count": doc.get("cited_count", 0),
    }


def getAllPapers(request):
    if request.method != 'GET':
        return JsonResponse(
            {"error": "Method not allowed"},
            status=405
        )

    try:
        # Optional pagination
        page = int(request.GET.get("page", 1))
        page_size = int(request.GET.get("page_size", 20))

        if page < 1:
            page = 1

        skip = (page - 1) * page_size

        cursor = (
            paper_collection
            .find({})
            .sort("year", -1)   # latest first
            .skip(skip)
            .limit(page_size)
        )

        papers = [serialize_paper(doc) for doc in cursor]
        total = paper_collection.count_documents({})

        return JsonResponse(
            {
                "results": papers,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                }
            },
            safe=False
        )

    except Exception as e:
        return JsonResponse(
            {"error": str(e)},
            status=500
        )
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
        client = MongoClient('mongodb://superUser:superUpsil!@localhost:27019/server_db?authSource=admin')
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
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)

    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return JsonResponse({'error': 'Username and password are required'}, status=400)

        userinfo = user_collection.find_one({
            '$or': [{'username': username}, {'email': username}]
        })

        if not userinfo:
            return JsonResponse({'error': 'User not found'}, status=404)

        if not check_password(password, userinfo['password']):
            return JsonResponse({'error': 'Invalid password'}, status=401)

        # optional: session (not recommended for SPA)
        request.session['user_id'] = userinfo['id']

        # logging
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

        datauser = {
            'username': userinfo['username'],
            'user_group': userinfo['user_group'],
            'email': userinfo['email'],
            'user_category': userinfo.get('user_category'),
            'photo': userinfo.get('photo')
        }

        return JsonResponse({
            'message': 'Login successful',
            'redirect_url': '/backend/tourism/korean-tourism/',
            'data': datauser
        })

    except Exception as e:
        logging.exception("Login error")
        return JsonResponse({'error': 'Internal server error'}, status=500)

       
        
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
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)

    try:
        data = json.loads(request.body)

        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        confirm = data.get('confirmPassword')

        if not all([username, email, password, confirm]):
            return JsonResponse({'error': 'All fields are required'}, status=400)

        if password != confirm:
            return JsonResponse({'error': 'Passwords do not match'}, status=400)

        if len(password) < 8:
            return JsonResponse({'error': 'Password too short'}, status=400)

        if user_collection.find_one({'$or': [{'username': username}, {'email': email}]}):
            return JsonResponse({'error': 'Username or email already exists'}, status=400)

        user_data = {
            'id': str(uuid.uuid4()),
            'username': username,
            'email': email,
            'password': make_password(password),
            'user_group': 'guest',
            'is_active': False,
            'verification_token': str(uuid.uuid4()),
            'created_at': datetime.datetime.utcnow()
        }

        user_collection.insert_one(user_data)

        verification_link = generate_verification_link(user_data, request)

        send_mail(
            'Verify your email',
            f'Click to verify: {verification_link}',
            'upsil@mail.com',
            [email],
            fail_silently=False
        )

        return JsonResponse({
            'message': 'Registration successful. Please verify your email.'
        })

    except Exception as e:
        logging.exception("Register error")
        return JsonResponse({'error': 'Internal server error'}, status=500)
    

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
            # return JsonResponse({
            #     "message": 'Email verified successfully! You can now log in.',
            #     "status": 'Success'            
            # })
            
            return redirect('/verification', {
                "message": 'Email verified successfully! You can now log in.',
                "status": 'Success' 
            })
            
            
            # return redirect('/tourism/korean-tourism/')
            # })
        else:
            return JsonResponse({'error': 'Verification link is invalid or expired!'}, status=400)
            
    except (TypeError, ValueError, OverflowError) as e:
        return JsonResponse({'error': 'Invalid verification link!'}, status=400)

def verification_page(request):
    return render(request, 'landingPage/verification_page.html')




# # Create your views here.
