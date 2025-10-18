import requests
import pandas as pd 


API_KEY = "a5edd953082d4f209e8ef29fdeedb0a1"


class GeopifyAPI:
    BASE_URL = "https://api.geoapify.com/v1/geocode/"
    BASE_URL_PLACES = "https://api.geoapify.com/v2/places"

    def __init__(self, api_key=API_KEY):
        self.api_key = api_key

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
        hotels_list = []
        for hotel in data['hotels']:
            name = hotel.get('name', 'N/A')
            coords = hotel.get('coordinates', {})
            latitude = coords.get('latitude', 'N/A')
            longitude = coords.get('longitude', 'N/A')
            hotels_list.append({'Name': name, 'Latitude': latitude, 'Longitude': longitude, 'Type': 'Hotel'})

        attractions_list = []
        for attraction in data['attractions']:
            name = attraction.get('name', 'N/A')
            coords = attraction.get('coordinates', {})
            latitude = coords.get('latitude', 'N/A')
            longitude = coords.get('longitude', 'N/A')
            attractions_list.append({'Name': name, 'Latitude': latitude, 'Longitude': longitude, 'Type': 'Attraction'})

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
                        distance = route.get('distance', 'N/A')
                        duration = route.get('time', 'N/A')
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
                        distance_data.append({
                            'Source': source_name,
                            'Destination': destination_name,
                            'SourceCoordinates': (source_lat, source_lon),
                            'DestinationCoordinates': (destination_lat, destination_lon),
                            'Distance (m)': 'N/A',
                            'Duration (s)': 'N/A',
                            'Path': []
                        })
                else:
                    print(f"Error calculating distance from {source_name} to {destination_name}: {response.status_code}")
                    print(response.text)
                    distance_data.append({
                        'Source': source_name,
                        'Destination': destination_name,
                        'SourceCoordinates': (source_lat, source_lon),
                        'DestinationCoordinates': (destination_lat, destination_lon),
                        'Distance (m)': 'Error',
                        'Duration (s)': 'Error',
                        'Path': []
                    })

        df = pd.DataFrame(distance_data)
        ga_method = GA(df)
        ga_result = ga_method.main()
        # Create a DataFrame from the distance data
        return ga_result
        # distance_matrix_df = pd.DataFrame(distance_data)

        # # Display the distance matrix
        # display(distance_matrix_df)

        # return hotels_list, attractions_list
