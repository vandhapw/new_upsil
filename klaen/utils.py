from production.utils import get_mongo_client

client = get_mongo_client()
db = client['server_db']
plalion_data_collection = db['plalion_klaen_sensor']
plalion_company_data_collection = db['plalion_company_sensor']
klaen_mqtt_collection = db['klaen_mqtt_collection']
bus_klaen_devices_collection = db['bus_klaen_devices']
bus_klaen_master_schedule_collection = db['bus_klaen_master_schedule']
bus_klaen_security_collection = db['bus_klaen_security']
bus_klaen_status_collection = db['bus_klaen_status']
bus_klaen_time_schedule_collection = db['bus_klaen_time_schedule']
bus_klaen_mqtt = db['klaen_mqtt']
bus_klaen_logs = db['klaen_logs']

jungrok_url = "http://54.180.153.12:3000/plalion/"

from bson import ObjectId

def serialize(doc):
    doc['_id'] = str(doc['_id'])
    return doc
