import gridfs
from pymongo import MongoClient
import osmnx as ox
import networkx as nx
import os 
from django.http import JsonResponse

client = MongoClient("mongodb://localhost:27017/")
db = client["server_db"]
fs = gridfs.GridFS(db)
map_graph_ml_collection = db["map_graph_ml"]

class MapCRUD:
    def __init__(self, data):
        self.collection = map_graph_ml_collection
        self.data = data

    def insert_graphml(self):
        ox.settings.timeout = (20*60)
        # create graphml file
        G = ox.graph_from_place(f"{self.data['country']}", network_type='drive')
        
        # Generate unique filename based on country and timestamp
        import time
        timestamp = int(time.time())
        filename = f"{self.data['country']}_{timestamp}.graphml"
        
        ox.save_graphml(G, filename)
        
        # Read the GraphML file and store it in GridFS only
        with open(filename, "rb") as f:
            graphml_data = f.read()
        
        # Store the graphml file in GridFS and get the file ID
        graphml_file_id = fs.put(
            graphml_data, 
            filename=filename,
            country=self.data['country'],
            province=self.data['province'],
            username=self.data['username'],
            user_id=self.data['user_id'],
            created_at=self.data.get('created_at'),
            updated_at=self.data.get('updated_at')
        )
        
        # Store only metadata in the collection (NOT the large graphml_data)
        map_data = {
            "username": self.data['username'],
            "user_id": self.data['user_id'],
            "country": self.data['country'],
            "province": self.data['province'],
            "graphml_file_id": graphml_file_id,
            "filename": filename,
            "file_size": len(graphml_data),
            "created_at": self.data.get('created_at'),
            "updated_at": self.data.get('updated_at')
        }

        # Insert only the metadata into the collection
        result = self.collection.insert_one(map_data)
        
        # Clean up the temporary file
        try:
            os.remove(filename)
        except OSError as e:
            print(f"Warning: Could not remove temporary file {filename}: {e}")

        return str(graphml_file_id)

    def get_graphml_file(self, file_id):
        """Retrieve GraphML file from GridFS by file ID"""
        try:
            file_data = fs.get(file_id)
            return file_data.read()
        except gridfs.NoFile:
            raise ValueError(f"No file found with ID: {file_id}")
    
    def get_graphml_metadata(self, file_id):
        """Get metadata for a GraphML file from GridFS"""
        try:
            file_info = fs.find_one({"_id": file_id})
            if file_info:
                return {
                    "filename": file_info.filename,
                    "upload_date": file_info.upload_date,
                    "length": file_info.length,
                    "country": getattr(file_info, 'country', None),
                    "username": getattr(file_info, 'username', None),
                    "user_id": getattr(file_info, 'user_id', None)
                }
            return None
        except Exception as e:
            print(f"Error getting file metadata: {e}")
            return None

        # return JsonResponse({"message": "GraphML file inserted successfully", "file_id": str(graphml_file_id)}, status=201) 

    def create_map(self, map_data):
        result = self.collection.insert_one(map_data)
        return str(result.inserted_id)

    def read_map(self, map_id):
        return self.collection.find_one({"_id": map_id})

    def update_map(self, map_id, updated_data):
        self.collection.update_one({"_id": map_id}, {"$set": updated_data})

    def delete_map(self, map_id):
        self.collection.delete_one({"_id": map_id})