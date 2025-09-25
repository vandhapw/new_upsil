from django.shortcuts import render, redirect
from .forms import *
from .models import User, UserLog, UserGroup
from datetime import timedelta
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

client = get_mongo_client()
db = client['server_db']
user_collection = db['user']

@csrf_exempt
def login_function(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')

        print(f"Received login attempt for username: {username}")        

        if not username or not password:
            return JsonResponse({'error': 'Username and password are required'}, status=400)

        user = user_collection.find_one({'username': username})
        if not user:
            return JsonResponse({'error': 'User not found'}, status=404)

        if check_password(password, user['password']):
            request.session['user'] = username
            return JsonResponse({'message': 'success'})
        else:
            return JsonResponse({'error': 'Incorrect password'}, status=401)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)
    
@csrf_exempt
def logout_function(request):
    if request.method == 'POST':
        if 'user' in request.session:
            del request.session['user']
            return JsonResponse({'message': 'Logout successful'})
        else:
            return JsonResponse({'error': 'No user is logged in'}, status=400)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)

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
    if 'user' in request.session:
        return dashboard_page(request)
    # Render the result of test_mongo_connection for demonstration
    mongo_status = test_mongo_connection(request)
    # If you want to show the status on the landing page, pass it to the template
    if hasattr(mongo_status, 'content'):
        mongo_data = json.loads(mongo_status.content)
    else:
        mongo_data = {"Error": "Could not connect to MongoDB"}
    return render(request, 'landingPage/landingPage.html', {'mongo_status': mongo_data})
    # return JsonResponse(mongo_data)

def testing_dashboard(request):
    mongo_status = test_mongo_connection(request)
    # If you want to show the status on the landing page, pass it to the template
    if hasattr(mongo_status, 'content'):
        mongo_data = json.loads(mongo_status.content)
    else:
        mongo_data = {"Error": "Could not connect to MongoDB"}
    return render(request, 'dashboard/kaiadmin/index.html', {'mongo_status': mongo_data})

@login_required
def check_page(request):
    return render(request,'check.html')

def dashboard_page(request):
    context = {}
    
    return render(request,'dashboard/kaiadmin/index.html', context)
        
    


@csrf_exempt
def login_api(request):
   
   if request.method == 'POST':
       
        data = json.loads(request.body)
       
        username = data.get('username')
        password = data.get('password')
       
        request.session['user'] = username
        
        try:
            user = User.objects.get(username=username)
        except:
            return HttpResponse('incorrect id')

        try:
            userinfo = UserLog.objects.get(username=user.id)
        except UserLog.DoesNotExist:
            return JsonResponse({'message': 'UserLog does not exist for this user'}, status=400)
        request.session['appid'] = user.appid
       
        if check_password(password, user.password):
            if userinfo.visitcount == None:
                cnt = 1
            else:
                cnt = userinfo.visitcount + 1
            userinfo.visitcount = cnt
            userinfo.login_at = datetime.datetime.utcnow()
            userinfo.save()
            return JsonResponse({'message': 'Login successful'})
        else:
            return JsonResponse({'message': 'Username and password are required'}, status=400)
       
        
@csrf_exempt
def logout_api(request):
    if request.method == 'POST':
        username = request.session.get('user')
        if username:
            try:
                userinfo = UserLog.objects.get(username__username=username)
                userinfo.logout_at = timezone.now()
                userinfo.save()
            except UserLog.DoesNotExist:
                pass  # Handle the case where the UserLog does not exist
            logout(request)
        return JsonResponse({'message': 'Logout successful', 'redirect_url':'/'})
        
    
    
@csrf_exempt
def register_api(request):
    
    if request.method == 'POST':
        # data = JSONParser().parse(request)
        data = json.loads(request.body)
        username = data['username']
        password = data['password']
        re_password = data['re_password']
        email = data['email']
        
        res_data = {}
        
        if not (username and password and re_password and email):
            res_data['error'] = '모든 값을 입력해야 합니다.'
        elif password != re_password:
            res_data['error'] = '비밀번호가 다릅니다.'
        else:
            hash_password = make_password(password)
           
            data = {
                'username': username,
                'password': hash_password,
                'email': email,
                'registered_at': datetime.datetime.now()
            }
            
            # Connect to MongoDB (adjust connection details accordingly)
            db = client[MONGO_DB]  # Use your actual MongoDB database name
            users_collection = db['user']  # Use your actual collection name for users

            # Find user by username
            user = users_collection.insert_one(data)
        
        if user:
            return JsonResponse({'message': 'Register successful! Please Login', 'redirect_url':'/'})
        else:
            return JsonResponse({'error': 'Incorrect password'}, status=401)
    else:
        return JsonResponse({'error': 'User not found'}, status=404)
            
# Create your views here.
