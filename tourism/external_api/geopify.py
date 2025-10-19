import requests
import pandas as pd 
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import time


# API_KEY = "a5edd953082d4f209e8ef29fdeedb0a1"
# API_KEY = "decf3faeabb744a09a99a7a4ce8579ad"
API_KEY = "7987d19900864cf6a41cb30cb02a27fd"


class GeopifyAPI:
    BASE_URL = "https://api.geoapify.com/v1/geocode/"
    BASE_URL_PLACES = "https://api.geoapify.com/v2/places"

    def __init__(self, api_key=API_KEY):
        self.api_key = api_key
        # Create session with retry strategy
        self.session = requests.Session()
        retry_strategy = Retry(
            total=3,  # Retry up to 3 times
            backoff_factor=1,  # Wait 1, 2, 4 seconds between retries
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def autocomplete_country(self, params):
        params['apiKey'] = self.api_key
        response = requests.get(f"{self.BASE_URL}autocomplete?type=country", params=params)
        if response.status_code == 200:
            return response.json()
        else:
            response.raise_for_status()

    def autocomplete_province(self, params):
        params['apiKey'] = self.api_key
        countrycode = params.get('countrycode', 'kr')
        response = requests.get(f"{self.BASE_URL}search?&type=city&filter=countrycode:{countrycode}", params=params)
        # ?filter=countrycode:id&type=city&format=json&apiKey=a5edd953082d4f209e8ef29fdeedb0a1&text=Jakarta
        print('response url :', response.url)
        if response.status_code == 200:
            return response.json()
        else:
            response.raise_for_status()

    def get_hotel_list(self, params):
        params['apiKey'] = self.api_key
        place_id = params.get('place_id')
        # place_id = "51e55e605668226040596d697fb108974140f00101f9012291240000000000c00208"
        # https://api.geoapify.com/v2/places?categories=accommodation.hotel&filter=place:51e55e605668226040596d697fb108974140f00101f9012291240000000000c00208&limit=150&apiKey=a5edd953082d4f209e8ef29fdeedb0a1
        response = requests.get(f"{self.BASE_URL_PLACES}?categories=accommodation.hotel&filter=place:{place_id}&limit=150", params=params)
        if response.status_code == 200:
            return response.json()
        else:
            response.raise_for_status()

    def get_attraction_list(self, params):
        params['apiKey'] = self.api_key
        place_id = params.get('place_id')
        # place_id = "51e55e605668226040596d697fb108974140f00101f9012291240000000000c00208"
        # https://api.geoapify.com/v2/places?categories=tourism.attraction&filter=place:51e55e605668226040596d697fb108974140f00101f9012291240000000000c00208&limit=200&apiKey=a5edd953082d4f209e8ef29fdeedb0a1
        response = requests.get(f"{self.BASE_URL_PLACES}?categories=tourism.attraction&filter=place:{place_id}&limit=200", params=params)
        if response.status_code == 200:
            return response.json()
        else:
            response.raise_for_status()

    def calculate_distance_matrix(self, data):
        from tourism.optimization.genetic_algorithm import GA
        from tourism.optimization.ga_multi import GA_MultiOptimizer
        """Calculate distance matrix with timeout and error handling"""
        try:
            hotels_list = []
            for hotel in data['hotels']:
                name = hotel.get('name', 'Unknown Hotel')
                coords = hotel.get('coordinates', {})
                latitude = coords.get('latitude', None)
                longitude = coords.get('longitude', None)
                
                # Skip hotels with invalid coordinates
                if latitude is None or longitude is None or latitude == 'N/A' or longitude == 'N/A':
                    print(f"Skipping hotel {name} due to invalid coordinates")
                    continue
                
                # Ensure coordinates are floats
                try:
                    latitude = float(latitude)
                    longitude = float(longitude)
                except (ValueError, TypeError):
                    print(f"Skipping hotel {name} due to non-numeric coordinates")
                    continue
                
                hotel_booking = hotel.get('booking', {})
                checkInDate = hotel_booking.get('checkInDate', 'N/A')
                checkOutDate = hotel_booking.get('checkOutDate', 'N/A')
                hotels_list.append({
                    'Name': name, 
                    'Latitude': latitude, 
                    'Longitude': longitude, 
                    'Type': 'Hotel', 
                    'checkIn': checkInDate, 
                    'checkOut': checkOutDate
                })

            attractions_list = []
            for attraction in data['attractions']:
                name = attraction.get('name', 'Unknown Attraction')
                coords = attraction.get('coordinates', {})
                latitude = coords.get('latitude', None)
                longitude = coords.get('longitude', None)
                
                # Skip attractions with invalid coordinates
                if latitude is None or longitude is None or latitude == 'N/A' or longitude == 'N/A':
                    print(f"Skipping attraction {name} due to invalid coordinates")
                    continue
                
                # Ensure coordinates are floats
                try:
                    latitude = float(latitude)
                    longitude = float(longitude)
                except (ValueError, TypeError):
                    print(f"Skipping attraction {name} due to non-numeric coordinates")
                    continue
                
                attractions_list.append({
                    'Name': name, 
                    'Latitude': latitude, 
                    'Longitude': longitude, 
                    'Type': 'Attraction'
                })

            # Check if we have enough valid locations
            if len(hotels_list) + len(attractions_list) < 2:
                return {
                    'error': 'Insufficient valid locations',
                    'message': 'At least 2 locations with valid coordinates are required',
                    'details': f'Only {len(hotels_list) + len(attractions_list)} valid location(s) found'
                }

            all_locations_df = pd.DataFrame(hotels_list + attractions_list)
            # Get coordinates from the DataFrame
            locations = all_locations_df[['Name', 'Latitude', 'Longitude']].to_records(index=False).tolist()
            
            # Create a list to store distance data
            distance_data = []

            # Calculate distances between all pairs of locations
            for i in range(len(locations)):
                for j in range(len(locations)):
                    source_name, source_lat, source_lon = locations[i]
                    destination_name, destination_lat, destination_lon = locations[j]

                    # Format the URL properly using f-string
                    url_api = (
                        f"https://api.geoapify.com/v1/routing?"
                        f"waypoints={source_lat},{source_lon}|{destination_lat},{destination_lon}"
                        f"&mode=drive&traffic=approximated&apiKey={API_KEY}"
                    )

                    # Make the request
                    response = requests.get(url_api)

                    # Check and handle the response
                    if response.status_code == 200:
                        data = response.json()
                        # Extract distance (in meters) and duration (in seconds)
                        if 'features' in data and len(data['features']) > 0:
                            route = data['features'][0]['properties']
                            path_line = data['features'][0]['geometry']['coordinates']
                            
                            # Safely extract distance and duration with fallback to large values
                            distance = route.get('distance', 999999.0)
                            duration = route.get('time', 999999.0)
                            
                            # Handle cases where API returns None, 'N/A', or empty values
                            if distance is None or distance == 'N/A' or distance == '':
                                distance = 999999.0
                            if duration is None or duration == 'N/A' or duration == '':
                                duration = 999999.0
                            
                            # Ensure they are numeric
                            try:
                                distance = float(distance)
                                duration = float(duration)
                            except (ValueError, TypeError):
                                print(f"Warning: Invalid distance/duration format for {source_name} -> {destination_name}")
                                distance = 999999.0
                                duration = 999999.0
                            
                            distance_data.append({
                                'Source': source_name,
                                'SourceCoordinates': (source_lat, source_lon),
                                'Destination': destination_name,
                                'DestinationCoordinates': (destination_lat, destination_lon),
                                'Distance (m)': distance,
                                'Duration (s)': duration,
                                'Path': path_line
                            })
                        else:
                            print(f"No route found between {source_name} and {destination_name}")
                            # Use large numeric values instead of 'N/A' for unreachable routes
                            distance_data.append({
                                'Source': source_name,
                                'Destination': destination_name,
                                'SourceCoordinates': (source_lat, source_lon),
                                'DestinationCoordinates': (destination_lat, destination_lon),
                                'Distance (m)': 999999.0,  # Large distance for unreachable routes
                                'Duration (s)': 999999.0,  # Large duration for unreachable routes
                                'Path': []
                            })
                    else:
                        print(f"Error calculating distance from {source_name} to {destination_name}: {response.status_code}")
                        print(response.text)
                        # Use large numeric values instead of 'Error' string
                        distance_data.append({
                            'Source': source_name,
                            'Destination': destination_name,
                            'SourceCoordinates': (source_lat, source_lon),
                            'DestinationCoordinates': (destination_lat, destination_lon),
                            'Distance (m)': 999999.0,  # Large distance for error cases
                            'Duration (s)': 999999.0,  # Large duration for error cases
                            'Path': []
                        })

            df = pd.DataFrame(distance_data)
            ga_method = GA_MultiOptimizer(df, all_locations_df)
            ga_result = ga_method.main()
            # Create a DataFrame from the distance data
            return ga_result
            # distance_matrix_df = pd.DataFrame(distance_data)

            # # Display the distance matrix
            # display(distance_matrix_df)

            # return hotels_list, attractions_list
            # Your existing distance matrix calculation code
            # Add timeout parameter
            # response = self.session.post(
            #     f"{self.base_url}/v1/routematrix",
            #     json=data,
            #     timeout=(10, 60)  # (connect timeout, read timeout) in seconds
            # )
            
            # response.raise_for_status()
            # return response.json()
            
        except requests.exceptions.Timeout as e:
            print(f"Timeout error: {str(e)}")
            return {
                'error': 'API timeout',
                'message': 'The distance calculation took too long. Try with fewer locations.',
                'details': str(e)
            }
        except requests.exceptions.ConnectionError as e:
            print(f"Connection error: {str(e)}")
            return {
                'error': 'Connection failed',
                'message': 'Could not connect to the routing service. Please try again.',
                'details': str(e)
            }
        except requests.exceptions.HTTPError as e:
            print(f"HTTP error: {str(e)}")
            return {
                'error': 'API error',
                'message': f'Routing service returned an error: {e.response.status_code}',
                'details': str(e)
            }
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            return {
                'error': 'Unexpected error',
                'message': 'An unexpected error occurred during distance calculation',
                'details': str(e)
            }
        
