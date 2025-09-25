
from django.urls import path

from .views import *
from functools import partial

app_name = 'account'
urlpatterns = [
    path('login/', login_page, name='login'),
    # path('api/login/', login_api, name='login_api'),
    path('api/login/', login_function, name='login_function'),
    # path('api/logout/', logout_api, name='logout_api'),
    path('api/logout/', logout_function, name='logout_function'),
    path('api/check/', check_page, name='check'),
    path('api/register/', register_api, name='register_api'),
    
    path('api/dashboard_page/', dashboard_page, name='dashboard_page'),
]
