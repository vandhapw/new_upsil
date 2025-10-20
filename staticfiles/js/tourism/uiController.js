// UI Controller Module
class UIController {
    constructor(mapDisplay, provinceDisplay, locationServices, tourismAttractions, hotelServices, flightServices) {
        this.mapDisplay = mapDisplay;
        this.provinceDisplay = provinceDisplay;
        // this.locationServices = locationServices;
        // this.tourismAttractions = tourismAttractions;
        // this.hotelServices = hotelServices;
        // this.flightServices = flightServices;
        
        // this.selectedRegion = {
        //     province: null,
        //     municipality: null,
        //     submunicipality: null
        // };
    }

    // Initialize all event listeners
    setupEventListeners() {
        // Menu toggle for mobile
        this.setupMobileMenu();
        
        // Province selection
        this.setupProvinceSelection();
        
        // Date selection
        // this.setupDateSelection();
        
        // Location services
        // this.setupLocationServices();
        
        // // Search buttons
        // this.setupSearchButtons();
        
        // // Map controls
        this.setupMapControls();
        
        // // Results panel
        // this.setupResultsPanel();
    }

    setupMobileMenu() {
        const menuToggle = document.getElementById("menuToggle");
        const sidebar = document.getElementById("sidebar");
        const closeSidebar = document.getElementById("closeSidebar");

        menuToggle?.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });

        closeSidebar?.addEventListener("click", () => {
            sidebar.classList.remove("open");
        });
    }

    setupProvinceSelection() {
        const provinceSelect = document.getElementById("provinceSelect");
        console.log('Province select element:', provinceSelect);
        provinceSelect?.addEventListener("change", (e) => {
            const provinceName = e.target.value;
            this.selectedRegion.province = provinceName;
            this.updateSelectedInfo();
            this.provinceDisplay.showProvince(provinceName);
        });
    }

    // setupLocationServices() {
    //     // GPS location button
    //     const getCurrentLocationBtn = document.getElementById("getCurrentLocation");
    //     getCurrentLocationBtn?.addEventListener("click", async () => {
    //         try {
    //             getCurrentLocationBtn.disabled = true;
    //             getCurrentLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting location...';
                
    //             await this.locationServices.getCurrentLocation();
    //             this.updateCurrentLocationStatus(true);
                
    //             getCurrentLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Use My Location';
    //             getCurrentLocationBtn.disabled = false;
                
    //             // Enable destination button
    //             const useCurrentBtn = document.getElementById("useCurrentAsDestination");
    //             if (useCurrentBtn) useCurrentBtn.disabled = false;
                
    //         } catch (error) {
    //             console.error('Error getting location:', error);
    //             alert('Unable to get your location. Please check your browser settings.');
    //             getCurrentLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Use My Location';
    //             getCurrentLocationBtn.disabled = false;
    //         }
    //     });

    //     // Manual location button
    //     const manualLocationBtn = document.getElementById("manualLocationMode");
    //     manualLocationBtn?.addEventListener("click", () => {
    //         const isActive = this.locationServices.toggleManualLocationMode();
    //         this.updateManualLocationUI(isActive);
    //     });

    //     // Use current as destination button
    //     const useCurrentBtn = document.getElementById("useCurrentAsDestination");
    //     useCurrentBtn?.addEventListener("click", () => {
    //         this.useCurrentLocationAsDestination();
    //     });

    //     // Save location button
    //     const saveLocationBtn = document.getElementById("saveLocation");
    //     saveLocationBtn?.addEventListener("click", () => {
    //         const locationNameInput = document.getElementById("locationName");
    //         const locationName = locationNameInput?.value.trim() || '';
    //         const savedLocation = this.locationServices.saveCurrentLocation(locationName);
            
    //         if (savedLocation) {
    //             this.showSaveConfirmation(savedLocation.name);
    //             this.hideSaveLocationOption();
    //         }
    //     });

    //     // View saved locations button
    //     const viewSavedBtn = document.getElementById("viewSavedLocations");
    //     viewSavedBtn?.addEventListener("click", () => {
    //         this.showSavedLocations();
    //     });
    // }

    // setupSearchButtons() {
    //     // Tourism attractions button
    //     const findTourismBtn = document.getElementById("findTourismVillage");
    //     findTourismBtn?.addEventListener("click", () => {
    //         this.showTourismAttractionsForProvince();
    //     });

    //     // Hotel search button
    //     const findHotelBtn = document.getElementById("findHotel");
    //     findHotelBtn?.addEventListener("click", () => {
    //         this.searchHotelsForProvince();
    //     });

    //     // Flight search button
    //     const findFlightsBtn = document.getElementById("findFlights");
    //     findFlightsBtn?.addEventListener("click", () => {
    //         this.searchFlights();
    //     });
    // }

    setupMapControls() {
        // Map control buttons
        const zoomToKorea = document.getElementById("zoomToKorea");
        zoomToKorea?.addEventListener("click", () => {
            this.mapDisplay.zoomToKorea();
        });

        const toggleSatellite = document.getElementById("toggleSatellite");
        toggleSatellite?.addEventListener("click", () => {
            this.mapDisplay.toggleSatelliteView();
        });

        const fullscreenMap = document.getElementById("fullscreenMap");
        fullscreenMap?.addEventListener("click", () => {
            this.mapDisplay.toggleFullscreen();
        });

        // Map click for manual location
        // this.mapDisplay.getMap().on('click', (e) => {
        //     if (this.locationServices.manualLocationMode) {
        //         this.locationServices.setManualLocation(e.latlng.lat, e.latlng.lng);
        //         this.updateManualLocationUI(false);
        //         this.showSaveLocationOption();
                
        //         // Enable destination button
        //         const useCurrentBtn = document.getElementById("useCurrentAsDestination");
        //         if (useCurrentBtn) useCurrentBtn.disabled = false;
        //     }
        // });
    }

    // Update UI methods
    updateSelectedInfo() {
        const selectedProvinceElement = document.getElementById("selectedProvince");
        if (selectedProvinceElement) {
            selectedProvinceElement.textContent = this.selectedRegion.province || "Select Province...";
        }
    }

    // updateCurrentLocationStatus(hasLocation) {
    //     const statusElement = document.getElementById("currentLocationStatus");
    //     if (statusElement && hasLocation) {
    //         const coords = this.locationServices.getCurrentLocationCoords();
    //         if (coords) {
    //             const [lat, lng] = coords;
    //             statusElement.innerHTML = `<i class="fas fa-check-circle" style="color: green;"></i> ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    //         }
    //     }
    // }

    // updateManualLocationUI(isActive) {
    //     const manualLocationBtn = document.getElementById("manualLocationMode");
    //     if (manualLocationBtn) {
    //         if (isActive) {
    //             manualLocationBtn.innerHTML = '<i class="fas fa-times"></i> Cancel Manual Mode';
    //             manualLocationBtn.classList.add('btn-warning');
    //             manualLocationBtn.classList.remove('btn-location');
    //         } else {
    //             manualLocationBtn.innerHTML = '<i class="fas fa-mouse-pointer"></i> Set Location Manually';
    //             manualLocationBtn.classList.remove('btn-warning');
    //             manualLocationBtn.classList.add('btn-location');
    //         }
    //     }
    // }

    // showSaveLocationOption() {
    //     const saveLocationGroup = document.getElementById('saveLocationGroup');
    //     if (saveLocationGroup) {
    //         saveLocationGroup.style.display = 'block';
    //     }
    // }

    // hideSaveLocationOption() {
    //     const saveLocationGroup = document.getElementById('saveLocationGroup');
    //     if (saveLocationGroup) {
    //         saveLocationGroup.style.display = 'none';
    //         const locationNameInput = document.getElementById('locationName');
    //         if (locationNameInput) locationNameInput.value = '';
    //     }
    // }

    // showSaveConfirmation(locationName) {
    //     // Create temporary confirmation message
    //     const confirmation = document.createElement('div');
    //     confirmation.className = 'save-confirmation';
    //     confirmation.innerHTML = `
    //         <div class="confirmation-content">
    //             <i class="fas fa-check-circle"></i>
    //             <span>Location "${locationName}" saved successfully!</span>
    //         </div>
    //     `;
    //     document.body.appendChild(confirmation);
    //     confirmation.style.display = 'block';
        
    //     setTimeout(() => {
    //         confirmation.remove();
    //     }, 3000);
    // }

    // // Search methods
    // async showTourismAttractionsForProvince() {
    //     if (!this.selectedRegion.province) {
    //         alert('Please select a province first.');
    //         return;
    //     }

    //     const attractions = this.tourismAttractions.filterTourismAttractionsByProvince(this.selectedRegion.province);
    //     if (attractions.length > 0) {
    //         this.tourismAttractions.displayTourismAttractions(attractions);
    //         this.showResults('Tourism Attractions', attractions);
    //     } else {
    //         alert('No tourism attractions found for this province.');
    //     }
    // }

    // async searchHotelsForProvince() {
    //     if (!this.selectedRegion.province) {
    //         alert('Please select a province first.');
    //         return;
    //     }

    //     const provinceBounds = this.provinceDisplay.getProvinceBounds();
    //     const hotels = await this.hotelServices.searchHotelsForProvince(this.selectedRegion.province, provinceBounds);
        
    //     if (hotels.length > 0) {
    //         this.hotelServices.displayHotels(hotels);
    //         this.showResults('Hotels', hotels);
    //     } else {
    //         alert('No hotels found for this province.');
    //     }
    // }

    // useCurrentLocationAsDestination() {
    //     const currentLocation = this.locationServices.getCurrentLocationCoords();
    //     if (!currentLocation) {
    //         alert('No current location available. Please set your location first.');
    //         return;
    //     }

    //     // Search nearby places
    //     const [lat, lng] = currentLocation;
    //     const radius = this.getSelectedSearchRadius();
        
    //     this.searchNearbyPlaces(lat, lng, radius);
    // }

    // async searchNearbyPlaces(lat, lng, radius) {
    //     try {
    //         // Search nearby attractions
    //         const nearbyAttractions = this.tourismAttractions.searchNearbyAttractions(lat, lng, radius);
    //         if (nearbyAttractions.length > 0) {
    //             this.tourismAttractions.displayTourismAttractions(nearbyAttractions);
    //         }

    //         // Search nearby hotels
    //         const nearbyHotels = await this.hotelServices.searchNearbyHotels(lat, lng, radius);
    //         if (nearbyHotels.length > 0) {
    //             this.hotelServices.displayHotels(nearbyHotels);
    //         }

    //         // Show combined results
    //         const allResults = [...nearbyAttractions, ...nearbyHotels];
    //         this.showNearbyResults(allResults, radius);
            
    //     } catch (error) {
    //         console.error('Error searching nearby places:', error);
    //         alert('Error searching for nearby places.');
    //     }
    // }

    // getSelectedSearchRadius() {
    //     const radiusSelect = document.getElementById("searchRadius");
    //     return radiusSelect ? parseInt(radiusSelect.value) : 10;
    // }

    // Results display methods
    // showResults(type, results) {
    //     const resultsPanel = document.getElementById("resultsPanel");
    //     const resultsContent = document.getElementById("resultsContent");
        
    //     if (!resultsPanel || !resultsContent) return;

    //     let html = `
    //         <div class="results-summary">
    //             <h4><i class="fas fa-search"></i> ${type} Results</h4>
    //             <p>Found ${results.length} ${type.toLowerCase()}</p>
    //         </div>
    //         <div class="results-list">
    //     `;

    //     results.forEach((item, index) => {
    //         html += this.createResultItem(item, type, index);
    //     });

    //     html += '</div>';
    //     resultsContent.innerHTML = html;
    //     resultsPanel.classList.add("show");
    // }

    // createResultItem(item, type, index) {
    //     return `
    //         <div class="result-item">
    //             <h5>${item.name}</h5>
    //             <p>${item.address || item.location || 'Location not specified'}</p>
    //             ${item.rating ? `<p><i class="fas fa-star"></i> ${item.rating}/5</p>` : ''}
    //             ${type === 'Hotels' ? `<button class="btn btn-primary btn-sm" onclick="window.hotelServices.bookHotel('${item.id}')">Book</button>` : ''}
    //         </div>
    //     `;
    // }

    // showNearbyResults(results, radius) {
    //     const resultsPanel = document.getElementById("resultsPanel");
    //     const resultsContent = document.getElementById("resultsContent");
        
    //     if (!resultsPanel || !resultsContent) return;

    //     let html = `
    //         <div class="results-summary">
    //             <h4><i class="fas fa-map-pin"></i> Nearby Places</h4>
    //             <p>Found ${results.length} places within ${radius}km</p>
    //         </div>
    //         <div class="results-list">
    //     `;

    //     results.forEach(item => {
    //         const currentLocation = this.locationServices.getCurrentLocationCoords();
    //         if (currentLocation && item.coordinates) {
    //             const [lat, lng] = currentLocation;
    //             const [itemLng, itemLat] = item.coordinates;
    //             const distance = this.tourismAttractions.calculateDistance(lat, lng, itemLat, itemLng);
                
    //             html += `
    //                 <div class="result-item">
    //                     <h5>${item.name}</h5>
    //                     <p><i class="fas fa-map-marker-alt"></i> ${distance.toFixed(1)}km away</p>
    //                     ${item.rating ? `<p><i class="fas fa-star"></i> ${item.rating}/5</p>` : ''}
    //                 </div>
    //             `;
    //         }
    //     });

    //     html += '</div>';
    //     resultsContent.innerHTML = html;
    //     resultsPanel.classList.add("show");
    // }
}

window.UIController = UIController;