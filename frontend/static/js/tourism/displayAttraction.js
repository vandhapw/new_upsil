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

            // Create attraction marker
            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'custom-attraction-marker',
                    html: `<div style="background-color: #ffcc00; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                            <i class="fas fa-map-marker-alt" style="color: white; font-size: 14px;"></i>
                        </div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                })
            }).bindPopup(this.createAttractionPopup(attraction))
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

    selectAttraction(attraction) {
        // Check if the attraction is already selected
        const isAlreadySelected = this.selectedAttractions.some(selected => selected.id === attraction.id);
        if (isAlreadySelected) {
            alert(`Attraction "${attraction.name}" is already selected.`);
            return;
        }

        // Add the attraction to the selected list
        this.selectedAttractions.push(attraction);
        
        // Save to localStorage
        this.saveSelectedAttractions();
        
        alert(`Attraction "${attraction.name}" has been added to your trip.`);
        console.log("Selected attractions:", this.selectedAttractions);
    }

    createAttractionPopup(attraction) {
        const ratingStars = attraction.rating
            ? "★".repeat(attraction.rating) + "☆".repeat(5 - attraction.rating)
            : "No rating";

        return `
            <div class="popup-content attraction-popup">
                <h4><i class="fas fa-map-marker-alt"></i> ${attraction.name}</h4>
                <p><strong>Province:</strong> ${attraction.province}</p>
                <p><strong>Type:</strong> ${attraction.type}</p>
                <p><strong>Rating:</strong> ${ratingStars}</p>
                <img src="${attraction.imageUrl}" alt="${attraction.name}" style="width: 100%; height: auto; margin-top: 10px;">
                <button class="btn-select-attraction" onclick="window.displayAttractionInstance.selectAttraction(${JSON.stringify(attraction).replace(/"/g, '&quot;')})">
                    <i class="fas fa-plus-circle"></i> Add to Trip
                </button>
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

            html += `
                <div class="attraction-item">
                    <div class="attraction-header">
                        <h5><i class="fas fa-star"></i> ${attraction.name}</h5>
                        <span class="attraction-type">${attraction.type}</span>
                    </div>
                    <div class="attraction-details">
                        <p><i class="fas fa-map-marker-alt"></i> ${attraction.province}</p>
                        <p><i class="fas fa-star"></i> ${ratingStars}</p>
                        <p><i class="fas fa-map"></i> Coordinates: ${attraction.coordinates[1].toFixed(4)}, ${attraction.coordinates[0].toFixed(4)}</p>
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

    // Save selected attractions to localStorage for persistence
    saveSelectedAttractions() {
        try {
            const attractionData = {
                selections: this.selectedAttractions,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            localStorage.setItem('selectedAttractions', JSON.stringify(attractionData));
            localStorage.setItem('attractionSelections', JSON.stringify(this.selectedAttractions)); // Backup key
            console.log('Selected attractions saved to localStorage:', attractionData);
        } catch (error) {
            console.error('Error saving selected attractions:', error);
        }
    }

    // Load selected attractions from localStorage
    loadSelectedAttractions() {
        try {
            // Try to load from the new format first
            let saved = localStorage.getItem('selectedAttractions');
            if (saved) {
                const data = JSON.parse(saved);
                // Check if it's the new format with metadata
                if (data.selections && Array.isArray(data.selections)) {
                    this.selectedAttractions = data.selections;
                } else if (Array.isArray(data)) {
                    // Old format - just an array
                    this.selectedAttractions = data;
                } else {
                    this.selectedAttractions = [];
                }
            } else {
                // Fallback to backup key
                saved = localStorage.getItem('attractionSelections');
                if (saved) {
                    this.selectedAttractions = JSON.parse(saved);
                } else {
                    this.selectedAttractions = [];
                }
            }
            console.log('Selected attractions loaded from localStorage:', this.selectedAttractions);
        } catch (error) {
            console.error('Error loading selected attractions:', error);
            this.selectedAttractions = [];
        }
    }

    
}