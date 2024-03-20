from django.shortcuts import render
from django.shortcuts import render, redirect
from .forms import *
from .models import User, UserLog, UserGroup
from datetime import timedelta
import json, datetime
from django.http import HttpResponse

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
    return render(request,'login-form-17.html')
   
# Create your views here.
