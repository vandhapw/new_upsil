from pymongo import MongoClient
from .utils import server, MONGO_DB,dbLocation
from django.http import JsonResponse, HttpResponse
from pymongo import MongoClient

client = MongoClient(dbLocation)
db = client.server_db
lights_collection = db.lighting_users



def print_example(request):
    
    server.start()

    client = MongoClient('127.0.0.1', server.local_bind_port) # calling 
    db = client[MONGO_DB]
    
    x = db.lighting_users.find({},{ "_id": 0})
    documents_list = list(x)  # Convert cursor to list
    
    server.stop()

    # Return the documents as JSON response
    if documents_list:
        return JsonResponse(documents_list, safe=False)
    else:
        return JsonResponse({'message': "No documents found"})
