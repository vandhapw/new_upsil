"""production URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.contrib import admin
from django.urls import path, include
from .views import print_example
from account.views import login_page, dashboard_page, testing_dashboard
from functools import partial 
# from klaen.views import *
from monitoringapps.views import *

urlpatterns = [
    path('admin/', admin.site.urls),
    path('testing/',print_example, name='testing' ),
    path('', login_page, name='login'),
    path('account/', include('account.urls')),
    path('dashboard/', dashboard_page, name='dashboard'),
    path('dashboard/kaidashboard/',testing_dashboard, name='kaidashboard' ),
    # path('klaen/', include('klaen.urls')),
    path('dashboard/kaidashboard/monitoringapps/', include('monitoringapps.urls'))
    # path('/api/login/', partial(login_api, running=None), name='api-login')
    
    
]

urlpatterns += staticfiles_urlpatterns()
