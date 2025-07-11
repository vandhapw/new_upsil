from django.db import models
from datetime import datetime
from django.utils import timezone


# Create your models here.
class SensorData(models.Model):
    temperature = models.FloatField()
    humidity = models.FloatField()
    ozone = models.FloatField()
    dust = models.FloatField()
    device = models.IntegerField()
    timestamp = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.device} Data at {self.timestamp}"

class PlalionSensorData(models.Model):
    ozone = models.FloatField()
    temperature = models.FloatField()
    humidity = models.FloatField()
    dust = models.FloatField()
    co2 = models.IntegerField()
    voc = models.IntegerField()
    timestamp = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.device} Data at {self.timestamp}"
    
class PlalionSensorCompanyData(models.Model):
    ozone = models.FloatField()
    temperature = models.FloatField()
    humidity = models.FloatField()
    dust = models.FloatField()
    co2 = models.IntegerField()
    voc = models.IntegerField()
    serial_num = models.CharField(max_length=255)
    last_time = models.CharField(max_length=255)
    active = models.BooleanField()
    m_enable = models.BooleanField()
    s_enable = models.BooleanField()
    timestamp = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'plalion_company_sensor'

    # def __str__(self):
    #     return f"{self.device} Data at {self.timestamp}"

# Lighting
class Registration(models.Model):
    email = models.EmailField()
    username = models.CharField(max_length=128)
    password = models.CharField(max_length=128)
    client_id = models.CharField(max_length=255, null=True)
    client_secret = models.CharField(max_length=255, null=True)
    app_id = models.CharField(max_length=255, null=True)
    device_id = models.CharField(max_length=255, null=True)
    device_name = models.CharField(max_length=255, null=True)
    registration_type = models.FloatField()
    timestamp = models.DateTimeField(default=timezone.now)

class StoringLighting(models.Model):
    username = models.CharField(max_length=128)
    lightHue = models.IntegerField()
    lightSat = models.IntegerField()
    lightBri = models.IntegerField()
    lightCT = models.IntegerField()
    lightStatus = models.CharField(max_length=64)
    lightId = models.CharField(max_length=64)
    roomName = models.CharField(max_length=255)
    switchMode = models.CharField(max_length=255)
    deviceTemp = models.FloatField(null=True)
    lightLuminance = models.FloatField(null=True)
    motion = models.CharField(max_length=255, null=True)
    location = models.JSONField()
    device = models.CharField(max_length=64)
    timestamp = models.DateTimeField(default=timezone.now)


# Outdoor Data
class OutdoorData(models.Model):
    data = models.JSONField()
    timestamp = models.IntegerField()

    class Meta:
        db_table = 'klaen_outdoorData'

class WeatherAPI(models.Model):
    data = models.JSONField()
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'lighting_weatherapi'

class lightingLog(models.Model):
    data = models.JSONField()

    class Meta:
        db_table = 'lighting_log'

    # def __str__(self):
    #     return f"Log entry for {self.timestamp}"

class FCMTOken(models.Model):
    token = models.CharField(max_length=255)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'lighting_fcmtoken'



