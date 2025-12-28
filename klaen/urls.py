from django.urls import path

# from .views import *
from functools import partial
from .management import device,security, master_schedule, status_device, time_schedule,socket_mqtt, remote_control

app_name = 'klaen'
urlpatterns = [
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
    
    # management sensors
    path('api/mqtt/', socket_mqtt.mqtt_address),
    path('api/security/', security.security_list),
    path('api/security/<int:sid>/', security.security_detail),
    path('api/device/', device.device_list),
    path('api/device/<int:sn>/', device.device_detail),
    path('api/delete/device/<int:sn>/', device.delete_device),
    path('api/detail/device/<int:sn>/', device.detail_device),    
    path('api/status/', status_device.status_list),
    path('api/remote/power/', remote_control.remote_power),
    path('api/remote/mode/', remote_control.remote_mode),
    
    path('api/master-schedule/', master_schedule.master_schedule),
    path('api/time-schedule/', time_schedule.time_schedule_list),
    
    
    
    
    
   
    
]
