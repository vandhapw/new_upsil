
// Gantt Chart Visualization for Trip Planning
class GanttChartManager {
    constructor() {
        this.currentEntryId = null;
        this.ganttData = null;
        this.timelineColors = {
            travel: '#3498db',
            hotel: '#e74c3c',
            attraction: '#2ecc71',
            meal: '#f39c12',
            break: '#95a5a6',
            transport: '#9b59b6'
        };
    }

    // Main function to display Gantt chart for a trip entry
    async displayGanttChart(entryId) {
        console.log(`Displaying Gantt chart for trip entry ID: ${entryId}`);
        this.currentEntryId = entryId;
        
        // Get trip data from history
        const tripData = this.getTripData(entryId);
        if (!tripData) {
            alert('Trip data not found!');
            return;
        }

        // Show loading message
        if (typeof showLoading === 'function') {
            showLoading('Loading Gantt chart data...');
        }

        // First, try to use stored optimization results
        if (window.lastOptimizationResults && 
            window.lastOptimizationResults.entryId === entryId && 
            window.lastOptimizationResults.gantt) {
            
            console.log('Using stored optimization results for Gantt chart');
            const storedGantt = window.lastOptimizationResults.gantt;
            
            try {
                // Process stored Gantt data
                this.ganttData = this.generateGanttDataFromOptimization(storedGantt, tripData);
                
                // Show Gantt chart in modal
                this.showGanttModal(tripData, this.ganttData, storedGantt);

                // Hide loading
                if (typeof showLoading === 'function') {
                    showLoading('Gantt chart loaded from stored data!', true);
                }
                return;
                
            } catch (error) {
                console.error('Error processing stored Gantt data:', error);
                // Continue to API fallback
            }
        }

        // Fallback: Load from API
        console.log('No stored Gantt data found, fetching from API...');

        try {
            // Fetch Gantt data from API
            const apiResponse = await fetch('/tourism/api/test_api_call/');
            if (!apiResponse.ok) {
                throw new Error(`HTTP error! status: ${apiResponse.status}`);
            }
            
            const apiData = await apiResponse.json();
            console.log("Fetched API response:", apiData);
            
            // Handle different API response structures
            let ganttApiData = null;
            
            // Try different possible structures for Gantt data
            if (apiData.success && apiData.results && apiData.results.gantt_data) {
                ganttApiData = apiData.results;
                console.log("Found Gantt data in apiData.results.gantt_data");
            } else if (apiData.gantt_data) {
                ganttApiData = { 
                    gantt_data: apiData.gantt_data,
                    schedule_start: apiData.schedule_start,
                    schedule_end: apiData.schedule_end,
                    method: apiData.method,
                    total_days: apiData.total_days
                };
                console.log("Found Gantt data in apiData.gantt_data");
            } else if (apiData.optimized_gantt_chart && apiData.optimized_gantt_chart.gantt_data) {
                ganttApiData = apiData.optimized_gantt_chart;
                console.log("Found Gantt data in apiData.optimized_gantt_chart.gantt_data");
            } else if (apiData.results && apiData.results.optimized_gantt_chart) {
                ganttApiData = apiData.results.optimized_gantt_chart;
                console.log("Found Gantt data in apiData.results.optimized_gantt_chart");
            } else if (apiData.success && apiData.optimized_gantt_chart) {
                ganttApiData = apiData.optimized_gantt_chart;
                console.log("Found Gantt data in apiData.optimized_gantt_chart");
            } else {
                // Log the actual structure to help debug
                console.log("API Response Structure:");
                console.log("- Top level keys:", Object.keys(apiData));
                if (apiData.results) {
                    console.log("- apiData.results keys:", Object.keys(apiData.results));
                }
                if (apiData.optimized_gantt_chart) {
                    console.log("- apiData.optimized_gantt_chart type:", typeof apiData.optimized_gantt_chart);
                    if (typeof apiData.optimized_gantt_chart === 'object') {
                        console.log("- apiData.optimized_gantt_chart keys:", Object.keys(apiData.optimized_gantt_chart));
                    }
                }
                
                console.warn('No Gantt data found in API response. Falling back to generated data.');
                // Fall back to generated data instead of throwing error
                this.ganttData = this.generateGanttData(tripData);
                this.showGanttModal(tripData, this.ganttData, null);
                
                if (typeof showLoading === 'function') {
                    showLoading('Gantt chart generated from trip data (API data not found)', true);
                }
                return;
            }

            // Generate Gantt chart data from API
            this.ganttData = this.generateGanttDataFromAPI(ganttApiData, tripData);
            
            // Show Gantt chart in modal
            this.showGanttModal(tripData, this.ganttData, ganttApiData);

            // Hide loading
            if (typeof showLoading === 'function') {
                showLoading('Gantt chart loaded successfully from API!', true);
            }

        } catch (error) {
            console.error('Error fetching Gantt data from API:', error);
            
            // Try fallback generation from trip data
            console.log('Generating fallback Gantt chart from trip data...');
            try {
                this.ganttData = this.generateGanttData(tripData);
                this.showGanttModal(tripData, this.ganttData, null);
                
                if (typeof showLoading === 'function') {
                    showLoading('Gantt chart generated from trip data (API fallback)', true);
                }
            } catch (fallbackError) {
                console.error('Error generating fallback Gantt chart:', fallbackError);
                alert('Failed to load Gantt chart data. Please try again.');
                
                if (typeof showLoading === 'function') {
                    showLoading('Failed to load Gantt chart', true);
                }
            }
        }
    }

    // NEW METHOD: Generate Gantt chart data from optimization results
    generateGanttDataFromOptimization(optimizationData, tripData) {
        console.log('Processing optimization Gantt data:', optimizationData);
        
        const ganttItems = [];
        let itemId = 1;
        
        // Handle different optimization data structures
        let ganttData = null;
        let scheduleStart = null;
        let scheduleEnd = null;
        let optimizationMethod = 'Optimization';
        
        // Try to extract gantt_data from different structures
        if (optimizationData.gantt_data) {
            ganttData = optimizationData.gantt_data;
            scheduleStart = optimizationData.schedule_start;
            scheduleEnd = optimizationData.schedule_end;
            optimizationMethod = optimizationData.method || 'Optimization';
        } else if (typeof optimizationData === 'object' && Object.keys(optimizationData).some(key => key.includes('Day'))) {
            // Direct day data structure
            ganttData = optimizationData;
        } else {
            console.error('Unable to extract Gantt data from optimization results');
            throw new Error('Invalid optimization data structure');
        }
        
        // Fallback for schedule dates
        if (!scheduleStart || !scheduleEnd) {
            scheduleStart = new Date(tripData.startDate + ' ' + tripData.startTime);
            scheduleEnd = new Date(tripData.endDate + ' ' + tripData.endTime);
        } else {
            scheduleStart = new Date(scheduleStart);
            scheduleEnd = new Date(scheduleEnd);
        }
        
        console.log(`Optimization Schedule: ${scheduleStart} to ${scheduleEnd}`);
        
        // Process each day from optimization data
        Object.keys(ganttData).forEach(dayKey => {
            const dayActivities = ganttData[dayKey];
            
            if (!Array.isArray(dayActivities) || dayActivities.length === 0) {
                console.warn(`No activities found for ${dayKey}`);
                return;
            }
            
            const dayNumber = dayActivities[0]?.day || parseInt(dayKey.replace(/\D/g, '')) || 1;
            
            console.log(`Processing ${dayKey} with ${dayActivities.length} activities`);
            
            // Add day header
            const dayStart = new Date(dayActivities[0]?.start || scheduleStart);
            const dayEnd = new Date(dayActivities[dayActivities.length - 1]?.finish || scheduleEnd);
            
            ganttItems.push({
                id: itemId++,
                type: 'day_header',
                name: dayKey,
                start: new Date(dayStart.toDateString() + ' 00:00:00'),
                end: new Date(dayStart.toDateString() + ' 23:59:59'),
                duration: 24, // Full 24-hour day (00:00 to 23:59)
                color: '#34495e',
                description: this.formatDate(dayStart),
                isHeader: true
            });
            
            // Process each activity in the day
            dayActivities.forEach(activity => {
                const startTime = new Date(activity.start);
                const endTime = new Date(activity.finish);
                
                // Map activity types to our color scheme
                let activityType = (activity.type || 'break').toLowerCase();
                let color = this.timelineColors.attraction; // default
                
                switch (activityType) {
                    case 'hotel':
                        color = this.timelineColors.hotel;
                        break;
                    case 'travel':
                    case 'transport':
                        color = this.timelineColors.transport;
                        activityType = 'transport';
                        break;
                    case 'attraction':
                        color = this.timelineColors.attraction;
                        break;
                    case 'meal':
                        color = this.timelineColors.meal;
                        break;
                    default:
                        color = this.timelineColors.break;
                        activityType = 'break';
                }
                
                ganttItems.push({
                    id: itemId++,
                    type: activityType,
                    name: activity.activity || activity.name || 'Activity',
                    start: startTime,
                    end: endTime,
                    duration: activity.duration_hours || activity.duration || 1,
                    color: color,
                    description: `${activity.activity || activity.name} (${activity.duration_hours || activity.duration || 1}h)`,
                    locationId: activity.location_id,
                    coordinates: activity.coordinates,
                    day: dayNumber
                });
            });
        });
        
        console.log(`Generated ${ganttItems.length} Gantt items from optimization data`);
        return ganttItems;
    }

    // Updated method to generate Gantt chart data from API response (with better error handling)
    generateGanttDataFromAPI(apiResults, tripData) {
        console.log('Processing API Gantt data:', apiResults);
        
        const ganttItems = [];
        let itemId = 1;
        
        // Handle case where gantt_data might not exist
        if (!apiResults.gantt_data) {
            console.warn('No gantt_data found in API results, using fallback generation');
            return this.generateGanttData(tripData);
        }
        
        // Get schedule dates from API
        const scheduleStart = new Date(apiResults.schedule_start || tripData.startDate + ' ' + tripData.startTime);
        const scheduleEnd = new Date(apiResults.schedule_end || tripData.endDate + ' ' + tripData.endTime);
        
        console.log(`API Schedule: ${scheduleStart} to ${scheduleEnd}`);
        
        // Process each day from API data
        Object.keys(apiResults.gantt_data).forEach(dayKey => {
            const dayActivities = apiResults.gantt_data[dayKey];
            
            if (!Array.isArray(dayActivities) || dayActivities.length === 0) {
                console.warn(`No activities found for ${dayKey}`);
                return;
            }
            
            const dayNumber = dayActivities[0]?.day || parseInt(dayKey.replace('Day ', ''));
            
            console.log(`Processing ${dayKey} with ${dayActivities.length} activities`);
            
            // Add day header
            const dayStart = new Date(dayActivities[0]?.start || scheduleStart);
            const dayEnd = new Date(dayActivities[dayActivities.length - 1]?.finish || scheduleEnd);
            
            ganttItems.push({
                id: itemId++,
                type: 'day_header',
                name: dayKey,
                start: new Date(dayStart.toDateString() + ' 00:00:00'),
                end: new Date(dayStart.toDateString() + ' 23:59:59'),
                duration: 24, // Full 24-hour day (00:00 to 23:59)
                color: '#34495e',
                description: this.formatDate(dayStart),
                isHeader: true
            });
            
            // Process each activity in the day
            dayActivities.forEach(activity => {
                const startTime = new Date(activity.start);
                const endTime = new Date(activity.finish);
                
                // Map API activity types to our color scheme
                let activityType = (activity.type || 'break').toLowerCase();
                let color = this.timelineColors.attraction; // default
                
                switch (activityType) {
                    case 'hotel':
                        color = this.timelineColors.hotel;
                        activityType = 'hotel';
                        break;
                    case 'travel':
                        color = this.timelineColors.transport;
                        activityType = 'transport';
                        break;
                    case 'attraction':
                        color = this.timelineColors.attraction;
                        activityType = 'attraction';
                        break;
                    case 'meal':
                        color = this.timelineColors.meal;
                        activityType = 'meal';
                        break;
                    default:
                        color = this.timelineColors.break;
                        activityType = 'break';
                }
                
                ganttItems.push({
                    id: itemId++,
                    type: activityType,
                    name: activity.activity || activity.name || 'Activity',
                    start: startTime,
                    end: endTime,
                    duration: activity.duration_hours || activity.duration || 1,
                    color: color,
                    description: `${activity.activity || activity.name} (${activity.duration_hours || activity.duration || 1}h)`,
                    locationId: activity.location_id,
                    coordinates: activity.coordinates,
                    day: dayNumber
                });
            });
        });
        
        console.log(`Generated ${ganttItems.length} Gantt items from API data`);
        return ganttItems;
    }

    // Get trip data from trip history manager
    getTripData(entryId) {
        if (window.tripHistoryManager && window.tripHistoryManager.historyData) {
            return window.tripHistoryManager.historyData.find(entry => entry.id === entryId);
        }
        return null;
    }

    // Generate Gantt chart data from trip information (fallback method)
    generateGanttData(tripData) {
        const startDate = new Date(tripData.startDate + ' ' + tripData.startTime);
        const endDate = new Date(tripData.endDate + ' ' + tripData.endTime);
        const totalDurationHours = (endDate - startDate) / (1000 * 60 * 60);
        const daysCount = Math.ceil(totalDurationHours / 24);
        
        const ganttItems = [];
        let itemId = 1;

        // Generate daily schedules
        for (let day = 0; day < daysCount; day++) {
            const dayStart = new Date(startDate);
            dayStart.setDate(startDate.getDate() + day);
            dayStart.setHours(0, 0, 0, 0); // Start at 00:00 (midnight)

            const dayEnd = new Date(dayStart);
            if (day === daysCount - 1) {
                // Last day - use actual end time
                dayEnd.setTime(endDate.getTime());
            } else {
                dayEnd.setHours(23, 59, 59, 999); // End at 23:59:59
            }

            // Add day header
            ganttItems.push({
                id: itemId++,
                type: 'day_header',
                name: `Day ${day + 1}`,
                start: new Date(dayStart),
                end: new Date(dayEnd),
                duration: (dayEnd - dayStart) / (1000 * 60 * 60),
                color: '#34495e',
                description: this.formatDate(dayStart),
                isHeader: true
            });

            // Morning activities
            let currentTime = new Date(dayStart);
            currentTime.setHours(8, 0, 0, 0); // Start at 8 AM
            
            // Breakfast
            ganttItems.push({
                id: itemId++,
                type: 'meal',
                name: 'Breakfast',
                start: new Date(currentTime),
                end: new Date(currentTime.getTime() + 60 * 60 * 1000), // 1 hour
                duration: 1,
                color: this.timelineColors.meal,
                description: 'Morning meal'
            });
            currentTime.setTime(currentTime.getTime() + 60 * 60 * 1000);

            // Hotel check-in/check-out
            if (tripData.hotels && tripData.hotels.length > 0) {
                const hotelName = tripData.hotels[Math.min(day, tripData.hotels.length - 1)] || 'Hotel';
                const hotelActivity = day === 0 ? 'Check-in' : (day === daysCount - 1 ? 'Check-out' : 'Hotel Stay');
                
                ganttItems.push({
                    id: itemId++,
                    type: 'hotel',
                    name: `${hotelActivity}: ${hotelName}`,
                    start: new Date(currentTime),
                    end: new Date(currentTime.getTime() + 30 * 60 * 1000), // 30 minutes
                    duration: 0.5,
                    color: this.timelineColors.hotel,
                    description: `Hotel: ${hotelName}`
                });
                currentTime.setTime(currentTime.getTime() + 30 * 60 * 1000);
            }

            // Attractions/Sightseeing
            if (tripData.attractions && tripData.attractions.length > 0) {
                const attractionsPerDay = Math.ceil(tripData.attractions.length / daysCount);
                const dayAttractions = tripData.attractions.slice(
                    day * attractionsPerDay, 
                    (day + 1) * attractionsPerDay
                );

                dayAttractions.forEach((attraction, index) => {
                    ganttItems.push({
                        id: itemId++,
                        type: 'attraction',
                        name: `Visit: ${attraction}`,
                        start: new Date(currentTime),
                        end: new Date(currentTime.getTime() + 2 * 60 * 60 * 1000), // 2 hours
                        duration: 2,
                        color: this.timelineColors.attraction,
                        description: `Attraction visit: ${attraction}`
                    });
                    currentTime.setTime(currentTime.getTime() + 2 * 60 * 60 * 1000);

                    // Add travel time between attractions
                    if (index < dayAttractions.length - 1) {
                        ganttItems.push({
                            id: itemId++,
                            type: 'transport',
                            name: 'Travel',
                            start: new Date(currentTime),
                            end: new Date(currentTime.getTime() + 30 * 60 * 1000), // 30 minutes
                            duration: 0.5,
                            color: this.timelineColors.transport,
                            description: 'Transportation between locations'
                        });
                        currentTime.setTime(currentTime.getTime() + 30 * 60 * 1000);
                    }
                });
            }

            // Lunch
            if (currentTime.getHours() >= 12) {
                ganttItems.push({
                    id: itemId++,
                    type: 'meal',
                    name: 'Lunch',
                    start: new Date(currentTime),
                    end: new Date(currentTime.getTime() + 60 * 60 * 1000), // 1 hour
                    duration: 1,
                    color: this.timelineColors.meal,
                    description: 'Lunch break'
                });
                currentTime.setTime(currentTime.getTime() + 60 * 60 * 1000);
            }

            // Afternoon break
            if (currentTime.getHours() >= 15) {
                ganttItems.push({
                    id: itemId++,
                    type: 'break',
                    name: 'Rest/Shopping',
                    start: new Date(currentTime),
                    end: new Date(currentTime.getTime() + 60 * 60 * 1000), // 1 hour
                    duration: 1,
                    color: this.timelineColors.break,
                    description: 'Rest and shopping time'
                });
                currentTime.setTime(currentTime.getTime() + 60 * 60 * 1000);
            }

            // Dinner
            if (currentTime.getHours() >= 18) {
                ganttItems.push({
                    id: itemId++,
                    type: 'meal',
                    name: 'Dinner',
                    start: new Date(currentTime),
                    end: new Date(currentTime.getTime() + 90 * 60 * 1000), // 1.5 hours
                    duration: 1.5,
                    color: this.timelineColors.meal,
                    description: 'Evening meal'
                });
                currentTime.setTime(currentTime.getTime() + 90 * 60 * 1000);
            }
        }

        return ganttItems;
    }

    // Format date for display
    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Format time for display
    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false // Use 24-hour format for cleaner timeline display
        });
    }

    // Show Gantt chart in modal
    showGanttModal(tripData, ganttData, apiResults = null) {
        // Remove existing modal if any
        const existingModal = document.getElementById('ganttChartModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalContent = this.generateGanttHTML(tripData, ganttData, apiResults);
        
        const modal = document.createElement('div');
        modal.id = 'ganttChartModal';
        modal.className = 'gantt-chart-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()">
                <div class="modal-content gantt-modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header gantt-modal-header">
                        <h3><i class="fas fa-chart-gantt"></i> Trip Schedule - Gantt Chart</h3>
                        <div class="modal-actions">
                            <button class="btn btn-sm btn-outline-primary" onclick="ganttChartManager.exportGanttChart()">
                                <i class="fas fa-download"></i> Export
                            </button>
                            <button class="modal-close" onclick="this.closest('.gantt-chart-modal').remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="modal-body gantt-modal-body">
                        ${modalContent}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.addGanttStyles();
        
        // Show modal with animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    // Generate Gantt chart HTML
    generateGanttHTML(tripData, ganttData, apiResults = null) {
        // Use API schedule dates if available, otherwise use trip data
        let startDate, endDate, totalHours;
        
        if (apiResults && apiResults.schedule_start && apiResults.schedule_end) {
            startDate = new Date(apiResults.schedule_start);
            endDate = new Date(apiResults.schedule_end);
        } else {
            startDate = new Date(tripData.startDate + ' ' + tripData.startTime);
            endDate = new Date(tripData.endDate + ' ' + tripData.endTime);
        }
        
        // Normalize to full 24-hour days (00:00 to 23:59)
        const normalizedStartDate = new Date(startDate);
        normalizedStartDate.setHours(0, 0, 0, 0); // Set to 00:00:00
        
        const normalizedEndDate = new Date(endDate);
        normalizedEndDate.setHours(23, 59, 59, 999); // Set to 23:59:59
        
        // Use normalized dates for timeline calculation
        startDate = normalizedStartDate;
        endDate = normalizedEndDate;
        totalHours = (endDate - startDate) / (1000 * 60 * 60);
        
        // Calculate timeline parameters
        const pixelsPerHour = 40; // Width per hour
        const chartWidth = Math.max(800, totalHours * pixelsPerHour);
        
        // Get optimization method and total days from API if available
        const optimizationMethod = apiResults?.method || 'Manual Planning';
        const totalDays = apiResults?.total_days || Math.ceil(totalHours / 24);
        
        let ganttHTML = `
            <div class="gantt-header">
                <div class="gantt-trip-info">
                    <h4>Trip to ${tripData.province}</h4>
                    <p><strong>Duration:</strong> ${totalDays} days</p>
                    <p><strong>Period:</strong> ${this.formatDate(startDate)} - ${this.formatDate(endDate)}</p>
                    <p><strong>Method:</strong> ${optimizationMethod}</p>
                    <p><strong>Schedule:</strong> ${this.formatTime(startDate)} - ${this.formatTime(endDate)}</p>
                </div>
                <div class="gantt-legend">
                    <h5>Activity Legend:</h5>
                    <div class="legend-items">
                        ${Object.entries(this.timelineColors).map(([type, color]) => 
                            `<div class="legend-item">
                                <div class="legend-color" style="background-color: ${color};"></div>
                                <span>${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                            </div>`
                        ).join('')}
                    </div>
                </div>
            </div>
            
            <div class="gantt-container" style="width: ${chartWidth + 200}px;">
                <div class="gantt-timeline-header">
                    <div class="gantt-timeline-labels" style="width: ${chartWidth}px;">
                        ${this.generateTimelineLabels(startDate, endDate, pixelsPerHour)}
                    </div>
                </div>
                
                <div class="gantt-chart-body">
                    <div class="gantt-tasks">
                        ${ganttData.map(item => this.generateGanttBar(item, startDate, pixelsPerHour)).join('')}
                    </div>
                </div>
            </div>
            
            <div class="gantt-summary">
                <h5>Schedule Summary:</h5>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Activities:</span>
                        <span class="stat-value">${ganttData.filter(item => !item.isHeader).length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Duration:</span>
                        <span class="stat-value">${totalHours.toFixed(1)} hours</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Daily Average:</span>
                        <span class="stat-value">${(totalHours / totalDays).toFixed(1)} hours/day</span>
                    </div>
                    ${apiResults ? `
                    <div class="stat-item">
                        <span class="stat-label">Optimization:</span>
                        <span class="stat-value">${optimizationMethod}</span>
                    </div>` : ''}
                </div>
            </div>
        `;

        return ganttHTML;
    }

    // Generate timeline labels (hours/days)
    generateTimelineLabels(startDate, endDate, pixelsPerHour) {
        const labels = [];
        const totalHours = (endDate - startDate) / (1000 * 60 * 60);
        
        // Show timeline labels every 4 hours for better readability in 24-hour format
        for (let hour = 0; hour <= totalHours; hour += 4) {
            const labelTime = new Date(startDate.getTime() + hour * 60 * 60 * 1000);
            const position = hour * pixelsPerHour;
            
            labels.push(`
                <div class="timeline-label" style="left: ${position}px;">
                    <div class="timeline-time">${this.formatTime(labelTime)}</div>
                    <div class="timeline-date">${labelTime.toLocaleDateString()}</div>
                </div>
            `);
        }
        
        return labels.join('');
    }

    // Generate individual Gantt bar
    generateGanttBar(item, startDate, pixelsPerHour) {
        const startPosition = ((item.start - startDate) / (1000 * 60 * 60)) * pixelsPerHour;
        const width = item.duration * pixelsPerHour;
        
        const barClass = item.isHeader || item.type === 'day_header' ? 'gantt-day-header' : 'gantt-task-bar';
        
        // Special handling for day headers
        if (item.isHeader || item.type === 'day_header') {
            return `
                <div class="gantt-task ${barClass}" data-id="${item.id}">
                    <div class="task-label day-header-label">
                        <span class="task-name">${item.name}</span>
                        <span class="task-time">${item.description}</span>
                    </div>
                    <div class="task-bar day-header-bar" 
                         style="left: ${startPosition}px; width: ${width}px; background-color: ${item.color};"
                         title="${item.description}">
                        <span class="task-duration">${item.duration}h</span>
                    </div>
                </div>
            `;
        }
        
        // Regular activity bars
        return `
            <div class="gantt-task ${barClass}" data-id="${item.id}">
                <div class="task-label">
                    <span class="task-name">${item.name}</span>
                    <span class="task-time">${this.formatTime(item.start)} - ${this.formatTime(item.end)}</span>
                </div>
                <div class="task-bar" 
                     style="left: ${startPosition}px; width: ${width}px; background-color: ${item.color};"
                     title="${item.description}${item.coordinates ? ` | Coordinates: ${item.coordinates.join(', ')}` : ''}">
                    <span class="task-duration">${item.duration}h</span>
                </div>
            </div>
        `;
    }

    // Export Gantt chart data
    exportGanttChart() {
        if (!this.ganttData) {
            alert('No Gantt chart data to export!');
            return;
        }

        const exportData = {
            exportDate: new Date().toISOString(),
            tripId: this.currentEntryId,
            ganttData: this.ganttData,
            summary: {
                totalActivities: this.ganttData.length,
                totalDuration: this.ganttData.reduce((sum, item) => sum + item.duration, 0),
                activityTypes: [...new Set(this.ganttData.map(item => item.type))]
            }
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `gantt-chart-trip-${this.currentEntryId}-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        console.log('Gantt chart exported successfully');
    }

    // Add CSS styles for Gantt chart
    addGanttStyles() {
        if (document.getElementById('ganttChartStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'ganttChartStyles';
        style.textContent = `
            .gantt-chart-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            
            .gantt-chart-modal.show {
                opacity: 1;
                visibility: visible;
            }
            
            .gantt-chart-modal .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .gantt-modal-content {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                max-width: 95vw;
                max-height: 90vh;
                width: 1200px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                position: relative;
                z-index: 1001;
                isolation: isolate;
            }
            
            .gantt-modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid #e9ecef;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f8f9fa;
            }
            
            .gantt-modal-header h3 {
                margin: 0;
                color: #2c3e50;
                font-size: 1.25rem;
            }
            
            .modal-actions {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            
            .gantt-modal-body {
                padding: 20px;
                overflow-x: auto;
                overflow-y: auto;
                flex: 1;
            }
            
            .gantt-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .gantt-trip-info h4 {
                margin: 0 0 10px 0;
                color: #2c3e50;
            }
            
            .gantt-trip-info p {
                margin: 5px 0;
                color: #6c757d;
                font-size: 0.9rem;
            }
            
            .gantt-legend h5 {
                margin: 0 0 10px 0;
                color: #2c3e50;
            }
            
            .legend-items {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
            }
            
            .legend-item {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 0.8rem;
            }
            
            .legend-color {
                width: 12px;
                height: 12px;
                border-radius: 2px;
            }
            
            .gantt-container {
                border: 1px solid #dee2e6;
                border-radius: 8px;
                overflow-x: auto;
                background: white;
                margin-bottom: 20px;
                position: relative;
                z-index: 1;
            }
            
            .gantt-timeline-header {
                background: #e9ecef;
                padding: 10px 0;
                border-bottom: 2px solid #dee2e6;
                position: relative;
                z-index: 2;
            }
            
            .gantt-timeline-labels {
                position: relative;
                height: 40px;
                margin-left: 200px;
            }
            
            .timeline-label {
                position: absolute;
                border-left: 1px solid #adb5bd;
                padding-left: 5px;
                font-size: 0.75rem;
                color: #6c757d;
            }
            
            .timeline-time {
                font-weight: bold;
                color: #495057;
            }
            
            .timeline-date {
                font-size: 0.7rem;
                color: #6c757d;
            }
            
            .gantt-chart-body {
                position: relative;
                z-index: 1;
                isolation: isolate;
            }
            
            .gantt-task {
                display: flex;
                align-items: center;
                min-height: 40px;
                border-bottom: 1px solid #f1f3f4;
                position: relative;
                z-index: auto;
                height: 80px;
                overflow: visible;
            }
            
            .gantt-day-header {
                background: #e3f2fd;
                font-weight: bold;
                border-bottom: 2px solid #bbdefb;
                min-height: 45px;
                height: 45px;
                position: relative;
                overflow: visible;
            }
            
            .day-header-label {
                background: #1976d2 !important;
                color: white !important;
                font-weight: bold;
            }
            
            .day-header-bar {
                background: linear-gradient(135deg, #1976d2, #42a5f5) !important;
                height: 28px !important;
                border: 2px solid #0d47a1;
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                margin-left: 200px;
                z-index: 1;
            }
            
            .task-label {
                width: 200px;
                padding: 8px 12px;
                border-right: 1px solid #dee2e6;
                background: #f8f9fa;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }
            
            .task-name {
                font-weight: 500;
                color: #2c3e50;
                font-size: 0.85rem;
            }
            
            .task-time {
                font-size: 0.75rem;
                color: #6c757d;
                margin-top: 2px;
            }
            
            .task-bar {
                position: absolute;
                height: 24px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 0.7rem;
                font-weight: 500;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
                cursor: pointer;
                transition: all 0.2s ease;
                top: 50%;
                transform: translateY(-50%);
                margin-left: 200px;
                z-index: 1;
                min-width: 2px;
            }
            
            .task-bar:hover {
                transform: translateY(-50%) scale(1.02);
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
                z-index: 10;
            }
            
            .gantt-summary {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #dee2e6;
            }
            
            .gantt-summary h5 {
                margin: 0 0 10px 0;
                color: #2c3e50;
            }
            
            .summary-stats {
                display: flex;
                gap: 30px;
                flex-wrap: wrap;
            }
            
            .stat-item {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            
            .stat-label {
                font-size: 0.8rem;
                color: #6c757d;
                font-weight: 500;
            }
            
            .stat-value {
                font-size: 1.1rem;
                color: #2c3e50;
                font-weight: bold;
            }
            
            .modal-close {
                background: none;
                border: none;
                font-size: 1.2rem;
                cursor: pointer;
                color: #6c757d;
                padding: 5px;
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            
            .modal-close:hover {
                background: #e9ecef;
                color: #495057;
            }
            
            @media (max-width: 768px) {
                .gantt-modal-content {
                    width: 95vw;
                    max-height: 85vh;
                }
                
                .gantt-header {
                    flex-direction: column;
                    gap: 15px;
                }
                
                .legend-items {
                    gap: 10px;
                }
                
                .task-label {
                    width: 150px;
                }
                
                .summary-stats {
                    gap: 15px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Initialize Gantt Chart Manager
const ganttChartManager = new GanttChartManager();

// Make it globally accessible
window.ganttChartManager = ganttChartManager;

// Test function for manual testing from browser console
async function testGanttChart() {
    console.log("=== MANUAL GANTT CHART TEST (WITH API) ===");
    
    // Create test trip data
    const testTripData = {
        id: 999,
        province: "Seoul",
        startDate: "2025-10-15",
        startTime: "09:00",
        endDate: "2025-10-17",
        endTime: "18:00",
        duration: "3 days",
        hotels: ["Seoul Plaza Hotel", "Lotte Hotel"],
        attractions: ["Gyeongbokgung Palace", "Myeongdong", "Namsan Tower", "Hongdae"],
        timestamp: new Date().toISOString(),
        formattedTimestamp: new Date().toLocaleString()
    };
    
    // Temporarily add test data to trip history
    if (window.tripHistoryManager) {
        const originalData = window.tripHistoryManager.historyData;
        window.tripHistoryManager.historyData = [testTripData, ...originalData];
        
        console.log("✅ Test data added to trip history");
        console.log("Calling displayGanttChart with test data (will fetch from API)...");
        
        try {
            await ganttChartManager.displayGanttChart(999);
            console.log("✅ Gantt chart displayed successfully with API data");
        } catch (error) {
            console.error("❌ Error displaying Gantt chart:", error);
        }
        
        // Restore original data after 10 seconds
        setTimeout(() => {
            window.tripHistoryManager.historyData = originalData;
            console.log("✅ Original trip history data restored");
        }, 10000);
    } else {
        console.log("❌ Trip history manager not found");
    }
}

// Test function for direct API testing
async function testGanttAPI() {
    console.log("=== DIRECT API GANTT TEST ===");
    
    try {
        const response = await fetch('/tourism/api/test_api_call/');
        const data = await response.json();
        
        console.log("✅ API Response:", data);
        
        if (data.success && data.gantt_data) {
            console.log("✅ API has valid Gantt data");
            console.log("Days available:", Object.keys(data.gantt_data));
            console.log("Total activities:", 
                Object.values(data.gantt_data).reduce((sum, day) => sum + day.length, 0));
        } else {
            console.log("❌ API response doesn't have expected Gantt data structure");
        }
    } catch (error) {
        console.error("❌ Error fetching from API:", error);
    }
}

// Make test functions globally available
window.testGanttChart = testGanttChart;
window.testGanttAPI = testGanttAPI;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GanttChartManager;
}