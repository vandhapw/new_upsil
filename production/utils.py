# from sshtunnel import SSHTunnelForwarder
# from pymongo import MongoClient
from django.conf import settings

dbLocation = None

if settings.CURRENT_ENVIRONMENT == 'server':
    MONGO_HOST = "10.12.179.2"
    MONGO_DB = "server_db"
    MONGO_USER = ""
    MONGO_PASS = ""
    dbLocation = f'mongodb://{MONGO_HOST}:27017/{MONGO_DB}'

else :
    MONGO_HOST = "localhost"
    MONGO_DB = "server_db"
    MONGO_USER = ""
    MONGO_PASS = ""
    dbLocation = f'mongodb://{MONGO_HOST}:27017/{MONGO_DB}'


# MONGO_HOST = "10.12.179.2"
# MONGO_DB = "server_db"
# MONGO_USER = ""
# MONGO_PASS = ""

# SERVER_HOST = "139.150.73.211"
# SERVER_USER = "root"
# SERVER_PASS = "upsil@1302"
# SSH_TUNNEL_LOCAL_BIND_PORT = 27018  # Example local port to bind the forwarded connection

# def get_database_client():
#     server = None  # Initialize server variable to ensure it's in the proper scope
    
#     if settings.CURRENT_ENVIRONMENT == 'local':
#         # Start SSH tunnel
#         server = SSHTunnelForwarder(
#             (SERVER_HOST, 22),
#             ssh_username=SERVER_USER,
#             ssh_password=SERVER_PASS,
#             remote_bind_address=('127.0.0.1', 27017),
#             local_bind_address=('127.0.0.1', SSH_TUNNEL_LOCAL_BIND_PORT)
#         )
#         server.start()

#         # Connect to MongoDB through the SSH tunnel
#         client = MongoClient(
#             f'mongodb://localhost:{server.local_bind_port}/{MONGO_DB}',
#             username=MONGO_USER,
#             password=MONGO_PASS,
#         )
#     else:
#         # Direct connection to MongoDB without SSH tunnel
#         dbLocation = f'mongodb://{MONGO_HOST}:27017/{MONGO_DB}'
#         client = MongoClient(
#             dbLocation,
#             username=MONGO_USER,
#             password=MONGO_PASS,
#         )
        
#     return client, server  # Return MongoClient and optionally SSHTunnelForwarder instances

