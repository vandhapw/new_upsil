from sshtunnel import SSHTunnelForwarder
from pymongo import MongoClient
import pprint

MONGO_HOST = "10.12.179.2"
MONGO_DB = "server_db"
MONGO_USER = ""
MONGO_PASS = ""

SERVER_HOST = "139.150.73.211"
SERVER_USER = "root"
SERVER_PASS = "upsil@1302"

server = SSHTunnelForwarder(
    (SERVER_HOST, 22),
    ssh_username=SERVER_USER,
    ssh_password=SERVER_PASS,
    remote_bind_address=(MONGO_HOST, 27017)
)




dbLocation = 'mongodb://10.12.179.2:27017'