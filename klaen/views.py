from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
# from production.utils import get_database_client
from production.utils import dbLocation
import pandas as pd 
import matplotlib.pyplot as plt
import seaborn as sns
import json
import io
import base64
from datetime import datetime, timedelta
from pymongo import DESCENDING, MongoClient
from plotly.subplots import make_subplots
import plotly.express as px
import plotly.graph_objects as go
from plotly.offline import plot
from django.conf import settings
from .forms import UploadFileForm
import pytz
from django.utils import timezone

import threading
import time
import requests

from .models import SensorData, PlalionSensorData, PlalionSensorCompanyData


# client, ssh_tunnel = get_database_client()
client = MongoClient(dbLocation)
db = client.server_db
buildthing_data_collection = db.klaen_buildthing
sensor_data_collection = db.klaen_arduino_sensor
weather_data_collection = db.weather_api
plalion_data_collection = db.plalion_klaen_sensor
plalion_company_data_collection = db.plalion_company_sensor

# REST API - Jungrok Company 
jungrok_url = "http://54.180.153.12:3000/plalion/"

# Mock data to use when the database is unavailable
MOCK_DATA = [
    {"serial_number": 1, "name": "Mock Company 1"},
    {"serial_number": 2, "name": "Mock Company 2"},
]

try:
    if settings.CURRENT_ENVIRONMENT == 'server':
        # Skip database queries in the 'server' environment
        print("Running in 'server' environment. Skipping database queries.")
        plalion_company_data = MOCK_DATA
    else:
        # Skip database queries in the 'local' environment
        print("Running in 'local' environment. Skipping database queries.")
        plalion_company_data = MOCK_DATA
except Exception as e:
    print(f"An error occurred while fetching data: {e}")
    plalion_company_data = MOCK_DATA

for document in plalion_company_data_collection.find({"serial_number": {"$type": "int"}}):
    # Convert serial_number to string and update the document
    plalion_company_data_collection.update_one(
        {"_id": document["_id"]},
        {"$set": {"serial_number": str(document["serial_number"])}}
    )



# Create your views here.
def dataCapacity(request):
    try:
        num_buildthing = buildthing_data_collection.count_documents({})
        num_arduino = sensor_data_collection.count_documents({})
        num_weather = weather_data_collection.count_documents({})
        num_klaen = plalion_data_collection.count_documents({})
        num_klaen_company = plalion_company_data_collection.count_documents({})

        buildthing_stats = db.command('collStats','klaen_buildthing')
        buildthing_size = buildthing_stats['size'] / (1024 * 1024)
        
        arduino_stats = db.command('collStats','klaen_arduinoSensor')
        arduino_size = arduino_stats['size'] / (1024 * 1024)
        
        weather_stats = db.command('collStats','weather_api')
        weather_size = weather_stats['size'] / (1024 * 1024)
        
        klaen_stats = db.command('collStats','plalion_klaen_sensor')
        klaen_size = klaen_stats['size'] / (1024 * 1024)
        
        klaen_company_stats = db.command('collStats','plalion_company_sensor')
        klaen_company_size = klaen_company_stats['size'] / (1024 * 1024)
        
        initial_date_arduino = sensor_data_collection.find().sort('timestamp').limit(1)
        last_date_arduino = sensor_data_collection.find().sort('timestamp', DESCENDING).limit(1)
        initial_date_buildthing = buildthing_data_collection.find().sort('Time').limit(1)
        last_date_buildthing = buildthing_data_collection.find().sort('Time', DESCENDING).limit(1)
        initial_date_klaen = plalion_data_collection.find().sort('timestamp').limit(1)
        last_date_klaen = plalion_data_collection.find().sort('timestamp', DESCENDING).limit(1)
        initial_date_klaen_company = plalion_company_data_collection.find().sort('timestamp').limit(1)
        last_date_klaen_company = plalion_company_data_collection.find().sort('timestamp', DESCENDING).limit(1)
        initial_date_weather = weather_data_collection.find().sort('timestamp').limit(1)
        last_date_weather = weather_data_collection.find().sort('timestamp', DESCENDING).limit(1)
        
        arduino_initial = next(initial_date_arduino)['timestamp']
        arduino_last = next(last_date_arduino)['timestamp']
        buildthing_initial = next(initial_date_buildthing)['Time']
        buildthing_last = next(last_date_buildthing)['Time']
        klaen_initial = next(initial_date_klaen)['timestamp']
        klaen_last = next(last_date_klaen)['timestamp']
        klaen_company_initial = next(initial_date_klaen_company)['timestamp']
        klaen_company_last = next(last_date_klaen_company)['timestamp']
        weather_initial = next(initial_date_weather)['timestamp']
        weather_last = next(last_date_weather)['timestamp']


        # Create a response dictionary with data and count
        response_data = {
            'buildthing_row': num_buildthing,
            'buildthing_size':buildthing_size,
            'arduino_row': num_arduino,
            'arduino_size':arduino_size,
            'weather_row': num_weather,
            'weather_size':weather_size,
            'klaen_row': num_klaen,
            'klaen_size':klaen_size,
            'klaen_company_row': num_klaen_company,
            'klaen_company_size':klaen_company_size,
            'arduino_initial': arduino_initial,
            'arduino_last':arduino_last,
            'buildthing_initial': buildthing_initial,
            'buildthing_last':buildthing_last,
            'klaen_initial': klaen_initial,
            'klaen_last':klaen_last,
            'weather_initial': weather_initial,
            'weather_last':weather_last,
            'klaen_company_initial': klaen_company_initial,
            'klaen_company_last':klaen_company_last,
        }

        # Pass the response_data to JsonResponse
        return JsonResponse(response_data, safe=False)
    except Exception as e:
        # Handle any exceptions that may occur
        return JsonResponse({'error': str(e)}, status=500)
    
def indoor_arduino_index(request):
    context = {'arduino_initial': None,"arduino_last":None, 'user': None, 'appid': None}
    if 'user' in request.session:
        user = request.session['user']
        appid = request.session['appid']
    data_capacity = dataCapacity(request)
    context = {'arduino_initial': data_capacity.get('arduino_initial'),"arduino_last":data_capacity.get('arduino_last'), 'user': user, 'appid': appid}
    print('context',context)
    
    return render(request, 'klaen/arduino_indoor.html', context)

def indoor_buildthing_index(request):
    context = {'buildthing_initial': None,"buildthing_last":None, 'user': None, 'appid': None}
    if 'user' in request.session:
        user = request.session['user']
        appid = request.session['appid']
    data_capacity = dataCapacity(request)
    context = {'buildthing_initial': data_capacity.get('buildthing_initial'),"buildthing_last":data_capacity.get('buildthing_last'), 'user': user, 'appid': appid}
    return render(request, 'klaen/buildthing_indoor.html', context)

def indoor_klaen_index(request):
    context = {'klaen_initial': None,"klaen_last":None, 'user': None, 'appid': None}
    if 'user' in request.session:
        user = request.session['user']
        appid = request.session['appid']
    data_capacity = dataCapacity(request)
    context = {'klaen_initial': data_capacity.get('klaen_initial'),"klaen_last":data_capacity.get('klaen_last'), 'user': user, 'appid': appid}
    return render(request, 'klaen/klaen_indoor.html', context)

def indoor_klaen_company_index(request):
    context = {'klaen_company_initial': None,"klaen_company_last":None, 'user': None, 'appid': None, 'date_range':None}
    # data_capacity = dataCapacity(request)
    data_company_sn = indoorPlalionDataCompanyPerSN(request)
    json_content = json.loads(data_company_sn.content)

    date_range = json_content.get('date_range', None)
    serial_numbers = json_content.get('serial_number', None)
    # print('data_company_sn',data_company_sn)
    if 'user' in request.session:
        user = request.session['user']
        appid = request.session['appid']
    context = {
        # 'klaen_company_initial': data_capacity.get('klaen_company_initial'),"klaen_company_last":data_capacity.get('klaen_company_last'), 
               'user': user, 'appid': appid, 'date_range':date_range, 'serial_numbers':serial_numbers}
    return render(request, 'klaen/klaen_company_indoor.html', context)

def outdoor_weather_index(request):
    context = {'weather_initial': None,"weather_last":None, 'user': None, 'appid': None}
    if 'user' in request.session:
        user = request.session['user']
        appid = request.session['appid']
    data_capacity = dataCapacity(request)
    context = {'weather_initial': data_capacity.get('weather_initial'),"weather_last":data_capacity.get('weather_last'), 'user': user, 'appid': appid}
    return render(request, 'klaen/weather_outdoor.html', context)

# Exploratory Data Analysis 
def eda_index(request):
    return render(request, 'klaen/eda.html')

def exploratory_data_analysis(request):
    context = {'data': None, 'columns': None, 'figures': None}
    if request.method == 'POST':
        form = UploadFileForm(request.POST, request.FILES)
        if form.is_valid():
            # Read the uploaded file into a pandas DataFrame
            uploaded_file = request.FILES['file']
            if uploaded_file.name.endswith('.csv'):
                data = pd.read_csv(uploaded_file)
            elif uploaded_file.name.endswith(('.xlsx', '.xls')):
                data = pd.read_excel(uploaded_file)
                
            columns = data.columns.tolist()
            context['columns'] = columns
                
            data_json = data.to_json(orient='records')
            data_list = json.loads(data_json)
            context['data'] = data_list
            
            # Generate and display the figures
            figures = []
            # figures.extend(plot_all_linearities(data))
            figures.extend(correlation_matrix(data))
            figures.append(plotingLinearityMultivariables(data))
            
            # figures.append(correlation_matrix(data, 'ozone', 'bar'))  # Replace 'target_variable' with the actual variable of interest
            # figures.append(correlation_matrix(data, 'ozone', 'heatmap'))
            # Add more figure generation and display here if needed
            
            # Convert figures to base64-encoded strings
            # encoded_figures = []
            # for fig in figures:
            #     buffer = io.BytesIO()
            #     fig.savefig(buffer, format='png')
            #     buffer.seek(0)
            #     img_base64 = base64.b64encode(buffer.getvalue()).decode()
            #     encoded_figures.append(img_base64)
            
            context['figures'] = figures
    else :
        context = {'column': None, 'data': None}
    return render(request, 'klaen/eda.html', context)

def plotingLinearityMultivariables(data):
    if 'timestamp' in data.columns:
        data = data.drop('timestamp', axis=1)
    # Determine the number of rows for subplots based on the number of y variables
    rows = len(data.columns) - 1  # Exclude the x variable

    # Create a subplot figure
    fig = make_subplots(rows=rows, cols=1, subplot_titles=[f'{data.columns[0]} vs {y}' for y in data.columns[1:]])

    # Add a scatter plot for each y variable
    for i, y in enumerate(data.columns[1:], start=1):
        # Create a scatter plot with trendline for each pair of variables
        scatter_with_trendline = px.scatter(data, x=data.columns[0], y=y, trendline="ols")

        # Extract the data for scatter and trendline
        scatter_trace = scatter_with_trendline['data'][0]
        trendline_trace = scatter_with_trendline['data'][1]

        # Add the scatter trace
        fig.add_trace(
            go.Scatter(x=scatter_trace['x'], y=scatter_trace['y'], mode='markers', name=f'{data.columns[0]} vs {y}'),
            row=i, col=1
        )

        # Add the trendline trace
        fig.add_trace(
            go.Scatter(x=trendline_trace['x'], y=trendline_trace['y'], mode='lines', name=f'Trendline - {y}'),
            row=i, col=1
        )

        # Add a trendline using OLS
        # You might need to add your method of calculating or fitting the OLS trendline here

    # Update layout if needed
    fig.update_layout(height=300*rows, title_text=f'Linearity plots for {data.columns[0]} with multiple variables')

    # Convert the figure to a base64-encoded string
    buffer = io.BytesIO()
    fig.write_image(buffer, format='png')
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.getvalue()).decode()

    return img_base64

def plot_all_linearities(data):
    columns = data.columns
    if 'timestamp' in columns:
        columns = columns.drop('timestamp')  # Remove the 'timestamp' column
        figures = []
    for i in range(len(columns)):
        for j in range(i+1, len(columns)):
            x = data[columns[i]]  # Assuming the columns are already in the correct data type
            y = data[columns[j]]  # Assuming the columns are already in the correct data type
            fig, ax = plt.subplots()
            ax.scatter(x, y)
            ax.set_xlabel(columns[i])
            ax.set_ylabel(columns[j])
            figures.append(fig)
    return figures

def correlation_matrix(data):
    data['timestamp'] = pd.to_datetime(data['timestamp'])
    data.set_index('timestamp', inplace=True)
    
    # Calculate correlation matrix
    corr = data.corr()
    
    # Prepare a list to collect figures
    figures = []
    
    # Plot heatmap of correlation matrix
    plt.figure(figsize=(10, 8))
    sns.heatmap(corr, annot=True, fmt=".2f")
    plt.title('Correlation Matrix Heatmap')
    fig = plt.gcf()
    figures.append(fig)
    plt.close(fig)  # Close the figure to prevent it from displaying inline if using Jupyter
    
    # Plot bar chart for each variable's correlation with others
    # Note: This approach simplifies the interpretation but differs from directly plotting corr as a bar chart.
    for column in corr.columns:
        plt.figure(figsize=(10, 6))
        corr[column].drop(column).plot(kind='bar')  # Exclude self-correlation
        plt.title(f'Correlation of {column} with other variables')
        plt.ylabel('Correlation coefficient')
        fig = plt.gcf()
        figures.append(fig)
        plt.close(fig)  # Close the figure to prevent it from displaying inline if using Jupyter
    
    # Convert the figures to base64-encoded strings
    encoded_figures = []
    for fig in figures:
        buffer = io.BytesIO()
        fig.savefig(buffer, format='png', bbox_inches="tight")  # Use bbox_inches="tight" to fit the layout
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.getvalue()).decode()
        encoded_figures.append(img_base64)
    
    return encoded_figures

def indoorBuildthingUpdated(request, start_date=None, end_date=None, array_filter=None, resample=None):
    start_date = request.GET.get('start_date')
    if(start_date):
        start_date = datetime.strptime(start_date, '%Y-%m-%dT%H:%M:%S')
        # print(type(start_date))
    else :
        date_start = datetime.now() - timedelta(days=30)
        start_date = date_start.strftime("%Y-%m-%dT%H:%M:%S")
        start_date = datetime.strptime(start_date, '%Y-%m-%dT%H:%M:%S')
    end_date = request.GET.get('end_date')
    if(end_date):
        end_date = datetime.strptime(end_date, '%Y-%m-%dT%H:%M:%S')
    else :
        date_end = datetime.now()
        end_date = date_end.strftime("%Y-%m-%dT%H:%M:%S")
        end_date = datetime.strptime(end_date, '%Y-%m-%dT%H:%M:%S')
        # print(type(end_date), end_date)
        
    array_filter = request.GET.get('array_filter')
    resample = request.GET.get('resample')
    print('request',start_date, end_date, array_filter, resample)
    try:
        # Create a query dictionary
        query = {}
        if start_date and end_date:
            query['Time'] = {'$gte': start_date.isoformat(), '$lte': end_date.isoformat()}
        elif start_date:
            query['Time'] = {'$gte': start_date.isoformat()}
        elif end_date:
            query['Time'] = {'$lte': end_date.isoformat()}
        
        # Fetch documents from the collection
        documents = list(buildthing_data_collection.find(
            # {"Time": {"$gte": start_date, "$lte": end_date} if start_date and end_date else {}},
            query,
            # skip_Nan
            # projection=projection
        ).sort("Time", -1))
        
        if documents:
        
            df = pd.DataFrame(documents)
            # df = df.dropna(subset=['IAQ Score', 'PM 10', 'PM 2.5', 'PM 1.0', 'CO2', 'TVOC', 'Temperature', 'Humidity', 'status'])
            df = df.rename(columns={'IAQ Score':'iaq'})  # Rename 'Time' to 'timestamp'
            df = df[['Time', 'iaq', 'PM10', 'PM25', 'PM10', 'PM1','CO2', 'TVOC', 'Temperature', 'Humidity']]
            # df = df.fillna(method='ffill')
            # Drop rows with NaN values in specific columns
            df.set_index('Time', inplace=True)
            df.index = pd.to_datetime(df.index)

        
        # Resample data if needed
        if resample:
            # Resample data
            if resample == 'yearly':
                df = df.resample('Y').mean().round(2)
            elif resample == 'monthly':
                df = df.resample('M').mean().round(2)
            elif resample == 'weekly':
                df = df.resample('W').mean().round(2)
            elif resample == 'daily':
                df = df.resample('D').mean().round(2)
            elif resample == 'hourly':
                df = df.resample('H').mean().round(2)
            
            df.dropna(inplace=True)

            documents = df.reset_index().to_dict('records')
     
        response_data = {
            # 'total_rows': num_documents,
            # 'size_in_mb':size_in_mb,
            'data': documents,
        }

        # Pass the response_data to JsonResponse
        return JsonResponse(response_data, safe=False)
    except Exception as e:
        # Handle any exceptions that may occur
        return JsonResponse({'error': str(e)}, status=500) 
    
# Plalion Sensor Data 
def indoorPlalionData(request, start_date=None, end_date=None, resample=None):
    if request.method == 'GET':
        # Extract parameters from request
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        resample = request.GET.get('resample', None)

        # Convert start_date and end_date to datetime objects
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%dT%H:%M')
        else :
            date_start = datetime.now() - timedelta(days=30)
            date_start = date_start.strftime("%Y-%m-%dT%H:%M")
            start_date = datetime.strptime(date_start, '%Y-%m-%dT%H:%M')
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%dT%H:%M')
        else :
            date_end = datetime.now()
            date_end = date_end.strftime("%Y-%m-%dT%H:%M")
            end_date = datetime.strptime(date_end, '%Y-%m-%dT%H:%M')


        # Create a query dictionary
        query = {}
        if start_date and end_date:
            query['timestamp'] = {'$gte': start_date, '$lte': end_date}
        elif start_date:
            query['timestamp'] = {'$gte': start_date}
        elif end_date:
            query['timestamp'] = {'$lte': end_date}
            
        documents = plalion_data_collection.find(query,{'_id':0}).sort('timestamp', DESCENDING)

        # Convert data_list to a pandas DataFrame for resampling
    if documents:
        df = pd.DataFrame(documents)
        # Ensure 'timestamp' column is in datetime format for resampling
        df['timestamp'] = pd.to_datetime(df['timestamp'])

        # Set 'timestamp' as the index
        df.set_index('timestamp', inplace=True)

        # Dictionary to map resampling frequency to pandas offset aliases
        resample_frequencies = {
            'minute': 'T',
            'hourly': 'h',
            'daily': 'D',
            'weekly': 'W',
            'monthly': 'M'
        }

        # Check if resample parameter is provided and valid
        if resample and resample in resample_frequencies:
            # Resample DataFrame based on the specified frequency
            resampled_df = df.resample(resample_frequencies[resample]).mean().round(2)  # Adjust aggregation method if needed
            
            # resampled_df.dropna(inplace=True)

            # Convert resampled DataFrame back to list of dictionaries
            # resampled_data_list = resampled_df.reset_index().to_dict(orient='records')
            resampled_data_list_dropna = resampled_df.dropna().reset_index().to_dict(orient='records')
        else:
             resampled_data_list_dropna = resampled_df.dropna().reset_index().to_dict(orient='records')
        response_data = {'data' : resampled_data_list_dropna}  # Update response data with resampled data
    else:
        # No documents found, return an appropriate response
        return JsonResponse({"message": "No documents found"}, status=404)

    # Return the data as a JSON response
    return JsonResponse(response_data, safe=False)

def indoorPlalionDataCompany(request, start_date=None, end_date=None, resample=None):
    if request.method == 'GET':
        # Extract parameters from request
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        resample = request.GET.get('resample', None)

        # Convert start_date and end_date to datetime objects
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%dT%H:%M')
        else :
            date_start = datetime.now() - timedelta(days=30)
            date_start = date_start.strftime("%Y-%m-%dT%H:%M")
            start_date = datetime.strptime(date_start, '%Y-%m-%dT%H:%M')
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%dT%H:%M')
        else :
            date_end = datetime.now()
            date_end = date_end.strftime("%Y-%m-%dT%H:%M")
            end_date = datetime.strptime(date_end, '%Y-%m-%dT%H:%M')


        # Create a query dictionary
        query = {}
        if start_date and end_date:
            query['timestamp'] = {'$gte': start_date, '$lte': end_date}
        elif start_date:
            query['timestamp'] = {'$gte': start_date}
        elif end_date:
            query['timestamp'] = {'$lte': end_date}
            
        documents = plalion_company_data_collection.find(query,{'_id':0}).sort('timestamp', DESCENDING)

        # Convert data_list to a pandas DataFrame for resampling
    if documents:
        df = pd.DataFrame(documents)
        
        df = df[['timestamp', 'ozone', 'dust', 'co2', 'voc', 'temperature', 'humidity', 'serial_number', 'last_time']]
        df_serial_number = df['serial_number'].unique().tolist()
        
        # Ensure 'timestamp' column is in datetime format for resampling
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df['last_time'] = pd.to_datetime(df['last_time'])
        
        # Set 'timestamp' as the index
        df.set_index('timestamp', inplace=True)

        # Dictionary to map resampling frequency to pandas offset aliases
        resample_frequencies = {
            'minute': 'T',
            'hourly': 'h',
            'daily': 'D',
            'weekly': 'W',
            'monthly': 'M'
        }
        
        resampled_data_by_serial_number = {}
        
        for serial_number in df_serial_number:
            df_serial = df[df['serial_number'] == serial_number]
            if resample and resample in resample_frequencies:
                df_serial_numeric = df_serial.drop(columns=['serial_number', 'last_time'])
                # Resample DataFrame based on the specified frequency
                resampled_df = df_serial_numeric.resample(resample_frequencies[resample]).mean().round(2) 
                # resampled_df.dropna()
                # resampled_data_list = resampled_df.reset_index().to_dict(orient='records')
                resampled_data_list_dropna = resampled_df.dropna().reset_index().to_dict(orient='records')
                
                resampled_data_by_serial_number[serial_number] = resampled_data_list_dropna

        # Check if resample parameter is provided and valid
        # if resample and resample in resample_frequencies:
          
        #     resampled_df = df.resample(resample_frequencies[resample]).mean()  # Adjust aggregation method if needed
            
        #     resampled_df.dropna(inplace=True)

        #     # Convert resampled DataFrame back to list of dictionaries
        #     resampled_data_list = resampled_df.reset_index().to_dict(orient='records')
        # else:
        #     resampled_data_list = df.reset_index().to_dict(orient='records')

        response_data = {'data' : resampled_data_by_serial_number, 'serial_number': df_serial_number}  # Update response data with resampled data
    else:
        # No documents found, return an appropriate response
        return JsonResponse({"message": "No documents found"}, status=404)

    # Return the data as a JSON response
    return JsonResponse(response_data, safe=False)

def indoorPlalionDataCompanyPerSN(request):
    if request.method == 'GET':
        start_date = request.GET.get('start_date', None)
        end_date = request.GET.get('end_date', None)
        resample = request.GET.get('resample', 'daily')
        serial_number = request.GET.get('serial_number', None)

        try:
            if start_date:
                start_date = datetime.strptime(start_date, '%Y-%m-%dT%H:%M')
            else:
                start_date = datetime.now() - timedelta(days=30)

            if end_date:
                end_date = datetime.strptime(end_date, '%Y-%m-%dT%H:%M')
            else:
                end_date = datetime.now()
        except ValueError as e:
            return JsonResponse({"message": "Invalid date format", "error": str(e)}, status=400)

        query = {}
        query2 = {}
        if start_date and end_date:
            query['timestamp'] = {'$gte': start_date, '$lte': end_date}
            query2['timestamp'] = {'$gte': start_date, '$lte': end_date}
        
        if serial_number is not None and serial_number != '':
            print('serial_number',serial_number, type(serial_number))
            query['serial_number'] = serial_number
            documents = plalion_company_data_collection.find(query, {'_id': 0}).sort('timestamp', DESCENDING)

        else:
            print('call all of data', serial_number)
            documents = plalion_company_data_collection.find(query, {'_id': 0}).sort('timestamp', DESCENDING)


        documents2 = plalion_company_data_collection.find(query2, {'_id': 0}).sort('timestamp', DESCENDING)
        # Convert the cursor to a pandas DataFrame
        
        if documents.count() > 0:
            df = pd.DataFrame(list(documents))
            df2 = pd.DataFrame(list(documents2)) 
             # Group by serial number and aggregate the minimum and maximum timestamps
            serial_number_date_ranges = df2.groupby('serial_number')['timestamp'].agg(['min', 'max']).reset_index()

            # Rename columns for clarity
            serial_number_date_ranges.columns = ['serial_number', 'start_date', 'end_date']

            # Convert timestamps to datetime objects if necessary
            serial_number_date_ranges['start_date'] = pd.to_datetime(serial_number_date_ranges['start_date'])
            serial_number_date_ranges['end_date'] = pd.to_datetime(serial_number_date_ranges['end_date'])

            # Convert DataFrame to a list of dictionaries
            serial_number_date_ranges = serial_number_date_ranges.to_dict('records')
            
            df2 = df2.dropna(subset=['serial_number'])   
            df_serial_number = df2['serial_number'].unique().tolist()

            # Ensure columns exist to avoid KeyError
            required_columns = ['timestamp', 'ozone', 'dust', 'co2', 'voc', 'temperature', 'humidity', 'serial_number', 'last_time']
            for column in required_columns:
                if column not in df.columns:
                    df[column] = None

            df = df.dropna(subset=required_columns)
           
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df['last_time'] = pd.to_datetime(df['last_time'])
            df.set_index('timestamp', inplace=True)

             # Dictionary to map resampling frequency to pandas offset aliases
            resample_frequencies = {
                'minute': 'T',
                'hourly': 'h',
                'daily': 'D',
                'weekly': 'W',
                'monthly': 'M'
            }
            
            # Check if resample parameter is provided and valid
            if resample and resample in resample_frequencies:
                # Resample DataFrame based on the specified frequency
                if serial_number is not None and serial_number != '':
                    df_numerical = df.drop(columns=['serial_number','last_time'])
                else :
                    df_numerical = df.drop(columns=['serial_number','last_time', 'serial_num'])
                print('df_numerical',df_numerical)
                resampled_df = df_numerical.resample(resample_frequencies[resample]).mean().round(2)  # Adjust aggregation method if needed
                resampled_df.dropna(inplace=True)
                # Convert resampled DataFrame back to list of dictionaries
                resampled_data_list = resampled_df.reset_index().to_dict(orient='records')
            else:
                resampled_data_list = df.reset_index().to_dict(orient='records')

            response_data = {'data' : resampled_data_list, 'serial_number':df_serial_number, 'date_range':serial_number_date_ranges}  # Update response data with resampled data
        else:
            # No documents found, return an appropriate response
            return JsonResponse({"message": "No documents found"}, status=404)

        # Return the data as a JSON response
        return JsonResponse(response_data, safe=False)

# def indoorPlalionDataCompanyPerSN(request, start_date=None, end_date=None, resample=None, serial_number=None):
#     if request.method == 'GET':
#         # Extract parameters from request
#         start_date = request.GET.get('start_date')
#         end_date = request.GET.get('end_date')
#         resample = request.GET.get('resample', None)

#         # Convert start_date and end_date to datetime objects
#         if start_date:
#             start_date = datetime.strptime(start_date, '%Y-%m-%dT%H:%M')
#         else :
#             date_start = datetime.now() - timedelta(days=30)
#             date_start = date_start.strftime("%Y-%m-%dT%H:%M")
#             start_date = datetime.strptime(date_start, '%Y-%m-%dT%H:%M')
#         if end_date:
#             end_date = datetime.strptime(end_date, '%Y-%m-%dT%H:%M')
#         else :
#             date_end = datetime.now()
#             date_end = date_end.strftime("%Y-%m-%dT%H:%M")
#             end_date = datetime.strptime(date_end, '%Y-%m-%dT%H:%M')


#         # Create a query dictionary
#         query = {}
#         if start_date and end_date:
#             query['timestamp'] = {'$gte': start_date, '$lte': end_date}
#         elif start_date:
#             query['timestamp'] = {'$gte': start_date}
#         elif end_date:
#             query['timestamp'] = {'$lte': end_date}
        
#         if serial_number is not None:
#             query['serial_num'] = serial_number
#             print('query',query)
#         # query['serial_num'] = serial_number
            
#         documents = plalion_company_data_collection.find(query,{'_id':0}).sort('timestamp', DESCENDING)

#         # Convert data_list to a pandas DataFrame for resampling
#     if documents:
#         df = pd.DataFrame(documents)
        
#         df = df[['timestamp', 'ozone', 'dust', 'co2', 'voc', 'temperature', 'humidity', 'serial_number', 'last_time']]
#         ## Filter by serial number
#         df = df.dropna()
        
#         df_serial_number = df['serial_number'].unique().tolist()
#         # df = df[df['serial_number'] == serial_number]
       
#         # Ensure 'timestamp' column is in datetime format for resampling
#         df['timestamp'] = pd.to_datetime(df['timestamp'])
#         df['last_time'] = pd.to_datetime(df['last_time'])
        
#         # Set 'timestamp' as the index
#         df.set_index('timestamp', inplace=True)

#         # Dictionary to map resampling frequency to pandas offset aliases
#         resample_frequencies = {
#             'minute': 'T',
#             'hourly': 'h',
#             'daily': 'D',
#             'weekly': 'W',
#             'monthly': 'M'
#         }
        
#          # Check if resample parameter is provided and valid
#         if resample and resample in resample_frequencies:
#             # Resample DataFrame based on the specified frequency
#             df_numerical = df.drop(columns=['serial_number', 'last_time'])
#             resampled_df = df_numerical.resample(resample_frequencies[resample]).mean().round(2)  # Adjust aggregation method if needed
            
#             resampled_df.dropna(inplace=True)

#             # Convert resampled DataFrame back to list of dictionaries
#             resampled_data_list = resampled_df.reset_index().to_dict(orient='records')
#         else:
#             resampled_data_list = df.reset_index().to_dict(orient='records')

#         response_data = {'data' : resampled_data_list, 'serial_number':df_serial_number}  # Update response data with resampled data
#     else:
#         # No documents found, return an appropriate response
#         return JsonResponse({"message": "No documents found"}, status=404)

#     # Return the data as a JSON response
#     return JsonResponse(response_data, safe=False)

def get_sensor_data_updated(request, start_date=None, end_date=None, resample=None):
    if request.method == 'GET':
        # Extract parameters from request
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        resample = request.GET.get('resample', None)

        # Convert start_date and end_date to datetime objects
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%dT%H:%M')
        else :
            date_start = datetime.now() - timedelta(days=30)
            date_start = date_start.strftime("%Y-%m-%dT%H:%M")
            start_date = datetime.strptime(date_start, '%Y-%m-%dT%H:%M')
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%dT%H:%M')
        else :
            date_end = datetime.now()
            date_end = date_end.strftime("%Y-%m-%dT%H:%M")
            end_date = datetime.strptime(date_end, '%Y-%m-%dT%H:%M')


        # Create a query dictionary
        query = {}
        if start_date and end_date:
            query['timestamp'] = {'$gte': start_date, '$lte': end_date}
        elif start_date:
            query['timestamp'] = {'$gte': start_date}
        elif end_date:
            query['timestamp'] = {'$lte': end_date}
        
        documents = sensor_data_collection.find(query, {'_id':0}).sort('timestamp', DESCENDING)
        # Convert data_list to a pandas DataFrame for resampling
    if documents:
        df = pd.DataFrame(documents)
        df_filter = df.dropna()
       # Ensure 'timestamp' column is in datetime format for resampling
        df_filter['timestamp'] = pd.to_datetime(df_filter['timestamp'])
        

        # Set 'timestamp' as the index
        df_filter.set_index('timestamp', inplace=True)
        
        # Dictionary to map resampling frequency to pandas offset aliases
        resample_frequencies = {
            'minute': 'T',
            'hourly': 'h',
            'daily': 'D',
            'weekly': 'W',
            'monthly': 'M'
        }

        # Check if resample parameter is provided and valid
        if resample and resample in resample_frequencies:
            # Resample DataFrame based on the specified frequency
            resampled_df = df_filter.resample(resample_frequencies[resample]).mean().round(2)  # Adjust aggregation method if needed

            # Convert resampled DataFrame back to list of dictionaries
            # resampled_data_list = resampled_df.reset_index().to_dict(orient='records')
            resampled_data_list_dropna = resampled_df.dropna().reset_index().to_dict(orient='records')
            
        else:
            resampled_data_list = df_filter.reset_index().to_dict(orient='records')

        response_data = {'data' : resampled_data_list_dropna}  # Update response data with resampled data
    else:
        # No documents found, return an appropriate response
        return JsonResponse({"message": "No documents found"}, status=404)

    # Return the data as a JSON response
    return JsonResponse(response_data, safe=False)

# weather data 
def ug_per_m3_to_ppm(ozone_ug_per_m3):
    # Constants
    molecular_weight_ozone = 48.0  # Molecular weight of ozone in g/mol
    volume_at_stp = 0.0224  # Volume of 1 mole of gas at STP in m³/mol
    
    # Conversion formula
    ozone_ppm = ozone_ug_per_m3 / (molecular_weight_ozone * volume_at_stp * 1000.0)
    ozone_ppm2 = (24.45 * ozone_ug_per_m3 / 48.0) / 1000.0
    
    return {'ppm1':ozone_ppm,'ppm2':ozone_ppm2}

def extract_weather_info(json_str):
    try:
        if isinstance(json_str, dict):
            parsed_data = json_str
        else:
            parsed_data = json.loads(json_str)

        current_data = parsed_data['current']
        air_quality = current_data['air_quality']
        o3_ppm = ug_per_m3_to_ppm(air_quality['o3'])
        
        return {
            'co': air_quality['co'],
            'no2': air_quality['no2'],
            'o3': o3_ppm['ppm1'],
            'o3_ppm': o3_ppm['ppm2'],
            'o3_ug/m3': air_quality['o3'], # For reference only
            'so2': air_quality['so2'],
            'pm2_5': air_quality['pm2_5'],
            'pm10': air_quality['pm10'],
            'cloud': current_data['cloud'],
            'temperature_c': current_data['temp_c'],
            'humidity_o': current_data['humidity'],
            'uv_index': current_data['uv'],
            'timestamp': current_data['last_updated'],
            'wind': current_data['wind_kph'],
        }
    except (json.JSONDecodeError, KeyError) as e:
        # Handle invalid JSON or missing keys gracefully (e.g., return None)
        return None

        

def displayDataFromAPIUpdated(request, start_date=None, end_date=None, resample=None):
    # Connect to MongoDB
    if request.method == 'GET':
        # Extract parameters from request
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        array_filter = request.GET.get('array_filter', None)
        resample = request.GET.get('resample', None)

        # Convert start_date and end_date to datetime objects
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%dT%H:%M')
        else :
            date_start = datetime.now() - timedelta(days=30)
            date_start = date_start.strftime("%Y-%m-%dT%H:%M")
            start_date = datetime.strptime(date_start, '%Y-%m-%dT%H:%M')
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%dT%H:%M')
        else :
            date_end = datetime.now()
            date_end = date_end.strftime("%Y-%m-%dT%H:%M")
            end_date = datetime.strptime(date_end, '%Y-%m-%dT%H:%M')


        # Create a query dictionary
        query = {}
        if start_date and end_date:
            query['timestamp'] = {'$gte': start_date, '$lte': end_date}
        elif start_date:
            query['timestamp'] = {'$gte': start_date}
        elif end_date:
            query['timestamp'] = {'$lte': end_date}
            
        # Create a projection dictionary
        projection = {}
        if array_filter:
            fields = array_filter.split(',')  # Assuming array_filter is a comma-separated string
            for field in fields:
                projection[field] = 1

        # Fetch documents from the collection
        documents = weather_data_collection.find(query, {'_id':0}).sort('timestamp', DESCENDING)

        total_rows = weather_data_collection.count_documents(query)
        collection_stats = db.command('collStats', 'weather_api')
        size_in_mb = collection_stats['size'] / (1024 * 1024)

        # Initialize a list to store the data
        data_list = []

        # Iterate over the documents
        for document in documents:
            # Access the "data" field in the document
            data = document.get("data")
            data = extract_weather_info(data)
            
            if data:
                # Check if the timestamp is within the specified start_date and end_date
                if start_date and end_date:
                    data_timestamp = datetime.strptime(data['timestamp'], '%Y-%m-%d %H:%M')
                    start_date_formatted = start_date.strftime('%Y-%m-%d %H:%M')
                    end_date_formatted = end_date.strftime('%Y-%m-%d %H:%M')
                    if datetime.strptime(start_date_formatted, '%Y-%m-%d %H:%M') <= data_timestamp <= datetime.strptime(end_date_formatted, '%Y-%m-%d %H:%M'):
                        data_list.append(data)
               
        response_data = {
            'data': data_list,
            'total_rows': total_rows,
            'size_in_mb': size_in_mb
        }

        # Convert data_list to a pandas DataFrame for resampling
    if data_list:
        df = pd.DataFrame(data_list)
        # Ensure 'timestamp' column is in datetime format for resampling
        df['timestamp'] = pd.to_datetime(df['timestamp'])

        # Set 'timestamp' as the index
        df.set_index('timestamp', inplace=True)

        # Dictionary to map resampling frequency to pandas offset aliases
        resample_frequencies = {
            'minute': 'T',
            'hourly': 'h',
            'daily': 'D',
            'weekly': 'W',
            'monthly': 'M'
        }

        # Check if resample parameter is provided and valid
        if resample and resample in resample_frequencies:
            # Resample DataFrame based on the specified frequency
            resampled_df = df.resample(resample_frequencies[resample]).mean().round(2)  # Adjust aggregation method if needed

            # Convert resampled DataFrame back to list of dictionaries
            # resampled_data_list = resampled_df.reset_index().to_dict(orient='records')
            resampled_data_list_dropna = resampled_df.dropna().reset_index().to_dict(orient='records')
        else:
            resampled_data_list_dropna = resampled_df.dropna().reset_index().to_dict(orient='records')
            
        response_data['data'] = resampled_data_list_dropna  # Update response data with resampled data
    else:
        # No documents found, return an appropriate response
        return JsonResponse({"message": "No documents found"}, status=404)

    # Return the data as a JSON response
    # print(json.dumps(response_data, indent=2, default=str))
    return JsonResponse(response_data, safe=False)
   

# download function 
def downloadDataByType(request):
    data = request.GET.get('data')
    type = request.GET.get('type')  # Fetch 'type' query parameter
    filename = request.GET.get('filename') 
    if data:
            # Create a DataFrame from the MongoDB data
        df = pd.DataFrame(data)
        if type == 'csv':
                # Create a CSV response
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="mongodb_data_{filename}.csv"'

                # Export DataFrame to CSV and write it to the response
            df.to_csv(response, index=False)

            return response
            
        elif type == 'excel':
            response = HttpResponse(content_type='application/ms-excel')
            response['Content-Disposition'] = f'attachment; filename="mongodb_data_{filename}.xlsx"'
            df.to_excel(response, index=False)
        return response
    else:
        return HttpResponse(f"No {type} data to export", content_type='text/plain')

# Plalion Klaen Sensor 
class PlalionSensorDataView(APIView):
    def post(self, request, format=None):
        data = request.data

        # Create a new SensorData instance
        sensor_data = PlalionSensorData.objects.create(
            temperature=data['temp'],
            humidity=data['hum'],
            ozone=data['ozone'],
            dust=data['dust'],
            co2=data['co2'],
            voc = data['voc'],
            timestamp=timezone.now()  # Use timezone-aware datetime
        )

        # Convert to the desired timezone (UTC+9 for South Korea)
        target_timezone = pytz.timezone('Asia/Seoul')
        converted_datetime = sensor_data.timestamp.astimezone(target_timezone)
        converted_datetime = converted_datetime.replace(tzinfo=None)

        # Convert Django model instance to a dictionary
        data_dict = {
            'temperature': sensor_data.temperature,
            'humidity': sensor_data.humidity,
            'ozone': sensor_data.ozone,
            'dust': sensor_data.dust,
            'co2': sensor_data.co2,
            'voc': sensor_data.voc,
            'timestamp': converted_datetime
        }

        plalion_data_collection.insert_one(data_dict)

        return Response(data, status=status.HTTP_201_CREATED)

def plalion_fromRESTAPI(serial_number):

    print('serial_number',serial_number)

    REST_API = jungrok_url+'status/get'
    
    data = {
        "serial_num": serial_number,
    }
    
    headers = {
        "Content-Type":"application/json"
    }
    
    # latest_datas = PlalionSensorCompanyData.objects.all()
    # print('latest_data', latest_datas)

    try:
        latest_data = PlalionSensorCompanyData.objects.filter(serial_num=serial_number).latest('timestamp')
        print('latest_data', latest_data.serial_num)
        if latest_data is not None:
            latest_timestamp = latest_data.last_time
            print('latest_timestamp of', serial_number, latest_timestamp)
        else :
            print('new timestamp')
            latest_timestamp = timezone.now()
    except Exception as e:
        print('No existing data, storing new entry')
        # latest_data_dict = {field.name: getattr(latest_data, field.name) for field in
        #                     PlalionSensorCompanyData._meta.fields}
        # plalion_company_data_collection.insert_one(latest_data_dict)
        latest_timestamp = timezone.now()

    response = requests.post(REST_API, data=json.dumps(data), headers=headers)
    # print('response',response.status_code)
    
    if response.status_code == 200:
        response_data = response.json()
        rows = response_data.get("rows",[])
        
        if rows:
            row = rows[0]
        # Create a new SensorData instance
            sensor_data = PlalionSensorCompanyData.objects.create(
                temperature=row['temp_val'],
                humidity=row['humi_val'],
                ozone=row['ozone_val'],
                dust=row['dust_val'],
                co2=row['co2_val'],
                voc = row['voc_val'],
                serial_num = row['serial_num'],
                active = row['active'],
                m_enable = row['m_enable'],
                s_enable = row['s_enable'],
                last_time = row['last_time'],
                timestamp=timezone.now()  # Use timezone-aware datetime
            )

                # Convert to the desired timezone (UTC+9 for South Korea)
            target_timezone = pytz.timezone('Asia/Seoul')
            converted_datetime = sensor_data.timestamp.astimezone(target_timezone)
            converted_datetime = converted_datetime.replace(tzinfo=None)

        # Convert Django model instance to a dictionary
            data_dict = {
                'temperature': sensor_data.temperature,
                'humidity': sensor_data.humidity,
                'ozone': sensor_data.ozone,
                'dust': sensor_data.dust,
                'co2': sensor_data.co2,
                'voc': sensor_data.voc,
                'serial_number':serial_number,
                'active': sensor_data.active,
                'm_enable': sensor_data.m_enable,
                's_enable': sensor_data.s_enable,
                'last_time': sensor_data.last_time,
                'timestamp': converted_datetime
            }

            if latest_timestamp != row['last_time']:
                print('data inserted',serial_number)
                plalion_company_data_collection.insert_one(data_dict)
            else :
                print('data is not inserted', serial_number)

            return Response(data, status=status.HTTP_201_CREATED)
        
        else:
            return Response("No data from the REST API", status=status.HTTP_404_NOT_FOUND)
    
    else:
        return Response("Failed to fetch data from the REST API", status=status.HTTP_500_INTERNAL_SERVER_ERROR)    


# ============================= Schedule / Real Time =======================================
def schedule_data_fetch():
    
    while True:
        print('fetching data')
        for serial_number in ['8551576','8546512','8545944','8546492', '8545932']:

            plalion_fromRESTAPI(serial_number)
        # plalion_fromRESTAPI("8546512")
        # print('print out')
        time.sleep(60*1)
      

# Start a new thread to run the schedule_data_fetch function
data_fetch_thread = threading.Thread(target=schedule_data_fetch)
data_fetch_thread.start()