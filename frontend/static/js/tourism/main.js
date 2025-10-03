document.addEventListener("DOMContentLoaded", async () => {
    try {
        console.log("Starting application initialization...");

        // Clear any existing map instances first (with safety check)
        if (typeof displayMap !== 'undefined' && displayMap.clearInstance) {
            displayMap.clearInstance();
        } else {
            console.log("displayMap.clearInstance not available, proceeding with initialization");
        }

        // Step 1: Initialize the map first
        const mapInstance = new displayMap();
        
        // Wait for map initialization to complete
        await new Promise(resolve => {
            const checkMapReady = () => {
                if (mapInstance.isMapReady()) {
                    console.log("Map is ready");
                    resolve();
                } else {
                    setTimeout(checkMapReady, 100);
                }
            };
            checkMapReady();
        });

        // Step 2: Initialize province display with the map instance
        const map = mapInstance.getMap();
        window.mapInstance = mapInstance;

        // Check if provinceDisplay class exists before initializing
        if (typeof provinceDisplay !== 'undefined') {
            const provinceDisplayInstance = new provinceDisplay(map);
            if (typeof provinceDisplayInstance.getData !== 'function') {
                provinceDisplayInstance.getData = function() {
                    console.warn("getData method is not implemented. Returning mock data.");
                    return {}; // Return mock data or implement actual logic here
                };
            }
            window.provinceDisplayInstance = provinceDisplayInstance;
        } else {
            console.log("provinceDisplay class not found, skipping initialization");
        }

        // Initialize other components with safety checks
        if (typeof dateChosen !== 'undefined') {
            const dateChosenInstance = new dateChosen();
            window.dateChosenInstance = dateChosenInstance;
        }

        // Initialize hotel display
        if (typeof displayHotel !== 'undefined' && window.provinceDisplayInstance) {
            const displayHotelInstance = new displayHotel(map, window.provinceDisplayInstance);
            window.displayHotelInstance = displayHotelInstance;
            console.log("Hotel display initialized");
        } else {
            console.log("displayHotel class not found or provinceDisplay not available, skipping hotel initialization");
        }

        // Initialize attraction display
        if (typeof displayAttraction !== 'undefined' && window.provinceDisplayInstance) {
            const displayAttractionInstance = new displayAttraction(map, window.provinceDisplayInstance);
            window.displayAttractionInstance = displayAttractionInstance;
            console.log("Attraction display initialized");
        } else {
            console.log("displayAttraction class not found or provinceDisplay not available, skipping attraction initialization");
        }

        // if (typeof TripSummary !== 'undefined') {
        //     const tripSummaryInstance = new TripSummary();
        //     window.tripSummaryInstance = tripSummaryInstance;
        // }

        // if (typeof flightOption !== 'undefined') {
        //     const flightOptionInstance = new flightOption();
        //     window.flightOptionInstance = flightOptionInstance;
        // }

        // Initialize trip history manager
        if (typeof TripHistoryManager !== 'undefined') {
            const tripHistoryManager = new TripHistoryManager();
            window.tripHistoryManager = tripHistoryManager;
            console.log("Trip history manager initialized");
        } else {
            console.log("TripHistoryManager class not found, skipping trip history initialization");
        }

        // Optimize Button 
        const optimizeButton = document.getElementById("optimizeButton");

        if(optimizeButton){
            optimizeButton.addEventListener('click',() => {
                // alert("optimize button clicked");
                handleOptimize(provinceDisplayInstance);
                
            });
        }
        else {
            console.error("Optimize button not found");
        }

        // Clear History Button
        const clearHistoryButton = document.getElementById("clearHistoryButton");

        if(clearHistoryButton){
            clearHistoryButton.addEventListener('click',() => {
                handleClearHistory();
            });
        }
        else {
            console.error("Clear history button not found");
        }

        // Save to History Button
        const saveToHistoryButton = document.getElementById("saveToHistoryButton");

        if(saveToHistoryButton){
            saveToHistoryButton.addEventListener('click',() => {
                if (window.manualCreateNewTrip) {
                    window.manualCreateNewTrip();
                } else {
                    console.error("Manual create new trip function not available");
                }
            });
        }
        else {
            console.error("Save to history button not found");
        }

        // Setup automatic form data capture
        setTimeout(() => {
            if (window.setupFormDataCapture) {
                window.setupFormDataCapture();
            }
        }, 1000); // Wait 1 second for all components to initialize
 

        console.log("Application initialized successfully");

    } catch (error) {
        console.error("Error initializing application:", error);
        alert("Failed to initialize the application. Please refresh the page.");
    }
});

function handleOptimize(provinceDisplayInstance){
try{
    if(!provinceDisplayInstance){
        console.error("provinceDisplayInstance is not available");
        alert("Province display is not initialized. Cannot optimize.");
        return;
    }
    
    const selectedProvince = provinceDisplayInstance.selectedRegion.province;
    console.log("Selected Province for optimization:", selectedProvince);
    
    // Check if province is selected
    if(selectedProvince === null || selectedProvince === undefined){
        showLoading("Please choose the Province", true);
        return;
    }
    
    // Get date and time information from dateChosen instance
    let dateTimeInfo = null;
    let isValidDateTime = false;
    
    if (window.dateChosenInstance) {
        // Check if dates are valid using the dateChosen instance
        isValidDateTime = window.dateChosenInstance.hasValidDateTime();
        
        if (!isValidDateTime) {
            alert("Please select valid start and end dates. Start date must be today or later, and end date must be after start date.");
            return;
        }
        
        dateTimeInfo = window.dateChosenInstance.getAllDateTimeInfo();
        console.log("Date/Time Info:", dateTimeInfo);
    } else {
        // Fallback if dateChosen instance is not available
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        
        if (!startDate || !endDate) {
            alert("Please select start and end dates.");
            return;
        }
        
        dateTimeInfo = {
            startDate: startDate,
            endDate: endDate,
            startTime: document.getElementById('startTime')?.value || '09:00',
            endTime: document.getElementById('endTime')?.value || '18:00'
        };
    }
    
    // Show optimization in progress
    showLoading("Optimizing trip for " + selectedProvince.name + " from " + 
               dateTimeInfo.startDate + " to " + dateTimeInfo.endDate, true);
    
    // Get hotel booking information
    let hotelBookingInfo = { title: "No Hotels", content: "No hotels booked", html: "<p>No hotels booked</p>" };
    if (window.displayHotelInstance) {
        hotelBookingInfo = window.displayHotelInstance.getBookingDisplayInfo();
        console.log("Hotel Booking Info:", hotelBookingInfo);
    }
    
    // Store attraction data for optimization and get attraction info
    let attractionOptimizationData = null;
    if (window.displayAttractionInstance) {
        attractionOptimizationData = window.displayAttractionInstance.storeAttractionDataForOptimization();
        console.log("Attraction data stored for optimization:", attractionOptimizationData);
    }
    
    // Capture trip data for history table
    const tripData = {
        province: selectedProvince?.name || 'Not selected',
        startDate: dateTimeInfo?.startDate || 'Not set',
        startTime: dateTimeInfo?.startTime || 'Not set', 
        endDate: dateTimeInfo?.endDate || 'Not set',
        endTime: dateTimeInfo?.endTime || 'Not set',
        hotels: window.displayHotelInstance ? 
            window.displayHotelInstance.getSelectedHotels().map(hotel => hotel.name) : [],
        attractions: window.displayAttractionInstance ? 
            window.displayAttractionInstance.getSelectedAttractions().map(attraction => attraction.name) : []
    };
    
    // Add to trip history table immediately (update existing row)
    if (window.tripHistoryManager) {
        window.tripHistoryManager.updateTripEntry(tripData);
        console.log('Trip data updated in history table:', tripData);
    }
    
    // Get coordinate information for API
    const hotelCoordinates = window.displayHotelInstance ? window.displayHotelInstance.getHotelCoordinates() : [];
    
    // Send optimization data to API
    sendOptimizationToAPI({
        province: selectedProvince,
        dateTimeInfo: dateTimeInfo,
        tripDuration: calculateTripDuration(dateTimeInfo.startDate, dateTimeInfo.endDate),
        hotels: window.displayHotelInstance ? window.displayHotelInstance.getSelectedHotels() : [],
        hotelCoordinates: hotelCoordinates,
        attractions: window.displayAttractionInstance ? window.displayAttractionInstance.getSelectedAttractions() : [],
        attractionOptimizationData: attractionOptimizationData,
        mapFocused: hotelCoordinates.length > 0 || selectedProvince ? true : false,
        historyPreserved: true,
        validationStatus: isValidDateTime ? 'valid' : 'partial',
        dataStorage: {
            attractions: 'Stored in localStorage as tripAttractionData',
            hotels: 'Stored via hotel display instance',
            province: 'Stored in province display instance'
        },
        isComplete: selectedProvince && dateTimeInfo.startDate && dateTimeInfo.endDate && 
                   (window.displayHotelInstance?.getSelectedHotels()?.length > 0 || 
                    window.displayAttractionInstance?.getSelectedAttractions()?.length > 0)
    });
    
        // Display optimization results with hotel information
        setTimeout(() => {
            // Validate coordinates before displaying results
            if (window.displayHotelInstance) {
                const coordinateReport = window.displayHotelInstance.validateCoordinateData();
                console.log('Pre-export coordinate validation:', coordinateReport);
            }
            
            // Pass attractionOptimizationData as a parameter
            displayOptimizationResults(selectedProvince, dateTimeInfo, hotelBookingInfo, attractionOptimizationData);
            
            // Focus map on selected province and hotels
            if (window.displayHotelInstance) {
                console.log('Focusing map on selected province and booked hotels...');
                window.displayHotelInstance.focusMapOnSelections();
                window.displayHotelInstance.displayUserHistoryOnMap();
                console.log('Map focused on user selections and history displayed');
            } else {
                console.log('Hotel display instance not available for map focusing');
            }
        }, 1500);
        
        // Note: Removed automatic clearing - user history is now preserved
        
    } catch(error){
        console.error("Error in handleOptimize:", error);
        alert("An error occurred during optimization. Please try again.");
    }
}

// Handle clear history button click
function handleClearHistory() {
    try {
        if (confirm('Are you sure you want to clear all trip history and selected hotels?\n\nThis will remove:\n• Province selection trails\n• Hotel booking history trails\n• Timeline information\n• Map visualizations\n• ALL selected/booked hotels\n• Attraction selections\n\nThis action cannot be undone.')) {
            
            console.log('Clearing trip history and all selected data...');
            
            // Clear all hotel data including selected hotels
            if (window.displayHotelInstance) {
                window.displayHotelInstance.clearAllHotelData();
                console.log('All hotel data and history cleared');
            } else {
                console.error('Hotel display instance not available for clearing');
            }
            
            // Clear all attraction data including selected attractions
            if (window.displayAttractionInstance) {
                window.displayAttractionInstance.clearSelectedAttractions();
                console.log('All attraction data cleared');
            }
            
            // Clear trip history table
            if (window.tripHistoryManager) {
                window.tripHistoryManager.historyData = [];
                window.tripHistoryManager.currentRowId = 1;
                window.tripHistoryManager.saveHistoryData();
                window.tripHistoryManager.renderHistoryTable();
                console.log('Trip history table cleared');
            }
            
            // Clear province selection
            if (window.provinceDisplayInstance) {
                // Remove province layer from map
                if (window.provinceDisplayInstance.provinceLayer) {
                    window.provinceDisplayInstance.provinceLayer.remove();
                    window.provinceDisplayInstance.provinceLayer = null;
                }
                
                // Reset selected region
                window.provinceDisplayInstance.selectedRegion = {
                    province: null,
                };
                
                // Reset province dropdown
                const provinceSelect = document.getElementById('provinceSelect');
                if (provinceSelect) {
                    provinceSelect.value = '';
                }
                
                console.log('Province selection cleared');
            }
            
            // Clear date selections
            if (window.dateChosenInstance) {
                const startDateInput = document.getElementById('startDate');
                const endDateInput = document.getElementById('endDate');
                const startTimeInput = document.getElementById('startTime');
                const endTimeInput = document.getElementById('endTime');
                
                if (startDateInput) startDateInput.value = '';
                if (endDateInput) endDateInput.value = '';
                if (startTimeInput) startTimeInput.value = '09:00';
                if (endTimeInput) endTimeInput.value = '18:00';
                
                console.log('Date selections cleared');
            }
            
            // Clear localStorage data
            localStorage.removeItem('hotelBookings');
            localStorage.removeItem('tripData');
            localStorage.removeItem('selectedProvince');
            localStorage.removeItem('selectedDates');
            localStorage.removeItem('attractionSelections');
            localStorage.removeItem('selectedAttractions');
            localStorage.removeItem('tripAttractionData'); // Clear optimization attraction data
            
            // Reset map view to Korea center
            if (window.mapInstance) {
                const map = window.mapInstance.getMap();
                if (map) {
                    map.setView([36.5, 127.5], 7); // Korea center coordinates
                }
            }
            
            showLoading('All trip history, selected hotels, attractions, and data cleared successfully! You can start planning a new trip.', true);
            
        }
    } catch(error) {
        console.error("Error in handleClearHistory:", error);
        alert("An error occurred while clearing history. Please try again.");
    }
}

// Update the displayOptimizationResults function to accept attractionOptimizationData parameter
function displayOptimizationResults(selectedProvince, dateTimeInfo, hotelBookingInfo, attractionOptimizationData) {
    const tripDuration = calculateTripDuration(dateTimeInfo.startDate, dateTimeInfo.endDate);
    
    // Get coordinate information
    const coordinateInfo = window.displayHotelInstance ? 
        window.displayHotelInstance.getHotelCoordinates() : [];
        
    // Get attraction information
    const attractionInfo = window.displayAttractionInstance ? 
        window.displayAttractionInstance.getAttractionDisplayInfo() : 
        { title: "No Attractions", content: "No attractions available", html: "<p>No attractions available</p>" };
    
    let coordinateSection = '';
    if (coordinateInfo.length > 0) {
        coordinateSection = `
            <div class="coordinates-section">
                <h4><i class="fas fa-map"></i> Hotel Locations</h4>
                <div class="coordinate-list">
                    ${coordinateInfo.map(hotel => `
                        <div class="coordinate-item">
                            <p><strong>${hotel.name}</strong> (${hotel.province})</p>
                            <p><small><i class="fas fa-crosshairs"></i> ${hotel.lat.toFixed(6)}, ${hotel.lng.toFixed(6)}</small></p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Create detailed results HTML
    const resultsHTML = `
        <div class="optimization-results">
            <div class="trip-header">
                <h3><i class="fas fa-route"></i> Trip Optimization Results</h3>
                <div class="trip-overview">
                    <p><strong><i class="fas fa-map-marker-alt"></i> Province:</strong> ${selectedProvince.name}</p>
                    <p><strong><i class="fas fa-calendar"></i> Dates:</strong> ${dateTimeInfo.startDate} to ${dateTimeInfo.endDate}</p>
                    <p><strong><i class="fas fa-clock"></i> Duration:</strong> ${tripDuration} days</p>
                    <p><strong><i class="fas fa-time"></i> Daily Hours:</strong> ${dateTimeInfo.startTime} - ${dateTimeInfo.endTime}</p>
                </div>
                <div class="map-status">
                    <p><i class="fas fa-map"></i> <strong>Map View:</strong> Focused on your selected province, hotels, and attractions</p>
                </div>
            </div>
            
            <div class="accommodation-section">
                ${hotelBookingInfo.html}
            </div>
            
            <div class="attraction-section">
                ${attractionInfo.html}
            </div>
            
            ${coordinateSection}
            
            <div class="trip-actions">
                <button class="btn btn-primary" onclick="closeOptimizationResults()">
                    <i class="fas fa-check"></i> Close
                </button>
               
                <button class="btn btn-outline" onclick="clearHistoryOnly()">
                    <i class="fas fa-eraser"></i> Clear History
                </button>
                <button class="btn btn-warning" onclick="clearAllDataAndClose()">
                    <i class="fas fa-trash-alt"></i> Clear All Data
                </button>
            </div>
        </div>
    `;
    
    // Show results in a modal or overlay
    showOptimizationModal(resultsHTML);
    
    console.log("Optimization completed with persistent history:", {
        province: selectedProvince,
        dates: dateTimeInfo,
        hotels: hotelBookingInfo.summary,
        attractions: attractionInfo.summary,
        attractionOptimization: attractionOptimizationData?.summary || 'No data stored',
        coordinates: coordinateInfo,
        tripDuration: tripDuration,
        mapFocused: coordinateInfo.length > 0 || selectedProvince ? 'Yes' : 'No',
        historyPreserved: 'Yes - selections remain visible on map',
        dataStorage: {
            attractions: 'Stored in localStorage as tripAttractionData',
            hotels: 'Stored via hotel display instance',
            province: 'Stored in province display instance'
        }
    });
}

// Calculate trip duration in days
function calculateTripDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Show optimization results in a modal
function showOptimizationModal(htmlContent) {
    // Remove existing modal if any
    const existingModal = document.getElementById('optimizationModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'optimizationModal';
    modal.className = 'optimization-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeOptimizationResults()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <button class="modal-close" onclick="closeOptimizationResults()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${htmlContent}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Show modal with animation
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// Close optimization results modal
function closeOptimizationResults() {
    const modal = document.getElementById('optimizationModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Clear all data and close modal
function clearAllDataAndClose() {
    if (confirm('Are you sure you want to clear ALL trip data?\n\nThis will remove:\n• All hotel bookings and selections\n• Selected dates\n• Province selection\n• All history and trails\n• All saved data\n\nThis action cannot be undone.')) {
        closeOptimizationResults();
        setTimeout(() => {
            clearAllPriorInformation();
        }, 500);
    }
}

// Focus map on trip selections
function focusMapOnTrip() {
    if (window.displayHotelInstance) {
        window.displayHotelInstance.focusMapOnSelections();
        showLoading('Map focused on your selected province and booked hotels', true);
    } else {
        alert('Hotel display not available');
    }
}

// Toggle trip history display
function toggleTripHistory() {
    if (window.displayHotelInstance) {
        const isEnabled = window.displayHotelInstance.toggleHistoryDisplay();
        if (isEnabled) {
            showLoading('Trip history is now visible on the map with selection trails and timeline', true);
        } else {
            showLoading('Trip history display has been hidden', true);
        }
    } else {
        alert('Hotel display not available');
    }
}

// Clear only history while preserving selected hotels
function clearHistoryOnly() {
    if (window.displayHotelInstance) {
        window.displayHotelInstance.clearHistoryOnly();
        showLoading('History trails and timeline cleared. Your selected hotels remain visible on the map.', true);
    } else {
        alert('Hotel display not available');
    }
}

// Export trip details
function exportTripDetails() {
    const hotelInfo = window.displayHotelInstance ? window.displayHotelInstance.getBookingSummary() : null;
    const dateInfo = window.dateChosenInstance ? window.dateChosenInstance.getAllDateTimeInfo() : null;
    const provinceInfo = window.provinceDisplayInstance?.selectedRegion?.province || null;
    
    // Get stored attraction optimization data
    const attractionData = window.displayAttractionInstance ? 
        window.displayAttractionInstance.getStoredOptimizationData() : null;
    
    // Enhanced trip data with coordinates and detailed hotel information
    const tripData = {
        trip: {
            province: provinceInfo?.name || 'Not selected',
            dates: dateInfo || 'Not selected',
            duration: dateInfo ? calculateTripDuration(dateInfo.startDate, dateInfo.endDate) : 0
        },
        hotels: {
            summary: hotelInfo || 'No bookings',
            detailed: window.displayHotelInstance ? window.displayHotelInstance.getSelectedHotels() : [],
            totalDays: hotelInfo?.totalDays || 0,
            hotelCount: hotelInfo?.hotelCount || 0
        },
        attractions: {
            summary: attractionData?.summary || 'No attractions selected',
            detailed: attractionData?.selectedAttractions || [],
            totalSelected: attractionData?.attractionCount || 0,
            byProvince: attractionData?.summary?.byProvince || {},
            byType: attractionData?.summary?.byType || {},
            optimizationTimestamp: attractionData?.optimizationTimestamp || null
        },
        coordinates: {
            hotels: window.displayHotelInstance ? 
                window.displayHotelInstance.getSelectedHotels().map(hotel => ({
                    name: hotel.name,
                    address: hotel.address,
                    coordinates: hotel.coordinates,
                    province: hotel.province,
                    days: hotel.days
                })) : [],
            attractions: attractionData?.selectedAttractions?.map(attraction => ({
                name: attraction.name,
                province: attraction.province,
                coordinates: attraction.coordinates,
                type: attraction.type,
                rating: attraction.rating
            })) || [],
            province: provinceInfo?.geometry?.coordinates || null
        },
        metadata: {
            exportDate: new Date().toISOString(),
            version: '2.1',
            format: 'korea-trip-planner-with-attractions'
        }
    };
    
    // Create downloadable JSON file
    const dataStr = JSON.stringify(tripData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `korea-trip-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showLoading('Trip details with hotels and attractions exported successfully!', true);
    
    // Log detailed export info
    console.log('Exported trip data with attractions:', tripData);
}

// Clear all prior information after optimization
function clearAllPriorInformation() {
    try {
        console.log('Clearing all prior information...');
        
        // Clear hotel bookings history but preserve selected hotels
        if (window.displayHotelInstance) {
            // Use the complete clearing method for "Clear All Data" button
            window.displayHotelInstance.clearAllHotelData();
            
            console.log('All hotel data and history cleared completely');
        }
        
        // Clear date selections
        if (window.dateChosenInstance) {
            // Reset date inputs to empty
            const startDateInput = document.getElementById('startDate');
            const endDateInput = document.getElementById('endDate');
            const startTimeInput = document.getElementById('startTime');
            const endTimeInput = document.getElementById('endTime');
            
            if (startDateInput) startDateInput.value = '';
            if (endDateInput) endDateInput.value = '';
            if (startTimeInput) startTimeInput.value = '09:00';
            if (endTimeInput) endTimeInput.value = '18:00';
            
            console.log('Date selections cleared');
        }
        
        // Clear province selection
        if (window.provinceDisplayInstance) {
            // Remove province layer from map
            if (window.provinceDisplayInstance.provinceLayer) {
                window.provinceDisplayInstance.provinceLayer.remove();
                window.provinceDisplayInstance.provinceLayer = null;
            }
            
            // Reset selected region
            window.provinceDisplayInstance.selectedRegion = {
                province: null,
            };
            
            // Reset province dropdown if exists
            const provinceDropdown = document.getElementById('province');
            if (provinceDropdown) {
                provinceDropdown.value = '';
            }
            
            console.log('Province selection cleared');
        }
        
            // Clear localStorage data
            localStorage.removeItem('hotelBookings');
            localStorage.removeItem('tripData');
            localStorage.removeItem('selectedProvince');
            localStorage.removeItem('selectedDates');
            localStorage.removeItem('selectedAttractions');
            localStorage.removeItem('attractionSelections');
            localStorage.removeItem('tripAttractionData'); // Clear optimization attraction data
            localStorage.removeItem('tripHistoryData'); // Clear trip history table data        // Reset map view to Korea center
        if (window.mapInstance) {
            const map = window.mapInstance.getMap();
            if (map) {
                map.setView([36.5, 127.5], 7); // Korea center coordinates
            }
        }
        
        console.log('All prior information cleared successfully');
        
        // Show confirmation message
        showLoading('All trip data including hotels, history, dates, and province selection has been completely cleared. You can start planning a new trip!', true);
        
    } catch (error) {
        console.error('Error clearing prior information:', error);
    }
}

// Send optimization data to API
async function sendOptimizationToAPI(optimizationData) {
    try {
        console.log('Sending optimization data to API:', optimizationData);
        
        const response = await fetch('/account/api/trip-optimization/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken() // Get CSRF token for Django
            },
            body: JSON.stringify(optimizationData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            console.log('Optimization data sent successfully:', result);
            
            // Show success message with API response
            showOptimizationAPIResponse(result);
            
            // Log detailed API response
            console.log('API Response Details:', {
                optimizationId: result.optimization_id,
                summary: result.summary,
                recommendations: result.recommendations,
                insights: result.data_insights
            });
            
        } else {
            console.error('API Error:', result);
            alert(`API Error: ${result.error || 'Unknown error occurred'}`);
        }
        
    } catch (error) {
        console.error('Error sending optimization data:', error);
        alert('Failed to send optimization data to server. Please check your connection.');
    }
}

// Get CSRF token for Django requests
function getCsrfToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') {
            return value;
        }
    }
    
    // Fallback: try to get from meta tag
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    if (csrfMeta) {
        return csrfMeta.getAttribute('content');
    }
    
    return '';
}

// Show API response in a modal
function showOptimizationAPIResponse(apiResponse) {
    const modalContent = `
        <div class="api-response-modal">
            <h3><i class="fas fa-server"></i> Optimization API Response</h3>
            
            <div class="response-section">
                <h4><i class="fas fa-check-circle text-success"></i> Status</h4>
                <p><strong>Optimization ID:</strong> ${apiResponse.optimization_id}</p>
                <p><strong>Stored At:</strong> ${new Date(apiResponse.stored_at).toLocaleString()}</p>
                <p class="text-success"><i class="fas fa-database"></i> Data successfully stored in database</p>
            </div>
            
            <div class="response-section">
                <h4><i class="fas fa-chart-pie"></i> Trip Summary</h4>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="label">Province:</span>
                        <span class="value">${apiResponse.summary.province}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Duration:</span>
                        <span class="value">${apiResponse.summary.duration} days</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Hotels:</span>
                        <span class="value">${apiResponse.summary.hotels.count} hotels (${apiResponse.summary.hotels.total_days} days)</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Attractions:</span>
                        <span class="value">${apiResponse.summary.attractions.count} places</span>
                    </div>
                </div>
            </div>
            
            <div class="response-section">
                <h4><i class="fas fa-lightbulb"></i> AI Recommendations</h4>
                <div class="recommendations">
                    <div class="budget-estimate">
                        <h5><i class="fas fa-money-bill-wave"></i> Budget Estimate</h5>
                        <p><strong>Total:</strong> $${apiResponse.recommendations.budget_estimate.estimated_total_usd} USD 
                        (₩${apiResponse.recommendations.budget_estimate.estimated_total_krw.toLocaleString()} KRW)</p>
                        <p><strong>Daily Average:</strong> $${apiResponse.recommendations.budget_estimate.daily_average_usd} USD</p>
                    </div>
                    
                    <div class="optimization-score">
                        <h5><i class="fas fa-star"></i> Optimization Score</h5>
                        <div class="score-display">
                            <span class="score-number">${apiResponse.recommendations.optimization_score.score}/100</span>
                            <span class="score-level ${apiResponse.recommendations.optimization_score.level.toLowerCase()}">${apiResponse.recommendations.optimization_score.level}</span>
                        </div>
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${apiResponse.recommendations.optimization_score.percentage}%"></div>
                        </div>
                    </div>
                    
                    <div class="travel-tips">
                        <h5><i class="fas fa-compass"></i> Travel Tips</h5>
                        <ul>
                            ${apiResponse.recommendations.travel_tips.map(tip => `<li>${tip}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="response-section">
                <h4><i class="fas fa-analytics"></i> Data Insights</h4>
                <div class="insights-grid">
                    <div class="insight-item">
                        <h6>Trip Completeness</h6>
                        <p>${apiResponse.data_insights.trip_completeness.percentage}% complete</p>
                        <small>${apiResponse.data_insights.trip_completeness.completed_components}/${apiResponse.data_insights.trip_completeness.total_components} components</small>
                    </div>
                    <div class="insight-item">
                        <h6>Geographical Spread</h6>
                        <p>${apiResponse.data_insights.geographical_spread.concentration_level}</p>
                        <small>${apiResponse.data_insights.geographical_spread.unique_provinces} province(s)</small>
                    </div>
                    <div class="insight-item">
                        <h6>Travel Pace</h6>
                        <p>${apiResponse.data_insights.time_optimization.pace}</p>
                        <small>${apiResponse.data_insights.time_optimization.attractions_per_day} attractions/day</small>
                    </div>
                </div>
            </div>
            
            <div class="response-actions">
                <button class="btn btn-primary" onclick="closeAPIResponseModal()">
                    <i class="fas fa-check"></i> Continue Planning
                </button>
                <button class="btn btn-outline-info" onclick="exportAPIResponse()">
                    <i class="fas fa-download"></i> Export Response
                </button>
            </div>
        </div>
    `;
    
    // Store API response for export
    window.lastAPIResponse = apiResponse;
    
    // Show in modal
    showOptimizationModal(modalContent);
}

// Close API response modal
function closeAPIResponseModal() {
    closeOptimizationResults();
}

// Export API response
function exportAPIResponse() {
    if (window.lastAPIResponse) {
        const dataStr = JSON.stringify(window.lastAPIResponse, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `trip-optimization-response-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        console.log('API response exported successfully');
    }
}