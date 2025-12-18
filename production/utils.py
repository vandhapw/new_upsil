from django.conf import settings
from pathlib import Path
import pymongo
import socket

dbLocation = None

def is_server():
    hostname = socket.gethostname()
    server_indicators = ["vps", "server", "host", "node"]
    return any(indicator in hostname.lower() for indicator in server_indicators)
server = is_server()

def get_mongo_client():
    """
    Returns a pymongo.MongoClient instance based on the current environment.
    Skips connection for 'server' environment.
    """
    try:
        if server:
            print("Running in 'server' environment. Skipping database connection.")
            client = pymongo.MongoClient("mongodb://superUser:superUpsil!@localhost:27019/server_db?authSource=server_db")
            return client
        else:
            print("Running in 'local' environment. Connecting to MongoDB.")
            print("Connecting to MongoDB at localhost:27017...")
            client = pymongo.MongoClient("mongodb://superUser:superUpsil!@localhost:27017/server_db?authSource=server_db")
            return client
    except Exception as e:
        print(f"An error occurred while connecting to MongoDB: {e}")
        return None

# Ensure DATABASES is defined to avoid errors in other parts of the application
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.dummy',  # Use dummy backend to bypass database
    }
}

print("Getting MongoDB client...", server)
