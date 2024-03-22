from pymongo import MongoClient
from .utils import get_database_client, MONGO_DB
from django.http import JsonResponse, HttpResponse
from pymongo import MongoClient

# databases = get_database_client()
# client = MongoClient(databases)
# db = client.server_db
# lights_collection = db.lighting_users



client, ssh_tunnel = get_database_client()

def print_example(request):
    
    # print('databases',databases)
    
    db = client[MONGO_DB]
    
    x = db.user.find({},{ "_id": 0})
    documents_list = list(x)  # Convert cursor to list
    
    if ssh_tunnel:
        ssh_tunnel.stop()
        
    # Return the documents as JSON response
    if documents_list:
        return JsonResponse(documents_list, safe=False)
    else:
        return JsonResponse({'message': "No documents found"})
    
    
