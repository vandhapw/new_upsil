/**
 * DisplayLineResult - Class to display route optimization results from API
 * Fetches data from Django API and displays markers and path lines on the map
 */
class DisplayLineResult {
    constructor() {
        this.map = null;
        this.routeData = null;
        this.markers = [];
        this.pathLines = [];
        this.routeLayerGroup = null;
        this.colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#95a5a6'];
        this.apiUrl = '/tourism/api/test_api_call_3/';
        
        this.init();
    }

    init() {
        // Get map instance from displayMap
        if (window.displayMapInstance && window.displayMapInstance.isMapReady()) {
            this.map = window.displayMapInstance.getMap();
            console.log("DisplayLineResult initialized with displayMapInstance");
        } else if (window.map) {
            this.map = window.map;
            console.log("DisplayLineResult initialized with global map");
        } else {
            console.error("No map instance found. Waiting for map to be ready...");
            // Wait for map to be ready
            setTimeout(() => this.init(), 500);
            return;
        }

        // Initialize layer group for route visualization
        this.routeLayerGroup = L.layerGroup().addTo(this.map);
        
        // Set up event listeners and UI
        this.setupEventListeners();
   
    }

    setupEventListeners() {
        // Listen for custom events
        document.addEventListener('loadRouteFromAPI', () => {
            this.loadRouteFromAPI();
        });

        document.addEventListener('clearRoute', () => {
            this.clearRouteVisualization();
        });

        // Listen for trip optimization completion
        document.addEventListener('tripOptimizationComplete', (event) => {
            if (event.detail && event.detail.routeData) {
                this.displayRouteResults(event.detail.routeData);
            }
        });

        // Listen for route visualization requests
        document.addEventListener('showRouteVisualization', (event) => {
            if (event.detail && event.detail.routeData) {
                this.displayRouteResults(event.detail.routeData);
            } else {
                this.loadRouteFromAPI();
            }
        });
    }

    /**
     * Create route control buttons that integrate with existing map controls
     */


    /**
     * Create route controls as Leaflet controls (integrated approach)
     */
    

    /**
     * Create standalone route controls (fallback approach)
     */
    createStandaloneRouteControls() {
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'route-control-buttons';
        buttonContainer.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;

        // Load Route button
        const loadButton = document.createElement('button');
        loadButton.innerHTML = '<i class="fas fa-route"></i> Load Route';
        loadButton.className = 'btn-load-route';
        loadButton.style.cssText = `
            background: #3498db;
            color: white;
            border: none;
            padding: 12px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        loadButton.addEventListener('click', () => {
            this.loadRouteFromAPI();
        });

        // Clear Route button
        const clearButton = document.createElement('button');
        clearButton.innerHTML = '<i class="fas fa-trash"></i> Clear';
        clearButton.className = 'btn-clear-route';
        clearButton.style.cssText = `
            background: #e74c3c;
            color: white;
            border: none;
            padding: 12px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        clearButton.addEventListener('click', () => {
            this.clearRouteVisualization();
        });

        // Add buttons to container
        buttonContainer.appendChild(loadButton);
        buttonContainer.appendChild(clearButton);

        // Add to document
        document.body.appendChild(buttonContainer);

        console.log("Standalone route controls created");
    }

    /**
     * Load route data from the Django API (using dummy data for testing)
     */
    
    async loadRouteFromAPI() {
        try {
            console.log("Loading route data from dummy JSON file");
            
            // Show loading indicator
            this.showLoadingIndicator(true);
            
            // Load dummy data from static JSON file with cache busting
            const cacheBuster = new Date().getTime();
            // const response = await fetch(`/static/js/tourism/json_dummy.json?v=${cacheBuster}`);
            const response = await fetch(`${this.apiUrl}?v=${cacheBuster}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Raw JSON Data Response:", data);
            console.log("Data type:", typeof data);
            console.log("Data keys:", data ? Object.keys(data) : 'null');
            
            // Display the route data
            this.displayRouteResults(data);

        } catch (error) {
            console.error("Error loading route from dummy data:", error);
            this.showError("Failed to load route data: " + error.message);
        } finally {
            this.showLoadingIndicator(false);
        }
    }

    /**
     * Main method to display route optimization results
     * @param {Object} resultsData - The optimization results from API
     */
    displayRouteResults(resultsData) {
        console.log("Displaying route optimization results:", resultsData);
        console.log("Results data structure check:", {
            hasResultsData: !!resultsData,
            hasSuccess: resultsData && !!resultsData.success,
            hasData: resultsData && !!resultsData.data,
            hasResults: resultsData && resultsData.data && !!resultsData.data.results,
            resultsKeys: resultsData ? Object.keys(resultsData) : 'null',
            dataKeys: resultsData && resultsData.data ? Object.keys(resultsData.data) : 'null',
            resultsSubKeys: resultsData && resultsData.data && resultsData.data.results ? Object.keys(resultsData.data.results) : 'null'
        });
        
        // Handle the new nested data structure: data.results
        let actualResults = null;
        
        if (resultsData && resultsData.data && resultsData.data.results) {
            // New format: { success: true, data: { success: true, results: {...} } }
            actualResults = resultsData.data.results;
        } else if (resultsData && resultsData.results) {
            // Legacy format: { success: true, results: {...} }
            actualResults = resultsData.results;
        } else {
            console.error("Invalid results data provided - no results found");
            this.showError("Invalid route data received from API");
            return;
        }

        // Check for success flag if present
        if (resultsData.hasOwnProperty('success') && !resultsData.success) {
            console.error("API returned success: false");
            this.showError("Route optimization failed");
            return;
        }

        // Additional check for nested success flag
        if (resultsData.data && resultsData.data.hasOwnProperty('success') && !resultsData.data.success) {
            console.error("API data returned success: false");
            this.showError("Route optimization failed");
            return;
        }

        // Clear previous visualization BEFORE assigning new data
        this.clearVisualizationOnly();

        this.routeData = actualResults;
        console.log("Route data assigned:", this.routeData);
        console.log("Route data after assignment check:", {
            routeData: this.routeData,
            hasPathLines: this.routeData && !!this.routeData.path_lines,
            pathLinesLength: this.routeData && this.routeData.path_lines ? this.routeData.path_lines.length : 'no path_lines'
        });
        
        // Verify the assignment worked
        if (!this.routeData) {
            console.error("Failed to assign route data");
            this.showError("Failed to process route data");
            return;
        }
        
        // Display route information
        this.displayRouteInfo();
        
        // Display markers and path lines
        this.displayMarkersAndPaths();
        
        // Fit map to route bounds
        this.fitMapToRoute();
        
        // Show route summary
        this.showRouteSummary();
    }

    /**
     * Display route optimization information in console
     */
    displayRouteInfo() {
        const routeInfo = this.routeData;
        
        // Add debugging to check the data structure
        console.log("Route data check:", {
            routeInfo: routeInfo,
            hasRouteInfo: !!routeInfo,
            hasBestRoute: routeInfo && routeInfo.best_route,
            hasMultiDay: routeInfo && (routeInfo.n_days || routeInfo.day1_schedule),
            keys: routeInfo ? Object.keys(routeInfo) : 'null'
        });
        
        if (!routeInfo) {
            console.error("Route info is null or undefined");
            return;
        }
        
        // Check if this is multi-day format
        if (routeInfo.n_days && routeInfo.n_days > 1) {
            console.log(`Multi-Day Route Optimization Results:
        - Number of Days: ${routeInfo.n_days}
        - Best Fitness: ${routeInfo.best_fitness}
        - Best Is Feasible: ${routeInfo.best_is_feasible}
        - Total Distance: ${routeInfo.total_distance}m (${(routeInfo.total_distance/1000).toFixed(2)}km)
        - Execution Time: ${routeInfo.execution_time.toFixed(2)}s
        - Feasible Solutions: ${routeInfo.feasible_solutions_pct}%
        - Improvement: ${routeInfo.improvement_percentage.toFixed(1)}%`);
            
            // Log day-specific information
            for (let day = 1; day <= routeInfo.n_days; day++) {
                const dayRoute = routeInfo[`day${day}_route`] || routeInfo[`day${day}`];
                const dayDistance = routeInfo[`day${day}_distance`];
                const daySchedule = routeInfo[`day${day}_schedule`];
                
                if (dayRoute || daySchedule) {
                    console.log(`Day ${day}:`, {
                        route: dayRoute,
                        distance: dayDistance ? `${dayDistance}m` : 'N/A',
                        feasible: daySchedule ? daySchedule.feasible : 'N/A',
                        duration: daySchedule ? `${daySchedule.total_duration_minutes} min` : 'N/A',
                        endTime: daySchedule ? daySchedule.end_time : 'N/A'
                    });
                }
            }
            return;
        }
        
        // Fallback to original single-day format
        if (!routeInfo.best_route) {
            console.error("Best route data is missing");
            return;
        }
        
        console.log(`Route Optimization Results:
        - Best Route: ${routeInfo.best_route.join(' → ')}
        - Total Distance: ${routeInfo.best_distance}m (${(routeInfo.best_distance/1000).toFixed(2)}km)
        - Execution Time: ${routeInfo.execution_time.toFixed(2)}s
        - Generations: ${routeInfo.generations}
        - Improvement: ${routeInfo.improvement_percentage.toFixed(1)}%`);
    }

    /**
     * Display markers for each location and path lines between them
     */
    displayMarkersAndPaths() {
        console.log("displayMarkersAndPaths called");
        console.log("this.routeData:", this.routeData);
        console.log("this.routeData type:", typeof this.routeData);
        
        if (!this.routeData) {
            console.error("Route data is null or undefined in displayMarkersAndPaths");
            this.showError("Route data is not available for visualization");
            return;
        }
        
        // Check for multi-day format first
        const hasMultiDayData = this.routeData.day1_path_lines || this.routeData.day2_path_lines || this.routeData.day3_path_lines;
        
        if (hasMultiDayData) {
            console.log("Processing multi-day route data");
            this.displayMultiDayRoute();
            return;
        }
        
        // Fallback to original single-day format
        const pathLines = this.routeData.path_lines;
        console.log("pathLines:", pathLines);
        
        if (!pathLines || pathLines.length === 0) {
            console.warn("No path lines found in route data");
            this.showError("No path data available for visualization");
            return;
        }

        // Track unique locations to avoid duplicate markers
        const locationMarkers = new Map();
        let sequenceNumber = 1;

        // Process each path segment
        pathLines.forEach((segment, index) => {
            console.log(`Processing segment ${index + 1}:`, segment.source_name, "→", segment.destination_name);

            // Extract coordinates from source and destination
            const sourceCoords = this.extractCoordinates(segment.source_coords);
            const destCoords = this.extractCoordinates(segment.destination_coords);

            // Add source marker (if not already added)
            if (!locationMarkers.has(segment.source_name)) {
                const sourceMarker = this.createLocationMarker(
                    segment.source_name,
                    sourceCoords,
                    sequenceNumber,
                    'source',
                    index === 0 // First location is the start
                );
                locationMarkers.set(segment.source_name, sourceMarker);
                sequenceNumber++;
            }

            // Add destination marker (if not already added)
            if (!locationMarkers.has(segment.destination_name)) {
                const destMarker = this.createLocationMarker(
                    segment.destination_name,
                    destCoords,
                    sequenceNumber,
                    'destination',
                    false
                );
                locationMarkers.set(segment.destination_name, destMarker);
                sequenceNumber++;
            }

            // Add path line
            this.createPathLine(segment, index);
        });

        console.log(`Created ${locationMarkers.size} location markers and ${pathLines.length} path lines`);
    }

    /**
     * Display multi-day route with day-specific path lines and schedules
     */
    displayMultiDayRoute() {
        console.log("Processing multi-day route data");
        
        const dayColors = {
            1: '#e74c3c', // Red for day 1
            2: '#3498db', // Blue for day 2  
            3: '#2ecc71', // Green for day 3
            4: '#f39c12', // Orange for day 4
            5: '#9b59b6', // Purple for day 5
            6: '#1abc9c', // Teal for day 6
            7: '#e67e22'  // Dark orange for day 7
        };

        // Track unique locations to avoid duplicate markers
        const locationMarkers = new Map();
        let globalSequenceNumber = 1;
        let totalSegments = 0;

        // Process each day's path lines
        for (let day = 1; day <= 7; day++) {
            const dayPathLinesKey = `day${day}_path_lines`;
            const dayScheduleKey = `day${day}_schedule`;
            
            if (this.routeData[dayPathLinesKey] && this.routeData[dayPathLinesKey].length > 0) {
                console.log(`Processing Day ${day} with ${this.routeData[dayPathLinesKey].length} segments`);
                
                const dayPathLines = this.routeData[dayPathLinesKey];
                const daySchedule = this.routeData[dayScheduleKey];
                const dayColor = dayColors[day];
                
                // Process each segment for this day
                dayPathLines.forEach((segment, segmentIndex) => {
                    console.log(`Day ${day}, Segment ${segmentIndex + 1}:`, segment.source_name, "→", segment.destination_name);
                    
                    const sourceCoords = this.extractCoordinates(segment.source_coords);
                    const destCoords = this.extractCoordinates(segment.destination_coords);

                    // Add source marker (if not already added)
                    const sourceKey = `${segment.source_name}_${sourceCoords[0]}_${sourceCoords[1]}`;
                    if (!locationMarkers.has(sourceKey)) {
                        const sourceMarker = this.createMultiDayLocationMarker(
                            segment.source_name,
                            sourceCoords,
                            globalSequenceNumber,
                            day,
                            'source',
                            dayColor,
                            segmentIndex === 0 && day === 1, // First location of first day is the start
                            daySchedule
                        );
                        locationMarkers.set(sourceKey, sourceMarker);
                        globalSequenceNumber++;
                    }

                    // Add destination marker (if not already added)
                    const destKey = `${segment.destination_name}_${destCoords[0]}_${destCoords[1]}`;
                    if (!locationMarkers.has(destKey)) {
                        const destMarker = this.createMultiDayLocationMarker(
                            segment.destination_name,
                            destCoords,
                            globalSequenceNumber,
                            day,
                            'destination',
                            dayColor,
                            false,
                            daySchedule
                        );
                        locationMarkers.set(destKey, destMarker);
                        globalSequenceNumber++;
                    }

                    // Add path line for this segment
                    this.createMultiDayPathLine(segment, totalSegments, day, dayColor);
                    totalSegments++;
                });
            }
        }

        console.log(`Created ${locationMarkers.size} location markers and ${totalSegments} path lines across ${this.getActiveDaysCount()} days`);
    }

    /**
     * Get count of active days with path lines
     */
    getActiveDaysCount() {
        let activeDays = 0;
        for (let day = 1; day <= 7; day++) {
            const dayPathLinesKey = `day${day}_path_lines`;
            if (this.routeData[dayPathLinesKey] && this.routeData[dayPathLinesKey].length > 0) {
                activeDays++;
            }
        }
        return activeDays;
    }

    /**
     * Create a marker for a location in multi-day format
     */
    createMultiDayLocationMarker(locationName, coordinates, sequence, day, type, dayColor, isStart = false, daySchedule = null) {
        // Determine marker style
        let markerColor = dayColor;
        let borderColor = 'white';
        let textColor = 'white';
        
        if (isStart) {
            borderColor = '#27ae60';
        }
        
        // Create custom icon with day indicator
        const markerIcon = L.divIcon({
            className: 'custom-multi-day-marker',
            html: `<div class="marker-content" style="
                background-color: ${markerColor};
                border: 3px solid ${borderColor};
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: ${textColor};
                font-weight: bold;
                font-size: 12px;
                box-shadow: 0 3px 6px rgba(0,0,0,0.4);
                position: relative;
            ">
                <div style="text-align: center; line-height: 1;">
                    <div style="font-size: 10px;">D${day}</div>
                    <div style="font-size: 14px;">${sequence}</div>
                </div>
            </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        // Create marker
        const marker = L.marker(coordinates, { icon: markerIcon });
        
        // Find schedule info for this location
        let scheduleInfo = '';
        if (daySchedule && daySchedule.timeline) {
            const locationSchedule = daySchedule.timeline.find(item => 
                item.location === locationName || 
                item.from === locationName || 
                item.to === locationName
            );
            
            if (locationSchedule) {
                if (locationSchedule.type === 'visit') {
                    scheduleInfo = `
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                            <strong>Visit Schedule:</strong><br>
                            <span style="color: #27ae60;"><i class="fas fa-clock"></i> ${locationSchedule.start_time} - ${locationSchedule.end_time}</span><br>
                            <span style="color: #666;">Duration: ${locationSchedule.duration_minutes} minutes</span>
                        </div>
                    `;
                } else if (locationSchedule.type === 'travel') {
                    scheduleInfo = `
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                            <strong>Travel:</strong><br>
                            <span style="color: #3498db;"><i class="fas fa-route"></i> ${locationSchedule.start_time} - ${locationSchedule.end_time}</span><br>
                            <span style="color: #666;">Distance: ${locationSchedule.distance_meters}m</span>
                        </div>
                    `;
                }
            }
        }
        
        // Create popup content
        const popupContent = `
            <div class="multi-day-marker-popup" style="min-width: 220px;">
                <h4 style="margin: 0 0 10px 0; color: ${markerColor}; font-size: 16px;">
                    <i class="fas fa-map-marker-alt"></i> ${locationName}
                </h4>
                <div style="font-size: 13px; color: #555; line-height: 1.4;">
                    <p style="margin: 6px 0;"><strong>Day:</strong> <span style="color: ${markerColor}; font-weight: bold;">Day ${day}</span></p>
                    <p style="margin: 6px 0;"><strong>Sequence:</strong> ${sequence}</p>
                    <p style="margin: 6px 0;"><strong>Type:</strong> ${isStart ? 'Start Location' : type.charAt(0).toUpperCase() + type.slice(1)}</p>
                    <p style="margin: 6px 0;"><strong>Coordinates:</strong> ${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}</p>
                    ${isStart ? '<p style="margin: 6px 0; color: #27ae60; font-weight: bold;"><i class="fas fa-play"></i> Starting Point</p>' : ''}
                    ${scheduleInfo}
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        
        // Add to route layer group
        marker.addTo(this.routeLayerGroup);
        this.markers.push(marker);
        
        return marker;
    }

    /**
     * Create a path line for multi-day routes
     */
    createMultiDayPathLine(segment, index, day, dayColor) {
        if (!segment.path_coordinates || segment.path_coordinates.length === 0) {
            console.warn(`No path coordinates found for Day ${day} segment: ${segment.source_name} → ${segment.destination_name}`);
            return;
        }

        // Convert coordinates to Leaflet format [lat, lng]
        const pathCoords = segment.path_coordinates.map((coord, coordIndex) => {
            // Handle different coordinate formats
            if (Array.isArray(coord) && coord.length >= 2) {
                return [coord[0], coord[1]]; // Assuming [lat, lng] format
            } else if (coord && typeof coord === 'object' && coord.lat && coord.lon) {
                return [coord.lat, coord.lon];
            } else {
                console.warn(`Invalid coordinate format at index ${coordIndex}:`, coord);
                return null;
            }
        }).filter(coord => coord !== null);

        if (pathCoords.length === 0) {
            console.warn("No valid coordinates found for path line");
            return;
        }
        
        // Create polyline with day-specific styling
        const pathLine = L.polyline(pathCoords, {
            color: dayColor,
            weight: 6,
            opacity: 0.8,
            smoothFactor: 1,
            lineCap: 'round',
            lineJoin: 'round',
            dashArray: day > 1 ? '10, 5' : null // Dashed lines for subsequent days
        });

        // Calculate approximate distance
        const distance = this.calculatePathDistance(pathCoords);

        // Create popup content
        const popupContent = `
            <div class="multi-day-path-popup" style="min-width: 250px;">
                <h4 style="margin: 0 0 10px 0; color: ${dayColor}; font-size: 16px;">
                    <i class="fas fa-route"></i> Day ${day} - Segment ${segment.segment || (index + 1)}
                </h4>
                <div style="font-size: 13px; line-height: 1.4;">
                    <p style="margin: 6px 0;"><strong>From:</strong> ${segment.source_name}</p>
                    <p style="margin: 6px 0;"><strong>To:</strong> ${segment.destination_name}</p>
                    <p style="margin: 6px 0;"><strong>Day:</strong> <span style="color: ${dayColor}; font-weight: bold;">Day ${day}</span></p>
                    <p style="margin: 6px 0;"><strong>Path Points:</strong> ${pathCoords.length}</p>
                    <p style="margin: 6px 0;"><strong>Distance:</strong> ${distance.toFixed(2)} km</p>
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
                        Multi-day tourism route optimization
                    </div>
                </div>
            </div>
        `;
        
        pathLine.bindPopup(popupContent);
        
        // Add to route layer group
        pathLine.addTo(this.routeLayerGroup);
        this.pathLines.push(pathLine);

        // Add hover effects
        pathLine.on('mouseover', function(e) {
            e.target.setStyle({
                weight: 8,
                opacity: 1
            });
        });

        pathLine.on('mouseout', function(e) {
            e.target.setStyle({
                weight: 6,
                opacity: 0.8
            });
        });

        console.log(`Created Day ${day} path line: ${segment.source_name} → ${segment.destination_name} (${pathCoords.length} points, ${distance.toFixed(2)} km)`);
    }

    /**
     * Extract coordinates from various formats
     * @param {*} coords - Coordinate data (number, array, or object)
     * @returns {Array} [lat, lng] coordinates
     */
    extractCoordinates(coords) {
        // Handle different coordinate formats
        if (typeof coords === 'number') {
            // If it's a single number, it might be latitude, use a default longitude
            return [coords, 110.4]; // Default longitude for Indonesia area
        } else if (Array.isArray(coords) && coords.length >= 2) {
            return [coords[0], coords[1]]; // [lat, lng]
        } else if (coords && typeof coords === 'object' && coords.lat && coords.lon) {
            return [coords.lat, coords.lon];
        } else {
            console.warn("Invalid coordinate format:", coords);
            return [-7.0, 110.4]; // Default coordinates for Central Java
        }
    }

    /**
     * Create a marker for a location
     * @param {string} locationName - Name of the location
     * @param {Array} coordinates - [lat, lng] coordinates
     * @param {number} sequence - Sequence number in the route
     * @param {string} type - 'source' or 'destination'
     * @param {boolean} isStart - Whether this is the starting location
     * @returns {L.Marker} The created marker
     */
    createLocationMarker(locationName, coordinates, sequence, type, isStart = false) {
        // Determine marker color based on type and position
        let color;
        if (isStart) {
            color = '#27ae60'; // Green for start
        } else if (type === 'source') {
            color = '#e74c3c'; // Red for source
        } else {
            color = '#3498db'; // Blue for destination
        }
        
        // Create custom icon
        const markerIcon = L.divIcon({
            className: 'custom-route-marker',
            html: `<div class="marker-content" style="
                background-color: ${color};
                border: 3px solid white;
                border-radius: 50%;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 14px;
                box-shadow: 0 3px 6px rgba(0,0,0,0.4);
                position: relative;
            ">${sequence}</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });

        // Create marker
        const marker = L.marker(coordinates, { icon: markerIcon });
        
        // Create popup content
        const popupContent = `
            <div class="route-marker-popup" style="min-width: 200px;">
                <h4 style="margin: 0 0 10px 0; color: ${color}; font-size: 16px;">
                    <i class="fas fa-map-marker-alt"></i> ${locationName}
                </h4>
                <div style="font-size: 13px; color: #555; line-height: 1.4;">
                    <p style="margin: 6px 0;"><strong>Sequence:</strong> ${sequence}</p>
                    <p style="margin: 6px 0;"><strong>Type:</strong> ${isStart ? 'Start Location' : type.charAt(0).toUpperCase() + type.slice(1)}</p>
                    <p style="margin: 6px 0;"><strong>Coordinates:</strong> ${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}</p>
                    ${isStart ? '<p style="margin: 6px 0; color: #27ae60; font-weight: bold;"><i class="fas fa-play"></i> Starting Point</p>' : ''}
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        
        // Add to route layer group
        marker.addTo(this.routeLayerGroup);
        this.markers.push(marker);
        
        return marker;
    }

    /**
     * Create a path line between two locations
     * @param {Object} segment - Path segment data
     * @param {number} index - Segment index for styling
     */
    createPathLine(segment, index) {
        if (!segment.path_coordinates || segment.path_coordinates.length === 0) {
            console.warn(`No path coordinates found for segment: ${segment.source_name} → ${segment.destination_name}`);
            return;
        }

        // Convert coordinates to Leaflet format [lat, lng]
        const pathCoords = segment.path_coordinates.map((coord, coordIndex) => {
            // Handle different coordinate formats
            if (Array.isArray(coord) && coord.length >= 2) {
                return [coord[0], coord[1]]; // Assuming [lat, lng] format
            } else if (coord && typeof coord === 'object' && coord.lat && coord.lon) {
                return [coord.lat, coord.lon];
            } else {
                console.warn(`Invalid coordinate format at index ${coordIndex}:`, coord);
                return null;
            }
        }).filter(coord => coord !== null);

        if (pathCoords.length === 0) {
            console.warn("No valid coordinates found for path line");
            return;
        }

        // Get color for this segment
        const color = this.colors[index % this.colors.length];
        
        // Create polyline with enhanced styling
        const pathLine = L.polyline(pathCoords, {
            color: color,
            weight: 5,
            opacity: 0.8,
            smoothFactor: 1,
            lineCap: 'round',
            lineJoin: 'round'
        });

        // Calculate approximate distance
        const distance = this.calculatePathDistance(pathCoords);

        // Create popup content
        const popupContent = `
            <div class="path-line-popup" style="min-width: 220px;">
                <h4 style="margin: 0 0 10px 0; color: ${color}; font-size: 16px;">
                    <i class="fas fa-route"></i> Route Segment ${index + 1}
                </h4>
                <div style="font-size: 13px; line-height: 1.4;">
                    <p style="margin: 6px 0;"><strong>From:</strong> ${segment.source_name}</p>
                    <p style="margin: 6px 0;"><strong>To:</strong> ${segment.destination_name}</p>
                    <p style="margin: 6px 0;"><strong>Path Points:</strong> ${pathCoords.length}</p>
                    <p style="margin: 6px 0;"><strong>Distance:</strong> ${distance.toFixed(2)} km</p>
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
                        Click and drag to explore the route
                    </div>
                </div>
            </div>
        `;
        
        pathLine.bindPopup(popupContent);
        
        // Add to route layer group
        pathLine.addTo(this.routeLayerGroup);
        this.pathLines.push(pathLine);

        // Add hover effects
        pathLine.on('mouseover', function(e) {
            e.target.setStyle({
                weight: 7,
                opacity: 1
            });
        });

        pathLine.on('mouseout', function(e) {
            e.target.setStyle({
                weight: 5,
                opacity: 0.8
            });
        });

        console.log(`Created path line: ${segment.source_name} → ${segment.destination_name} (${pathCoords.length} points, ${distance.toFixed(2)} km)`);
    }

    /**
     * Calculate approximate distance of a path
     * @param {Array} pathCoords - Array of [lat, lng] coordinates
     * @returns {number} Distance in kilometers
     */
    calculatePathDistance(pathCoords) {
        let totalDistance = 0;
        
        for (let i = 0; i < pathCoords.length - 1; i++) {
            const point1 = L.latLng(pathCoords[i]);
            const point2 = L.latLng(pathCoords[i + 1]);
            totalDistance += point1.distanceTo(point2);
        }
        
        return totalDistance / 1000; // Convert to kilometers
    }

    /**
     * Fit the map view to show the entire route
     */
    fitMapToRoute() {
        if (this.routeLayerGroup.getLayers().length === 0) {
            console.warn("No route data to fit map bounds");
            return;
        }

        try {
            const group = new L.featureGroup(this.routeLayerGroup.getLayers());
            this.map.fitBounds(group.getBounds().pad(0.1));
            console.log("Map fitted to route bounds");
        } catch (error) {
            console.error("Error fitting map to route bounds:", error);
        }
    }

    /**
     * Show route optimization summary
     */
    showRouteSummary() {
        const routeInfo = this.routeData;
        
        // Create or update route summary panel
        let summaryPanel = document.getElementById('routeSummaryPanel');
        if (!summaryPanel) {
            summaryPanel = this.createRouteSummaryPanel();
        }

        // Calculate total path distance
        const totalPathDistance = this.pathLines.reduce((total, pathLine) => {
            const coords = pathLine.getLatLngs();
            return total + this.calculatePathDistance(coords.map(ll => [ll.lat, ll.lng]));
        }, 0);

        // Check if this is multi-day format
        const isMultiDay = routeInfo.n_days && routeInfo.n_days > 1;
        
        let summaryContent = '';
        
        if (isMultiDay) {
            // Multi-day summary
            summaryContent = `
                <div class="route-summary-header">
                    <h3><i class="fas fa-calendar-alt"></i> Multi-Day Route Optimization Results</h3>
                    <button id="closeSummary" class="close-btn">&times;</button>
                </div>
                <div class="route-summary-content">
                    <div class="summary-item">
                        <span class="label">Number of Days:</span>
                        <span class="value">${routeInfo.n_days}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Best Fitness:</span>
                        <span class="value">${routeInfo.best_fitness.toFixed(2)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Best Is Feasible:</span>
                        <span class="value">${routeInfo.best_is_feasible ? 'Yes' : 'No'}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Total Distance:</span>
                        <span class="value">${routeInfo.total_distance}m (${(routeInfo.total_distance/1000).toFixed(2)}km)</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Path Distance:</span>
                        <span class="value">${totalPathDistance.toFixed(2)} km</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Execution Time:</span>
                        <span class="value">${routeInfo.execution_time.toFixed(2)} seconds</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Feasible Solutions:</span>
                        <span class="value">${routeInfo.feasible_solutions_pct}%</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Improvement:</span>
                        <span class="value">${routeInfo.improvement_percentage.toFixed(1)}%</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Active Days:</span>
                        <span class="value">${this.getActiveDaysCount()}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Total Segments:</span>
                        <span class="value">${this.pathLines.length}</span>
                    </div>
                </div>
                <div class="day-details">
                    <h4 style="margin: 15px 0 10px 0; color: #2c3e50;"><i class="fas fa-calendar-day"></i> Daily Breakdown</h4>
                    ${this.generateDayBreakdown()}
                </div>
            `;
        } else {
            // Single-day summary (original format)
            summaryContent = `
                <div class="route-summary-header">
                    <h3><i class="fas fa-route"></i> Route Optimization Results</h3>
                    <button id="closeSummary" class="close-btn">&times;</button>
                </div>
                <div class="route-summary-content">
                    <div class="summary-item">
                        <span class="label">Route Sequence:</span>
                        <span class="value">${routeInfo.best_route.join(' → ')}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Total Distance:</span>
                        <span class="value">${routeInfo.best_distance}m (${(routeInfo.best_distance/1000).toFixed(2)}km)</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Path Distance:</span>
                        <span class="value">${totalPathDistance.toFixed(2)} km</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Execution Time:</span>
                        <span class="value">${routeInfo.execution_time.toFixed(2)} seconds</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Generations:</span>
                        <span class="value">${routeInfo.generations}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Improvement:</span>
                        <span class="value">${routeInfo.improvement_percentage.toFixed(1)}%</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Path Segments:</span>
                        <span class="value">${routeInfo.path_lines.length}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Total Coordinates:</span>
                        <span class="value">${routeInfo.path_lines.reduce((total, segment) => total + (segment.path_coordinates ? segment.path_coordinates.length : 0), 0)}</span>
                    </div>
                </div>
            `;
        }
        
        // Add action buttons
        summaryContent += `
            <div class="route-summary-actions">
                <button id="exportRoute" class="btn btn-primary">
                    <i class="fas fa-download"></i> Export Route
                </button>
                <button id="reloadRoute" class="btn btn-success">
                    <i class="fas fa-sync"></i> Reload Route
                </button>
            </div>
        `;

        // Update summary content
        summaryPanel.innerHTML = summaryContent;

        // Show the panel
        summaryPanel.style.display = 'block';

        // Add event listeners
        document.getElementById('closeSummary').addEventListener('click', () => {
            summaryPanel.style.display = 'none';
        });

        document.getElementById('exportRoute').addEventListener('click', () => {
            this.exportRouteData();
        });

        document.getElementById('reloadRoute').addEventListener('click', () => {
            this.loadRouteFromAPI();
        });
    }

    /**
     * Generate day-by-day breakdown for multi-day routes
     */
    generateDayBreakdown() {
        let breakdown = '';
        const dayColors = {
            1: '#e74c3c', 2: '#3498db', 3: '#2ecc71', 4: '#f39c12', 
            5: '#9b59b6', 6: '#1abc9c', 7: '#e67e22'
        };

        for (let day = 1; day <= 7; day++) {
            const dayScheduleKey = `day${day}_schedule`;
            const dayRouteKey = `day${day}_route`;
            const dayDistanceKey = `day${day}_distance`;
            const dayPathLinesKey = `day${day}_path_lines`;
            
            const daySchedule = this.routeData[dayScheduleKey];
            const dayRoute = this.routeData[dayRouteKey];
            const dayDistance = this.routeData[dayDistanceKey];
            const dayPathLines = this.routeData[dayPathLinesKey];
            
            if (daySchedule || dayRoute || dayPathLines) {
                const dayColor = dayColors[day];
                
                breakdown += `
                    <div class="day-item" style="margin-bottom: 12px; padding: 10px; border-left: 4px solid ${dayColor}; background: #f8f9fa;">
                        <h5 style="margin: 0 0 8px 0; color: ${dayColor};"><i class="fas fa-calendar-day"></i> Day ${day}</h5>
                        <div style="font-size: 12px; line-height: 1.4;">
                `;
                
                if (dayRoute) {
                    breakdown += `<p style="margin: 3px 0;"><strong>Route:</strong> ${Array.isArray(dayRoute) ? dayRoute.join(' → ') : dayRoute}</p>`;
                }
                
                if (dayDistance !== undefined) {
                    breakdown += `<p style="margin: 3px 0;"><strong>Distance:</strong> ${dayDistance}m (${(dayDistance/1000).toFixed(2)}km)</p>`;
                }
                
                if (daySchedule) {
                    breakdown += `
                        <p style="margin: 3px 0;"><strong>Duration:</strong> ${daySchedule.total_duration_minutes} minutes</p>
                        <p style="margin: 3px 0;"><strong>Feasible:</strong> ${daySchedule.feasible ? 'Yes' : 'No'}</p>
                        <p style="margin: 3px 0;"><strong>End Time:</strong> ${daySchedule.end_time}</p>
                    `;
                    
                    if (daySchedule.timeline && daySchedule.timeline.length > 0) {
                        const visitCount = daySchedule.timeline.filter(item => item.type === 'visit').length;
                        breakdown += `<p style="margin: 3px 0;"><strong>Activities:</strong> ${visitCount} visits, ${daySchedule.timeline.length} total activities</p>`;
                    }
                }
                
                if (dayPathLines && dayPathLines.length > 0) {
                    breakdown += `<p style="margin: 3px 0;"><strong>Segments:</strong> ${dayPathLines.length} path segments</p>`;
                }
                
                breakdown += `
                        </div>
                    </div>
                `;
            }
        }
        
        return breakdown || '<p style="color: #666; font-style: italic;">No day-specific data available</p>';
    }

    /**
     * Create the route summary panel
     */
    createRouteSummaryPanel() {
        const panel = document.createElement('div');
        panel.id = 'routeSummaryPanel';
        panel.className = 'route-summary-panel';
        
        // Add CSS styles
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            width: 380px;
            max-height: 80vh;
            background: white;
            border-radius: 10px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            z-index: 1000;
            display: none;
            font-family: Arial, sans-serif;
            overflow: hidden;
        `;

        // Add to document
        document.body.appendChild(panel);

        // Add CSS for the panel content
        this.addRouteSummaryStyles();

        return panel;
    }

    /**
     * Add CSS styles for route summary panel
     */
    addRouteSummaryStyles() {
        if (document.getElementById('routeSummaryStyles')) return;

        const style = document.createElement('style');
        style.id = 'routeSummaryStyles';
        style.textContent = `
            .route-summary-header {
                background: linear-gradient(135deg, #3498db, #2980b9);
                color: white;
                padding: 18px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .route-summary-header h3 {
                margin: 0;
                font-size: 17px;
                font-weight: 600;
            }
            .close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 22px;
                cursor: pointer;
                padding: 0;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: background 0.2s;
            }
            .close-btn:hover {
                background: rgba(255,255,255,0.2);
            }
            .route-summary-content {
                padding: 18px;
                max-height: 50vh;
                overflow-y: auto;
            }
            .summary-item {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 12px;
                padding-bottom: 10px;
                border-bottom: 1px solid #f0f0f0;
            }
            .summary-item:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }
            .summary-item .label {
                font-weight: 600;
                color: #333;
                flex: 0 0 45%;
                font-size: 13px;
            }
            .summary-item .value {
                color: #666;
                text-align: right;
                flex: 1;
                font-size: 13px;
                word-break: break-word;
            }
            .route-summary-actions {
                padding: 18px;
                border-top: 1px solid #f0f0f0;
                background: #f8f9fa;
                display: flex;
                gap: 12px;
            }
            .btn {
                flex: 1;
                padding: 10px 14px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                transition: all 0.2s;
            }
            .btn-primary {
                background: #3498db;
                color: white;
            }
            .btn-primary:hover {
                background: #2980b9;
                transform: translateY(-1px);
            }
            .btn-success {
                background: #27ae60;
                color: white;
            }
            .btn-success:hover {
                background: #219a52;
                transform: translateY(-1px);
            }
            .day-details {
                margin-top: 16px;
                padding-top: 16px;
                border-top: 1px solid #e0e0e0;
            }
            .day-details h4 {
                margin: 0 0 12px 0;
                font-size: 14px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .day-item {
                margin-bottom: 10px;
                border-radius: 6px;
                transition: background 0.2s;
            }
            .day-item:hover {
                background: #f0f8ff !important;
            }
            .day-item h5 {
                font-size: 13px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .multi-day-marker-popup, .multi-day-path-popup {
                font-family: Arial, sans-serif;
            }
            .multi-day-marker-popup h4, .multi-day-path-popup h4 {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .custom-multi-day-marker {
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Export route data to JSON file
     */
    exportRouteData() {
        const exportData = {
            export_timestamp: new Date().toISOString(),
            route_optimization: this.routeData,
            visualization_data: {
                markers_count: this.markers.length,
                path_lines_count: this.pathLines.length,
                total_coordinates: this.routeData.path_lines.reduce((total, segment) => 
                    total + (segment.path_coordinates ? segment.path_coordinates.length : 0), 0)
            },
            api_source: this.apiUrl
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `route_optimization_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
        link.click();
        
        console.log("Route data exported");
    }

    /**
     * Clear only the visualization elements without clearing route data
     */
    clearVisualizationOnly() {
        if (this.routeLayerGroup) {
            this.routeLayerGroup.clearLayers();
        }
        
        this.markers = [];
        this.pathLines = [];
        
        // Hide summary panel
        const summaryPanel = document.getElementById('routeSummaryPanel');
        if (summaryPanel) {
            summaryPanel.style.display = 'none';
        }
        
        console.log("Visualization cleared (data preserved)");
    }

    /**
     * Clear all route visualization
     */
    clearRouteVisualization() {
        if (this.routeLayerGroup) {
            this.routeLayerGroup.clearLayers();
        }
        
        this.markers = [];
        this.pathLines = [];
        this.routeData = null;
        
        // Hide summary panel
        const summaryPanel = document.getElementById('routeSummaryPanel');
        if (summaryPanel) {
            summaryPanel.style.display = 'none';
        }
        
        console.log("Route visualization cleared");
    }

    /**
     * Show loading indicator
     */
    showLoadingIndicator(show) {
        let loadingOverlay = document.getElementById('routeLoadingOverlay');
        
        if (show && !loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'routeLoadingOverlay';
            loadingOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255,255,255,0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                font-family: Arial, sans-serif;
            `;
            
            loadingOverlay.innerHTML = `
                <div style="text-align: center;">
                    <div style="
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #3498db;
                        border-radius: 50%;
                        width: 50px;
                        height: 50px;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    "></div>
                    <p style="margin: 0; color: #333; font-size: 16px;">Loading route data from API...</p>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            
            document.body.appendChild(loadingOverlay);
        } else if (!show && loadingOverlay) {
            loadingOverlay.remove();
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error("DisplayLineResult Error:", message);
        
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 15px 20px;
            border-radius: 6px;
            z-index: 3000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
        `;
        
        errorDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 18px;
                    padding: 0;
                    margin-left: auto;
                ">&times;</button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 5000);
    }

    /**
     * Display route from API data directly (called from other modules)
     * @param {Object} apiResponse - The complete API response
     */
    displayRouteFromAPI(apiResponse) {
        console.log("DisplayLineResult.displayRouteFromAPI called with:", apiResponse);
        
        if (!apiResponse) {
            console.error("No API response provided");
            this.showError("No route data provided");
            return;
        }

        // Handle the API response and display
        this.displayRouteResults(apiResponse);
        
        // Focus on route area
        setTimeout(() => {
            this.fitMapToRoute();
        }, 1000);
    }

    /**
     * Load and display route for a specific trip ID
     * @param {string|number} tripId - The trip ID to load route for
     */
    async loadRouteForTrip(tripId) {
        try {
            console.log(`Loading route for trip ID: ${tripId}`);
            this.showLoadingIndicator(true);
            
            // Update API URL to use trip ID
            const tripApiUrl = `/tourism/api/route_visualization/${tripId}/`;
            
            const response = await fetch(tripApiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Route data loaded for trip:", data);
            
            this.displayRouteResults(data);
            
        } catch (error) {
            console.error("Error loading route for trip:", error);
            this.showError(`Failed to load route for trip ${tripId}: ${error.message}`);
        } finally {
            this.showLoadingIndicator(false);
        }
    }

    /**
     * Set coordinates focus to Korean tourism region
     */
    setKoreanFocus() {
        if (this.map) {
            // Focus on South Korea tourism regions (Semarang area based on your coordinates)
            this.map.setView([-6.996, 110.42], 12);
            console.log("Map focused on Indonesian tourism region");
        }
    }

    /**
     * Get current route statistics
     */
    getRouteStatistics() {
        if (!this.routeData) return null;
        
        const isMultiDay = this.routeData.n_days && this.routeData.n_days > 1;
        
        if (isMultiDay) {
            return {
                n_days: this.routeData.n_days,
                total_distance: this.routeData.total_distance,
                total_distance_km: (this.routeData.total_distance / 1000).toFixed(2),
                execution_time: this.routeData.execution_time,
                path_segments: this.pathLines.length,
                best_fitness: this.routeData.best_fitness,
                best_is_feasible: this.routeData.best_is_feasible,
                feasible_solutions_pct: this.routeData.feasible_solutions_pct,
                improvement_percentage: this.routeData.improvement_percentage
            };
        } else {
            return {
                total_distance: this.routeData.best_distance,
                total_distance_km: (this.routeData.best_distance / 1000).toFixed(2),
                execution_time: this.routeData.execution_time,
                path_segments: this.routeData.path_lines ? this.routeData.path_lines.length : 0,
                total_coordinates: this.routeData.path_lines ? this.routeData.path_lines.reduce((total, segment) => 
                    total + (segment.path_coordinates ? segment.path_coordinates.length : 0), 0) : 0,
                improvement_percentage: this.routeData.improvement_percentage
            };
        }
    }
}

// Initialize DisplayLineResult when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for map to be ready with multiple retry attempts
    let retryCount = 0;
    const maxRetries = 20; // Wait up to 4 seconds (20 * 200ms)
    
    const initDisplayLineResult = () => {
        if (window.displayMapInstance && window.displayMapInstance.isMapReady()) {
            window.displayLineResultInstance = new DisplayLineResult();
            console.log("✅ DisplayLineResult initialized and ready");
            
            // Notify other components that route visualization is ready
            document.dispatchEvent(new CustomEvent('routeVisualizationReady', {
                detail: { instance: window.displayLineResultInstance }
            }));
            
        } else if (retryCount < maxRetries) {
            retryCount++;
            console.log(`⏳ Waiting for map to be ready... (attempt ${retryCount}/${maxRetries})`);
            setTimeout(initDisplayLineResult, 200);
        } else {
            console.warn("❌ Failed to initialize DisplayLineResult: Map not ready after maximum retries");
        }
    };
    
    initDisplayLineResult();
});

// Global functions for external access
window.loadRouteFromAPI = function() {
    if (window.displayLineResultInstance) {
        window.displayLineResultInstance.loadRouteFromAPI();
    } else {
        console.error("DisplayLineResult not initialized");
    }
};

window.clearRouteVisualization = function() {
    if (window.displayLineResultInstance) {
        window.displayLineResultInstance.clearRouteVisualization();
    } else {
        console.error("DisplayLineResult not initialized");
    }
};

window.getRouteStatistics = function() {
    if (window.displayLineResultInstance) {
        return window.displayLineResultInstance.getRouteStatistics();
    } else {
        console.error("DisplayLineResult not initialized");
        return null;
    }
};

window.testDisplayLineResult = function() {
    if (window.displayLineResultInstance) {
        console.log("🧪 Testing DisplayLineResult with dummy data...");
        window.displayLineResultInstance.loadRouteFromAPI();
        return true;
    } else {
        console.error("❌ DisplayLineResult not initialized");
        return false;
    }
};

// Make DisplayLineResult available globally for testing
window.DisplayLineResult = DisplayLineResult;
