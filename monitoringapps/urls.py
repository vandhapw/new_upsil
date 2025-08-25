from django.urls import path

from .views import *
from functools import partial

app_name = 'monitoringapps'
urlpatterns = [
    # path('api/iaq-sensor/', test_pages, name='iaq-sensor'),
    path('api/iaq-sensor/', iaq_sensor_monitoring, name='iaq-sensor-monitoring'),
    path('dashboard/', dashboard_content, name='dasboard-content'),
    path('api/plalion-sensor-data/', plalion_sensor_data_view, name='plalion-sensor-data'),
    path('api/latest-sensor-data/', get_latest_sensor_data, name='latest-sensor-data'),
    path('api/under-construction/', under_construction, name='under-construction'),
    #  path('api/indoor-buildthing-updated/', indoorBuildthingUpdated, name='indoor-buildthing-updated'),
    #  path('api/data-capacity/', dataCapacity, name='data-capacity'),
    # path('api/eda-index/', eda_index, name='eda-index'),
    # path('api/eda-process/', exploratory_data_analysis, name='eda-process'),
    # path('api/indoor-arduino/', indoor_arduino_index, name='indoor-arduino'),
    # path('api/buildthing-index/', indoor_buildthing_index, name='buildthing-index'),
    # path('api/outdoor-weather/', outdoor_weather_index, name='outdoor-weather'),
    # path('api/indoor-plalion-data/', indoorPlalionData, name='indoor-plalion-data'),
    # path('api/download-data-type/', downloadDataByType, name='download-data-type'),
    # path('api/klaen-index/', indoor_klaen_index, name='klaen-index'),
    # path('api/indoor-plalion-company-data/', indoorPlalionDataCompany, name='indoor-plalion-company-data'),
    # path('api/indoor-plalion-company-data-sn/', indoorPlalionDataCompanyPerSN, name='indoor-plalion-company-data-sn'),
    # path('api/klaen-company-index/', indoor_klaen_company_index, name='klaen-company-index'),
    # path('api/get-sensor-data-updated/',  get_sensor_data_updated, name='get-sensor-data-updated'),
    # path('api/display-weather-updated/', displayDataFromAPIUpdated, name='display-weather-updated'),
    # path('api/plalion-sensor-data/', PlalionSensorDataView.as_view(), name='plalion-sensor-data'),
    # path('api/plalion-rest-api/', plalion_fromRESTAPI, name='plalion-rest-api'),
    
    
    
    
    
   
    
]
