
from django.urls import path

from functools import partial
from .desa_wisata.jember import *


app_name = 'idn'
urlpatterns = [
    path('api/jember_tourism_villages/', get_jember_tourism_villages, name='jember_tourism_villages'),
    path('api/add_desa_wisata/', add_desa_wisata, name='add_desa_wisata'),
    path('api/approval_desa_wisata/<str:id>/', approval_desa_wisata, name='approval_desa_wisata'),
    path('api/notifications/', notifications, name='notifications'),
]
