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
    path('api/trip-page/', get_trip_optimization_data, name='trip_optimization_page'),
    path('api/trip-optimization/', trip_optimization_api, name='trip_optimization_api'),
    path('api/insert_graphml/', api_insert_graphml, name='api_insert_graphml'),
    path('api/get_graphml/<str:file_id>/', api_get_graphml, name='api_get_graphml'),
    path('api/test_graphml/', calling_test_api, name='test_graphml'),


]