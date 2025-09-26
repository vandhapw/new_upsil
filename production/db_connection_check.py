from pymongo import MongoClient

# Create a connection to MongoDB
client = MongoClient('mongodb://localhost:27017')  # Adjust the URL and port as needed

try:
    # Ping the MongoDB server
    client.admin.command('ping')  # This command checks if the connection is successful
    print("MongoDB connection successful!")
except Exception as e:
    print(f"Failed to connect to MongoDB: {e}")
