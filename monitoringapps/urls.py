from django.urls import path

from .views import *
from functools import partial
from .analysis import *
from .sn_sensors import getAllSensors, getAllActiveSensors, checkExistingSensor, insertSensor
app_name = 'monitoringapps'
urlpatterns = [
    # path('api/iaq-sensor/', test_pages, name='iaq-sensor'),
    path('api/iaq-sensor/', iaq_sensor_monitoring, name='iaq-sensor-monitoring'),
    path('dashboard/', dashboard_content, name='dasboard-content'),
    path('api/plalion-sensor-data/', plalion_sensor_data_view, name='plalion-sensor-data'),
    path('api/latest-sensor-data/', get_latest_sensor_data, name='latest-sensor-data'),
    path('api/under-construction/', under_construction, name='under-construction'),
    path('api/iaq/realtime/', iaq_realtime_view, {"serial_number":None}),#/<int:did>/
    path('api/iaq/realtime/<int:serial_number>/', iaq_realtime_view),#/<int:did>/
    path('api/iaq/index/', iaq_index_view, {"serial_number":None}),
    path('api/iaq/index/<int:serial_number>/', iaq_index_view),
    path('api/iaq/trends/', iaq_trends_view, {"serial_number":None}),
    path('api/iaq/trends/<int:serial_number>/', iaq_trends_view),
    path('api/iaq/latest/', iaq_latest_table_view, {"serial_number":None}),
    path('api/iaq/latest/<int:serial_number>/', iaq_latest_table_view),
    path('api/iaq/data/', iaq_filtered_data, {"serial_number":None}),
    path('api/iaq/data/<int:serial_number>/', iaq_filtered_data),
    path('api/iaq/data/export/', iaq_export_csv, {"serial_number":None}),
    path('api/iaq/data/export/<int:serial_number>/', iaq_export_csv),
   
    # Analysis API
    path('api/iaq/analysis/summary/', iaq_summary, {"serial_number":None}),
    path('api/iaq/analysis/summary/<int:serial_number>/', iaq_summary),
    path('api/iaq/analysis/trend/', iaq_trend, {"serial_number":None}),
    path('api/iaq/analysis/trend/<int:serial_number>/', iaq_trend),
    path('api/iaq/analysis/safe-trend/', iaq_trend_safe, {"serial_number":None}),
    path('api/iaq/analysis/safe-trend/<int:serial_number>/', iaq_trend_safe),
    path('api/iaq/analysis/distribution/', iaq_distribution, {"serial_number":None}),
    path('api/iaq/analysis/distribution/<int:serial_number>/', iaq_distribution),
    path('api/iaq/analysis/correlation/', iaq_correlation, {"serial_number":None}),
    path('api/iaq/analysis/correlation/<int:serial_number>/', iaq_correlation),
    path('api/iaq/analysis/data-quality/', iaq_data_quality, {"serial_number":None}),
    path('api/iaq/analysis/data-quality/<int:serial_number>/', iaq_data_quality),
    path('api/iaq/analysis/autocorrelation/', iaq_autocorrelation, {"serial_number":None}),
    path('api/iaq/analysis/autocorrelation/<int:serial_number>/', iaq_autocorrelation),
    path('api/iaq/analysis/seasonal-decompose/', iaq_seasonal_decompose, {"serial_number":None}),
    path('api/iaq/analysis/seasonal-decompose/<int:serial_number>/', iaq_seasonal_decompose),

    # Sensor Serial Number
    path('api/iaq/sns/read/', getAllSensors),
    path('api/iaq/sns/check/', checkExistingSensor),
    path('api/iaq/sns/active/', getAllActiveSensors),
    
    path('api/iaq/sns/insert/', insertSensor),
    
    # path('api/iaq/test/active-sensor/', activateSensor),
    # path('api/iaq/sns/add/', getAllActiveSensors),
    
    
    
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
