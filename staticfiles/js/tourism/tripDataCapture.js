// Trip Data Capture Functions
// This file provides functions to capture and append form data to the trip history table

// Global function to capture current form state and append to history table
function captureAndAppendTripData() {
    try {
        // Get current province selection
        const selectedProvince = window.provinceDisplayInstance?.selectedRegion?.province?.name || 'Not selected';
        
        // Get date and time information
        let dateTimeInfo = null;
        if (window.dateChosenInstance && window.dateChosenInstance.hasValidDateTime()) {
            dateTimeInfo = window.dateChosenInstance.getAllDateTimeInfo();
            
            // Handle new datetime picker format
            if (dateTimeInfo && dateTimeInfo.startDateTime && dateTimeInfo.endDateTime) {
                // Extract separate date and time components for backward compatibility
                dateTimeInfo.startDate = dateTimeInfo.startDateTime.split(' ')[0];
                dateTimeInfo.endDate = dateTimeInfo.endDateTime.split(' ')[0];
                dateTimeInfo.startTime = dateTimeInfo.startDateTime.split(' ')[1] || '09:00';
                dateTimeInfo.endTime = dateTimeInfo.endDateTime.split(' ')[1] || '18:00';
            }
        } else {
            // Fallback to direct input reading (support both old and new formats)
            const startDateTime = document.getElementById('startDateTime')?.value;
            const endDateTime = document.getElementById('endDateTime')?.value;
            
            if (startDateTime && endDateTime) {
                // New datetime picker format
                dateTimeInfo = {
                    startDateTime: startDateTime,
                    endDateTime: endDateTime,
                    startDate: startDateTime.split(' ')[0],
                    endDate: endDateTime.split(' ')[0],
                    startTime: startDateTime.split(' ')[1] || '09:00',
                    endTime: endDateTime.split(' ')[1] || '18:00'
                };
            } else {
                // Legacy format fallback
                const startDate = document.getElementById('startDate')?.value || 'Not set';
                const endDate = document.getElementById('endDate')?.value || 'Not set';
                const startTime = document.getElementById('startTime')?.value || 'Not set';
                const endTime = document.getElementById('endTime')?.value || 'Not set';
                
                dateTimeInfo = {
                    startDate: startDate,
                    endDate: endDate,
                    startTime: startTime,
                    endTime: endTime
                };
            }
        }
        
        // Get selected hotels
        const selectedHotels = window.displayHotelInstance ? 
            window.displayHotelInstance.getSelectedHotels().map(hotel => hotel.name) : [];
        
        // Get selected attractions
        const selectedAttractions = window.displayAttractionInstance ? 
            window.displayAttractionInstance.getSelectedAttractions().map(attraction => attraction.name) : [];
        
        // Create trip data object
        const tripData = {
            province: selectedProvince,
            startDate: dateTimeInfo.startDate,
            startTime: dateTimeInfo.startTime,
            endDate: dateTimeInfo.endDate,
            endTime: dateTimeInfo.endTime,
            hotels: selectedHotels,
            attractions: selectedAttractions
        };
        
        // Add to trip history table
        if (window.tripHistoryManager) {
            const entry = window.tripHistoryManager.updateTripEntry(tripData);
            console.log('Trip data captured and updated in history:', entry);
            
            // Show success notification
            if (typeof showLoading === 'function') {
                showLoading(`Trip entry updated with ${selectedHotels.length} hotels and ${selectedAttractions.length} attractions`, true);
            }
            
            return entry;
        } else {
            console.error('Trip history manager not available');
            return null;
        }
        
    } catch (error) {
        console.error('Error capturing trip data:', error);
        alert('Error saving trip data to history. Please try again.');
        return null;
    }
}

// Function to capture form data whenever any input changes
function setupFormDataCapture() {
    // Listen for province changes
    if (window.provinceDisplayInstance) {
        const originalSelectRegion = window.provinceDisplayInstance.selectRegion;
        window.provinceDisplayInstance.selectRegion = function(...args) {
            const result = originalSelectRegion.apply(this, args);
            scheduleDataCapture();
            return result;
        };
    }
    
    // Listen for date/time changes
    const dateTimeInputs = ['startDate', 'endDate', 'startTime', 'endTime'];
    dateTimeInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('change', () => {
                scheduleDataCapture();
            });
        }
    });
    
    // Listen for hotel selections
    if (window.displayHotelInstance) {
        const originalBookHotel = window.displayHotelInstance.bookHotel;
        window.displayHotelInstance.bookHotel = function(...args) {
            const result = originalBookHotel.apply(this, args);
            scheduleDataCapture();
            return result;
        };
    }
    
    // Listen for attraction selections
    if (window.displayAttractionInstance) {
        const originalSelectAttraction = window.displayAttractionInstance.selectAttraction;
        window.displayAttractionInstance.selectAttraction = function(...args) {
            const result = originalSelectAttraction.apply(this, args);
            scheduleDataCapture();
            return result;
        };
    }
    
    console.log('Form data capture listeners setup complete');
}

// Debounced function to capture data (prevents too many rapid captures)
let captureTimeout = null;
function scheduleDataCapture() {
    clearTimeout(captureTimeout);
    captureTimeout = setTimeout(() => {
        // Only capture if we have meaningful data
        if (hasMinimumDataForCapture()) {
            captureAndAppendTripData();
        }
    }, 1000); // Wait 1 second after last change
}

// Check if we have minimum data worth capturing
function hasMinimumDataForCapture() {
    const hasProvince = window.provinceDisplayInstance?.selectedRegion?.province?.name;
    const hasDate = document.getElementById('startDate')?.value || document.getElementById('endDate')?.value;
    const hasHotels = window.displayHotelInstance?.getSelectedHotels()?.length > 0;
    const hasAttractions = window.displayAttractionInstance?.getSelectedAttractions()?.length > 0;
    
    // Require at least province and one other piece of data
    return hasProvince && (hasDate || hasHotels || hasAttractions);
}

// Manual trigger function for buttons
function manualCaptureTrip() {
    const entry = captureAndAppendTripData();
    if (entry) {
        // Show the trip history table
        if (window.tripHistoryManager && !window.tripHistoryManager.isVisible) {
            window.tripHistoryManager.showTable();
        }
        if (window.tripHistoryManager && !window.tripHistoryManager.isExpanded) {
            window.tripHistoryManager.expandTable();
        }
    }
    return entry;
}

// Manual trigger to force create new entry
function manualCreateNewTrip() {
    if (window.tripHistoryManager) {
        const entry = window.tripHistoryManager.createNewEntry();
        
        // Show the trip history table
        if (!window.tripHistoryManager.isVisible) {
            window.tripHistoryManager.showTable();
        }
        if (!window.tripHistoryManager.isExpanded) {
            window.tripHistoryManager.expandTable();
        }
        
        return entry;
    } else {
        console.error('Trip history manager not available');
        return null;
    }
}

// Function to get trip data summary for display
function getCurrentTripSummary() {
    const selectedProvince = window.provinceDisplayInstance?.selectedRegion?.province?.name || 'Not selected';
    const selectedHotels = window.displayHotelInstance ? 
        window.displayHotelInstance.getSelectedHotels().length : 0;
    const selectedAttractions = window.displayAttractionInstance ? 
        window.displayAttractionInstance.getSelectedAttractions().length : 0;
    
    return {
        province: selectedProvince,
        hotels: selectedHotels,
        attractions: selectedAttractions,
        hasData: selectedProvince !== 'Not selected' || selectedHotels > 0 || selectedAttractions > 0
    };
}

// Function to validate current form state
function validateCurrentTripData() {
    const summary = getCurrentTripSummary();
    const dateTimeInfo = window.dateChosenInstance?.getAllDateTimeInfo();
    
    const errors = [];
    
    if (summary.province === 'Not selected') {
        errors.push('Please select a province');
    }
    
    if (!dateTimeInfo?.startDate || !dateTimeInfo?.endDate) {
        errors.push('Please select start and end dates');
    }
    
    if (summary.hotels === 0 && summary.attractions === 0) {
        errors.push('Please select at least one hotel or attraction');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors,
        summary: summary
    };
}

// Export functions for global access
window.captureAndAppendTripData = captureAndAppendTripData;
window.setupFormDataCapture = setupFormDataCapture;
window.manualCaptureTrip = manualCaptureTrip;
window.manualCreateNewTrip = manualCreateNewTrip;
window.getCurrentTripSummary = getCurrentTripSummary;
window.validateCurrentTripData = validateCurrentTripData;

console.log('Trip data capture functions loaded');