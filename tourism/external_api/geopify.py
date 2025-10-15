import requests


API_KEY = "a5edd953082d4f209e8ef29fdeedb0a1"


class GeopifyAPI:
    BASE_URL = "https://api.geoapify.com/v1/geocode/"

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

