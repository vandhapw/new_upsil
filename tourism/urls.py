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
    path('api/display_history_trip/', get_trip_optimization_data, name='display_history_trip'),
    
    # Trip deletion endpoints
    path('api/delete_trip/<str:trip_id>/', delete_trip_optimization, name='delete_trip_optimization'),
    path('api/delete_all_trips/', delete_all_trip_optimizations, name='delete_all_trip_optimizations'),

    path('api/test_api_call/', test_api_call, name='test_api_call'),
    path('api/test_api_call_2/', test_api_call_2, name='test_api_call_2'),
    path('api/test_api_call_3/', test_api_call_3, name='test_api_call_3'),

    path('api/autocomplete_country/', autocomplete_country, name='autocomplete_country'),
    path('api/autocomplete_province/', autocomplete_province, name='autocomplete_province'),
    path('api/hotels_list/', get_hotel_list, name='get_hotel_list'),
    path('api/attractions_list/', get_attraction_list, name='get_attraction_list'),

    path('api/countries_list/', get_countries_list, name='get_countries_list'),


]