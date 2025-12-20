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
   
   if request.method == 'POST':
       
        data = json.loads(request.body)
       
        username = data.get('username')
        email = data.get('username')
        password = data.get('password')
       
        request.session['username'] = username
        print(f"Received login attempt for username: {username}")
        
        try:
            userinfo = user_collection.find_one({
            '$or': [
                {'username': username},
                {'email': email}
            ]
            
        })
            datauser = {
                'username': userinfo['username'],
                'user_group': userinfo['user_group'],
                'email': userinfo['email'],
                'user_category': userinfo['user_category']
            }

            if not userinfo:
                return JsonResponse({'message': 'User not found'}, status=404)
        except Exception as e:
            logging.error(f"Error fetching user info: {e}")
            return JsonResponse({'error': 'An error occurred while fetching user information', 'user': username, 'payload': data}, status=500)

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
            return JsonResponse({'message': 'Login successful', 'redirect_url':'/tourism/korean-tourism/', 'data':datauser})
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
            return redirect('/tourism/korean-tourism/')
            # })
        else:
            return JsonResponse({'error': 'Verification link is invalid or expired!'}, status=400)
            
    except (TypeError, ValueError, OverflowError) as e:
        return JsonResponse({'error': 'Invalid verification link!'}, status=400)

def verification_page(request):
    return render(request, 'landingPage/verification_page.html')



# # Create your views here.
