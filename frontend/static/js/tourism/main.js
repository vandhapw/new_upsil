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
    
        // Display optimization results with hotel information
        setTimeout(() => {
            // Validate coordinates before displaying results
            if (window.displayHotelInstance) {
                const coordinateReport = window.displayHotelInstance.validateCoordinateData();
                console.log('Pre-export coordinate validation:', coordinateReport);
            }
            
            displayOptimizationResults(selectedProvince, dateTimeInfo, hotelBookingInfo);
            
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

// Display optimization results with hotel booking information
function displayOptimizationResults(selectedProvince, dateTimeInfo, hotelBookingInfo) {
    const tripDuration = calculateTripDuration(dateTimeInfo.startDate, dateTimeInfo.endDate);
    
    // Get coordinate information
    const coordinateInfo = window.displayHotelInstance ? 
        window.displayHotelInstance.getHotelCoordinates() : [];
    
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
                    <p><i class="fas fa-map"></i> <strong>Map View:</strong> Focused on your selected province and booked hotels</p>
                </div>
            </div>
            
            <div class="accommodation-section">
                ${hotelBookingInfo.html}
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
        coordinates: coordinateInfo,
        tripDuration: tripDuration,
        mapFocused: coordinateInfo.length > 0 || selectedProvince ? 'Yes' : 'No',
        historyPreserved: 'Yes - selections remain visible on map'
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
        coordinates: {
            hotels: window.displayHotelInstance ? 
                window.displayHotelInstance.getSelectedHotels().map(hotel => ({
                    name: hotel.name,
                    address: hotel.address,
                    coordinates: hotel.coordinates,
                    province: hotel.province,
                    days: hotel.days
                })) : [],
            province: provinceInfo?.geometry?.coordinates || null
        },
        metadata: {
            exportDate: new Date().toISOString(),
            version: '2.0',
            format: 'korea-trip-planner'
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
    
    showLoading('Trip details with coordinates exported successfully!', true);
    
    // Log detailed export info
    console.log('Exported trip data:', tripData);
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
        
        // Reset map view to Korea center
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