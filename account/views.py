from django.shortcuts import render, redirect
from .forms import *
from .models import User, UserLog, UserGroup
from datetime import timedelta
import json, datetime
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.hashers import check_password, make_password
from production.utils import get_database_client, MONGO_DB
from pymongo import MongoClient
import pytz
from django.utils import timezone


client, ssh_tunnel = get_database_client()

def home(request):
    # login을 통해서 확인된 user는 session을 통해 user.id를 넘겨 받았다.
    user_id = request.session.get('user')

    # user_id유무를 통해 login판단
    if user_id:
        user = User.objects.get(pk=user_id)
        return HttpResponse(f'{user} login success')

    return HttpResponse('Home')

def login(request):
    if request.method == 'POST':
        form = LoginForm(request.POST)

        if form.is_valid():
            request.session['user'] = form.user_id
            userinfo = UserLog.objects.get(username=form.user_id)
            if userinfo.visitcount == None:
                cnt = 1
            else:
                cnt = userinfo.visitcount + 1
            userinfo.visitcount = cnt
            userinfo.login_at = datetime.datetime.utcnow()
            userinfo.save()
            return redirect('/home/')

    else:
        form = LoginForm()

    return render(request, 'login.html', {'form': form})

def login_page(request):
    user = request.session.get('user')
    print('user',user)
    if user is not None:
        return redirect('/dashboard/')
    return render(request,'login-form-17.html')


def check_page(request):
    return render(request,'check.html')

def dashboard_page(request):
    return render(request,'dashboard/dashboard.html')


@csrf_exempt
def login_api(request):

    if request.method == 'POST':
        # data = JSONParser().parse(request)
        data = json.loads(request.body)
        username = data['username']
        password = data['password']
        print('usernames',username, 'password',password)

        # Connect to MongoDB (adjust connection details accordingly)
        db = client[MONGO_DB]  # Use your actual MongoDB database name
        users_collection = db['user']  # Use your actual collection name for users

        # Find user by username
        user = users_collection.find_one({'username': username})
        
        # print('user',user)

        if user:
            if(check_password(password, user['password'])):
                request.session['user'] = username  # Simplified session creation
                return JsonResponse({'message': 'Login successful'})
            else:
                return JsonResponse({'error': 'Incorrect password'}, status=401)
        else:
            return JsonResponse({'error': 'User not found'}, status=404)
        
@csrf_exempt
def logout_api(request):
    if request.method == 'POST':
    # Check if 'user' is in session and delete it
        user_in_session = request.session.pop('user', None)
        print('user_in_session',user_in_session)
        
        # You can log the logout action here if needed
        if user_in_session:
            print(f"User {user_in_session} logged out.")
            
        return JsonResponse({'message':'success!','redirect_url':'/'})
    
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
