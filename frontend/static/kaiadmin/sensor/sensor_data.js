
    (function() {
      'use strict';
      
      // Check if the sensor monitoring script has already been loaded
      if (window.sensorMonitoringLoaded) {
        console.log('Sensor monitoring script already loaded, skipping...');
        // return;
      }
      
      // Mark script as loaded
      window.sensorMonitoringLoaded = true;
    
      // Initialize chart variables (use var to avoid redeclaration errors)
      var statisticsChart = null;
      var aqiChart = null;
      var updateInterval = null;
      
      // Function to process sensor data for chart
      function processSensorData(data) {
        var labels = [];
        var co2Data = [], vocData = [], dustData = [], tempData = [], humidityData = [];
        
        if (!Array.isArray(data) || data.length === 0) {
          console.warn('Invalid sensor data, creating default data');
          // Create default data if no real data
          // for (var i = 19; i >= 0; i--) {
          //   var d = new Date(Date.now() - i * 60000);
          //   labels.push(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          //   co2Data.push(420 + Math.random() * 100);
          //   vocData.push(50 + Math.random() * 50);
          //   dustData.push(5 + Math.random() * 10);
          //   tempData.push(25 + Math.random() * 10);
          //   humidityData.push(60 + Math.random() * 20);
          // }
        } else {
          // Process real sensor data
          var sortedData = data.slice().reverse(); // Show oldest to newest
          sortedData.forEach(function(item) {
            var timestamp = new Date(item.timestamp);
            labels.push(timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            co2Data.push(item.co2 || 0);
            vocData.push(item.voc || 0);
            dustData.push(item.dust || 0);
            tempData.push(item.temperature || 0);
            humidityData.push(item.humidity || 0);
          });
        }
        
        return { labels: labels, co2Data: co2Data, vocData: vocData, dustData: dustData, tempData: tempData, humidityData: humidityData };
      }
      
      // Function to update sensor cards
      function updateSensorCards(data) {
        if (data) {
          var updateElement = function(id, value) {
            var element = document.getElementById(id);
            if (element) element.textContent = value || 0;
          };
    
          updateElement('co2-value', data.co2);
          updateElement('voc-value', data.voc);
          updateElement('dust-value', data.dust);
          updateElement('temp-value', data.temperature);
          updateElement('humidity-value', data.humidity);
          
          // Calculate simple AQI
          var aqi = Math.min(100, Math.max(0, Math.floor((data.co2 / 1000 + data.voc / 500 + data.dust / 50) * 33)));
          updateElement('aqi-value', aqi);
          
          var aqiStatusElement = document.getElementById('aqi-status');
          if (aqiStatusElement) {
            if (aqi <= 50) {
              aqiStatusElement.textContent = 'Good';
              aqiStatusElement.className = 'badge badge-success';
            } else if (aqi <= 100) {
              aqiStatusElement.textContent = 'Moderate';
              aqiStatusElement.className = 'badge badge-warning';
            } else {
              aqiStatusElement.textContent = 'Unhealthy';
              aqiStatusElement.className = 'badge badge-danger';
            }
          }
        }
      }
      
      // Function to initialize sensor chart
      function initializeSensorChart() {
        console.log('Initializing sensor chart...');
        
        var sensorDataElement = document.getElementById('my-data');
        if (!sensorDataElement) {
          console.error('Sensor data element not found');
          return;
        }
    
        var sensorData;
        try {
          sensorData = JSON.parse(sensorDataElement.textContent);
        } catch (error) {
          console.error('Failed to parse sensor data:', error);
          sensorData = [];
        }
    
        console.log('Sensor data received:', sensorData);
    
        var chartData = processSensorData(sensorData);
        console.log('Processed chart data:', chartData);
    
        var ctx = document.getElementById('statisticsChart');
        var aqiCtx = document.getElementById('aqiChart');
        
        if (!ctx || !aqiCtx) {
          console.error('Chart canvas elements not found');
          return;
        }
    
        // Destroy existing charts if they exist
        if (statisticsChart && typeof statisticsChart.destroy === 'function') {
          statisticsChart.destroy();
        }
        if (aqiChart && typeof aqiChart.destroy === 'function') {
          aqiChart.destroy();
        }
    
        // Create main statistics chart
        statisticsChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: chartData.labels,
            datasets: [
              {
                label: 'CO2 (ppm)',
                data: chartData.co2Data,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0,123,255,0.1)',
                fill: false,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2
              },
              {
                label: 'VOC (ppb)',
                data: chartData.vocData,
                borderColor: '#28a745',
                backgroundColor: 'rgba(40,167,69,0.1)',
                fill: false,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2
              },
              {
                label: 'Dust (μg/m³)',
                data: chartData.dustData,
                borderColor: '#ffc107',
                backgroundColor: 'rgba(255,193,7,0.1)',
                fill: false,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2
              },
              {
                label: 'Temperature (°C)',
                data: chartData.tempData,
                borderColor: '#dc3545',
                backgroundColor: 'rgba(220,53,69,0.1)',
                fill: false,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2
              },
              {
                label: 'Humidity (%)',
                data: chartData.humidityData,
                borderColor: '#6f42c1',
                backgroundColor: 'rgba(111,66,193,0.1)',
                fill: false,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 750,
              easing: 'easeInOutQuart'
            },
            plugins: {
              legend: { 
                display: true,
                position: 'top',
                labels: {
                  usePointStyle: true,
                  padding: 15
                }
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0,0,0,0.8)',
                titleColor: 'white',
                bodyColor: 'white'
              }
            },
            scales: {
              x: {
                display: true,
                title: {
                  display: true,
                  text: 'Time'
                },
                grid: {
                  color: 'rgba(0,0,0,0.1)'
                }
              },
              y: {
                display: true,
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Sensor Values'
                },
                grid: {
                  color: 'rgba(0,0,0,0.1)'
                }
              }
            },
            interaction: {
              mode: 'nearest',
              axis: 'x',
              intersect: false
            }
          }
        });
    
        // Create AQI chart
        aqiChart = new Chart(aqiCtx, {
          type: 'doughnut',
          data: {
            labels: ['Good', 'Remaining'],
            datasets: [{
              data: [42, 58],
              backgroundColor: ['#28a745', '#e9ecef'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
              legend: {
                display: false
              }
            }
          }
        });
    
        console.log('Charts created successfully');
    
        // Initialize sensor cards with current data
        if (sensorData.length > 0) {
          updateSensorCards(sensorData[0]);
        }
    
        // Start auto-update interval
        startAutoUpdate();
        
        // Trigger custom event for index.html
        if (typeof $ !== 'undefined') {
          $(document).trigger('chartInitialized');
        }
      }
      
      // Function to fetch latest sensor data
      function fetchLatestSensorData() {
        return fetch('/dashboard/kaidashboard/monitoringapps/api/latest-sensor-data/')
          .then(function(response) {
            if (!response.ok) {
              throw new Error('Failed to fetch latest sensor data');
            }
            return response.json();
          })
          .then(function(result) {
            console.log('Latest data received:', result);
            return result.data && result.data.length > 0 ? result.data[0] : null;
          })
          .catch(function(error) {
            console.error('Error fetching latest sensor data:', error);
            return null;
          });
      }
      
      // Function to update chart with new data
      function updateChart() {
        console.log('Updating chart with latest data...');
        
        if (!statisticsChart) {
          console.warn('Chart not initialized yet');
          return;
        }
    
        fetchLatestSensorData().then(function(newData) {
          console.log('New data received:', newData);
          if (!newData) {
            console.warn('No new data received');
            return;
          }
    
          var timestamp = new Date(newData.timestamp);
          var newLabel = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          // Check if the timestamp is the same as the last one
          if (statisticsChart.data.labels.length > 0) {
            var lastTimestamp = statisticsChart.data.labels[statisticsChart.data.labels.length - 1];
            if (lastTimestamp === newLabel) {
              console.warn('Warning: New data has the same timestamp as previous data - no new readings detected');
              return; // Exit function without updating chart
            }
          }
          // Remove oldest data point if we have 20 or more points
          if (statisticsChart.data.labels.length >= 20) {
            statisticsChart.data.labels.shift();
            statisticsChart.data.datasets.forEach(function(dataset) {
              dataset.data.shift();
            });
          }
    
          // Add new data point
          statisticsChart.data.labels.push(newLabel);
          statisticsChart.data.datasets[0].data.push(newData.co2 || 0);
          statisticsChart.data.datasets[1].data.push(newData.voc || 0);
          statisticsChart.data.datasets[2].data.push(newData.dust || 0);
          statisticsChart.data.datasets[3].data.push(newData.temperature || 0);
          statisticsChart.data.datasets[4].data.push(newData.humidity || 0);
    
          // Update chart with animation
          statisticsChart.update('active');
    
          // Update sensor cards
          updateSensorCards(newData);
    
          console.log('Chart updated at ' + newLabel);
        });
      }
      
      // Function to start auto-update
      function startAutoUpdate() {
        // Clear existing interval if any
        if (updateInterval) {
          clearInterval(updateInterval);
        }
        
        // Start new interval - update every 60 seconds (1 minute)
        updateInterval = setInterval(updateChart, 60000);
        console.log('Auto-update started - updating every 60 seconds');
      }
      
      // Function to stop auto-update
      function stopAutoUpdate() {
        if (updateInterval) {
          clearInterval(updateInterval);
          updateInterval = null;
          console.log('Auto-update stopped');
        }
      }
      
      // Initialize chart when DOM is ready
      function initWhenReady() {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM loaded, initializing sensor chart...');
            setTimeout(initializeSensorChart, 100); // Small delay to ensure everything is ready
          });
        } else {
          console.log('DOM already loaded, initializing sensor chart...');
          setTimeout(initializeSensorChart, 100);
        }
      }
      
      // Manual refresh button event
      document.addEventListener('click', function(e) {
        if (e.target && (e.target.id === 'refresh-chart' || e.target.closest('#refresh-chart'))) {
          console.log('Manual refresh triggered');
          updateChart();
        }
      });
      
      // Cleanup when page is unloaded
      window.addEventListener('beforeunload', function() {
        stopAutoUpdate();
      });
      
      // Make functions globally accessible for external calls
      window.sensorMonitoring = {
        initialize: initializeSensorChart,
        update: updateChart,
        stopAutoUpdate: stopAutoUpdate,
        startAutoUpdate: startAutoUpdate
      };
      
      // Initialize when ready
      initWhenReady();
      
    })();
