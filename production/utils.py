from django.conf import settings
from pathlib import Path
import pymongo

dbLocation = None

def get_mongo_client():
    """
    Returns a pymongo.MongoClient instance based on the current environment.
    Skips connection for 'server' environment.
    """
    try:
        if settings.CURRENT_ENVIRONMENT == 'server':
            print("Running in 'server' environment. Skipping database connection.")
            return None
        else:
            print("Running in 'local' environment. Connecting to MongoDB.")
            client = pymongo.MongoClient('localhost', 27017)
            client.admin.command('ping')  # Check if the database is reachable
            DATABASES = {
                'default': {
                    'ENGINE': 'djongo',
                    'NAME': 'server_db',
                    'CLIENT': {
                        'host': '127.0.0.1',
                        'port': 27017,
                        'authSource': 'admin',
                    }
                }
            }
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
