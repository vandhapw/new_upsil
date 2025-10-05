class displayAttraction {
    constructor(map, provinceDisplayInstance) {
        this.map = map;
        this.provinceDisplayInstance = provinceDisplayInstance;
        this.attractionMarkers = [];
        this.attractionLayer = L.layerGroup().addTo(this.map);
        this.selectedAttractions = []; // Array to store selected attractions
        
        // Load saved attractions
        this.loadSelectedAttractions();
    }

    async searchAttractions() {
    try {
        // Check if a province is selected
        if (!this.provinceDisplayInstance || 
            !this.provinceDisplayInstance.selectedRegion || 
            !this.provinceDisplayInstance.selectedRegion.province) {
            alert('Please select a province first to search for attractions');
            return;
        }

        const selectedProvince = this.provinceDisplayInstance.selectedRegion.province;
        console.log("Searching attractions for province:", selectedProvince.name);

        // Fetch attractions using province_id
        const provinceId = selectedProvince.code; // Assuming `code` is the `province_id`
        const attractions = await this.fetchAttractions(provinceId);

        if (attractions && attractions.length > 0) {
            this.displayAttractions(attractions);
            this.showLoading('Found ' + attractions.length + ' attractions in ' + selectedProvince.name, true);
        } else {
            this.showLoading('No attractions found in ' + selectedProvince.name, true);
        }

    } catch (error) {
        console.error("Error searching attractions:", error);
        this.showLoading('Error searching for attractions. Please try again.', true);
    }
}

    async fetchAttractions(provinceId) {
        try {
            const url = `/dashboard/kaidashboard/tourism/api/attractions/?province_id=${provinceId}`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (!result.success) {
                throw new Error('Failed to fetch attractions from the API');
            }

            // Transform API response to our format
            return result.attractions.map(attraction => ({
                id: attraction.id,
                name: attraction.name,
                province: attraction.province,
                provinceId: attraction.province_id,
                coordinates: attraction.coordinates,
                rating: attraction.rating || null,
                imageUrl: attraction.image_url || null,
                type: attraction.type || 'unknown'
            }));
            
        } catch (error) {
            console.error("API fetch error:", error);
            throw error;
        }
    }

    displayAttractions(attractions) {
        attractions.forEach(attraction => {
            const [lng, lat] = attraction.coordinates;

            // Check if the attraction is already selected
            const isSelected = this.isAttractionSelected(attraction.id);

            // Create a custom marker style based on selection status
            const markerIcon = L.divIcon({
                className: isSelected ? 'custom-selected-attraction-marker' : 'custom-attraction-marker',
                html: `
                    <div style="background-color: ${isSelected ? '#10b981' : '#ffcc00'}; 
                                width: 28px; 
                                height: 28px; 
                                border-radius: 50%; 
                                border: 3px solid white; 
                                display: flex; 
                                align-items: center; 
                                justify-content: center; 
                                box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                        <i class="fas ${isSelected ? 'fa-check-circle' : 'fa-map-marker-alt'}" 
                        style="color: white; font-size: 14px;"></i>
                    </div>
                `,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });

            // Create attraction marker
            const marker = L.marker([lat, lng], { icon: markerIcon })
                .bindPopup(this.createAttractionPopup(attraction))
                .addTo(this.attractionLayer);

            this.attractionMarkers.push(marker);
        });

        console.log(`Displayed ${attractions.length} attractions on the map`);
    }



    clearAttractions() {
        this.attractionLayer.clearLayers();
        this.attractionMarkers = [];
        console.log("Cleared all attraction markers");
    }

    showLoading(message, autoClose = false) {
        if (typeof showLoading === 'function') {
            showLoading(message, autoClose);
        } else {
            console.log(message);
            if (autoClose) {
                alert(message);
            }
        }
    }

    // Validate selection hours input
    validateSelectionHours(attractionId, hours) {
        const validationDiv = document.getElementById(`validation_${attractionId}`);
        const hoursNum = parseInt(hours);

        if (!hours || hoursNum < 1) {
            validationDiv.innerHTML = '<span style="color: red;">Please enter a valid number of hours (minimum 1)</span>';
            return false;
        }

        const tripDurationHours = this.getTripDurationHours();
        const totalSelectedHours = this.getTotalSelectedHours();

        if ((totalSelectedHours + hoursNum) > tripDurationHours) {
            validationDiv.innerHTML = `<span style="color: red;">Selection hours (${hoursNum}) exceed trip duration (${tripDurationHours} hours)</span>`;
            return false;
        } else {
            validationDiv.innerHTML = '<span style="color: green;">✓ Valid selection duration</span>';
            return true;
        }
    }

    // Select an attraction
    selectAttraction(attractionId, attractionName, province, coordinates) {
        console.log("clicked select attraction")
        const hoursInput = document.getElementById(`selectionHours_${attractionId}`);
        const hours = hoursInput ? hoursInput.value : '';

        if (!this.validateSelectionHours(attractionId, hours)) {
            alert('Please enter a valid number of hours for selection.');
            return;
        }

        // Check if the attraction is already selected
        if (this.isAttractionSelected(attractionId)) {
            alert('This attraction is already selected.');
            return;
        }

        // Close or remove the popup if it exists
        const popup = document.querySelector('.leaflet-popup-content-wrapper');
        if (popup) {
            const popupParent = popup.closest('.leaflet-popup');
            if (popupParent) {
                popupParent.remove();
            }
        }

        const selectionData = {
            id: attractionId,
            name: attractionName,
            province: province,
            hours: parseInt(hours),
            coordinates: coordinates ? coordinates.split(',').map(coord => parseFloat(coord.trim())) : [],
            selectionDate: new Date().toISOString()
        };

        this.selectedAttractions.push(selectionData);

        // Save to localStorage
        this.saveSelectedAttractions();

        // Refresh attraction display
        // this.refreshAttractionDisplay();
       
        // alert(`Attraction "${attractionName}" selected for ${hours} hours.`);
    }

    // Cancel attraction selection
    cancelAttractionSelection(attractionId) {
        const index = this.selectedAttractions.findIndex(a => a.id === attractionId);
        if (index === -1) {
            alert('Selection not found.');
            return;
        }

        const selection = this.selectedAttractions[index];
        if (confirm(`Cancel selection for ${selection.name}?`)) {
            this.selectedAttractions.splice(index, 1);

            // Save updated selections
            this.saveSelectedAttractions();

            // Refresh attraction display
            this.refreshAttractionDisplay();

            alert(`Selection for "${selection.name}" has been canceled.`);
        }
    }

    // Check if an attraction is already selected
    isAttractionSelected(attractionId) {
        return this.selectedAttractions.some(a => a.id === attractionId);
    }

    // Get total selected hours
    getTotalSelectedHours() {
        return this.selectedAttractions.reduce((total, a) => total + a.hours, 0);
    }

    // Get trip duration in hours
    getTripDurationHours() {
        if (window.dateChosenInstance) {
            const dateTimeInfo = window.dateChosenInstance.getAllDateTimeInfo();
            if (dateTimeInfo.startDateTime && dateTimeInfo.endDateTime) {
                const start = new Date(dateTimeInfo.startDateTime);
                const end = new Date(dateTimeInfo.endDateTime);
                const diffTime = Math.abs(end - start);
                return Math.ceil(diffTime / (1000 * 60 * 60));
            }
        }
        return 0;
    }

    // Refresh attraction display
    refreshAttractionDisplay() {
        // Get all current attractions from markers
        const currentAttractions = this.attractionMarkers.map(marker => marker.attractionData).filter(Boolean);

        // Clear the attraction layer but keep the selected attractions in memory
        this.attractionLayer.clearLayers();
        this.attractionMarkers = [];

        // Redisplay all attractions, including selected ones
        if (currentAttractions.length > 0) {
            currentAttractions.forEach(attraction => {
                const [lng, lat] = attraction.coordinates;

                // Check if the attraction is already selected
                const isSelected = this.isAttractionSelected(attraction.id);

                // Create a custom marker style based on selection status
                const markerIcon = L.divIcon({
                    className: isSelected ? 'custom-selected-attraction-marker' : 'custom-attraction-marker',
                    html: `
                        <div style="background-color: ${isSelected ? '#10b981' : '#ffcc00'}; 
                                    width: 28px; 
                                    height: 28px; 
                                    border-radius: 50%; 
                                    border: 3px solid white; 
                                    display: flex; 
                                    align-items: center; 
                                    justify-content: center; 
                                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                            <i class="fas ${isSelected ? 'fa-check-circle' : 'fa-map-marker-alt'}" 
                            style="color: white; font-size: 14px;"></i>
                        </div>
                    `,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                });

                // Create attraction marker
                const marker = L.marker([lat, lng], { icon: markerIcon })
                    .bindPopup(this.createAttractionPopup(attraction))
                    .addTo(this.attractionLayer);

                this.attractionMarkers.push(marker);
            });
        }

        console.log("Attraction display refreshed, including selected attractions.");
    }

    createAttractionPopup(attraction) {
        const ratingStars = attraction.rating
            ? "★".repeat(attraction.rating) + "☆".repeat(5 - attraction.rating)
            : "No rating";

        const isSelected = this.isAttractionSelected(attraction.id);
        const totalSelectedHours = this.getTotalSelectedHours();
        const tripDurationHours = this.getTripDurationHours();
        const remainingHours = tripDurationHours - totalSelectedHours;

        let selectionSection = '';
        if (isSelected) {
            const selection = this.selectedAttractions.find(a => a.id === attraction.id);
            selectionSection = `
                <div class="selection-section selected">
                    <h5 style="color: #10b981;"><i class="fas fa-check-circle"></i> Already Selected</h5>
                    <p><strong>Selected for:</strong> ${selection ? selection.hours : 'N/A'} hours</p>
                    <button class="btn-cancel-selection" onclick="window.displayAttractionInstance.cancelAttractionSelection('${attraction.id}')">
                        <i class="fas fa-times"></i> Cancel Selection
                    </button>
                </div>
            `;
        } else {
            selectionSection = `
                <div class="selection-section">
                    <h5><i class="fas fa-calendar-check"></i> Select This Attraction</h5>
                    <div class="selection-info">
                        <p><small>Trip Duration: ${tripDurationHours} hours | Selected: ${totalSelectedHours} hours | Available: ${remainingHours} hours</small></p>
                    </div>
                    <div class="selection-form">
                        <div class="form-group">
                            <label for="selectionHours_${attraction.id}">Number of Hours (max ${remainingHours}):</label>
                            <input type="number" 
                                id="selectionHours_${attraction.id}" 
                                class="selection-input" 
                                min="1" 
                                max="${remainingHours}"
                                placeholder="Enter hours"
                                onchange="window.displayAttractionInstance.validateSelectionHours('${attraction.id}', this.value)">
                            <div id="validation_${attraction.id}" class="validation-message"></div>
                        </div>
                        <button class="btn-select" onclick="window.displayAttractionInstance.selectAttraction('${attraction.id}', '${attraction.name}', '${attraction.province}', '${attraction.coordinates}')">
                            <i class="fas fa-check"></i> Select Attractionss
                        </button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="popup-content attraction-popup ${isSelected ? 'selected-attraction' : ''}">
                <h4><i class="fas fa-map-marker-alt"></i> ${attraction.name}</h4>
                <p><strong>Province:</strong> ${attraction.province}</p>
                <p><strong>Type:</strong> ${attraction.type}</p>
                <p><strong>Rating:</strong> ${ratingStars}</p>
                <img src="${attraction.imageUrl}" alt="${attraction.name}" style="width: 100%; height: auto; margin-top: 10px;">
                ${selectionSection}
            </div>
        `;
    }

    displaySelectedAttractions() {
        if (this.selectedAttractions.length === 0) {
            alert("No attractions selected.");
            return;
        }

        let attractionList = '<h3>Selected Attractions</h3><ul>';
        this.selectedAttractions.forEach(attraction => {
            attractionList += `<li>${attraction.name} (${attraction.province})</li>`;
        });
        attractionList += '</ul>';

        // change the marker selected shape with checked icon and green color
        this.selectedAttractions.forEach(attraction => {
            const marker = this.getMarkerByAttractionId(attraction.id);
            if (marker) {
                marker.setIcon('checked-icon.png');
                marker.setColor('green');
            }
        });

        // Display the list in a modal or alert
        alert(attractionList);
        console.log("Selected attractions:", this.selectedAttractions);
    }

    // Get selected attractions for optimization results
    getSelectedAttractions() {
        return this.selectedAttractions || [];
    }

    // Get attraction booking display info for optimization results
    getAttractionDisplayInfo() {
        const attractions = this.getSelectedAttractions();
        
        if (attractions.length === 0) {
            return {
                title: "No Attractions",
                content: "No attractions selected",
                html: "<p>No attractions selected</p>",
                summary: { attractionCount: 0, attractions: [] }
            };
        }

        let html = `
            <div class="attraction-booking-summary">
                <h4><i class="fas fa-map-marker-alt"></i> Selected Attractions (${attractions.length} places)</h4>
                <div class="attraction-list">
        `;

        attractions.forEach((attraction, index) => {
            const ratingStars = attraction.rating
                ? "★".repeat(attraction.rating) + "☆".repeat(5 - attraction.rating)
                : "No rating";

            // Check if coordinates are valid
            const coordinates = Array.isArray(attraction.coordinates) && attraction.coordinates.length >= 2
                ? `${attraction.coordinates[1].toFixed(4)}, ${attraction.coordinates[0].toFixed(4)}`
                : "Coordinates not available";

            html += `
                <div class="attraction-item">
                    <div class="attraction-header">
                        <h5><i class="fas fa-star"></i> ${attraction.name}</h5>
                        <span class="attraction-type">${attraction.type}</span>
                    </div>
                    <div class="attraction-details">
                        <p><i class="fas fa-map-marker-alt"></i> ${attraction.province}</p>
                        <p><i class="fas fa-star"></i> ${ratingStars}</p>
                        <p><i class="fas fa-map"></i> Coordinates: ${coordinates}</p>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        return {
            title: `Selected Attractions (${attractions.length} places)`,
            content: `${attractions.length} attractions selected for your trip`,
            html: html,
            summary: {
                attractionCount: attractions.length,
                attractions: attractions
            }
        };
    }

    // Clear selected attractions (for the clear history function)
    clearSelectedAttractions() {
        this.selectedAttractions = [];
        this.clearAttractions();
        // Clear from localStorage
        localStorage.removeItem('selectedAttractions');
        localStorage.removeItem('attractionSelections');
        console.log("Cleared all selected attractions");
    }

    // Store attraction data for optimization (called when optimize button is clicked)
    storeAttractionDataForOptimization() {
        try {
            const optimizationData = {
                selectedAttractions: this.selectedAttractions,
                attractionCount: this.selectedAttractions.length,
                provinces: [...new Set(this.selectedAttractions.map(a => a.province))],
                optimizationTimestamp: new Date().toISOString(),
                summary: {
                    totalSelected: this.selectedAttractions.length,
                    byProvince: this.selectedAttractions.reduce((acc, attraction) => {
                        acc[attraction.province] = (acc[attraction.province] || 0) + 1;
                        return acc;
                    }, {}),
                    byType: this.selectedAttractions.reduce((acc, attraction) => {
                        acc[attraction.type] = (acc[attraction.type] || 0) + 1;
                        return acc;
                    }, {})
                }
            };

            // Store in localStorage with optimization-specific key
            localStorage.setItem('tripAttractionData', JSON.stringify(optimizationData));
            
            console.log('Attraction data stored for optimization:', optimizationData);
            return optimizationData;
        } catch (error) {
            console.error('Error storing attraction data for optimization:', error);
            return null;
        }
    }

    // Get stored optimization data
    getStoredOptimizationData() {
        try {
            const stored = localStorage.getItem('tripAttractionData');
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error('Error retrieving stored optimization data:', error);
            return null;
        }
    }

    // Save selected attractions to localStorage
    saveSelectedAttractions() {
        try {
            localStorage.setItem('selectedAttractions', JSON.stringify(this.selectedAttractions || []));
            console.log('Selected attractions saved to localStorage', JSON.stringify(this.selectedAttractions));
        } catch (error) {
            console.error('Error saving selected attractions:', error);
        }
    }


    // Load selected attractions from localStorage
    loadSelectedAttractions() {
        try {
            const saved = localStorage.getItem('selectedAttractions');
            if (saved) {
                this.selectedAttractions = JSON.parse(saved);
                console.log('Selected attractions loaded from localStorage:', this.selectedAttractions);
            }
        } catch (error) {
            console.error('Error loading selected attractions:', error);
            this.selectedAttractions = [];
        }
    }

    // Helper method to get a marker by attraction ID
    getMarkerByAttractionId(attractionId) {
        return this.attractionMarkers.find(marker => marker.attractionData && marker.attractionData.id === attractionId);
    }
}