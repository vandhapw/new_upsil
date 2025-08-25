
    (function() {
    'use strict';
    let slidingWindowChart = null;
    let windowAnimationInterval = null;
    let currentWindowIndex = 0;
    let totalWindows = 0;
    let isPlaying = false;
    let allData = [];
    
    function initializeSlidingWindowChart() {
        console.log('Initializing sliding window chart...');
        
        const sensorDataElement = document.getElementById('my-data');
        if (!sensorDataElement) {
    console.error('Sensor data element not found for sliding window chart');
    return;
        }
        
        try {
    const sensorData = JSON.parse(sensorDataElement.textContent);
    if (!Array.isArray(sensorData) || sensorData.length === 0) {
        console.warn('No sensor data available for sliding window chart');
        return;
    }
    
    allData = sensorData.slice().reverse(); // Oldest to newest
    const windowSize = 60;
    const overlap = 10;
    const stepSize = windowSize - overlap; // 50
    
    totalWindows = Math.max(1, Math.floor((allData.length - overlap) / stepSize));
    document.getElementById('total-windows').textContent = totalWindows;
    
    const ctx = document.getElementById('slidingWindowChart');
    if (!ctx) {
        console.error('Sliding window chart canvas not found');
        return;
    }
    
    if (slidingWindowChart) {
        slidingWindowChart.destroy();
    }
    
    // Prepare initial data
    const labels = allData.map((item, index) => {
        const timestamp = new Date(item.timestamp);
        return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    
    const co2Data = allData.map(item => item.co2 || 0);
    
    slidingWindowChart = new Chart(ctx, {
        type: 'line',
        data: {
        labels: labels,
        datasets: [
        {
        label: 'CO2 (ppm) - All Data',
        data: co2Data,
        borderColor: '#e9ecef',
        backgroundColor: 'rgba(233, 236, 239, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 1,
        pointBackgroundColor: '#e9ecef'
        },
        {
        label: 'Current Window',
        data: new Array(labels.length).fill(null),
        borderColor: '#dc3545',
        backgroundColor: 'rgba(220, 53, 69, 0.2)',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 3,
        pointBackgroundColor: '#dc3545',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
        },
        {
        label: 'Previous Window',
        data: new Array(labels.length).fill(null),
        borderColor: '#6c757d',
        backgroundColor: 'rgba(108, 117, 125, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2,
        borderDash: [5, 5],
        pointBackgroundColor: '#6c757d'
        },
        {
        label: 'Next Window',
        data: new Array(labels.length).fill(null),
        borderColor: '#17a2b8',
        backgroundColor: 'rgba(23, 162, 184, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2,
        borderDash: [3, 3],
        pointBackgroundColor: '#17a2b8'
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
            padding: 15,
            filter: function(legendItem) {
        return legendItem.text !== 'CO2 (ppm) - All Data';
            }
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
        },
        ticks: {
            maxTicksLimit: 10,
            callback: function(value, index, values) {
        return this.getLabelForValue(value);
            }
        }
        },
        y: {
        display: true,
        beginAtZero: true,
        title: {
            display: true,
            text: 'CO2 (ppm)'
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
        },
        plugins: [{
        id: 'windowHighlight',
        beforeDraw: function(chart) {
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        const meta = chart.getDatasetMeta(1); // Current window dataset
        
        if (!meta.data || meta.data.length === 0) return;
        
        // Find the range of visible points in current window
        let minX = null, maxX = null;
        
        for (let i = 0; i < meta.data.length; i++) {
        const point = meta.data[i];
        if (point && chart.data.datasets[1].data[i] !== null) {
            if (minX === null || point.x < minX) minX = point.x;
            if (maxX === null || point.x > maxX) maxX = point.x;
        }
        }
        
        if (minX !== null && maxX !== null) {
        // Draw red highlight background
        ctx.save();
        ctx.fillStyle = 'rgba(220, 53, 69, 0.15)';
        ctx.fillRect(minX, chartArea.top, maxX - minX, chartArea.bottom - chartArea.top);
        
        // Draw red border lines
        ctx.strokeStyle = 'rgba(220, 53, 69, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        
        
        // Left border
        ctx.beginPath();
        ctx.moveTo(minX, chartArea.top);
        ctx.lineTo(minX, chartArea.bottom);
        ctx.stroke();
        
        // Right border
        ctx.beginPath();
        ctx.moveTo(maxX, chartArea.top);
        ctx.lineTo(maxX, chartArea.bottom);
        ctx.stroke();
        
        ctx.restore();
        }
        }
        }]
    });
    
    updateSlidingWindow(0);
    console.log('Sliding window chart created successfully');
    
        } catch (error) {
    console.error('Error initializing sliding window chart:', error);
        }
    }
    
    function updateSlidingWindow(windowIndex) {
        if (!slidingWindowChart || !allData.length) return;
        
        const windowSize = 60;
        const overlap = 10;
        const stepSize = windowSize - overlap;
        
        currentWindowIndex = Math.max(0, Math.min(windowIndex, totalWindows - 1));
        
        // Calculate window boundaries
        const currentStart = currentWindowIndex * stepSize;
        const currentEnd = Math.min(currentStart + windowSize, allData.length);
        
        const prevStart = Math.max(0, (currentWindowIndex - 1) * stepSize);
        const prevEnd = Math.min(prevStart + windowSize, allData.length);
        
        const nextStart = (currentWindowIndex + 1) * stepSize;
        const nextEnd = Math.min(nextStart + windowSize, allData.length);
        
        // Clear all datasets
        slidingWindowChart.data.datasets[1].data = new Array(allData.length).fill(null);
        slidingWindowChart.data.datasets[2].data = new Array(allData.length).fill(null);
        slidingWindowChart.data.datasets[3].data = new Array(allData.length).fill(null);
        
        // Fill current window (red with border)
        for (let i = currentStart; i < currentEnd; i++) {
    slidingWindowChart.data.datasets[1].data[i] = allData[i].co2 || 0;
        }
        
        // Fill previous window (gray dashed) if exists
        if (currentWindowIndex > 0) {
    for (let i = prevStart; i < prevEnd; i++) {
        slidingWindowChart.data.datasets[2].data[i] = allData[i].co2 || 0;
    }
        }
        
        // Fill next window (blue dashed) if exists
        if (nextStart < allData.length && currentWindowIndex < totalWindows - 1) {
    for (let i = nextStart; i < nextEnd; i++) {
        slidingWindowChart.data.datasets[3].data[i] = allData[i].co2 || 0;
    }
        }
        
        slidingWindowChart.update('none');
        
        // Update info displays
        document.getElementById('current-window-index').textContent = currentWindowIndex + 1;
        document.getElementById('window-info').textContent = 
    `Window ${currentWindowIndex + 1}: Steps ${currentStart + 1}-${currentEnd}`;
    }
    
    function startWindowAnimation() {
        if (isPlaying) return;
        
        isPlaying = true;
        document.getElementById('play-pause-icon').className = 'fa fa-pause';
        document.getElementById('play-pause-text').textContent = 'Pause';
        
        windowAnimationInterval = setInterval(() => {
    currentWindowIndex++;
    if (currentWindowIndex >= totalWindows) {
        currentWindowIndex = 0; // Loop back to start
    }
    updateSlidingWindow(currentWindowIndex);
        }, 2000); // Change window every 2 seconds
    }
    
    function stopWindowAnimation() {
        if (!isPlaying) return;
        
        isPlaying = false;
        document.getElementById('play-pause-icon').className = 'fa fa-play';
        document.getElementById('play-pause-text').textContent = 'Play';
        
        if (windowAnimationInterval) {
    clearInterval(windowAnimationInterval);
    windowAnimationInterval = null;
        }
    }
    
    // Initialize chart when DOM is ready
    function initWhenReady() {
        if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, initializing sliding window chart...');
        setTimeout(initializeSlidingWindowChart, 100); // Small delay to ensure everything is ready
    });
        } else {
    console.log('DOM already loaded, initializing sliding window chart...');
    setTimeout(initializeSlidingWindowChart, 100);
        }
    }
    
    // Event listeners
    document.addEventListener('click', function(e) {
        if (e.target && (e.target.id === 'play-pause-btn' || e.target.closest('#play-pause-btn'))) {
    if (isPlaying) {
        stopWindowAnimation();
    } else {
        startWindowAnimation();
    }
        }
        
        if (e.target && (e.target.id === 'reset-window' || e.target.closest('#reset-window'))) {
    stopWindowAnimation();
    currentWindowIndex = 0;
    updateSlidingWindow(0);
        }
    });
    
    // Listen for main chart updates
    document.addEventListener('chartInitialized', function() {
        console.log('Chart initialized event received, reinitializing sliding window chart...');
        setTimeout(initializeSlidingWindowChart, 200);
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
        stopWindowAnimation();
    });
    
    // Initialize when ready
    initWhenReady();
    
    })();