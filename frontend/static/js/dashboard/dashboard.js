const API_URL = window.location.origin;

function pm10Chart1(type){
    var ctx = document.getElementById("myAreaChart");
    var dataset = new Array();
    var humdata = new Array();
    var tempdata = new Array();
    var dustdata = new Array();
    var labels = new Array();
    var timestamps = new Array();
    var backgroundColor = [
      'rgba(245, 238, 248)',
      'rgba(215, 189, 226)',
      'rgba(169, 204, 227)',
      'rgba(127, 179, 213)',
      'rgba(163, 228, 215)',
      'rgba(118, 215, 196)',
      'rgba(171, 235, 198)',
      'rgba(130, 224, 170)',
      'rgba(249, 231, 159)',
      'rgba(248, 196, 113)',
    ];
    var borderColor = [
      'rgba(245, 238, 248)',
      'rgba(215, 189, 226)',
      'rgba(169, 204, 227)',
      'rgba(127, 179, 213)',
      'rgba(163, 228, 215)',
      'rgba(118, 215, 196)',
      'rgba(171, 235, 198)',
      'rgba(130, 224, 170)',
      'rgba(249, 231, 159)',
      'rgba(248, 196, 113)',
    ];
    $.ajax({
        url:  "/sensor/dust/data/",
        method: 'GET',
        dataType: 'json',
        async: false,
        contentType: 'application/json',
        processData: false,
        success: function(result) {
            for (var i = 0; i < result.length; i++) {
                humdata.push(result[i].humidity);
                tempdata.push(result[i].temperature);
                dustdata.push(result[i].dustDensity);

                timestamps.push(result[i].timestamp);
            }

            dataset.push({
                    backgroundColor: "pink",
                    label: "humidity",
                    responsive: true,
                    pointRadius: 0,
                    data: humdata,
                    borderWidth: 3,
                    borderColor: "pink",
            });

            dataset.push({
                    backgroundColor: "lightblue",
                    label: "temperature",
                    responsive: true,
                    pointRadius: 0,
                    data: tempdata,
                    borderWidth: 3,
                    borderColor: "lightblue",
            });

            dataset.push({
                    backgroundColor: "lightgreen",
                    label: "dust",
                    responsive: true,
                    pointRadius: 0,
                    data: dustdata,
                    borderWidth: 3,
                    borderColor: "lightgreen",
            });

            const config = new Chart(ctx, {
                type: type,
                data: {
                    labels: timestamps,
                    datasets: dataset
                },
                options: {
                    scales: {
                          y: {
                                beginAtZero: true
                          }
                    },

                },
            });
        }

    });
}
function pm10Pie(){
    var ctx = document.getElementById("myPieChart");
    var dataset = new Array();
    var data = new Array();
    var labels = new Array();
    var backgroundColor = [
      'rgba(245, 238, 248)',
      'rgba(215, 189, 226)',
      'rgba(169, 204, 227)',
      'rgba(127, 179, 213)',
      'rgba(163, 228, 215)',
      'rgba(118, 215, 196)',
      'rgba(171, 235, 198)',
      'rgba(130, 224, 170)',
      'rgba(249, 231, 159)',
      'rgba(248, 196, 113)',
    ];
    var borderColor = [
      'rgba(245, 238, 248)',
      'rgba(215, 189, 226)',
      'rgba(169, 204, 227)',
      'rgba(127, 179, 213)',
      'rgba(163, 228, 215)',
      'rgba(118, 215, 196)',
      'rgba(171, 235, 198)',
      'rgba(130, 224, 170)',
      'rgba(249, 231, 159)',
      'rgba(248, 196, 113)',
    ];
    $.ajax({
        url:  "/scheduler/time/",
        method: 'GET',
        dataType: 'json',
        async: false,
        contentType: 'application/json',
        processData: false,
        success: function(result) {

            result = result['data']
            for (var i = 0; i < result.length; i++) {
                data.push(result[i].pm10);
                labels.push(result[i].site);
            }

            dataset.push({
                    backgroundColor: backgroundColor,
                    responsive: true,
                    pointRadius: 0,
                    borderColor:borderColor,
                    data: data,
                    borderWidth: 1
            });
            const config = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels:labels,
                    datasets: dataset
                },
                options: {
                maintainAspectRatio: false,
                tooltips: {
                  backgroundColor: "rgb(255,255,255)",
                  bodyFontColor: "#858796",
                  borderColor: '#dddfeb',
                  borderWidth: 1,
                  xPadding: 15,
                  yPadding: 15,
                  displayColors: false,
                  caretPadding: 10,
                },
                legend: {
                  display: false
                },
                cutoutPercentage: 80,
              },
            });
        }
    });

}

let statusLabel = '';
let isLoading = true;

      // Loading Sweet Alert 
      const showLoading = function(statusLabel) {
        // Use SweetAlert2 to show loading indicator
        Swal.fire({
          title: 'Now '+statusLabel,
          allowEscapeKey: false,
          allowOutsideClick: false,
          didOpen: () => { // Updated to didOpen for SweetAlert2
            Swal.showLoading(); // Use Swal.showLoading() on the Swal instance
          },
        //   timer: 2000,
        })
      };

      const errorAlert = function() {
        // Use SweetAlert2 to show loading indicator
           Swal.fire({
              title: 'No Data!',
              icon: 'error', // Updated to icon for SweetAlert2
              timer: 2000,
              showConfirmButton: false
            });
        }
    
    async function fetchArduinoSensorData(start_date,end_date,resample, sensorChart) {
        statusLabel = 'Loading for Arduino Chart';
        showLoading(statusLabel);
        
        const apiUrl = `${API_URL}/klaen/api/get-sensor-data-updated/?start_date=${start_date}&end_date=${end_date}&resample=${resample}`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            Swal.close();
            return data.data; // Adjust according to the actual structure of your response
        } catch (error) {
            errorAlert('No Data!');
            console.error("Could not fetch sensor data: ", error);
            return null;
        }
    }
    
    async function fetchBuildthingSensorData(start_date,end_date,array_filter,resample) {
        console.log('buildthing--', start_date, end_date)
        statusLabel = 'Loading for Buildthing Chart';
        showLoading(statusLabel);
        const apiUrl = `${API_URL}/klaen/api/indoor-buildthing-updated/?start_date=${start_date}&end_date=${end_date}&array_filter=${array_filter}&resample=${resample}`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            Swal.close();
            return data.data; // Adjust according to the actual structure of your response
        } catch (error) {
            console.error("Could not fetch sensor data: ", error);
            Swal.close();
            errorAlert();
            return null;
        }
    }

    async function fetchOutdoorSensorData(start_date,end_date,array_filter,resample) {
        console.log('outdoor')
        statusLabel = 'Loading for Outdoor Weather Chart';
        showLoading(statusLabel);
        const apiUrl = `${API_URL}/klaen/api/display-weather-updated/?start_date=${start_date}&end_date=${end_date}&array_filter=${array_filter}&resample=${resample}`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            Swal.close();
            return data.data; // Adjust according to the actual structure of your response
        } catch (error) {
            console.error("Could not fetch sensor data: ", error);
            return 'No Data';
        }
    }

    async function fetchPlalionSensorData(start_date,end_date,resample) {
        statusLabel = 'Loading for Klaen Sensor Chart';
        showLoading(statusLabel);
        const apiUrl = `${API_URL}/klaen/api/indoor-plalion-data/?start_date=${start_date}&end_date=${end_date}&resample=${resample}`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            Swal.close();
            return data.data; // Adjust according to the actual structure of your response
        } catch (error) {
            console.error("Could not fetch sensor data: ", error);
            errorAlert('No Data!');
            return 'No Data';
        }
    }

    async function fetchPlalionCompanySensorData(start_date,end_date,resample) {
        statusLabel = 'Loading for Klaen Company Sensor Chart';
        showLoading(statusLabel);
        const apiUrl = `${API_URL}/klaen/api/indoor-plalion-company-data/?start_date=${start_date}&end_date=${end_date}&resample=${resample}`;
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            Swal.close();
            return data.data; // Adjust according to the actual structure of your response
        } catch (error) {
            console.error("Could not fetch sensor data: ", error);
            errorAlert('No Data!');
            return 'No Data';
        }
    }

    let sensorChart = null;
    async function arduinoSensor(chartType,start_date,end_date,resample) {
        console.log(chartType, resample);
       
        var ctx = document.getElementById("myAreaChart").getContext('2d');
       
        // Fetch sensor data from the API
        const sensorData =  await fetchArduinoSensorData(start_date,end_date,resample, sensorChart);
        if (!sensorData) {
            console.error("Failed to load sensor data");
            return; // Exit if no data could be fetched
        }else {

            // Example of processing the fetched sensor data
        // You need to adjust this part based on the actual structure of your data and what you want to display
        var labels = sensorData.map(data => data.timestamp);
        var humidityData = sensorData.map(data => data.humidity);
        var temperatureData = sensorData.map(data => data.temperature);
        var ozoneData = sensorData.map(data => data.ozone);
        var dustData = sensorData.map(data => data.dust);
        var deviceData = sensorData.map(data => data.device);
    
        // Create an empty array to hold the datasets
        var datasets = [];

        if (sensorChart !== null) {
            console.log(sensorChart.id)
           sensorChart.destroy();
        }

        // Assuming you want to display humidity and temperature data
        if(chartType === 'line' || chartType === 'combo') {
            datasets.push({
                label: "Humidity",
                data: humidityData,
                borderColor: "pink",
                backgroundColor: "rgba(255,192,203,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "Temperature",
                data: temperatureData,
                borderColor: "lightblue",
                backgroundColor: "rgba(173,216,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "Dust Density",
                data: dustData,
                borderColor: "green",
                backgroundColor: "rgba(173,206,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "Ozone",
                data: ozoneData,
                borderColor: "red",
                backgroundColor: "rgba(170,216,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "Location",
                data: deviceData,
                borderColor: "orange",
                backgroundColor: "rgba(73,216,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
        }

        sensorChart = new Chart(ctx, {
            type: chartType === 'combo' ? 'bar' : chartType, // Use 'bar' for combo, otherwise use the chartType
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    },
                    x: {
                        beginAtZero: true,
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    }
                },
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        display: true
                    },
                    title: {
                        display: true,
                        text: 'Sensor Data Over Time'
                    }
                }
            },
        });

        console.log('Creating Chart', sensorChart);
      
    }

        
    }

    async function klaenSensor(chartType,start_date,end_date,resample) {
        console.log(chartType, resample);
        var ctx = document.getElementById("myAreaChart").getContext('2d');
    
        // Fetch sensor data from the API
        const sensorData =  await fetchPlalionSensorData(start_date,end_date,resample);
        if (!sensorData) {
            console.error("Failed to load sensor data");
            return; // Exit if no data could be fetched
        }
    
        // Example of processing the fetched sensor data
        // You need to adjust this part based on the actual structure of your data and what you want to display
        var labels = sensorData.map(data => data.timestamp);
        var humidityData = sensorData.map(data => data.humidity);
        var temperatureData = sensorData.map(data => data.temperature);
        var ozoneData = sensorData.map(data => data.ozone);
        var dustData = sensorData.map(data => data.dust);
        var co2Data = sensorData.map(data => data.co2);
        var vocData = sensorData.map(data => data.voc);
    
        // Create an empty array to hold the datasets
        var datasets = [];
        if (chart !== null) {
           chart.destroy();
        }
    
        // Assuming you want to display humidity and temperature data
        if(chartType === 'line' || chartType === 'combo') {
            datasets.push({
                label: "Humidity",
                data: humidityData,
                borderColor: "pink",
                backgroundColor: "rgba(255,192,203,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "Temperature",
                data: temperatureData,
                borderColor: "lightblue",
                backgroundColor: "rgba(173,216,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "Dust Density",
                data: dustData,
                borderColor: "green",
                backgroundColor: "rgba(173,206,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "Ozone",
                data: ozoneData,
                borderColor: "red",
                backgroundColor: "rgba(170,216,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "CO2",
                data: co2Data,
                borderColor: "orange",
                backgroundColor: "rgba(73,216,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "VOC",
                data: vocData,
                borderColor: "black",
                backgroundColor: "rgba(173,116,130,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
        }
    
        // More chart configurations...
        // Update the rest of your chart setup here
    
        // Create the chart with the specified type and dataset
        chart = new Chart(ctx, {
            type: chartType === 'combo' ? 'bar' : chartType, // Use 'bar' for combo, otherwise use the chartType
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    },
                    x: {
                        beginAtZero: true,
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    }
                },
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        display: true
                    },
                    title: {
                        display: true,
                        text: 'Sensor Data Over Time'
                    }
                }
            },
        });
    }

    async function klaenCompanySensor(chartType,start_date,end_date,resample) {
        console.log(chartType, resample);
        var ctx = document.getElementById("myAreaChart").getContext('2d');
    
        // Fetch sensor data from the API
        const sensorData =  await fetchPlalionCompanySensorData(start_date,end_date,resample);
        if (!sensorData) {
            console.error("Failed to load sensor data");
            return; // Exit if no data could be fetched
        }
    
        // Example of processing the fetched sensor data
        // You need to adjust this part based on the actual structure of your data and what you want to display
        var labels = sensorData.map(data => data.timestamp);
        var humidityData = sensorData.map(data => data.humidity);
        var temperatureData = sensorData.map(data => data.temperature);
        var ozoneData = sensorData.map(data => data.ozone);
        var dustData = sensorData.map(data => data.dust);
        var co2Data = sensorData.map(data => data.co2);
        var vocData = sensorData.map(data => data.voc);
    
        // Create an empty array to hold the datasets
        var datasets = [];
        if (chart !== null) {
           chart.destroy();
        }
    
        // Assuming you want to display humidity and temperature data
        if(chartType === 'line' || chartType === 'combo') {
            datasets.push({
                label: "Humidity",
                data: humidityData,
                borderColor: "pink",
                backgroundColor: "rgba(255,192,203,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "Temperature",
                data: temperatureData,
                borderColor: "lightblue",
                backgroundColor: "rgba(173,216,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "Dust Density",
                data: dustData,
                borderColor: "green",
                backgroundColor: "rgba(173,206,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "Ozone",
                data: ozoneData,
                borderColor: "red",
                backgroundColor: "rgba(170,216,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "CO2",
                data: co2Data,
                borderColor: "orange",
                backgroundColor: "rgba(73,216,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "VOC",
                data: vocData,
                borderColor: "black",
                backgroundColor: "rgba(173,116,130,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
        }
    
        // More chart configurations...
        // Update the rest of your chart setup here
    
        // Create the chart with the specified type and dataset
        chart = new Chart(ctx, {
            type: chartType === 'combo' ? 'bar' : chartType, // Use 'bar' for combo, otherwise use the chartType
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    },
                    x: {
                        beginAtZero: true,
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    }
                },
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        display: true
                    },
                    title: {
                        display: true,
                        text: 'Sensor Data Over Time'
                    }
                }
            },
        });
    }

    let chart = null;
    async function buildthingSensor(chartType,start_date,end_date, array_filter,resample) {
        console.log(chartType, resample);
        var ctx = document.getElementById("myAreaChart").getContext('2d');
    
        // Fetch sensor data from the API
        const sensorData =  await fetchBuildthingSensorData(start_date,end_date,array_filter,resample);
        if (!sensorData) {
            console.error("Failed to load sensor data");
            return; // Exit if no data could be fetched
        }
    
        // Example of processing the fetched sensor data
        // You need to adjust this part based on the actual structure of your data and what you want to display
        var labels = sensorData.map(data => data.Time);
        var humidityData = sensorData.map(data => data.Humidity);
        var temperatureData = sensorData.map(data => data.Temperature);
        var pm10Data = sensorData.map(data => data.pm10);
        var pm1Data = sensorData.map(data => data.pm1);
        var pm25Data = sensorData.map(data => data.pm25);
        var co2Data = sensorData.map(data => data.CO2);
        var tvocData = sensorData.map(data => data.TVOC);
        
        // Create an empty array to hold the datasets
        var datasets = [];
        if (chart !== null) {
            chart.destroy();
        }
    
        // Assuming you want to display humidity and temperature data
        if(chartType === 'line' || chartType === 'combo') {
            datasets.push({
                label: "Humidity",
                data: humidityData,
                borderColor: "pink",
                backgroundColor: "rgba(255,192,203,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "Temperature",
                data: temperatureData,
                borderColor: "lightblue",
                backgroundColor: "rgba(173,216,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "PM10",
                data: pm10Data,
                borderColor: "green",
                backgroundColor: "rgba(173,206,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "PM 1",
                data: pm1Data,
                borderColor: "red",
                backgroundColor: "rgba(170,216,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "PM 2.5",
                data: pm25Data,
                borderColor: "orange",
                backgroundColor: "rgba(73,216,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "CO2",
                data: co2Data,
                borderColor: "yellow",
                backgroundColor: "rgba(13,16,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "TVOC",
                data: tvocData,
                borderColor: "brown",
                backgroundColor: "rgba(273,16,30,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
        }
    
        // More chart configurations...
        // Update the rest of your chart setup here
    
        // Create the chart with the specified type and dataset
        chart = new Chart(ctx, {
            type: chartType === 'combo' ? 'bar' : chartType, // Use 'bar' for combo, otherwise use the chartType
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    },
                    x: {
                        beginAtZero: true,
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    }
                },
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        display: true
                    },
                    title: {
                        display: true,
                        text: 'Sensor Data Over Time'
                    }
                }
            },
        });
    }

    async function outdoorSensor(chartType, start_date,end_date,array_filter,resample) {
        console.log(chartType);
        var ctx = document.getElementById("myAreaChart").getContext('2d');
    
        // Fetch sensor data from the API
        const sensorData =  await fetchOutdoorSensorData(start_date,end_date,array_filter,resample);
        if (!sensorData) {
            console.error("Failed to load sensor data");
            return; // Exit if no data could be fetched
        }
    
        // Example of processing the fetched sensor data
        // You need to adjust this part based on the actual structure of your data and what you want to display
        var labels = sensorData.map(data => data.timestamp);
        var humidityData = sensorData.map(data => data.humidity_o);
        var temperatureData = sensorData.map(data => data.temperature_c);
        var ozoneData = sensorData.map(data => data.o3);
        var coData = sensorData.map(data => data.co);
        var no2Data = sensorData.map(data => data.no2);
        var so2Data = sensorData.map(data => data.so2);
        var pm25Data = sensorData.map(data => data.pm_25);
        var pm10Data = sensorData.map(data => data.pm10);
        var cloudData = sensorData.map(data => data.cloud);
        var uvData = sensorData.map(data => data.uv_index);
        var windData = sensorData.map(data => data.wind);
       
        // Create an empty array to hold the datasets
        var datasets = [];
        if (chart !== null) {
            chart.destroy();
        }
    
        // Assuming you want to display humidity and temperature data
        if(chartType === 'line' || chartType === 'combo') {
            datasets.push({
                label: "Humidity",
                data: humidityData,
                borderColor: "pink",
                backgroundColor: "rgba(255,192,203,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "Temperature",
                data: temperatureData,
                borderColor: "lightblue",
                backgroundColor: "rgba(173,216,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "Ozone",
                data: ozoneData,
                borderColor: "green",
                backgroundColor: "rgba(173,206,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "Carbon Monoxide",
                data: coData,
                borderColor: "red",
                backgroundColor: "rgba(170,216,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "NO2",
                data: no2Data,
                borderColor: "orange",
                backgroundColor: "rgba(73,216,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "SO2",
                data: so2Data,
                borderColor: "yellow",
                backgroundColor: "rgba(73,16,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "PM25",
                data: pm25Data,
                borderColor: "gray",
                backgroundColor: "rgba(173,16,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "PM10",
                data: pm10Data,
                borderColor: "brown",
                backgroundColor: "rgba(73,16,130,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "Cloud",
                data: cloudData,
                borderColor: "gold",
                backgroundColor: "rgba(173,16,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "UV Index",
                data: uvData,
                borderColor: "cyan",
                backgroundColor: "rgba(173,116,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
            datasets.push({
                label: "Wind",
                data: windData,
                borderColor: "yellow",
                backgroundColor: "rgba(123,10,230,0.5)",
                borderWidth: 3,
                fill: true,
                yAxisID: 'y',
                type: chartType === 'combo' ? 'line' : chartType,
            });
        }
    
        // More chart configurations...
        // Update the rest of your chart setup here
    
        // Create the chart with the specified type and dataset
        chart = new Chart(ctx, {
            type: chartType === 'combo' ? 'bar' : chartType, // Use 'bar' for combo, otherwise use the chartType
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    },
                    x: {
                        beginAtZero: true,
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    }
                },
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        display: true
                    },
                    title: {
                        display: true,
                        text: 'Sensor Data Over Time'
                    }
                }
            },
        });
    }

async function dataCapacity(){
    const apiUrl = `${API_URL}/klaen/api/data-capacity/`;
    // showLoading('Loading for Data Capacity');
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Swal.close();
        // loadingAlert = false;
        // console.log('data', data)
        return data; // Adjust according to the actual structure of your response
    } catch (error) {
        console.error("Could not fetch sensor data: ", error);
        return null;
    }
}


$('.send-new-email').on('click', function(){
    $('#modal-report').modal('show');
});

$('.send-email-btn').on('click', function(){

    var obj = new Object();
    obj.to = $('.email-to').val();
    obj.message = $('.email-contents').val();
    obj.subject = $('.subject-title').val();
    console.log(obj);
    $.ajax({
        url: "/sensor/anomaly/email/",
        datatype:'JSON',
        data: obj,
        method: "POST",
        success: function(data){
            location.reload();
        },
        error: function(error){
            console.log(error)
        }

    });

});

$('.form-selectgroup-input').on('click', function(target){
    var obj = new Object();
    obj.on_off = target.currentTarget.defaultValue;
    $.ajax({
        url: "/sensor/dust/switch/modify/",
        datatype:'JSON',
        data: obj,
        method: "POST",
        success: function(data){

        },
        error: function(error){
            console.log(error)
        }

    });
});

switches();
function switches(){
    $.ajax({
        url: "/sensor/dust/switch/get/",
        method: 'GET',
        dataType: 'json',
        async: false,
        contentType: 'application/json',
        processData: false,
        success: function(data){
            for(var i=0; i<data.length; i++){
                $('input:radio[name=dust-icons]:input[value='+ data[i].dust +']').attr("checked",true);
                $('input:radio[name=temp-icon]:input[value='+ data[i].temp +']').attr("checked",true);
                $('input:radio[name=hum-icon]:input[value='+ data[i].hum +']').attr("checked",true);
                $('input:radio[name=light-icons]:input[value='+ data[i].lighting +']').attr("checked",true);
            }
        },
        error: function(error){
            console.log(error)
        }

    });
}

function downloadExcelFromJson(data, filename = 'data.xlsx') {
    return new Promise((resolve, reject) => {
        try {
            // Create a new workbook (this is a SheetJS function)
            var wb = XLSX.utils.book_new();

            // Convert the JSON array to a worksheet (this is a SheetJS function)
            var ws = XLSX.utils.json_to_sheet(data);

            // Append the worksheet to the workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Data');

            // Write the workbook and trigger the download (using SheetJS write function)
            XLSX.writeFile(wb, filename, {bookType: 'xlsx'});

            // Resolve the promise after initiating download
            resolve('Excel file has been downloaded.');
        } catch (error) {
            // Reject the promise if there's an error
            reject('Failed to download Excel file.');
        }
    });
}


var chartType = 'combo';
var chartSource = 'arduino';

function updateChart() {
    // Remove the existing canvas and add a new one
    $('#myAreaChart').remove();
    $('.chart-selections').append('<canvas id="myAreaChart" class="chartjs-render-monitor" width="1606px" height="418px"></canvas>');

    // Call the appropriate function based on the chart source
    switch(chartSource) {
        case 'arduino':
            arduinoSensor(chartType,'','','daily');
            break;
        case 'buildthing':
            buildthingSensor(chartType,'2023-09-20T00:00:00','2023-10-20T23:59:59',null,'daily');
            break;
        case 'weather':
            outdoorSensor(chartType,'','',null,'daily');
            break;
        case 'klaen':
            klaenSensor(chartType,'','','daily');
            break;
        case 'klaen_company':
            klaenCompanySensor(chartType,'','','daily');
            break;
        default:
            console.error('Invalid chart source');
    }
}

// Listen for changes on the chart type selection
$('.chartSelect').on('change', function(e) {
    chartType = $(this).val();
    updateChart();
});

// Listen for changes on the chart source selection
$('.chartSource').on('change', function(e) {
    chartSource = $(this).val();
    updateChart();
});

// if(loadingAlert){
//     showLoading('Loading Content');
// }else {
//     Swal.close();
// }

// setInterval(function () {
//     var type = $('.chartSelect').val();
//     $('#myAreaChart').remove(); // this is my <canvas> element
//     $('.chart-selections').append('<canvas id="myAreaChart" class="chartjs-render-monitor" width="1606px" height="318px"></canvas>');
//     pm10Chart(type);
// }, 3600000);

