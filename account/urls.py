
from django.urls import path

from .views import *
from functools import partial
from .indonesian_users import users_api as idn
from .crud import *

app_name = 'account'
urlpatterns = [
    path('login/', login_page, name='login'),
    path('api/login/', login_api, name='login_api'),
    # path('api/login/', login_function, name='login_function'),
    path('api/logout/', logout_api, name='logout_api'),
    # path('api/logout/', logout_function, name='logout_function'),
    # path('api/check/', check_page, name='check'),
    path('api/register/', register_api, name='register_api'),
    path('api/verify_email/<str:uidb64>/<str:token>/', verify_email, name='verify_email'),
    path('verification_page/', verification_page, name='verification_page'),
    
    path('api/papers/', getAllPapers, name='get_all_papers'),

    # Indonesian User APIs
    path('api/idn/login/', idn.login_api, name='idn_login_api'),
    path('api/idn/logout/', idn.logout_api, name='idn_logout_api'),
    path('api/idn/register/', idn.register_api, name='idn_register_api'),
    path('api/idn/verify_email/<str:uidb64>/<str:token>/', idn.verify_email, name='idn_verify_email'),
    path('idn/verification_page/', idn.verification_page, name='idn_verification_page'),
    
    # CRUD Users
    path('api/users/read/', getUsers, name='get_users'),
    path('api/users/create/', createUser, name='create_users'),
    path('api/users/<str:user_id>/', getUserById),
    path('api/users/update/<str:user_id>/', updateUser),
    path('api/users/delete/<str:user_id>/', deleteUser),
    
    
    # path('api/dashboard_page/', dashboard_page, name='dashboard_page'),
]
