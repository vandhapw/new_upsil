import gridfs
from pymongo import MongoClient
import osmnx as ox
import networkx as nx
import os 
from django.http import JsonResponse
from bson import ObjectId
import pickle
import time
from io import BytesIO
import tempfile
import datetime


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

    def store_graphml_to_pickle(self):
        record = map_graph_ml_collection.find_one(
            {"province": "all"},
            sort=[("created_at", -1)]
        )

        if not record:
            raise ValueError("No graph file found for the specified province.")

        file_id = record['graphml_file_id']
        file_obj = fs.get(ObjectId(file_id))

        with tempfile.NamedTemporaryFile(delete=False, suffix=".graphml") as temp_file:
            temp_file.write(file_obj.read())
            temp_file_path = temp_file.name

        try:
            # Load the graph using osmnx
            G = ox.load_graphml(temp_file_path)
        
            # Serialize the graph to pickle format
            graph_stream = BytesIO()
            pickle.dump(G, graph_stream)
            graph_data = graph_stream.getvalue()

            # Store the pickle file into GridFS
            pickle_file_id = fs.put(
                graph_data, 
                filename="graph.pkl",
                content_type="application/octet-stream"
            )

            timestamp = int(time.time())
            filename = f"southkorea_{timestamp}.pkl"
        
            map_data = {
                "username": "pknu",
                "user_id": "00",
                "country": "South Korea",
                "province": "all",
                "graphml_file_id": pickle_file_id,
                "filename": filename,
                "file_size": len(graph_data),
                "file_type": "pickle",
                "created_at": datetime.datetime.now(),
                "updated_at": datetime.datetime.now()
            }

            # Insert the pickle file record
            result = map_graph_ml_collection.insert_one(map_data)
            
            return G

        finally:
            # Clean up the temporary file
            try:
                os.remove(temp_file_path)
            except OSError as e:
                print(f"Warning: Could not remove temporary file {temp_file_path}: {e}")