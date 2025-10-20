// Global variables for route management
let routeLayerGroups = {};
let routeControlPanel = null;
let dayColors = [
    '#FF6B6B', // Day 1 - Red
    '#4ECDC4', // Day 2 - Teal  
    '#45B7D1', // Day 3 - Blue
    '#96CEB4', // Day 4 - Green
    '#FFEAA7', // Day 5 - Yellow
    '#DDA0DD', // Day 6 - Plum
    '#98D8C8', // Day 7 - Mint
    '#F7DC6F', // Day 8 - Light Yellow
    '#BB8FCE', // Day 9 - Light Purple
    '#85C1E9'  // Day 10 - Light Blue
];

// Diagnostic function to help debug map issues
function diagnoseMapInstance() {
    console.log("=== MAP INSTANCE DIAGNOSIS ===");
    console.log("window.mapInstance:", window.mapInstance);
    console.log("window.displayMapInstance:", window.displayMapInstance);
    console.log("window.displayMap:", window.displayMap);
    console.log("window.map:", window.map);
    console.log("typeof L:", typeof L);
    console.log("displayMap class:", typeof displayMap);
    
    // Try to get map through different methods
    const methods = [
        () => window.mapInstance?.getMap(),
        () => window.displayMapInstance?.getMap(),
        () => window.displayMap?.getMap(),
        () => window.map,
        () => displayMap.getInstance()?.getMap()
    ];
    
    methods.forEach((method, index) => {
        try {
            const result = method();
            console.log(`Method ${index + 1} result:`, result);
            if (result && typeof result.addLayer === 'function') {
                console.log(`✅ Method ${index + 1} returned valid Leaflet map`);
            }
        } catch (error) {
            console.log(`❌ Method ${index + 1} failed:`, error.message);
        }
    });
    console.log("=== END DIAGNOSIS ===");
}

// Make the route display functionality into a callable function
function displayRoutes(entryId, map = null) {
    console.log(`Loading routes for trip entry ID: ${entryId}`);
    
    // Run diagnostic if no map provided
    if (!map) {
        diagnoseMapInstance();
    }
    
    // Get map instance if not provided
    if (!map) {
        // Try multiple ways to get the map instance
        let mapInstance = null;
        
        // Try displayMap singleton first
        if (typeof displayMap !== 'undefined') {
            mapInstance = displayMap.getInstance();
        }
        
        // Try global window instances
        if (!mapInstance) {
            mapInstance = window.mapInstance || window.displayMapInstance || window.displayMap;
        }
        
        // Extract actual map object
        if (mapInstance && typeof mapInstance.getMap === 'function') {
            map = mapInstance.getMap();
        } else if (mapInstance && typeof mapInstance.isMapReady === 'function' && mapInstance.isMapReady()) {
            map = mapInstance.getMap();
        } else if (mapInstance && mapInstance.map) {
            map = mapInstance.map;
        } else {
            // Last resort: try direct map access
            map = window.map || (mapInstance && mapInstance._map);
        }
        
        if (!map) {
            console.error("Map instance not available through any method");
            diagnoseMapInstance(); // Run diagnosis again
            alert("Map is not ready. Please wait for the map to load and try again.");
            return;
        }
    }
    
    // Additional validation for map
    if (!map || typeof map !== 'object') {
        console.error("Invalid map object:", map);
        alert("Map object is invalid. Please refresh the page.");
        return;
    }
    
    // Check if this is a Leaflet map
    if (typeof L === 'undefined') {
        console.error("Leaflet library not loaded");
        alert("Map library not loaded. Please refresh the page.");
        return;
    }
    
    // Additional check for map library compatibility 
    if (typeof map.addLayer !== 'function') {
        console.error("Map object does not support Leaflet methods. Checking for alternative map libraries...");
        
        // Check if this might be a MapLibre map instead
        if (typeof map.addSource === 'function' || typeof map.addLayer === 'function') {
            console.error("Detected non-Leaflet map library. Route display requires Leaflet map.");
            alert("Route display feature requires Leaflet map. Please ensure proper map initialization.");
            return;
        }
        
        console.error("Unknown map type detected:", map);
        alert("Unsupported map type. Please refresh the page.");
        return;
    }
    
    // Clear existing routes
    clearExistingRoutes(map);
    
    // First, try to use stored optimization results
    if (window.lastOptimizationResults && 
        window.lastOptimizationResults.entryId === entryId && 
        window.lastOptimizationResults.routes) {
        
        console.log('Using stored optimization results for routes');
        const storedRoutes = window.lastOptimizationResults.routes;
        
        // Process stored routes data
        if (storedRoutes && storedRoutes.routes && storedRoutes.routes.length > 0) {
            console.log(`Found ${storedRoutes.routes.length} route days from stored data`);
            displayRoutesOnMap(storedRoutes.routes, map);
            return;
        } else if (Array.isArray(storedRoutes) && storedRoutes.length > 0) {
            console.log(`Found ${storedRoutes.length} route days from stored data (direct array)`);
            displayRoutesOnMap(storedRoutes, map);
            return;
        }
    }
    
    // Fallback: Load from API
    console.log('No stored routes found, fetching from API...');
    
    // Show loading message
    if (typeof showLoading === 'function') {
        showLoading('Loading route data from server...');
    }
    
    // Load JSON file (served via Django static or public URL)
    fetch(`/tourism/api/test_api_call_2/`)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Fetched API response:", data);
        
        // Hide loading message
        if (typeof showLoading === 'function') {
            showLoading('Route data loaded successfully!', true);
        }
        
        // Handle different API response structures
        let routes = null;
        
        // Try different possible structures
        if (data.routes && Array.isArray(data.routes)) {
            routes = data.routes;
            console.log("Found routes in data.routes");
        } else if (data.results && data.results.routes && Array.isArray(data.results.routes)) {
            routes = data.results.routes;
            console.log("Found routes in data.results.routes");
        } else if (data.optimized_routes && data.optimized_routes.routes && Array.isArray(data.optimized_routes.routes)) {
            routes = data.optimized_routes.routes;
            console.log("Found routes in data.optimized_routes.routes");
        } else if (Array.isArray(data.optimized_routes)) {
            routes = data.optimized_routes;
            console.log("Found routes in data.optimized_routes (direct array)");
        } else if (data.summary && data.summary.routes && Array.isArray(data.summary.routes)) {
            routes = data.summary.routes;
            console.log("Found routes in data.summary.routes");
        } else {
            // Log the actual structure to help debug
            console.log("API Response Structure:");
            console.log("- Top level keys:", Object.keys(data));
            if (data.results) {
                console.log("- data.results keys:", Object.keys(data.results));
            }
            if (data.optimized_routes) {
                console.log("- data.optimized_routes type:", typeof data.optimized_routes);
                console.log("- data.optimized_routes keys:", Object.keys(data.optimized_routes));
            }
            
            console.error("No routes found in API response. Expected structure not found.");
            alert("No route data found in API response. Please check the API endpoint.");
            return;
        }
        
        console.log("Extracted routes data:", routes);
        
        // Display routes on map
        if (routes && routes.length > 0) {
            console.log(`Found ${routes.length} route days to display`);
            displayRoutesOnMap(routes, map);
        } else {
            console.log("No routes data to display");
            alert("No route data available for this trip.");
        }
    })
    .catch(error => {
        console.error("Error fetching routes:", error);
        
        // Hide loading message
        if (typeof showLoading === 'function') {
            showLoading('Failed to load route data', true);
        }
        
        // Provide more specific error messages
        if (error.name === 'TypeError' && error.message.includes('Cannot read properties')) {
            alert("Error: API response has unexpected format. Please check the server response structure.");
        } else if (error.message.includes('HTTP error')) {
            alert(`Error: Failed to fetch route data from server (${error.message}). Please try again.`);
        } else {
            alert("Error loading route data. Please try again or check your connection.");
        }
    });
}

// Clear existing route layers
function clearExistingRoutes(map) {
    // Remove existing route layers
    Object.values(routeLayerGroups).forEach(layerGroup => {
        if (layerGroup && typeof layerGroup.remove === 'function') {
            // If it's a Leaflet layer group
            if (map.hasLayer(layerGroup)) {
                map.removeLayer(layerGroup);
            }
        } else if (Array.isArray(layerGroup)) {
            // If it's an array of markers/polylines
            layerGroup.forEach(layer => {
                if (layer && typeof layer.remove === 'function') {
                    layer.remove();
                } else if (layer && map.hasLayer && map.hasLayer(layer)) {
                    map.removeLayer(layer);
                }
            });
        }
    });
    routeLayerGroups = {};
    
    // Remove control panel if exists
    if (routeControlPanel && map.hasLayer && map.hasLayer(routeControlPanel)) {
        map.removeLayer(routeControlPanel);
        routeControlPanel = null;
    } else if (routeControlPanel && typeof routeControlPanel.remove === 'function') {
        routeControlPanel.remove();
        routeControlPanel = null;
    }
}

// Main function to display routes on map
function displayRoutesOnMap(routes, map) {
    console.log("Starting to display routes on map:", routes);
    console.log("Map instance:", map);
    console.log("Map type:", typeof map);
    console.log("Map constructor:", map ? map.constructor.name : 'null');
    
    // Validate map instance with comprehensive checks
    if (!map) {
        console.error("Map instance is null or undefined");
        alert("Map is not properly initialized. Please refresh the page.");
        return;
    }
    
    // Check for Leaflet map methods
    if (typeof map.addLayer !== 'function') {
        console.error("Map does not have addLayer method. Map object:", map);
        console.error("Available methods:", Object.getOwnPropertyNames(map).filter(prop => typeof map[prop] === 'function'));
        alert("Map is not a valid Leaflet map instance. Please refresh the page.");
        return;
    }
    
    // Check if Leaflet is available
    if (typeof L === 'undefined') {
        console.error("Leaflet library (L) is not available");
        alert("Map library not loaded. Please refresh the page.");
        return;
    }
    
    let allBounds = [];
    
    // Process each day's route
    routes.forEach((dayRoute, dayIndex) => {
        const dayNumber = dayRoute.day;
        const color = dayColors[dayIndex % dayColors.length];
        
        console.log(`\n=== Processing Day ${dayNumber} ===`);
        console.log("Day route data:", dayRoute);
        console.log("Assigned color:", color);
        
        // Create layer group for this day
        try {
            routeLayerGroups[dayNumber] = L.layerGroup();
            map.addLayer(routeLayerGroups[dayNumber]);
            console.log(`✅ Created layer group for Day ${dayNumber}`);
        } catch (error) {
            console.error("Error creating layer group:", error);
            // Fallback: create a simple array to store markers
            routeLayerGroups[dayNumber] = [];
            console.log(`⚠️ Using fallback array for Day ${dayNumber}`);
        }
        
        console.log(`Processing Day ${dayNumber}:`, dayRoute);
        
        // Add hotel marker if exists
        if (dayRoute.hotel && dayRoute.hotel.coordinates) {
            const hotelLat = dayRoute.hotel.coordinates.lat || dayRoute.hotel.latitude;
            const hotelLon = dayRoute.hotel.coordinates.lon || dayRoute.hotel.longitude;
            
            console.log(`Hotel data for Day ${dayNumber}:`, dayRoute.hotel);
            console.log(`Hotel coordinates: lat=${hotelLat}, lon=${hotelLon}`);
            
            if (hotelLat && hotelLon) {
                // Create a standardized hotel object
                const hotelData = {
                    ...dayRoute.hotel,
                    latitude: hotelLat,
                    longitude: hotelLon
                };
                console.log(`✅ Adding hotel marker for Day ${dayNumber}`);
                addHotelMarker(hotelData, color, dayNumber, map);
                allBounds.push([hotelLat, hotelLon]);
            } else {
                console.log(`❌ Invalid hotel coordinates for Day ${dayNumber}`);
            }
        } else {
            console.log(`❌ No hotel data for Day ${dayNumber}`);
        }
        
        // Add stop markers
        if (dayRoute.stops && dayRoute.stops.length > 0) {
            console.log(`Processing ${dayRoute.stops.length} stops for Day ${dayNumber}`);
            dayRoute.stops.forEach((stop, stopIndex) => {
                const stopLat = stop.coordinates?.lat || stop.latitude;
                const stopLon = stop.coordinates?.lon || stop.longitude;
                
                console.log(`Stop ${stopIndex + 1} coordinates: lat=${stopLat}, lon=${stopLon}`);
                
                if (stopLat && stopLon) {
                    // Create a standardized stop object
                    const stopData = {
                        ...stop,
                        latitude: stopLat,
                        longitude: stopLon
                    };
                    console.log(`✅ Adding stop marker ${stopIndex + 1} for Day ${dayNumber}`);
                    addStopMarker(stopData, color, dayNumber, stopIndex + 1, map);
                    allBounds.push([stopLat, stopLon]);
                } else {
                    console.log(`❌ Invalid coordinates for stop ${stopIndex + 1} on Day ${dayNumber}`);
                }
            });
        } else {
            console.log(`❌ No stops data for Day ${dayNumber}`);
        }
        
        // Add path lines
        if (dayRoute.path_lines && dayRoute.path_lines.length > 0) {
            console.log(`Processing ${dayRoute.path_lines.length} path lines for Day ${dayNumber}`);
            dayRoute.path_lines.forEach((pathLine, pathIndex) => {
                console.log(`Path line ${pathIndex + 1}:`, pathLine);
                addPathLine(pathLine, color, dayNumber, map);
                // Add path coordinates to bounds - handle different coordinate formats
                if (Array.isArray(pathLine)) {
                    // If pathLine is directly an array of coordinate objects
                    console.log(`Path line ${pathIndex + 1} is direct array with ${pathLine.length} points`);
                    pathLine.forEach(coord => {
                        if (coord.lat && coord.lon) {
                            allBounds.push([coord.lat, coord.lon]);
                        } else if (coord.length >= 2) {
                            // If it's [lng, lat] format
                            allBounds.push([coord[1], coord[0]]);
                        }
                    });
                } else if (pathLine.coordinates && pathLine.coordinates.length > 0) {
                    console.log(`Path line ${pathIndex + 1} has coordinates array with ${pathLine.coordinates.length} points`);
                    pathLine.coordinates.forEach(coord => {
                        if (coord.lat && coord.lon) {
                            allBounds.push([coord.lat, coord.lon]);
                        } else if (coord.length >= 2) {
                            // Note: coordinates might be [lng, lat], convert to [lat, lng] for bounds
                            allBounds.push([coord[1], coord[0]]);
                        }
                    });
                }
            });
        } else {
            console.log(`❌ No path lines for Day ${dayNumber}`);
        }
    });
    
    // Create control panel
    createRouteControlPanel(routes, map);
    
    // Fit map to show all routes
    console.log(`\n=== Final Processing ===`);
    console.log(`Total bounds collected: ${allBounds.length}`);
    console.log("All bounds:", allBounds);
    
    if (allBounds.length > 0) {
        try {
            const group = new L.featureGroup();
            allBounds.forEach(bound => {
                L.marker(bound).addTo(group);
            });
            map.fitBounds(group.getBounds().pad(0.1));
            console.log("✅ Map bounds fitted successfully");
            
            // Clean up temporary markers used for bounds calculation
            group.clearLayers();
        } catch (error) {
            console.error("Error fitting bounds:", error);
        }
    } else {
        console.log("❌ No bounds to fit - routes may not be visible");
    }
    
    console.log("✅ Routes displayed successfully");
}

// Add hotel marker to map
function addHotelMarker(hotel, color, dayNumber, map) {
    const hotelIcon = L.divIcon({
        className: 'custom-route-marker hotel-marker',
        html: `<div style="
            background-color: ${color};
            width: 35px;
            height: 35px;
            border-radius: 50%;
            border: 3px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 6px rgba(0,0,0,0.3);
            font-size: 16px;
            color: white;
            cursor: pointer;
        ">🏨</div>`,
        iconSize: [35, 35],
        iconAnchor: [17.5, 17.5]
    });
    
    const popupContent = `
        <div class="route-popup">
            <h4 style="margin: 0 0 8px 0; color: ${color};">Day ${dayNumber} Hotel</h4>
            <p style="margin: 0; font-weight: bold;">${hotel.name || 'Hotel'}</p>
            ${hotel.address ? `<p style="margin: 4px 0; font-size: 12px;">${hotel.address}</p>` : ''}
            ${hotel.rating ? `<p style="margin: 4px 0;">Rating: ${hotel.rating} ⭐</p>` : ''}
            ${hotel.price ? `<p style="margin: 4px 0;">Price: ${hotel.price}</p>` : ''}
        </div>
    `;
    
    const marker = L.marker([hotel.latitude, hotel.longitude], { icon: hotelIcon })
        .bindPopup(popupContent, { maxWidth: 250 });
    
    // Add marker to layer group or directly to map
    if (routeLayerGroups[dayNumber] && typeof routeLayerGroups[dayNumber].addLayer === 'function') {
        routeLayerGroups[dayNumber].addLayer(marker);
    } else if (Array.isArray(routeLayerGroups[dayNumber])) {
        routeLayerGroups[dayNumber].push(marker);
        marker.addTo(map);
    } else {
        marker.addTo(map);
    }
}

// Add stop marker to map
function addStopMarker(stop, color, dayNumber, stopNumber, map) {
    const stopIcon = L.divIcon({
        className: 'custom-route-marker stop-marker',
        html: `<div style="
            background-color: ${color};
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            font-size: 12px;
            font-weight: bold;
            color: white;
            cursor: pointer;
        ">${stopNumber}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });
    
    const popupContent = `
        <div class="route-popup">
            <h4 style="margin: 0 0 8px 0; color: ${color};">Day ${dayNumber} - Stop ${stopNumber}</h4>
            <p style="margin: 0; font-weight: bold;">${stop.name || 'Tourist Spot'}</p>
            ${stop.description ? `<p style="margin: 4px 0; font-size: 12px;">${stop.description}</p>` : ''}
            ${stop.address ? `<p style="margin: 4px 0; font-size: 12px;">${stop.address}</p>` : ''}
            ${stop.category ? `<p style="margin: 4px 0;">Category: ${stop.category}</p>` : ''}
            ${stop.rating ? `<p style="margin: 4px 0;">Rating: ${stop.rating} ⭐</p>` : ''}
        </div>
    `;
    
    const marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon })
        .bindPopup(popupContent, { maxWidth: 250 });
    
    // Add marker to layer group or directly to map
    if (routeLayerGroups[dayNumber] && typeof routeLayerGroups[dayNumber].addLayer === 'function') {
        routeLayerGroups[dayNumber].addLayer(marker);
    } else if (Array.isArray(routeLayerGroups[dayNumber])) {
        routeLayerGroups[dayNumber].push(marker);
        marker.addTo(map);
    } else {
        marker.addTo(map);
    }
}

// Add path line to map
function addPathLine(pathLine, color, dayNumber, map) {
    let coordinates = [];
    
    // Handle different pathLine formats
    if (Array.isArray(pathLine)) {
        // If pathLine is directly an array of coordinate objects
        coordinates = pathLine;
    } else if (pathLine.coordinates && Array.isArray(pathLine.coordinates)) {
        // If pathLine has a coordinates property
        coordinates = pathLine.coordinates;
    } else {
        console.log(`No valid coordinates for path line on day ${dayNumber}:`, pathLine);
        return;
    }
    
    if (coordinates.length === 0) {
        console.log(`Empty coordinates for path line on day ${dayNumber}`);
        return;
    }
    
    // Convert coordinates to Leaflet format [lat, lng]
    const leafletCoords = coordinates.map(coord => {
        if (coord.lat && coord.lon) {
            // Handle {lat: x, lon: y} format
            return [coord.lat, coord.lon];
        } else if (Array.isArray(coord) && coord.length >= 2) {
            // Assume [lng, lat] format from API, convert to [lat, lng] for Leaflet
            return [coord[1], coord[0]];
        }
        return coord;
    });
    
    // Create polyline style based on type
    const lineStyle = {
        color: color,
        weight: 4,
        opacity: 0.8,
        dashArray: (pathLine.type === 'walking') ? '8, 8' : null
    };
    
    const popupContent = `
        <div class="route-popup">
            <h4 style="margin: 0 0 8px 0; color: ${color};">Day ${dayNumber} Route</h4>
            <p style="margin: 0;">Type: ${pathLine.type || 'Route'}</p>
            ${pathLine.distance ? `<p style="margin: 4px 0;">Distance: ${pathLine.distance}</p>` : ''}
            ${pathLine.duration ? `<p style="margin: 4px 0;">Duration: ${pathLine.duration}</p>` : ''}
            ${pathLine.description ? `<p style="margin: 4px 0; font-size: 12px;">${pathLine.description}</p>` : ''}
            <p style="margin: 4px 0; font-size: 11px; color: #666;">${coordinates.length} points</p>
        </div>
    `;
    
    const polyline = L.polyline(leafletCoords, lineStyle)
        .bindPopup(popupContent, { maxWidth: 200 });
    
    // Add polyline to layer group or directly to map
    if (routeLayerGroups[dayNumber] && typeof routeLayerGroups[dayNumber].addLayer === 'function') {
        routeLayerGroups[dayNumber].addLayer(polyline);
    } else if (Array.isArray(routeLayerGroups[dayNumber])) {
        routeLayerGroups[dayNumber].push(polyline);
        polyline.addTo(map);
    } else {
        polyline.addTo(map);
    }
}

// Create control panel for route management
function createRouteControlPanel(routes, map) {
    const RouteControlPanel = L.Control.extend({
        options: {
            position: 'topleft'
        },
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'route-control-panel');
            container.style.cssText = `
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                padding: 12px;
                max-width: 580px;
                font-family: 'Inter', sans-serif;
                top: 10px;
                left: 35em;
                z-index: 1000;
            `;
            
            let html = '<h4 style="margin: 0 0 12px 0; font-size: 14px; color: #333;"><i class="fas fa-route"></i> Route Control</h4>';
            
            routes.forEach((dayRoute, index) => {
                const dayNumber = dayRoute.day;
                const color = dayColors[index % dayColors.length];
                const stopCount = dayRoute.stops ? dayRoute.stops.length : 0;
                const hasHotel = dayRoute.hotel && dayRoute.hotel.coordinates && 
                                (dayRoute.hotel.coordinates.lat || dayRoute.hotel.latitude);
                const hasRoutes = dayRoute.path_lines && dayRoute.path_lines.length > 0;
                
                html += `
                    <div style="display: flex; align-items: center; margin-bottom: 8px; padding: 6px; border-radius: 4px; background: #f8f9fa;">
                        <div style="width: 12px; height: 12px; background-color: ${color}; border-radius: 50%; margin-right: 8px; border: 1px solid white; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
                        <label style="flex: 1; font-size: 12px; color: #333; cursor: pointer; margin: 0;" for="day-${dayNumber}">
                            Day ${dayNumber} (${stopCount} stops${hasHotel ? ' + hotel' : ''}${hasRoutes ? ' + route' : ''})
                        </label>
                        <input type="checkbox" 
                               id="day-${dayNumber}" 
                               checked 
                               data-day="${dayNumber}"
                               style="margin-left: 8px;">
                    </div>
                `;
            });
            
            html += `
                <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #eee;">
                    <button onclick="clearAllRoutes()" style="
                        width: 100%;
                        padding: 6px 12px;
                        background: #dc3545;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        font-size: 12px;
                        cursor: pointer;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#c82333'" onmouseout="this.style.background='#dc3545'">
                        <i class="fas fa-trash"></i> Clear All Routes
                    </button>
                </div>
            `;
            
            container.innerHTML = html;
            
            // Add event listeners for checkboxes
            container.addEventListener('change', function(e) {
                if (e.target.type === 'checkbox') {
                    const dayNumber = parseInt(e.target.dataset.day);
                    toggleRouteVisibility(dayNumber, e.target.checked, map);
                }
            });
            
            // Prevent map events when interacting with control panel
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            
            return container;
        }
    });
    
    routeControlPanel = new RouteControlPanel().addTo(map);
}

// Toggle visibility of routes for a specific day
function toggleRouteVisibility(dayNumber, isVisible, map) {
    const layerGroup = routeLayerGroups[dayNumber];
    if (!layerGroup) return;
    
    if (typeof layerGroup.addTo === 'function') {
        // Leaflet layer group
        if (isVisible) {
            if (!map.hasLayer(layerGroup)) {
                layerGroup.addTo(map);
            }
        } else {
            if (map.hasLayer(layerGroup)) {
                map.removeLayer(layerGroup);
            }
        }
    } else if (Array.isArray(layerGroup)) {
        // Array of markers/polylines
        layerGroup.forEach(layer => {
            if (isVisible) {
                if (typeof layer.addTo === 'function') {
                    layer.addTo(map);
                }
            } else {
                if (typeof layer.remove === 'function') {
                    layer.remove();
                } else if (map.hasLayer && map.hasLayer(layer)) {
                    map.removeLayer(layer);
                }
            }
        });
    }
    
    console.log(`Day ${dayNumber} routes ${isVisible ? 'shown' : 'hidden'}`);
}

// Clear all routes from map
function clearAllRoutes() {
    const mapInstance = displayMap.getInstance();
    if (mapInstance && mapInstance.isMapReady()) {
        const map = mapInstance.getMap();
        clearExistingRoutes(map);
        console.log("All routes cleared");
    }
}

// Function to show only specific days
function showOnlyDays(dayNumbers) {
    Object.keys(routeLayerGroups).forEach(dayNumber => {
        const checkbox = document.getElementById(`day-${dayNumber}`);
        const shouldShow = dayNumbers.includes(parseInt(dayNumber));
        
        if (checkbox) {
            checkbox.checked = shouldShow;
            const mapInstance = displayMap.getInstance();
            if (mapInstance && mapInstance.isMapReady()) {
                toggleRouteVisibility(parseInt(dayNumber), shouldShow, mapInstance.getMap());
            }
        }
    });
}

// Get route statistics
function getRouteStatistics() {
    const stats = {
        totalDays: Object.keys(routeLayerGroups).length,
        totalMarkers: 0,
        totalRoutes: 0,
        visibleDays: 0
    };
    
    const mapInstance = displayMap.getInstance();
    if (mapInstance && mapInstance.isMapReady()) {
        const map = mapInstance.getMap();
        
        Object.values(routeLayerGroups).forEach(layerGroup => {
            if (layerGroup && typeof layerGroup.eachLayer === 'function') {
                // Leaflet layer group
                if (map.hasLayer && map.hasLayer(layerGroup)) {
                    stats.visibleDays++;
                }
                
                layerGroup.eachLayer(layer => {
                    if (layer instanceof L.Marker) {
                        stats.totalMarkers++;
                    } else if (layer instanceof L.Polyline) {
                        stats.totalRoutes++;
                    }
                });
            } else if (Array.isArray(layerGroup)) {
                // Array of markers/polylines
                let isVisible = false;
                layerGroup.forEach(layer => {
                    if (layer instanceof L.Marker) {
                        stats.totalMarkers++;
                        if (map.hasLayer && map.hasLayer(layer)) {
                            isVisible = true;
                        }
                    } else if (layer instanceof L.Polyline) {
                        stats.totalRoutes++;
                        if (map.hasLayer && map.hasLayer(layer)) {
                            isVisible = true;
                        }
                    }
                });
                if (isVisible) {
                    stats.visibleDays++;
                }
            }
        });
    }
    
    return stats;
}

// Test function for manual testing from browser console
function testRouteDisplay() {
    console.log("=== MANUAL ROUTE DISPLAY TEST ===");
    
    // Try to get map instance
    let map = null;
    
    if (window.mapInstance && window.mapInstance.getMap) {
        map = window.mapInstance.getMap();
        console.log("✅ Got map from window.mapInstance");
    } else if (window.displayMapInstance && window.displayMapInstance.getMap) {
        map = window.displayMapInstance.getMap();
        console.log("✅ Got map from window.displayMapInstance");
    } else if (window.displayMap && window.displayMap.getMap) {
        map = window.displayMap.getMap();
        console.log("✅ Got map from window.displayMap");
    } else {
        console.log("❌ No map instance found");
        return;
    }
    
    if (map && typeof map.addLayer === 'function') {
        console.log("✅ Map is valid Leaflet map");
        console.log("Calling displayRoutes with test entry ID...");
        displayRoutes('test', map);
    } else {
        console.log("❌ Invalid map instance");
    }
}

// Make test function globally available
window.testRouteDisplay = testRouteDisplay;