import requests


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
