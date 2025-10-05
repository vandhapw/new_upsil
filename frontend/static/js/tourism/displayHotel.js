class displayHotel {
    constructor(map, provinceDisplayInstance) {
        this.map = map;
        this.provinceDisplayInstance = provinceDisplayInstance;
        this.hotelMarkers = [];
        this.bookedHotelMarkers = []; // Separate array for booked hotels
        this.hotelLayer = null;
        this.bookedHotelLayer = null; // Separate layer for booked hotels
        this.isHotelsVisible = false;
        
        // Hotel marker icon (default - red)
        this.hotelIcon = L.divIcon({
            className: 'custom-hotel-marker',
            html: `<div style="background-color: #ff6b6b; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                     <i class="fas fa-bed" style="color: white; font-size: 14px;"></i>
                   </div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        // Booked hotel marker icon (green)
        this.bookedHotelIcon = L.divIcon({
            className: 'custom-hotel-marker booked-hotel',
            html: `<div style="background-color: #10b981; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.4);">
                     <i class="fas fa-check" style="color: white; font-size: 16px;"></i>
                   </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        this.init();
    }

    init() {
        // Create a layer group for regular hotels
        this.hotelLayer = L.layerGroup().addTo(this.map);
        
        // Create a separate layer group for booked hotels (always visible)
        this.bookedHotelLayer = L.layerGroup().addTo(this.map);
        
        // Load saved hotel bookings
        this.loadHotelBookings();
        
        // Display booked hotels on map
        this.displayBookedHotels();
        
        console.log("Hotel display initialized");
    }

    async searchHotels() {
        try {
            // Check if a province is selected
            if (!this.provinceDisplayInstance || 
                !this.provinceDisplayInstance.selectedRegion || 
                !this.provinceDisplayInstance.selectedRegion.province) {
                alert('Please select a province first to search for hotels');
                return;
            }

            const selectedProvince = this.provinceDisplayInstance.selectedRegion.province;
            console.log("Searching hotels for province:", selectedProvince.name);

            // Get the bounds of the selected province
            const bounds = this.getProvinceBounds(selectedProvince);
            if (!bounds) {
                alert('Unable to determine province boundaries for hotel search');
                return;
            }

            // Show loading
            this.showLoading('Searching for hotels in ' + selectedProvince.name + '...', false);

            // Clear existing hotel markers
            this.clearHotels();

            // Fetch hotels from the API
            const hotels = await this.fetchHotels(bounds);
            
            if (hotels && hotels.length > 0) {
                this.displayHotels(hotels);
                this.showLoading('Found ' + hotels.length + ' hotels in ' + selectedProvince.name, true);
            } else {
                this.showLoading('No hotels found in ' + selectedProvince.name, true);
            }

        } catch (error) {
            console.error("Error searching hotels:", error);
            this.showLoading('Error searching for hotels. Please try again.', true);
        }
    }

    getProvinceBounds(province) {
        try {
            // Get bounds from the province geometry
            if (province.geometry && province.geometry.coordinates) {
                const coordinates = province.geometry.coordinates;
                let minLat = Infinity, maxLat = -Infinity;
                let minLng = Infinity, maxLng = -Infinity;

                // Handle different geometry types
                const processCoordinates = (coords) => {
                    if (Array.isArray(coords[0])) {
                        coords.forEach(coord => processCoordinates(coord));
                    } else {
                        const [lng, lat] = coords;
                        minLat = Math.min(minLat, lat);
                        maxLat = Math.max(maxLat, lat);
                        minLng = Math.min(minLng, lng);
                        maxLng = Math.max(maxLng, lng);
                    }
                };

                if (province.geometry.type === 'Polygon') {
                    province.geometry.coordinates.forEach(ring => processCoordinates(ring));
                } else if (province.geometry.type === 'MultiPolygon') {
                    province.geometry.coordinates.forEach(polygon => 
                        polygon.forEach(ring => processCoordinates(ring))
                    );
                }

                return {
                    minLat: minLat,
                    maxLat: maxLat,
                    minLng: minLng,
                    maxLng: maxLng
                };
            }

            // Fallback: try to get bounds from the displayed polygon on the map
            if (this.provinceDisplayInstance.provinceLayer) {
                const leafletBounds = this.provinceDisplayInstance.provinceLayer.getBounds();
                return {
                    minLat: leafletBounds.getSouth(),
                    maxLat: leafletBounds.getNorth(),
                    minLng: leafletBounds.getWest(),
                    maxLng: leafletBounds.getEast()
                };
            }

            return null;
        } catch (error) {
            console.error("Error calculating province bounds:", error);
            return null;
        }
    }

    async fetchHotels(bounds) {
        try {
            // Use Geoapify API directly
            const apiKey = "a5edd953082d4f209e8ef29fdeedb0a1";
            const url = `https://api.geoapify.com/v2/places?categories=accommodation.hotel&filter=rect:${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}&limit=100&apiKey=${apiKey}`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Transform API response to our format
            return result.features.map((feature, index) => ({
                id: feature.properties.place_id || `hotel_${index}`,
                name: feature.properties.name || `Hotel ${index + 1}`,
                address: feature.properties.formatted || feature.properties.address_line1 || 'Address not available',
                coordinates: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]],
                rating: feature.properties.rating || null,
                phone: feature.properties.contact?.phone || null,
                website: feature.properties.contact?.website || null,
                category: feature.properties.categories?.[0] || 'hotel',
                datasource: feature.properties.datasource?.sourcename || 'Geoapify'
            }));
            
        } catch (error) {
            console.error("API fetch error:", error);
            throw error;
        }
    }

    displayHotels(hotels) {
        hotels.forEach(hotel => {
            const [lng, lat] = hotel.coordinates;
            
            // Check if this hotel is already booked
            const isBooked = this.isHotelBooked(hotel.id);
            
            // Use different icon based on booking status
            const icon = isBooked ? this.bookedHotelIcon : this.hotelIcon;
            
            // Create hotel icon with improved styling
            const marker = L.marker([lat, lng], { icon })
                .bindPopup(this.createHotelPopup(hotel))
                .addTo(this.hotelLayer);

            // Store hotel data with marker for reference
            marker.hotelData = hotel;
            this.hotelMarkers.push(marker);
        });

        this.isHotelsVisible = true;
        console.log(`Displayed ${hotels.length} hotels on the map`);
    }

    createHotelPopup(hotel) {
        let ratingHTML = '';
        if (hotel.rating) {
            const stars = "★".repeat(Math.floor(hotel.rating));
            ratingHTML = `<p><strong>Rating:</strong> ${stars} ${hotel.rating}/5</p>`;
        }

        const isBooked = this.isHotelBooked(hotel.id);
        const totalBookedDays = this.getTotalBookedDays();
        const tripDuration = this.getTripDuration();
        const remainingDays = tripDuration - totalBookedDays;

        let bookingSection = '';
        if (isBooked) {
            const booking = this.selectedHotels.find(b => b.hotelId === hotel.id);
            bookingSection = `
                <div class="booking-section booked">
                    <h5 style="color: #10b981;"><i class="fas fa-check-circle"></i> Already Booked</h5>
                    <p><strong>Booked for:</strong> ${booking ? booking.days : 'N/A'} days</p>
                    <p><strong>Province:</strong> ${booking ? booking.province : 'Unknown'}</p>
                    <button class="btn-cancel-booking" onclick="window.displayHotelInstance.cancelHotelBooking('${hotel.id}')">
                        <i class="fas fa-times"></i> Cancel Booking
                    </button>
                </div>
            `;
        } else {
            bookingSection = `
                <div class="booking-section">
                    <h5><i class="fas fa-calendar-check"></i> Book This Hotel</h5>
                    <div class="booking-info">
                        <p><small>Trip Duration: ${tripDuration} days | Booked: ${totalBookedDays} days | Available: ${remainingDays} days</small></p>
                    </div>
                    <div class="booking-form">
                        <div class="form-group">
                            <label for="bookingDays_${hotel.id}">Number of Days (max ${remainingDays}):</label>
                            <input type="number" 
                                   id="bookingDays_${hotel.id}" 
                                   class="booking-input" 
                                   min="1" 
                                   max="${remainingDays}"
                                   placeholder="Enter days"
                                   onchange="window.displayHotelInstance.validateBookingDays('${hotel.id}', this.value)">
                            <div id="validation_${hotel.id}" class="validation-message"></div>
                        </div>
                        <button class="btn-book" onclick="window.displayHotelInstance.bookHotel('${hotel.id}', '${hotel.name}', '${hotel.address}')">
                            <i class="fas fa-check"></i> Book Hotel
                        </button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="popup-content hotel-popup ${isBooked ? 'booked-hotel' : ''}">
                <h4><i class="fas fa-bed"></i> ${hotel.name}</h4>
                <p><strong>Address:</strong> ${hotel.address}</p>
                ${ratingHTML}
                ${hotel.phone ? `<p><strong>Phone:</strong> <a href="tel:${hotel.phone}">${hotel.phone}</a></p>` : ''}
                ${hotel.website ? `<p><strong>Website:</strong> <a href="${hotel.website}" target="_blank" rel="noopener">Visit Website</a></p>` : ''}
                <p><strong>Source:</strong> ${hotel.datasource}</p>
                
                ${bookingSection}
            </div>
        `;
    }

    // Check if a hotel is already booked
    isHotelBooked(hotelId) {
        return this.selectedHotels && this.selectedHotels.some(hotel => hotel.hotelId === hotelId);
    }

    // Display booked hotels on the map (persistent across province changes)
    displayBookedHotels() {
        if (!this.selectedHotels || this.selectedHotels.length === 0) return;

        // Clear existing booked hotel markers
        this.bookedHotelLayer.clearLayers();
        this.bookedHotelMarkers = [];

        this.selectedHotels.forEach(booking => {
            if (booking.coordinates) {
                const [lng, lat] = booking.coordinates;
                
                const marker = L.marker([lat, lng], { icon: this.bookedHotelIcon })
                    .bindPopup(this.createBookedHotelPopup(booking))
                    .addTo(this.bookedHotelLayer);

                marker.bookingData = booking;
                this.bookedHotelMarkers.push(marker);
            }
        });

        console.log(`Displayed ${this.selectedHotels.length} booked hotels on the map`);
    }

    // Create popup for booked hotels
    createBookedHotelPopup(booking) {
        return `
            <div class="popup-content booked-hotel-popup">
                <h4><i class="fas fa-check-circle" style="color: #10b981;"></i> ${booking.name}</h4>
                <p><strong>Address:</strong> ${booking.address}</p>
                <p><strong>Province:</strong> ${booking.province}</p>
                <p><strong>Booked Days:</strong> ${booking.days}</p>
                <p><strong>Trip Dates:</strong> ${booking.tripDates.startDate} to ${booking.tripDates.endDate}</p>
                <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">BOOKED</span></p>
                
                <div class="booked-hotel-actions">
                    <button class="btn-cancel-booking" onclick="window.displayHotelInstance.cancelHotelBooking('${booking.hotelId}')">
                        <i class="fas fa-times"></i> Cancel Booking
                    </button>
                </div>
            </div>
        `;
    }

    selectHotel(name, address) {
        console.log("Selected hotel:", name, address);
        alert(`Selected hotel: ${name}\nAddress: ${address}`);
        // Here you can add logic to save the selected hotel or integrate with trip planning
    }

    // Validate booking days input
    validateBookingDays(hotelId, days) {
        const validationDiv = document.getElementById(`validation_${hotelId}`);
        const daysNum = parseInt(days);
        
        if (!days || daysNum < 1) {
            validationDiv.innerHTML = '<span style="color: red;">Please enter a valid number of days (minimum 1)</span>';
            return false;
        } else if (daysNum > 30) {
            validationDiv.innerHTML = '<span style="color: orange;">Maximum 30 days allowed</span>';
            return false;
        }

        // Check against trip duration if dates are selected
        const tripDuration = this.getTripDuration();
        if (tripDuration > 0 && daysNum > tripDuration) {
            validationDiv.innerHTML = `<span style="color: red;">Booking days (${daysNum}) exceeds trip duration (${tripDuration} days)</span>`;
            return false;
        } else if (tripDuration > 0) {
            validationDiv.innerHTML = `<span style="color: green;">✓ Valid booking duration (Trip: ${tripDuration} days)</span>`;
            return true;
        } else {
            validationDiv.innerHTML = '<span style="color: green;">✓ Valid booking duration</span>';
            return true;
        }
    }

    // Get trip duration from selected dates
    getTripDuration() {
        if (window.dateChosenInstance) {
            const dateTimeInfo = window.dateChosenInstance.getAllDateTimeInfo();
            if (dateTimeInfo) {
                let startDate, endDate;
                
                // Handle new datetime picker format
                if (dateTimeInfo.startDateTime && dateTimeInfo.endDateTime) {
                    startDate = dateTimeInfo.startDateTime.split(' ')[0];
                    endDate = dateTimeInfo.endDateTime.split(' ')[0];
                } else if (dateTimeInfo.startDate && dateTimeInfo.endDate) {
                    // Handle legacy format
                    startDate = dateTimeInfo.startDate;
                    endDate = dateTimeInfo.endDate;
                } else {
                    return 0;
                }
                
                const start = new Date(startDate);
                const end = new Date(endDate);
                const diffTime = Math.abs(end - start);
                return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
        }
        return 0; // Return 0 if no dates selected
    }

    // Book hotel functionality
    bookHotel(hotelId, hotelName, hotelAddress) {
        const daysInput = document.getElementById(`bookingDays_${hotelId}`);
        const days = daysInput ? daysInput.value : '';
        
        if (!this.validateBookingDays(hotelId, days)) {
            alert('Please enter a valid number of days for booking.');
            return;
        }

        // Check if hotel is already booked
        if (this.isHotelBooked(hotelId)) {
            alert('This hotel is already booked. You cannot book the same hotel twice.');
            return;
        }

        // Check if dates are selected
        let dateTimeInfo = null;
        if (window.dateChosenInstance) {
            dateTimeInfo = window.dateChosenInstance.getAllDateTimeInfo();
            
            // Check for new datetime picker format or legacy format
            const hasNewFormat = dateTimeInfo && dateTimeInfo.startDateTime && dateTimeInfo.endDateTime;
            const hasLegacyFormat = dateTimeInfo && dateTimeInfo.startDate && dateTimeInfo.endDate;
            
            if (!dateTimeInfo || (!hasNewFormat && !hasLegacyFormat)) {
                alert('Please select trip dates before booking hotels.');
                return;
            }
            
            // Ensure consistent format for processing
            if (hasNewFormat && !hasLegacyFormat) {
                dateTimeInfo.startDate = dateTimeInfo.startDateTime.split(' ')[0];
                dateTimeInfo.endDate = dateTimeInfo.endDateTime.split(' ')[0];
                dateTimeInfo.startTime = dateTimeInfo.startDateTime.split(' ')[1] || '09:00';
                dateTimeInfo.endTime = dateTimeInfo.endDateTime.split(' ')[1] || '18:00';
            }
        } else {
            alert('Date selection is not available. Please refresh the page.');
            return;
        }

        // Validate total booking days against trip duration
        const currentBookingDays = parseInt(days);
        const tripDuration = this.getTripDuration();
        const totalBookedDays = this.getTotalBookedDays();
        
        if ((totalBookedDays + currentBookingDays) > tripDuration) {
            alert(`Total hotel bookings (${totalBookedDays + currentBookingDays} days) would exceed your trip duration (${tripDuration} days).\n\nCurrent bookings: ${totalBookedDays} days\nTrying to add: ${currentBookingDays} days\nTrip duration: ${tripDuration} days\n\nPlease adjust your booking or extend your trip duration.`);
            return;
        }

        // Get date information and hotel coordinates
        const hotelMarker = this.hotelMarkers.find(marker => marker.hotelData && marker.hotelData.id === hotelId);
        const coordinates = hotelMarker ? hotelMarker.hotelData.coordinates : null;
        
        const dateInfo = `Check-in: ${dateTimeInfo.startDate}\nCheck-out: ${dateTimeInfo.endDate}\nTrip Duration: ${tripDuration} days`;

        // Show booking confirmation
        const bookingDetails = `Hotel: ${hotelName}\nAddress: ${hotelAddress}\nBooking Duration: ${days} days\n\n${dateInfo}\n\nTotal Booked Days: ${totalBookedDays + currentBookingDays}/${tripDuration} days\nRemaining Days: ${tripDuration - (totalBookedDays + currentBookingDays)} days`;
        
        if (confirm(`Confirm booking details:\n\n${bookingDetails}\n\nProceed with booking?`)) {
            // Process the booking
            this.processHotelBooking(hotelId, hotelName, hotelAddress, days, dateTimeInfo, coordinates);
        }
    }

    // Get total days already booked
    getTotalBookedDays() {
        if (!this.selectedHotels || this.selectedHotels.length === 0) {
            return 0;
        }
        return this.selectedHotels.reduce((total, hotel) => total + hotel.days, 0);
    }

    // Process hotel booking (integrate with trip planning)
    processHotelBooking(hotelId, hotelName, hotelAddress, days, dateTimeInfo, coordinates) {
        const bookingData = {
            hotelId: hotelId,
            name: hotelName,
            address: hotelAddress,
            coordinates: coordinates,
            days: parseInt(days),
            bookingDate: new Date().toISOString(),
            tripDates: {
                startDate: dateTimeInfo.startDate,
                endDate: dateTimeInfo.endDate,
                startTime: dateTimeInfo.startTime,
                endTime: dateTimeInfo.endTime
            },
            province: this.provinceDisplayInstance?.selectedRegion?.province?.name || 'Unknown'
        };

        // Add to selected hotels list
        if (!this.selectedHotels) {
            this.selectedHotels = [];
        }

        this.selectedHotels.push(bookingData);

        // Save to localStorage for persistence
        this.saveHotelBookings();

        // Verify coordinates were saved
        if (!coordinates) {
            console.warn('Warning: Hotel coordinates not saved for', hotelName);
        } else {
            console.log('Hotel coordinates saved:', coordinates, 'for', hotelName);
        }

        // Update booked hotels display
        this.displayBookedHotels();
        
        // Refresh current hotel display to show booked status
        if (this.isHotelsVisible) {
            this.refreshHotelDisplay();
        }

        // Show success message
        const totalBookedDays = this.getTotalBookedDays();
        const tripDuration = this.getTripDuration();
        const remainingDays = tripDuration - totalBookedDays;
        
        this.showLoading(`Hotel "${hotelName}" booked for ${days} days! (${totalBookedDays}/${tripDuration} days booked, ${remainingDays} days remaining)`, true);
        
        console.log('Hotel booked:', bookingData);
        console.log('All selected hotels:', this.selectedHotels);

        // Update any UI elements that show booking summary
        this.updateBookingSummaryDisplay();
    }

    // Save hotel bookings to localStorage
    saveHotelBookings() {
        try {
            localStorage.setItem('hotelBookings', JSON.stringify(this.selectedHotels || []));
            console.log('Hotel bookings saved to localStorage');
        } catch (error) {
            console.error('Error saving hotel bookings:', error);
        }
    }

    // Load hotel bookings from localStorage
    loadHotelBookings() {
        try {
            const saved = localStorage.getItem('hotelBookings');
            if (saved) {
                this.selectedHotels = JSON.parse(saved);
                console.log('Hotel bookings loaded from localStorage:', this.selectedHotels);
            }
        } catch (error) {
            console.error('Error loading hotel bookings:', error);
            this.selectedHotels = [];
        }
    }

    // Update booking summary display (can be called from optimize button)
    updateBookingSummaryDisplay() {
        // This method can be used to update any UI elements showing booking info
        if (typeof this.onBookingUpdate === 'function') {
            this.onBookingUpdate(this.getBookingSummary());
        }
    }

    clearHotels() {
        if (this.hotelLayer) {
            this.hotelLayer.clearLayers();
        }
        this.hotelMarkers = [];
        this.isHotelsVisible = false;
        console.log("Cleared all hotel markers");
    }

    // Cancel hotel booking
    cancelHotelBooking(hotelId) {
        const bookingIndex = this.selectedHotels.findIndex(hotel => hotel.hotelId === hotelId);
        if (bookingIndex === -1) {
            alert('Booking not found.');
            return;
        }

        const booking = this.selectedHotels[bookingIndex];
        if (confirm(`Cancel booking for ${booking.name}?\n\nThis will free up ${booking.days} days from your trip.`)) {
            // Remove from selectedHotels
            this.selectedHotels.splice(bookingIndex, 1);
            
            // Clear history display to remove outdated trail
            this.clearHistoryDisplay();
            
            // Save updated bookings
            this.saveHotelBookings();
            
            // Update displays - show only remaining selected hotels
            this.displayBookedHotels();
            if (this.isHotelsVisible) {
                this.refreshHotelDisplay();
            }
            
            const totalBookedDays = this.getTotalBookedDays();
            const tripDuration = this.getTripDuration();
            const remainingDays = tripDuration - totalBookedDays;
            
            this.showLoading(`Booking cancelled for ${booking.name}. History cleared, remaining ${this.selectedHotels.length} hotels shown. (${totalBookedDays}/${tripDuration} days booked, ${remainingDays} days available)`, true);
            console.log('Booking cancelled and history cleared:', booking);
        }
    }

    // Refresh hotel display to update booking status
    refreshHotelDisplay() {
        // Store current hotels data
        const currentHotels = this.hotelMarkers.map(marker => marker.hotelData).filter(Boolean);
        
        // Clear and redisplay
        this.clearHotels();
        if (currentHotels.length > 0) {
            this.displayHotels(currentHotels);
        }
    }

    toggleHotels() {
        if (this.isHotelsVisible) {
            this.clearHotels();
        } else {
            this.searchHotels();
        }
    }

    showLoading(message, autoClose = false) {
        // Use the global showLoading function if available
        if (typeof showLoading === 'function') {
            showLoading(message, autoClose);
        } else {
            // Fallback to console and alert
            console.log(message);
            if (autoClose) {
                alert(message);
            }
        }
    }

    // Get selected hotels (for trip planning integration)
    getSelectedHotels() {
        return this.selectedHotels || [];
    }

    // Clear selected hotels
    clearSelectedHotels() {
        // Store current selected hotels before clearing history
        const currentSelectedHotels = this.selectedHotels || [];
        
        // Clear history layer and controls first
        this.clearHistoryDisplay();
        
        // Clear localStorage
        localStorage.removeItem('hotelBookings');
        
        // Reset selectedHotels array
        this.selectedHotels = [];
        
        // Clear booked hotel markers from map
        if (this.bookedHotelLayer) {
            this.bookedHotelLayer.clearLayers();
        }
        this.bookedHotelMarkers = [];
        
        // If there were selected hotels, redisplay them without history
        if (currentSelectedHotels.length > 0) {
            // Restore the selected hotels
            this.selectedHotels = currentSelectedHotels;
            
            // Save them back to localStorage
            this.saveHotelBookings();
            
            // Display only the booked hotels (without history visualization)
            this.displayBookedHotels();
            
            console.log(`Cleared history but preserved ${currentSelectedHotels.length} selected hotels on map`);
        } else {
            console.log("Cleared all selected hotels and history - no hotels to preserve");
        }
        
        // Refresh current hotel display to remove booked status from search results
        if (this.isHotelsVisible) {
            this.refreshHotelDisplay();
        }
        
        console.log("Cleared all history while preserving selected hotel markers");
    }

    // Clear all data including selected hotels (for complete reset)
    clearAllHotelData() {
        this.selectedHotels = [];
        localStorage.removeItem('hotelBookings');
        
        // Clear booked hotel markers from map
        if (this.bookedHotelLayer) {
            this.bookedHotelLayer.clearLayers();
        }
        this.bookedHotelMarkers = [];
        
        // Clear history layer and controls
        this.clearHistoryDisplay();
        
        // Clear regular hotel markers
        this.clearHotels();
        
        console.log("Cleared all hotel data, selected hotels, markers, and history");
    }

    // Clear history display from map
    clearHistoryDisplay() {
        try {
            // Clear history layer
            if (this.historyLayer) {
                this.historyLayer.clearLayers();
            }
            
            // Remove timeline control
            if (this.timelineControl) {
                this.map.removeControl(this.timelineControl);
                this.timelineControl = null;
            }
            
            // Remove history summary control
            if (this.historySummaryControl) {
                this.map.removeControl(this.historySummaryControl);
                this.historySummaryControl = null;
            }
            
            console.log('History display cleared from map');
        } catch (error) {
            console.error('Error clearing history display:', error);
        }
    }

    // Toggle history display visibility
    toggleHistoryDisplay() {
        if (!this.historyLayer) {
            // Show history
            this.displayUserHistoryOnMap();
            console.log('History display enabled');
            return true;
        } else {
            // Hide history
            this.clearHistoryDisplay();
            console.log('History display disabled');
            return false;
        }
    }

    // Get history display status
    isHistoryDisplayActive() {
        return this.historyLayer && this.map.hasLayer(this.historyLayer);
    }

    // Clear only history display while preserving selected hotels
    clearHistoryOnly() {
        try {
            // Clear history layer and controls
            this.clearHistoryDisplay();
            
            // Ensure selected hotels remain visible
            if (this.selectedHotels && this.selectedHotels.length > 0) {
                this.displayBookedHotels();
                console.log(`History cleared, ${this.selectedHotels.length} selected hotels remain visible`);
            } else {
                console.log('History cleared, no selected hotels to preserve');
            }
            
        } catch (error) {
            console.error('Error clearing history only:', error);
        }
    }

    // Get booking summary
    getBookingSummary() {
        if (!this.selectedHotels || this.selectedHotels.length === 0) {
            return {
                status: "No hotels booked",
                hotelCount: 0,
                totalDays: 0,
                hotels: []
            };
        }

        const totalDays = this.selectedHotels.reduce((sum, hotel) => sum + hotel.days, 0);
        const tripDuration = this.getTripDuration();
        
        return {
            status: "Hotels booked",
            hotelCount: this.selectedHotels.length,
            totalDays: totalDays,
            tripDuration: tripDuration,
            remainingDays: tripDuration > 0 ? tripDuration - totalDays : 0,
            hotels: this.selectedHotels,
            isComplete: tripDuration > 0 && totalDays === tripDuration,
            coordinates: this.getHotelCoordinates()
        };
    }

    // Get all hotel coordinates for mapping purposes
    getHotelCoordinates() {
        if (!this.selectedHotels || this.selectedHotels.length === 0) {
            return [];
        }

        return this.selectedHotels
            .filter(hotel => hotel.coordinates && hotel.coordinates.length === 2)
            .map(hotel => ({
                name: hotel.name,
                address: hotel.address,
                coordinates: hotel.coordinates,
                province: hotel.province,
                days: hotel.days,
                lat: hotel.coordinates[1],
                lng: hotel.coordinates[0]
            }));
    }

    // Debug method to check coordinate data integrity
    validateCoordinateData() {
        const report = {
            totalHotels: this.selectedHotels?.length || 0,
            hotelsWithCoordinates: 0,
            hotelsWithoutCoordinates: 0,
            coordinateIssues: []
        };

        if (this.selectedHotels) {
            this.selectedHotels.forEach((hotel, index) => {
                if (hotel.coordinates && Array.isArray(hotel.coordinates) && hotel.coordinates.length === 2) {
                    const [lng, lat] = hotel.coordinates;
                    if (typeof lng === 'number' && typeof lat === 'number' && !isNaN(lng) && !isNaN(lat)) {
                        report.hotelsWithCoordinates++;
                    } else {
                        report.hotelsWithoutCoordinates++;
                        report.coordinateIssues.push(`Hotel ${index + 1} (${hotel.name}): Invalid coordinate format`);
                    }
                } else {
                    report.hotelsWithoutCoordinates++;
                    report.coordinateIssues.push(`Hotel ${index + 1} (${hotel.name}): Missing coordinates`);
                }
            });
        }

        console.log('Coordinate validation report:', report);
        return report;
    }

    // Focus map on selected province and display booked hotels prominently
    focusMapOnSelections() {
        try {
            // Get selected province bounds
            let provinceBounds = null;
            
            if (this.provinceDisplayInstance && 
                this.provinceDisplayInstance.selectedRegion && 
                this.provinceDisplayInstance.selectedRegion.province) {
                
                const selectedProvince = this.provinceDisplayInstance.selectedRegion.province;
                provinceBounds = this.getProvinceBounds(selectedProvince);
                console.log('Focusing map on province:', selectedProvince.name);
            }

            // Get hotel locations
            const hotelCoordinates = this.getHotelCoordinates();
            
            if (hotelCoordinates.length === 0 && !provinceBounds) {
                console.log('No hotels or province selected for map focus');
                return;
            }

            // Create bounds that include both province and hotels
            let boundsToFit = [];
            
            // Add hotel coordinates to bounds
            hotelCoordinates.forEach(hotel => {
                boundsToFit.push([hotel.lat, hotel.lng]);
            });

            // Add province bounds if available
            if (provinceBounds) {
                boundsToFit.push([provinceBounds.minLat, provinceBounds.minLng]);
                boundsToFit.push([provinceBounds.maxLat, provinceBounds.maxLng]);
            }

            // If only province bounds exist (no hotels), focus on province center
            if (boundsToFit.length === 0 && provinceBounds) {
                const provinceCenterLat = (provinceBounds.minLat + provinceBounds.maxLat) / 2;
                const provinceCenterLng = (provinceBounds.minLng + provinceBounds.maxLng) / 2;
                
                this.map.setView([provinceCenterLat, provinceCenterLng], 9);
                console.log('Map focused on province center (no hotels booked)');
                return;
            }

            // Fit map to show all selected locations
            if (boundsToFit.length > 0) {
                const leafletBounds = L.latLngBounds(boundsToFit);
                
                // Add some padding to the bounds
                this.map.fitBounds(leafletBounds, {
                    padding: [50, 50],
                    maxZoom: 10
                });

                console.log(`Map focused on ${boundsToFit.length} locations`);
                
                // Ensure booked hotels are visible and highlighted
                this.displayBookedHotels();
                
                // Temporarily pulse the booked hotel markers for attention
                this.pulseBookedHotelMarkers();
            }

        } catch (error) {
            console.error('Error focusing map on selections:', error);
        }
    }

    // Add visual pulse effect to booked hotel markers
    pulseBookedHotelMarkers() {
        if (!this.bookedHotelMarkers || this.bookedHotelMarkers.length === 0) return;

        // Add pulse animation to each booked hotel marker
        this.bookedHotelMarkers.forEach((marker, index) => {
            const markerElement = marker.getElement();
            if (markerElement) {
                // Add pulse class with a slight delay for each marker
                setTimeout(() => {
                    markerElement.style.animation = 'pulse 2s ease-in-out 3';
                    
                    // Remove animation after it completes
                    setTimeout(() => {
                        markerElement.style.animation = '';
                    }, 6000);
                }, index * 200);
            }
        });

        // Add CSS for pulse animation if it doesn't exist
        if (!document.getElementById('hotel-marker-animations')) {
            const style = document.createElement('style');
            style.id = 'hotel-marker-animations';
            style.textContent = `
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.3); box-shadow: 0 0 20px rgba(16, 185, 129, 0.6); }
                    100% { transform: scale(1); }
                }
                .booked-hotel-focused {
                    z-index: 1000 !important;
                }
            `;
            document.head.appendChild(style);
        }

        console.log(`Applied pulse animation to ${this.bookedHotelMarkers.length} booked hotel markers`);
    }

    // Display user history on map with enhanced visualization
    displayUserHistoryOnMap() {
        try {
            console.log('Displaying user selection history on map...');
            
            // Ensure booked hotels are prominently displayed
            this.displayBookedHotels();
            
            // Add history tracking layer if it doesn't exist
            if (!this.historyLayer) {
                this.historyLayer = L.layerGroup().addTo(this.map);
            } else {
                this.historyLayer.clearLayers();
            }
            
            // Get user selection history
            const selectionHistory = this.getUserSelectionHistory();
            
            // Display province outline with enhanced styling
            if (this.provinceDisplayInstance && 
                this.provinceDisplayInstance.selectedRegion && 
                this.provinceDisplayInstance.selectedRegion.province) {
                
                const selectedProvince = this.provinceDisplayInstance.selectedRegion.province;
                this.addProvinceHistoryToMap(selectedProvince);
            }
            
            // Add hotel selection history markers
            this.addHotelHistoryToMap(selectionHistory.hotels);
            
            // Add date/time history information
            this.addTripTimelineToMap(selectionHistory.timeline);
            
            // Add summary popup
            this.addHistorySummaryPopup(selectionHistory);
            
            console.log('User history successfully displayed on map');
            
        } catch (error) {
            console.error('Error displaying user history on map:', error);
        }
    }

    // Get comprehensive user selection history
    getUserSelectionHistory() {
        const history = {
            timestamp: new Date().toISOString(),
            province: null,
            hotels: [],
            timeline: null,
            summary: {
                totalSelections: 0,
                totalDays: 0,
                provinces: []
            }
        };

        // Get province history
        if (this.provinceDisplayInstance?.selectedRegion?.province) {
            history.province = {
                name: this.provinceDisplayInstance.selectedRegion.province.name,
                selectedAt: new Date().toISOString(),
                bounds: this.getProvinceBounds(this.provinceDisplayInstance.selectedRegion.province)
            };
            history.summary.provinces.push(history.province.name);
        }

        // Get hotel booking history
        if (this.selectedHotels && this.selectedHotels.length > 0) {
            history.hotels = this.selectedHotels.map(hotel => ({
                ...hotel,
                selectionOrder: history.hotels.length + 1,
                displayStatus: 'booked'
            }));
            history.summary.totalSelections = this.selectedHotels.length;
            history.summary.totalDays = this.selectedHotels.reduce((sum, hotel) => sum + hotel.days, 0);
        }

        // Get timeline information
        if (window.dateChosenInstance) {
            const dateInfo = window.dateChosenInstance.getAllDateTimeInfo();
            if (dateInfo.startDate && dateInfo.endDate) {
                history.timeline = {
                    startDate: dateInfo.startDate,
                    endDate: dateInfo.endDate,
                    duration: this.getTripDuration(),
                    selectedAt: new Date().toISOString()
                };
            }
        }

        return history;
    }

    // Add province history visualization to map
    addProvinceHistoryToMap(province) {
        try {
            // Create enhanced province outline
            if (province.geometry) {
                const provinceFeature = L.geoJSON(province.geometry, {
                    style: {
                        color: '#2563eb',
                        weight: 3,
                        opacity: 0.8,
                        fillColor: '#3b82f6',
                        fillOpacity: 0.1,
                        dashArray: '5, 5'
                    }
                }).addTo(this.historyLayer);

                // Add province label
                const bounds = provinceFeature.getBounds();
                const center = bounds.getCenter();
                
                const provinceLabel = L.marker(center, {
                    icon: L.divIcon({
                        className: 'province-history-label',
                        html: `<div style="background: rgba(37, 99, 235, 0.9); color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                                 <i class="fas fa-map-marker-alt"></i> ${province.name}
                               </div>`,
                        iconSize: [0, 0],
                        iconAnchor: [0, 0]
                    })
                }).addTo(this.historyLayer);

                console.log(`Added province history visualization for: ${province.name}`);
            }
        } catch (error) {
            console.error('Error adding province history to map:', error);
        }
    }

    // Add hotel selection history to map
    addHotelHistoryToMap(hotels) {
        if (!hotels || hotels.length === 0) return;

        hotels.forEach((hotel, index) => {
            if (hotel.coordinates) {
                const [lng, lat] = hotel.coordinates;
                
                // Create history trail marker (smaller than main booked marker)
                const historyIcon = L.divIcon({
                    className: 'hotel-history-marker',
                    html: `<div style="background: rgba(16, 185, 129, 0.7); width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative;">
                             <span style="color: white; font-size: 10px; font-weight: bold;">${index + 1}</span>
                             <div style="position: absolute; top: -8px; right: -8px; background: #3b82f6; color: white; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; font-size: 8px;">
                               <i class="fas fa-history"></i>
                             </div>
                           </div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });

                const historyMarker = L.marker([lat, lng], { icon: historyIcon })
                    .bindPopup(this.createHistoryPopup(hotel, index + 1))
                    .addTo(this.historyLayer);

                // Add connection line from previous hotel (if exists)
                if (index > 0 && hotels[index - 1].coordinates) {
                    const prevCoords = hotels[index - 1].coordinates;
                    const line = L.polyline([
                        [prevCoords[1], prevCoords[0]], 
                        [lat, lng]
                    ], {
                        color: '#10b981',
                        weight: 2,
                        opacity: 0.6,
                        dashArray: '3, 3'
                    }).addTo(this.historyLayer);
                }
            }
        });

        console.log(`Added ${hotels.length} hotel history markers to map`);
    }

    // Create history popup for hotels
    createHistoryPopup(hotel, orderNumber) {
        return `
            <div class="history-popup">
                <h5 style="color: #10b981; margin-bottom: 8px;">
                    <i class="fas fa-history"></i> Selection #${orderNumber}
                </h5>
                <h6><i class="fas fa-hotel"></i> ${hotel.name}</h6>
                <p style="font-size: 12px; margin-bottom: 4px;">
                    <i class="fas fa-map-marker-alt"></i> ${hotel.address}
                </p>
                <p style="font-size: 12px; margin-bottom: 4px;">
                    <i class="fas fa-calendar"></i> ${hotel.days} days in ${hotel.province}
                </p>
                <p style="font-size: 11px; color: #666; margin-bottom: 0;">
                    <i class="fas fa-clock"></i> Booked: ${new Date(hotel.bookingDate).toLocaleString()}
                </p>
                <div style="background: #f0f9ff; padding: 4px; border-radius: 4px; margin-top: 6px;">
                    <small style="color: #0369a1;">
                        <i class="fas fa-info-circle"></i> Part of your trip history
                    </small>
                </div>
            </div>
        `;
    }

    // Add trip timeline information to map
    addTripTimelineToMap(timeline) {
        if (!timeline) return;

        // Add timeline info box in corner of map
        const timelineControl = L.control({ position: 'bottomright' });
        
        timelineControl.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'trip-timeline-control');
            div.innerHTML = `
                <div style="background: rgba(255, 255, 255, 0.95); padding: 8px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); min-width: 200px;">
                    <h6 style="margin: 0 0 6px 0; color: #1f2937; font-size: 13px;">
                        <i class="fas fa-calendar-alt"></i> Trip Timeline
                    </h6>
                    <div style="font-size: 11px; color: #374151;">
                        <p style="margin: 2px 0;"><strong>Start:</strong> ${timeline.startDate}</p>
                        <p style="margin: 2px 0;"><strong>End:</strong> ${timeline.endDate}</p>
                        <p style="margin: 2px 0;"><strong>Duration:</strong> ${timeline.duration} days</p>
                    </div>
                    <div style="background: #dbeafe; padding: 4px; border-radius: 3px; margin-top: 4px;">
                        <small style="color: #1e40af;">
                            <i class="fas fa-history"></i> Your trip selections
                        </small>
                    </div>
                </div>
            `;
            return div;
        };

        timelineControl.addTo(this.map);
        this.timelineControl = timelineControl;

        console.log('Added trip timeline to map');
    }

    // Add history summary popup
    addHistorySummaryPopup(history) {
        // Create summary control
        const summaryControl = L.control({ position: 'topright' });
        
        summaryControl.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'history-summary-control');
            div.innerHTML = `
                <div style="background: rgba(16, 185, 129, 0.95); color: white; padding: 10px; border-radius: 8px; box-shadow: 0 3px 10px rgba(0,0,0,0.3); min-width: 220px;">
                    <h6 style="margin: 0 0 8px 0; font-size: 14px;">
                        <i class="fas fa-chart-line"></i> Selection History
                    </h6>
                    <div style="font-size: 12px;">
                        ${history.province ? `<p style="margin: 3px 0;"><i class="fas fa-map"></i> Province: ${history.province.name}</p>` : ''}
                        <p style="margin: 3px 0;"><i class="fas fa-hotel"></i> Hotels: ${history.summary.totalSelections}</p>
                        <p style="margin: 3px 0;"><i class="fas fa-calendar"></i> Total Days: ${history.summary.totalDays}</p>
                        ${history.timeline ? `<p style="margin: 3px 0;"><i class="fas fa-clock"></i> Duration: ${history.timeline.duration} days</p>` : ''}
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.2); padding: 4px; border-radius: 4px; margin-top: 6px; text-align: center;">
                        <small>
                            <i class="fas fa-eye"></i> Your trip is visualized on the map
                        </small>
                    </div>
                </div>
            `;
            return div;
        };

        summaryControl.addTo(this.map);
        this.historySummaryControl = summaryControl;

        console.log('Added history summary control to map');
    }

    // Get formatted booking display for optimize button
    getBookingDisplayInfo() {
        const summary = this.getBookingSummary();
        
        if (summary.hotelCount === 0) {
            return {
                title: "No Hotels Booked",
                content: "No hotel bookings found for this trip.",
                html: "<p><i class='fas fa-info-circle'></i> No hotel bookings found.</p>"
            };
        }

        let html = `
            <div class="hotel-booking-summary">
                <h4><i class="fas fa-bed"></i> Hotel Bookings (${summary.hotelCount} hotels)</h4>
                <div class="booking-stats">
                    <p><strong>Total Booked Days:</strong> ${summary.totalDays}</p>
                    ${summary.tripDuration > 0 ? `
                        <p><strong>Trip Duration:</strong> ${summary.tripDuration} days</p>
                        <p><strong>Remaining Days:</strong> ${summary.remainingDays} days</p>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(summary.totalDays/summary.tripDuration)*100}%"></div>
                        </div>
                    ` : ''}
                </div>
                <div class="hotel-list">
        `;

        summary.hotels.forEach((hotel, index) => {
            html += `
                <div class="hotel-booking-item">
                    <h5><i class="fas fa-hotel"></i> ${hotel.name}</h5>
                    <p><i class="fas fa-map-marker-alt"></i> ${hotel.address}</p>
                    <p><i class="fas fa-calendar"></i> ${hotel.days} days</p>
                    <p><i class="fas fa-location-arrow"></i> ${hotel.province}</p>
                    ${hotel.coordinates ? `<p><i class="fas fa-compass"></i> Coordinates: ${hotel.coordinates[1].toFixed(4)}, ${hotel.coordinates[0].toFixed(4)}</p>` : ''}
                    <small><i class="fas fa-clock"></i> Booked: ${new Date(hotel.bookingDate).toLocaleDateString()}</small>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        return {
            title: `Hotel Bookings (${summary.hotelCount} hotels, ${summary.totalDays} days)`,
            content: `${summary.hotelCount} hotels booked for ${summary.totalDays} days`,
            html: html,
            summary: summary
        };
    }
}
