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
from account.views import login_page
from functools import partial 
from django.conf import settings
from django.conf.urls.static import static
from account.views import testing_dashboard
from tourism.views import *
from production.views import *
from indonesian_app.desa_wisata.jember import *

# from klaen.views import *
from monitoringapps.views import *

urlpatterns = [
    path('admin/', admin.site.urls),
    path('testing/',print_example, name='testing' ),
    # path('', login_page, name='login'),
    path('backend/', new_login_page, name='login'),
    path('backend/account/', include('account.urls')),
    path('backend/tourism/', include('tourism.urls')),
    path('backend/idn/', include('indonesian_app.urls')),
    # path('dashboard/', dashboard_page, name='dashboard'),
    path('backend/dashboard/kaidashboard/',testing_dashboard, name='kaidashboard' ),
    # path('klaen/', include('klaen.urls')),
    # path('dashboard/kaidashboard/monitoringapps/', include('monitoringapps.urls'))
    # path('/api/login/', partial(login_api, running=None), name='api-login')
    path('backend/dashboard/kaidashboard/tourism/', include('tourism.urls')),
    path('backend/monitoringapps/', include('monitoringapps.urls')),

    path('backend/testing_page/', new_login_page, name='testing_page' ),

]

if settings.DEBUG:  # Only in development mode
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# urlpatterns += staticfiles_urlpatterns()
