from django.urls import path

from .views import *
from functools import partial

app_name = 'tourism'
urlpatterns = [
    # path('api/iaq-sensor/', test_pages, name='iaq-sensor'),
    path('korean-tourism/', korean_tourism_page, name='korean-tourism'),
    path('api/provinces/', get_provinces_api, name='get_provinces_api'),
    path('api/provinces/geojson/', get_provinces_geojson_api, name='get_provinces_geojson_api'),
    path('api/hotels/', get_hotel_list, name='get_hotel_list'),
    path('api/attractions/', get_attraction_list, name='get_attraction_list'),


]