// South Korea Interactive Map Application
class SouthKoreaMapApp {
    constructor() {
        this.map = null;
        this.currentLayer = null;
        this.markers = [];
        this.tourismData = [];
        this.restaurantData = [];
        this.tourismAttractionsData = [];
        this.hotelsData = [];
        this.flightData = [];
        this.regionData = {
            provinces: null,
            municipalities: null,
            submunicipalities: null
        };
        this.provincesGeoJSON = null;
        this.provinceLayer = null;
        this.airportsData = [];
        this.currentLocation = null;
        this.manualLocationMode = false;
        this.savedLocations = this.loadSavedLocations();
        this.selectedRegion = {
            province: null,
            municipality: null,
            submunicipality: null
        };
        
        // South Korea center coordinates
        this.koreaCenter = [36.5, 127.5];
        this.defaultZoom = 7;
        
        this.init();
    }

    // Province coordinate boundaries for hotel search
    getProvinceBounds() {
        return {
            'Seoul': { minLng: 126.7342, minLat: 37.4286, maxLng: 127.2695, maxLat: 37.7014 },
            'Busan': { minLng: 128.8668, minLat: 34.8799, maxLng: 129.3136, maxLat: 35.3959 },
            'Daegu': { minLng: 128.4279, minLat: 35.6532, maxLng: 128.7981, maxLat: 36.0359 },
            'Incheon': { minLng: 126.4058, minLat: 37.2635, maxLng: 126.8765, maxLat: 37.6395 },
            'Gwangju': { minLng: 126.7078, minLat: 35.0953, maxLng: 127.0173, maxLat: 35.2953 },
            'Daejeon': { minLng: 127.2845, minLat: 36.2024, maxLng: 127.5367, maxLat: 36.4806 },
            'Ulsan': { minLng: 129.0681, minLat: 35.4038, maxLng: 129.4357, maxLat: 35.6436 },
            'Sejong': { minLng: 127.2018, minLat: 36.4411, maxLng: 127.3267, maxLat: 36.5598 },
            'Gyeonggi-do': { minLng: 126.2895, minLat: 36.8945, maxLng: 127.5178, maxLat: 38.2114 },
            'Gangwon-do': { minLng: 127.0647, minLat: 37.0264, maxLng: 129.3664, maxLat: 38.6122 },
            'Chungcheongbuk-do': { minLng: 127.3881, minLat: 36.2681, maxLng: 128.6326, maxLat: 37.2019 },
            'Chungcheongnam-do': { minLng: 125.9394, minLat: 35.9951, maxLng: 127.5178, maxLat: 37.1836 },
            'Jeollabuk-do': { minLng: 126.4424, minLat: 35.2681, maxLng: 127.8956, maxLat: 36.2019 },
            'Jeollanam-do': { minLng: 125.8632, minLat: 33.9324, maxLng: 127.5055, maxLat: 35.4198 },
            'Gyeongsangbuk-do': { minLng: 128.0036, minLat: 35.6532, maxLng: 129.9238, maxLat: 37.1624 },
            'Gyeongsangnam-do': { minLng: 127.5955, minLat: 34.7394, maxLng: 129.3664, maxLat: 35.8833 },
            'Jeju-do': { minLng: 126.1628, minLat: 33.1897, maxLng: 126.9483, maxLat: 33.5632 }
        };
    }

    async init() {
        this.showLoading(true);
        
        try {
            await this.initializeMap();
            await this.loadRegionData();
            await this.loadProvinces();
            await this.loadAirports();
            await this.loadFlightData();
            await this.loadTourismData();
            await this.loadTourismAttractionsData();
            await this.loadRestaurantData();
            this.setupEventListeners();
            this.setupAirportAutocomplete();
            this.populateProvinceDropdown();
            this.initializeDateInputs();
            
            console.log("South Korea Map App initialized successfully");
        } catch (error) {
            console.error("Error initializing app:", error);
            this.showError("Failed to initialize the application. Please refresh the page.");
        } finally {
            this.showLoading(false);
        }
    }

    initializeMap() {
        // Initialize Leaflet map
        this.map = L.map("map", {
            center: this.koreaCenter,
            zoom: this.defaultZoom,
            zoomControl: false
        });

        // Add zoom control to bottom right
        L.control.zoom({
            position: "bottomright"
        }).addTo(this.map);

        // Add OpenStreetMap tile layer
        const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 18
        });

        // Add satellite tile layer
        const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
            attribution: "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
            maxZoom: 18
        });

        // Set default layer
        this.currentLayer = osmLayer;
        osmLayer.addTo(this.map);

        // Store layers for switching
        this.mapLayers = {
            osm: osmLayer,
            satellite: satelliteLayer
        };

        // Add map click event for manual location selection
        this.map.on('click', (e) => {
            if (this.manualLocationMode) {
                this.setManualLocation(e.latlng.lat, e.latlng.lng);
            }
        });

        console.log("Map initialized");
    }

    async loadRegionData() {
        try {
            // Load provinces data
            const provincesResponse = await fetch("data/skorea-provinces-2018-topo-simple.json");
            const provincesTopoJson = await provincesResponse.json();
            this.regionData.provinces = this.topojsonToGeoJson(provincesTopoJson, "skorea_provinces_2018_geo");
            
            // Load municipalities data
            // const municipalitiesResponse = await fetch("data/skorea-municipalities-2018-topo-simple.json");
            // const municipalitiesTopoJson = await municipalitiesResponse.json();
            // this.regionData.municipalities = this.topojsonToGeoJson(municipalitiesTopoJson, "skorea_municipalities_2018_geo");
            
            // // Load submunicipalities data
            // const submunicipalitiesResponse = await fetch("data/skorea-submunicipalities-2018-topo-simple.json");
            // const submunicipalitiesTopoJson = await submunicipalitiesResponse.json();
            // this.regionData.submunicipalities = this.topojsonToGeoJson(submunicipalitiesTopoJson, "skorea_submunicipalities_2018_geo");
            
            console.log("Region data loaded successfully");
        } catch (error) {
            console.error("Error loading region data:", error);
            throw error;
        }
    }

    async loadTourismData() {
        try {
            const response = await fetch("data/tourism-places.json");
            this.tourismData = await response.json();
            console.log("Tourism data loaded:", this.tourismData.length, "places");
        } catch (error) {
            console.error("Error loading tourism data:", error);
            throw error;
        }
    }

    async loadRestaurantData() {
        try {
            const response = await fetch("data/restaurants.json");
            this.restaurantData = await response.json();
            console.log("Restaurant data loaded:", this.restaurantData.length, "restaurants");
        } catch (error) {
            console.error("Error loading restaurant data:", error);
            throw error;
        }
    }

    async loadTourismAttractionsData() {
        try {
            const response = await fetch("data/tourism_attractions_all_provinces.json");
            this.tourismAttractionsData = await response.json();
            console.log("Tourism attractions data loaded:", this.tourismAttractionsData.length, "attractions");
        } catch (error) {
            console.error("Error loading tourism attractions data:", error);
            throw error;
        }
    }

    async loadFlightData() {
        try {
            const response = await fetch("data/dummy_flight_data.json");
            const flightResponse = await response.json();
            this.flightData = flightResponse.data;
            
            // Extract unique airports from flight data for autocomplete
            this.extractAirportsFromFlights();
            
            console.log("Flight data loaded:", this.flightData.length, "flight routes");
        } catch (error) {
            console.error("Error loading flight data:", error);
            throw error;
        }
    }

    // Extract unique airports from flight data
    extractAirportsFromFlights() {
        const airportsMap = new Map();
        
        this.flightData.forEach(flight => {
            // Add origin airport
            if (!airportsMap.has(flight.origin.id)) {
                airportsMap.set(flight.origin.id, {
                    iata_code: flight.origin.id,
                    name: flight.origin.name,
                    city: flight.origin.city,
                    country: flight.origin.city === 'Jakarta' ? 'Indonesia' : 'South Korea'
                });
            }
            
            // Add destination airport
            if (!airportsMap.has(flight.destination.id)) {
                airportsMap.set(flight.destination.id, {
                    iata_code: flight.destination.id,
                    name: flight.destination.name,
                    city: flight.destination.city,
                    country: flight.destination.city === 'Jakarta' ? 'Indonesia' : 'South Korea'
                });
            }
        });
        
        // Override airportsData with flight-specific airports for better autocomplete
        this.flightAirportsData = Array.from(airportsMap.values());
        console.log("Extracted", this.flightAirportsData.length, "airports from flight data");
    }

    // Load provinces GeoJSON for map display
    async loadProvinces() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/southkorea/southkorea-maps/refs/heads/master/gadm/json/skorea-provinces-geo.json');
            this.provincesGeoJSON = await response.json();
            console.log("Provinces GeoJSON loaded successfully");
        } catch (error) {
            console.error("Failed to load province GeoJSON data:", error);
            // Fallback to local data if available
            try {
                const localResponse = await fetch("data/skorea-provinces-2018-geo.json");
                this.provincesGeoJSON = await localResponse.json();
                console.log("Local provinces GeoJSON loaded successfully");
            } catch (localError) {
                console.error("Failed to load local province data:", localError);
            }
        }
    }

    // Show selected province polygon on map
    showProvince(provinceName) {
        if (!provinceName || !this.provincesGeoJSON) {
            // If no province name or no GeoJSON data, clear any existing province layer
            if (this.provinceLayer) {
                this.map.removeLayer(this.provinceLayer);
                this.provinceLayer = null;
            }
            return;
        }

        // Find the selected province feature
        const selectedFeature = this.provincesGeoJSON.features.find(
            feature => feature.properties.NAME_1 === provinceName
        );

        if (!selectedFeature) {
            console.warn(`Province "${provinceName}" not found in GeoJSON data`);
            return;
        }

        // Remove existing province layer if present
        if (this.provinceLayer) {
            this.map.removeLayer(this.provinceLayer);
        }

        // Create province layer
        this.provinceLayer = L.geoJSON(selectedFeature, {
            style: {
                fillColor: '#ff6600',
                fillOpacity: 0.4,
                color: '#cc3300',
                weight: 2
            }
        }).addTo(this.map);

        // Calculate bounds and fit map
        try {
            const bounds = this.provinceLayer.getBounds();
            this.map.fitBounds(bounds, { padding: [20, 20] });
        } catch (error) {
            console.error("Error fitting map bounds:", error);
        }
    }

    // Load airports data for autocomplete
    async loadAirports() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/algolia/datasets/master/airports/airports.json');
            this.airportsData = await response.json();
            console.log("Airports data loaded successfully:", this.airportsData.length, "airports");
        } catch (error) {
            console.error("Failed to load airports data:", error);
        }
    }

    // Search airports by name, city, country, or IATA code
    searchAirports(query) {
        if (!query || query.length < 2) return [];
        
        const searchTerm = query.toLowerCase();
        
        // Use flight-specific airports if available, otherwise use general airport data
        const airportSource = this.flightAirportsData && this.flightAirportsData.length > 0 
            ? this.flightAirportsData 
            : this.airportsData;
        
        const results = airportSource.filter(airport => {
            const nameMatch = airport.name && airport.name.toLowerCase().includes(searchTerm);
            const cityMatch = airport.city && airport.city.toLowerCase().includes(searchTerm);
            const countryMatch = airport.country && airport.country.toLowerCase().includes(searchTerm);
            const iataMatch = airport.iata_code && airport.iata_code.toLowerCase().includes(searchTerm);
            
            return nameMatch || cityMatch || countryMatch || iataMatch;
        });

        // Sort results by relevance
        return results.sort((a, b) => {
            const aName = a.name?.toLowerCase() || '';
            const bName = b.name?.toLowerCase() || '';
            const aIata = a.iata_code?.toLowerCase() || '';
            const bIata = b.iata_code?.toLowerCase() || '';
            
            // Prioritize exact IATA code matches
            if (aIata === searchTerm) return -1;
            if (bIata === searchTerm) return 1;
            
            // Then prioritize name matches at the beginning
            if (aName.startsWith(searchTerm) && !bName.startsWith(searchTerm)) return -1;
            if (bName.startsWith(searchTerm) && !aName.startsWith(searchTerm)) return 1;
            
            // Finally sort by popularity (if available)
            return (b.links_count || 0) - (a.links_count || 0);
        }).slice(0, 10); // Limit to 10 results
    }

    // Get selected airport data from input element
    getSelectedAirport(inputElementId) {
        const inputElement = document.getElementById(inputElementId);
        if (!inputElement || !inputElement.dataset.selectedAirport) return null;
        
        try {
            return JSON.parse(inputElement.dataset.selectedAirport);
        } catch (error) {
            console.error('Error parsing selected airport data:', error);
            return null;
        }
    }

    // Display tourism attractions markers on map
    displayTourismAttractions(attractions) {
        attractions.forEach(attraction => {
            const [lng, lat] = attraction.coordinates;
            
            // Create custom icon based on attraction type
            const iconColor = this.getAttractionIconColor(attraction.type);
            const icon = L.divIcon({
                className: 'custom-attraction-marker',
                html: `<div style="background-color: ${iconColor}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center;">
                         <i class="fas fa-map-marker-alt" style="color: white; font-size: 12px;"></i>
                       </div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            const marker = L.marker([lat, lng], { icon })
                .addTo(this.map)
                .bindPopup(this.createTourismAttractionPopup(attraction));

            this.markers.push(marker);
        });
    }

    // Get icon color based on attraction type
    getAttractionIconColor(type) {
        const colorMap = {
            'education': '#4CAF50',
            'technology': '#2196F3',
            'cultural': '#FF9800',
            'historical': '#795548',
            'nature': '#8BC34A',
            'entertainment': '#E91E63',
            'religious': '#9C27B0',
            'shopping': '#FF5722',
            'sports': '#00BCD4',
            'default': '#607D8B'
        };
        return colorMap[type] || colorMap['default'];
    }

    // Create popup content for tourism attractions
    createTourismAttractionPopup(attraction) {
        const stars = "★".repeat(Math.max(1, Math.min(5, attraction.rating || 3)));
        return `
            <div class="popup-content">
                <h4><i class="fas fa-map-marker-alt"></i> ${attraction.name}</h4>
                <p><strong>Province:</strong> ${attraction.province}</p>
                <p><strong>Type:</strong> ${attraction.type || 'Tourism Attraction'}</p>
                <p><strong>Rating:</strong> ${stars} ${attraction.rating || 'N/A'}/5</p>
                ${attraction.image_url ? `<img src="${attraction.image_url}" alt="${attraction.name}" style="width: 100%; max-width: 200px; height: auto; margin-top: 10px; border-radius: 5px;" onerror="this.style.display='none'">` : ''}
            </div>
        `;
    }

    // Filter tourism attractions by province
    filterTourismAttractionsByProvince(provinceName) {
        if (!provinceName || !this.tourismAttractionsData) {
            return [];
        }
        
        return this.tourismAttractionsData.filter(attraction => 
            attraction.province === provinceName
        );
    }

    // Show tourism attractions for selected province
    showTourismAttractionsForProvince() {
        const provinceSelect = document.getElementById("provinceSelect");
        
        if (!provinceSelect || !provinceSelect.value) {
            alert("Please select a province first!");
            return;
        }

        const selectedProvince = provinceSelect.value;
        
        // Clear existing markers
        this.clearMarkers();
        
        // Filter attractions by province
        const filteredAttractions = this.filterTourismAttractionsByProvince(selectedProvince);
        
        if (filteredAttractions.length === 0) {
            alert(`No tourism attractions found for ${selectedProvince}`);
            return;
        }

        // Display attractions on map
        this.displayTourismAttractions(filteredAttractions);
        
        // Fit map to show all markers
        if (this.markers.length > 0) {
            const group = new L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }

        // Show results
        this.showTourismAttractionsResults(filteredAttractions, selectedProvince);
        
        console.log(`Displayed ${filteredAttractions.length} tourism attractions for ${selectedProvince}`);
    }

    // Show tourism attractions results in results panel
    showTourismAttractionsResults(attractions, provinceName) {
        const resultsPanel = document.getElementById("resultsPanel");
        const resultsContent = document.getElementById("resultsContent");
        
        if (!resultsPanel || !resultsContent) return;

        let html = `
            <div class="results-summary">
                <h4><i class="fas fa-map-marker-alt"></i> Tourism Attractions in ${provinceName}</h4>
                <p>Found ${attractions.length} attractions</p>
            </div>
            <div class="results-list">
        `;

        attractions.forEach(attraction => {
            const stars = "★".repeat(Math.max(1, Math.min(5, attraction.rating || 3)));
            html += `
                <div class="result-item" onclick="window.southKoreaMapApp.focusOnAttraction(${attraction.id})">
                    <div class="result-header">
                        <h5>${attraction.name}</h5>
                        <span class="result-rating">${stars} ${attraction.rating || 'N/A'}</span>
                    </div>
                    <div class="result-details">
                        <p><i class="fas fa-map-pin"></i> ${attraction.province}</p>
                        <p><i class="fas fa-tag"></i> ${attraction.type || 'Tourism Attraction'}</p>
                    </div>
                    ${attraction.image_url ? `<img src="${attraction.image_url}" alt="${attraction.name}" class="result-image" onerror="this.style.display='none'">` : ''}
                </div>
            `;
        });

        html += '</div>';
        resultsContent.innerHTML = html;
        resultsPanel.classList.add("show");
    }

    // Focus on specific attraction when clicked from results
    focusOnAttraction(attractionId) {
        const attraction = this.tourismAttractionsData.find(attr => attr.id === attractionId);
        if (!attraction) return;

        const [lng, lat] = attraction.coordinates;
        this.map.setView([lat, lng], 15);
        
        // Find and open the popup for this marker
        this.markers.forEach(marker => {
            const markerLatLng = marker.getLatLng();
            if (Math.abs(markerLatLng.lat - lat) < 0.0001 && Math.abs(markerLatLng.lng - lng) < 0.0001) {
                marker.openPopup();
            }
        });
    }

    // Search hotels for selected province
    async searchHotelsForProvince() {
        const provinceSelect = document.getElementById("provinceSelect");
        
        if (!provinceSelect || !provinceSelect.value) {
            alert("Please select a province first!");
            return;
        }

        const selectedProvince = provinceSelect.value;
        const bounds = this.getProvinceBounds()[selectedProvince];
        
        if (!bounds) {
            alert(`Hotel search not available for ${selectedProvince}`);
            return;
        }

        this.showLoading(true);
        
        try {
            // Clear existing markers
            this.clearMarkers();
            
            // Fetch hotels from Geoapify API
            const hotels = await this.fetchHotelsFromAPI(bounds);
            
            if (hotels.length === 0) {
                alert(`No hotels found in ${selectedProvince}`);
                return;
            }

            // Store hotels data
            this.hotelsData = hotels;
            
            // Display hotels on map
            this.displayHotels(hotels);
            
            // Fit map to show all markers
            if (this.markers.length > 0) {
                const group = new L.featureGroup(this.markers);
                this.map.fitBounds(group.getBounds().pad(0.1));
            }

            // Show results
            this.showHotelsResults(hotels, selectedProvince);
            
            console.log(`Displayed ${hotels.length} hotels for ${selectedProvince}`);
            
        } catch (error) {
            console.error("Error fetching hotels:", error);
            alert("Failed to fetch hotels. Please try again.");
        } finally {
            this.showLoading(false);
        }
    }

    // Fetch hotels from Geoapify API
    async fetchHotelsFromAPI(bounds) {
        const apiKey = "7987d19900864cf6a41cb30cb02a27fd";
        const url = `https://api.geoapify.com/v2/places?categories=accommodation.hotel&filter=rect:${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}&limit=20&apiKey=${apiKey}`;
        
        try {
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

    // Display hotels markers on map
    displayHotels(hotels) {
        hotels.forEach(hotel => {
            const [lng, lat] = hotel.coordinates;
            
            // Create hotel icon
            const icon = L.divIcon({
                className: 'custom-hotel-marker',
                html: `<div style="background-color: #ff6b6b; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                         <i class="fas fa-bed" style="color: white; font-size: 14px;"></i>
                       </div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });

            const marker = L.marker([lat, lng], { icon })
                .addTo(this.map)
                .bindPopup(this.createHotelPopup(hotel));

            this.markers.push(marker);
        });
    }

    // Create popup content for hotels
    createHotelPopup(hotel) {
        let ratingHTML = '';
        if (hotel.rating) {
            const stars = "★".repeat(Math.floor(hotel.rating));
            ratingHTML = `<p><strong>Rating:</strong> ${stars} ${hotel.rating}/5</p>`;
        }

        return `
            <div class="popup-content hotel-popup">
                <h4><i class="fas fa-bed"></i> ${hotel.name}</h4>
                <p><strong>Address:</strong> ${hotel.address}</p>
                ${ratingHTML}
                ${hotel.phone ? `<p><strong>Phone:</strong> <a href="tel:${hotel.phone}">${hotel.phone}</a></p>` : ''}
                ${hotel.website ? `<p><strong>Website:</strong> <a href="${hotel.website}" target="_blank" rel="noopener">Visit Website</a></p>` : ''}
                <p><strong>Source:</strong> ${hotel.datasource}</p>
                
                <div class="booking-section">
                    <h5><i class="fas fa-calendar-check"></i> Book This Hotel</h5>
                    <div class="booking-form">
                        <div class="form-group">
                            <label for="bookingDays_${hotel.id}">Number of Days:</label>
                            <input type="number" 
                                   id="bookingDays_${hotel.id}" 
                                   class="booking-input" 
                                   min="1" 
                                   placeholder="Enter days"
                                   onchange="window.southKoreaMapApp.validateBookingDays('${hotel.id}', this.value)">
                            <div id="validation_${hotel.id}" class="validation-message"></div>
                        </div>
                        <button class="btn-book" onclick="window.southKoreaMapApp.bookHotel('${hotel.id}')">
                            <i class="fas fa-check"></i> Book Hotel
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Show hotels results in results panel
    showHotelsResults(hotels, provinceName) {
        const resultsPanel = document.getElementById("resultsPanel");
        const resultsContent = document.getElementById("resultsContent");
        
        if (!resultsPanel || !resultsContent) return;

        let html = `
            <div class="results-summary">
                <h4><i class="fas fa-bed"></i> Hotels in ${provinceName}</h4>
                <p>Found ${hotels.length} hotels</p>
            </div>
            <div class="results-list">
        `;

        hotels.forEach(hotel => {
            let ratingHTML = '';
            if (hotel.rating) {
                const stars = "★".repeat(Math.floor(hotel.rating));
                ratingHTML = `<span class="result-rating">${stars} ${hotel.rating}</span>`;
            }

            html += `
                <div class="result-item" onclick="window.southKoreaMapApp.focusOnHotel('${hotel.id}')">
                    <div class="result-header">
                        <h5>${hotel.name}</h5>
                        ${ratingHTML}
                    </div>
                    <div class="result-details">
                        <p><i class="fas fa-map-marker-alt"></i> ${hotel.address}</p>
                        ${hotel.phone ? `<p><i class="fas fa-phone"></i> ${hotel.phone}</p>` : ''}
                        <p><i class="fas fa-tag"></i> ${hotel.category}</p>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        resultsContent.innerHTML = html;
        resultsPanel.classList.add("show");
    }

    // Focus on specific hotel when clicked from results
    focusOnHotel(hotelId) {
        const hotel = this.hotelsData.find(h => h.id === hotelId);
        if (!hotel) return;

        const [lng, lat] = hotel.coordinates;
        this.map.setView([lat, lng], 15);
        
        // Find and open the popup for this marker
        this.markers.forEach(marker => {
            const markerLatLng = marker.getLatLng();
            if (Math.abs(markerLatLng.lat - lat) < 0.0001 && Math.abs(markerLatLng.lng - lng) < 0.0001) {
                marker.openPopup();
            }
        });
    }

    // Get selected date range
    getSelectedDateRange() {
        const startDateInput = document.getElementById("startDate");
        const endDateInput = document.getElementById("endDate");
        
        if (!startDateInput || !endDateInput || !startDateInput.value || !endDateInput.value) {
            return null;
        }

        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        
        if (startDate >= endDate) {
            return null;
        }

        const timeDiff = endDate.getTime() - startDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        return {
            startDate,
            endDate,
            totalDays: daysDiff
        };
    }

    // Validate booking days against selected date range
    validateBookingDays(hotelId, days) {
        const validationElement = document.getElementById(`validation_${hotelId}`);
        const daysInput = document.getElementById(`bookingDays_${hotelId}`);
        
        if (!validationElement || !daysInput) return;

        const dateRange = this.getSelectedDateRange();
        const bookingDays = parseInt(days);

        // Clear previous validation styles
        daysInput.classList.remove('valid', 'invalid');
        validationElement.className = 'validation-message';

        // Check if dates are selected
        if (!dateRange) {
            validationElement.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i> 
                Please select start and end dates first
            `;
            validationElement.classList.add('error');
            daysInput.classList.add('invalid');
            return false;
        }

        // Check if days input is valid
        if (!bookingDays || bookingDays < 1) {
            validationElement.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i> 
                Please enter a valid number of days (minimum 1)
            `;
            validationElement.classList.add('error');
            daysInput.classList.add('invalid');
            return false;
        }

        // Check if booking days exceed total trip duration
        if (bookingDays > dateRange.totalDays) {
            validationElement.innerHTML = `
                <i class="fas fa-times-circle"></i> 
                Booking days (${bookingDays}) cannot exceed trip duration (${dateRange.totalDays} days)
            `;
            validationElement.classList.add('error');
            daysInput.classList.add('invalid');
            return false;
        }

        // Valid booking
        validationElement.innerHTML = `
            <i class="fas fa-check-circle"></i> 
            Valid booking: ${bookingDays} days (Trip duration: ${dateRange.totalDays} days)
        `;
        validationElement.classList.add('success');
        daysInput.classList.add('valid');
        return true;
    }

    // Book hotel
    bookHotel(hotelId) {
        const hotel = this.hotelsData.find(h => h.id === hotelId);
        const daysInput = document.getElementById(`bookingDays_${hotelId}`);
        
        if (!hotel || !daysInput) {
            alert("Hotel booking information not found!");
            return;
        }

        const bookingDays = parseInt(daysInput.value);
        const dateRange = this.getSelectedDateRange();

        // Validate before booking
        if (!this.validateBookingDays(hotelId, bookingDays)) {
            return;
        }

        // Create booking object
        const booking = {
            hotelId: hotel.id,
            hotelName: hotel.name,
            hotelAddress: hotel.address,
            bookingDays: bookingDays,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            totalTripDays: dateRange.totalDays,
            bookingDate: new Date(),
            coordinates: hotel.coordinates
        };

        // Store booking (you can enhance this to send to a backend)
        this.saveHotelBooking(booking);

        // Show confirmation
        this.showBookingConfirmation(booking);

        // Close popup
        this.map.closePopup();
    }

    // Save hotel booking (local storage for now)
    saveHotelBooking(booking) {
        let bookings = JSON.parse(localStorage.getItem('hotelBookings') || '[]');
        bookings.push(booking);
        localStorage.setItem('hotelBookings', JSON.stringify(bookings));
        console.log('Hotel booking saved:', booking);
    }

    // Show booking confirmation
    showBookingConfirmation(booking) {
        const confirmationHTML = `
            <div class="booking-confirmation">
                <div class="confirmation-header">
                    <i class="fas fa-check-circle"></i>
                    <h3>Booking Confirmed!</h3>
                </div>
                <div class="confirmation-details">
                    <h4>${booking.hotelName}</h4>
                    <p><strong>Address:</strong> ${booking.hotelAddress}</p>
                    <p><strong>Booking Duration:</strong> ${booking.bookingDays} days</p>
                    <p><strong>Trip Period:</strong> ${booking.startDate.toLocaleDateString()} - ${booking.endDate.toLocaleDateString()}</p>
                    <p><strong>Total Trip Duration:</strong> ${booking.totalTripDays} days</p>
                </div>
                <div class="confirmation-actions">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn-close">
                        <i class="fas fa-times"></i> Close
                    </button>
                    <button onclick="window.southKoreaMapApp.viewAllBookings()" class="btn-view-bookings">
                        <i class="fas fa-list"></i> View All Bookings
                    </button>
                </div>
            </div>
        `;

        // Create and show confirmation modal
        const modal = document.createElement('div');
        modal.className = 'booking-modal';
        modal.innerHTML = confirmationHTML;
        document.body.appendChild(modal);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (modal.parentElement) {
                modal.remove();
            }
        }, 10000);
    }

    // View all bookings
    viewAllBookings() {
        const bookings = JSON.parse(localStorage.getItem('hotelBookings') || '[]');
        
        if (bookings.length === 0) {
            alert('No hotel bookings found!');
            return;
        }

        let bookingsHTML = `
            <div class="bookings-summary">
                <h4><i class="fas fa-list"></i> Your Hotel Bookings</h4>
                <p>Total bookings: ${bookings.length}</p>
            </div>
            <div class="bookings-list">
        `;

        bookings.forEach((booking, index) => {
            const bookingDate = new Date(booking.bookingDate);
            bookingsHTML += `
                <div class="booking-item">
                    <div class="booking-header">
                        <h5>${booking.hotelName}</h5>
                        <span class="booking-date">${bookingDate.toLocaleDateString()}</span>
                    </div>
                    <div class="booking-details">
                        <p><i class="fas fa-map-marker-alt"></i> ${booking.hotelAddress}</p>
                        <p><i class="fas fa-calendar"></i> ${booking.bookingDays} days</p>
                        <p><i class="fas fa-clock"></i> ${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}</p>
                    </div>
                    <button onclick="window.southKoreaMapApp.removeBooking(${index})" class="btn-remove">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            `;
        });

        bookingsHTML += '</div>';

        // Show in results panel
        const resultsPanel = document.getElementById("resultsPanel");
        const resultsContent = document.getElementById("resultsContent");
        
        if (resultsPanel && resultsContent) {
            resultsContent.innerHTML = bookingsHTML;
            resultsPanel.classList.add("show");
        }
    }

    // Remove booking
    removeBooking(index) {
        let bookings = JSON.parse(localStorage.getItem('hotelBookings') || '[]');
        bookings.splice(index, 1);
        localStorage.setItem('hotelBookings', JSON.stringify(bookings));
        
        // Refresh the bookings view
        this.viewAllBookings();
        
        alert('Booking removed successfully!');
    }

    // Search flights based on selected airports
    searchFlights() {
        const sourceAirport = this.getSelectedAirport('sourceAirport');
        const targetAirport = this.getSelectedAirport('targetAirport');
        
        if (!sourceAirport) {
            alert('Please select a source airport first!');
            return;
        }
        
        if (!targetAirport) {
            alert('Please select a target airport first!');
            return;
        }
        
        if (sourceAirport.iata_code === targetAirport.iata_code) {
            alert('Source and destination airports cannot be the same!');
            return;
        }

        this.showLoading(true);
        
        try {
            // Search for flights in the data
            const flights = this.findFlights(sourceAirport.iata_code, targetAirport.iata_code);
            
            if (flights.length === 0) {
                alert(`No flights found from ${sourceAirport.city} to ${targetAirport.city}`);
                return;
            }

            // Show flight results
            this.showFlightResults(flights, sourceAirport, targetAirport);
            
            console.log(`Found ${flights.length} flights from ${sourceAirport.iata_code} to ${targetAirport.iata_code}`);
            
        } catch (error) {
            console.error("Error searching flights:", error);
            alert("Failed to search flights. Please try again.");
        } finally {
            this.showLoading(false);
        }
    }

    // Find flights in the dummy data
    findFlights(originCode, destinationCode) {
        return this.flightData.filter(flight => 
            flight.origin.id === originCode && flight.destination.id === destinationCode
        );
    }

    // Show flight results in results panel
    showFlightResults(flights, sourceAirport, targetAirport) {
        const resultsPanel = document.getElementById("resultsPanel");
        const resultsContent = document.getElementById("resultsContent");
        
        if (!resultsPanel || !resultsContent) return;

        let html = `
            <div class="results-summary">
                <h4><i class="fas fa-plane"></i> Flights from ${sourceAirport.city} to ${targetAirport.city}</h4>
                <p>Found ${flights.length} flight options</p>
            </div>
            <div class="results-list">
        `;

        flights.forEach((flight, index) => {
            html += `
                <div class="result-item flight-item">
                    <div class="result-header">
                        <h5><i class="fas fa-plane-departure"></i> ${flight.origin.city} → ${flight.destination.city}</h5>
                        <span class="flight-route">${flight.origin.id} → ${flight.destination.id}</span>
                    </div>
                    <div class="flight-details">
                        <div class="airport-info">
                            <div class="origin-airport">
                                <p><strong>From:</strong> ${flight.origin.name}</p>
                                <p><i class="fas fa-map-marker-alt"></i> ${flight.origin.city}</p>
                            </div>
                            <div class="destination-airport">
                                <p><strong>To:</strong> ${flight.destination.name}</p>
                                <p><i class="fas fa-map-marker-alt"></i> ${flight.destination.city}</p>
                            </div>
                        </div>
                        <div class="price-info">
                            <div class="price-item">
                                <span class="price-label">One Way:</span>
                                <span class="price-value">$${flight.prices.one_way.toFixed(2)}</span>
                            </div>
                            <div class="price-item">
                                <span class="price-label">Round Trip:</span>
                                <span class="price-value">$${flight.prices.round_trip.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flight-actions">
                        <button class="btn-book-flight" onclick="window.southKoreaMapApp.bookFlight(${index}, 'one_way')">
                            <i class="fas fa-ticket-alt"></i> Book One Way ($${flight.prices.one_way.toFixed(2)})
                        </button>
                        <button class="btn-book-flight" onclick="window.southKoreaMapApp.bookFlight(${index}, 'round_trip')">
                            <i class="fas fa-exchange-alt"></i> Book Round Trip ($${flight.prices.round_trip.toFixed(2)})
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        resultsContent.innerHTML = html;
        resultsPanel.classList.add("show");
    }

    // Book flight
    bookFlight(flightIndex, tripType) {
        const sourceAirport = this.getSelectedAirport('sourceAirport');
        const targetAirport = this.getSelectedAirport('targetAirport');
        
        if (!sourceAirport || !targetAirport) {
            alert('Airport information not found!');
            return;
        }

        const flights = this.findFlights(sourceAirport.iata_code, targetAirport.iata_code);
        const flight = flights[flightIndex];
        
        if (!flight) {
            alert('Flight information not found!');
            return;
        }

        const dateRange = this.getSelectedDateRange();
        if (!dateRange) {
            alert('Please select your travel dates first!');
            return;
        }

        const price = tripType === 'one_way' ? flight.prices.one_way : flight.prices.round_trip;
        
        // Create flight booking object
        const flightBooking = {
            id: `flight_${Date.now()}`,
            origin: flight.origin,
            destination: flight.destination,
            tripType: tripType,
            price: price,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            bookingDate: new Date(),
            passengers: 1 // Default to 1 passenger
        };

        // Save flight booking
        this.saveFlightBooking(flightBooking);

        // Show confirmation
        this.showFlightBookingConfirmation(flightBooking);
    }

    // Save flight booking
    saveFlightBooking(booking) {
        let bookings = JSON.parse(localStorage.getItem('flightBookings') || '[]');
        bookings.push(booking);
        localStorage.setItem('flightBookings', JSON.stringify(bookings));
        console.log('Flight booking saved:', booking);
    }

    // Show flight booking confirmation
    showFlightBookingConfirmation(booking) {
        const tripTypeText = booking.tripType === 'one_way' ? 'One Way' : 'Round Trip';
        
        const confirmationHTML = `
            <div class="booking-confirmation">
                <div class="confirmation-header">
                    <i class="fas fa-plane"></i>
                    <h3>Flight Booked!</h3>
                </div>
                <div class="confirmation-details">
                    <h4>${booking.origin.city} → ${booking.destination.city}</h4>
                    <p><strong>From:</strong> ${booking.origin.name} (${booking.origin.id})</p>
                    <p><strong>To:</strong> ${booking.destination.name} (${booking.destination.id})</p>
                    <p><strong>Trip Type:</strong> ${tripTypeText}</p>
                    <p><strong>Price:</strong> $${booking.price.toFixed(2)}</p>
                    <p><strong>Travel Period:</strong> ${booking.startDate.toLocaleDateString()} - ${booking.endDate.toLocaleDateString()}</p>
                </div>
                <div class="confirmation-actions">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn-close">
                        <i class="fas fa-times"></i> Close
                    </button>
                    <button onclick="window.southKoreaMapApp.viewAllFlightBookings()" class="btn-view-bookings">
                        <i class="fas fa-list"></i> View All Flights
                    </button>
                </div>
            </div>
        `;

        // Create and show confirmation modal
        const modal = document.createElement('div');
        modal.className = 'booking-modal';
        modal.innerHTML = confirmationHTML;
        document.body.appendChild(modal);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (modal.parentElement) {
                modal.remove();
            }
        }, 10000);
    }

    // View all flight bookings
    viewAllFlightBookings() {
        const bookings = JSON.parse(localStorage.getItem('flightBookings') || '[]');
        
        if (bookings.length === 0) {
            alert('No flight bookings found!');
            return;
        }

        let bookingsHTML = `
            <div class="bookings-summary">
                <h4><i class="fas fa-plane"></i> Your Flight Bookings</h4>
                <p>Total bookings: ${bookings.length}</p>
            </div>
            <div class="bookings-list">
        `;

        bookings.forEach((booking, index) => {
            const bookingDate = new Date(booking.bookingDate);
            const tripTypeText = booking.tripType === 'one_way' ? 'One Way' : 'Round Trip';
            
            bookingsHTML += `
                <div class="booking-item flight-booking-item">
                    <div class="booking-header">
                        <h5>${booking.origin.city} → ${booking.destination.city}</h5>
                        <span class="booking-date">${bookingDate.toLocaleDateString()}</span>
                    </div>
                    <div class="booking-details">
                        <p><i class="fas fa-plane-departure"></i> ${booking.origin.name} (${booking.origin.id})</p>
                        <p><i class="fas fa-plane-arrival"></i> ${booking.destination.name} (${booking.destination.id})</p>
                        <p><i class="fas fa-ticket-alt"></i> ${tripTypeText} - $${booking.price.toFixed(2)}</p>
                        <p><i class="fas fa-calendar"></i> ${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}</p>
                    </div>
                    <button onclick="window.southKoreaMapApp.removeFlightBooking(${index})" class="btn-remove">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            `;
        });

        bookingsHTML += '</div>';

        // Show in results panel
        const resultsPanel = document.getElementById("resultsPanel");
        const resultsContent = document.getElementById("resultsContent");
        
        if (resultsPanel && resultsContent) {
            resultsContent.innerHTML = bookingsHTML;
            resultsPanel.classList.add("show");
        }
    }

    // Remove flight booking
    removeFlightBooking(index) {
        let bookings = JSON.parse(localStorage.getItem('flightBookings') || '[]');
        bookings.splice(index, 1);
        localStorage.setItem('flightBookings', JSON.stringify(bookings));
        
        // Refresh the bookings view
        this.viewAllFlightBookings();
        
        alert('Flight booking removed successfully!');
    }

    // Get selected date range
    getSelectedDateRange() {
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (!startDateInput || !endDateInput) return null;
        
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        
        if (!startDateInput.value || !endDateInput.value) return null;
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
        
        return {
            startDate: startDate,
            endDate: endDate
        };
    }

    // Hide results panel
    hideResults() {
        const resultsPanel = document.getElementById("resultsPanel");
        if (resultsPanel) {
            resultsPanel.classList.remove("show");
        }
    }

    // Create autocomplete dropdown
    createAutocompleteDropdown(inputElement, results) {
        // Remove existing dropdown
        const existingDropdown = document.querySelector('.autocomplete-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        if (results.length === 0) return;

        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        
        // Position the dropdown
        const rect = inputElement.getBoundingClientRect();
        dropdown.style.position = 'absolute';
        dropdown.style.top = (inputElement.offsetTop + inputElement.offsetHeight + 2) + 'px';
        dropdown.style.left = inputElement.offsetLeft + 'px';
        dropdown.style.width = inputElement.offsetWidth + 'px';

        results.forEach(airport => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            
            item.innerHTML = `
                <div><strong>${airport.name}</strong> (${airport.iata_code})</div>
                <div>${airport.city}, ${airport.country}</div>
            `;
            
            item.addEventListener('click', () => {
                inputElement.value = `${airport.name} (${airport.iata_code}) - ${airport.city}, ${airport.country}`;
                inputElement.dataset.selectedAirport = JSON.stringify(airport);
                inputElement.dispatchEvent(new Event('change')); // Trigger change event
                dropdown.remove();
            });
            
            dropdown.appendChild(item);
        });

        // Ensure parent has relative positioning
        if (inputElement.parentElement.style.position !== 'relative') {
            inputElement.parentElement.style.position = 'relative';
        }
        
        inputElement.parentElement.appendChild(dropdown);
    }

    // Setup airport autocomplete
    setupAirportAutocomplete() {
        const sourceAirport = document.getElementById('sourceAirport');
        const targetAirport = document.getElementById('targetAirport');

        this.setupSingleAirportAutocomplete(sourceAirport);
        this.setupSingleAirportAutocomplete(targetAirport);
    }

    // Setup autocomplete for a single airport input
    setupSingleAirportAutocomplete(inputElement) {
        if (!inputElement) return;

        let selectedIndex = -1;

        inputElement.addEventListener('input', (e) => {
            selectedIndex = -1;
            const results = this.searchAirports(e.target.value);
            this.createAutocompleteDropdown(inputElement, results);
        });

        inputElement.addEventListener('keydown', (e) => {
            const dropdown = document.querySelector('.autocomplete-dropdown');
            if (!dropdown) return;

            const items = dropdown.querySelectorAll('.autocomplete-item');
            
            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                    this.updateDropdownSelection(items, selectedIndex);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    selectedIndex = Math.max(selectedIndex - 1, -1);
                    this.updateDropdownSelection(items, selectedIndex);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0 && items[selectedIndex]) {
                        items[selectedIndex].click();
                    }
                    break;
                case 'Escape':
                    dropdown.remove();
                    selectedIndex = -1;
                    break;
            }
        });

        inputElement.addEventListener('blur', () => {
            // Delay removal to allow click on dropdown items
            setTimeout(() => {
                const dropdown = document.querySelector('.autocomplete-dropdown');
                if (dropdown) dropdown.remove();
            }, 200);
        });

        // Clear selection when input changes
        inputElement.addEventListener('change', () => {
            if (!inputElement.dataset.selectedAirport) {
                // Clear if no valid airport is selected
                if (inputElement.value && !inputElement.value.includes('(') && !inputElement.value.includes(')')) {
                    inputElement.dataset.selectedAirport = '';
                }
            }
        });
    }

    // Update dropdown selection highlighting
    updateDropdownSelection(items, selectedIndex) {
        items.forEach((item, index) => {
            if (index === selectedIndex) {
                item.style.backgroundColor = 'var(--bg-secondary)';
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.style.backgroundColor = 'transparent';
            }
        });
    }

    // Simple TopoJSON to GeoJSON converter
    topojsonToGeoJson(topojsonData, objectName) {
        const { arcs, transform } = topojsonData;
        const geometries = topojsonData.objects[objectName].geometries;

        const scale = transform.scale;
        const translate = transform.translate;

        function decode(coordinate) {
            return [
                (coordinate[0] * scale[0]) + translate[0],
                (coordinate[1] * scale[1]) + translate[1]
            ];
        }

        function getArcCoordinates(arcIndexes) {
            let coordinates = [];
            let x = 0, y = 0;
            for (const arcIndex of arcIndexes) {
                const arc = arcs[arcIndex < 0 ? ~arcIndex : arcIndex];
                const reversed = arcIndex < 0;
                const segment = reversed ? [...arc].reverse() : arc;

                for (let i = 0; i < segment.length; i++) {
                    const point = segment[i];
                    x += point[0];
                    y += point[1];
                    coordinates.push(decode([x, y]));
                }
            }
            return coordinates;
        }

        const features = geometries.map(geometry => {
            let geoJsonGeometry;
            if (geometry.type === "Polygon") {
                geoJsonGeometry = {
                    type: "Polygon",
                    coordinates: geometry.arcs.map(getArcCoordinates)
                };
            } else if (geometry.type === "MultiPolygon") {
                geoJsonGeometry = {
                    type: "MultiPolygon",
                    coordinates: geometry.arcs.map(polygonArcs => 
                        polygonArcs.map(getArcCoordinates)
                    )
                };
            } else {
                console.warn("Unsupported geometry type:", geometry.type);
                return null;
            }

            return {
                type: "Feature",
                geometry: geoJsonGeometry,
                properties: geometry.properties
            };
        }).filter(feature => feature !== null);

        return {
            type: "FeatureCollection",
            features: features
        };
    }

    populateProvinceDropdown() {
        const provinceSelect = document.getElementById("provinceSelect");
        
        if (!provinceSelect) {
            console.error("Province select element not found");
            return;
        }
        
        // Clear existing options
        provinceSelect.innerHTML = "<option value=\"\">Select Province...</option>";

        let provinces = [];

        // Try to use provincesGeoJSON first (for map display), then fall back to regionData
        if (this.provincesGeoJSON && this.provincesGeoJSON.features) {
            provinces = this.provincesGeoJSON.features.map(feature => ({
                name: feature.properties.NAME_1 || feature.properties.name || feature.properties.NAME_ENG || feature.properties.name_eng || feature.properties.NAME,
                code: feature.properties.ID_1 || feature.properties.id || feature.properties.CODE
            }));
        } else if (this.regionData.provinces && this.regionData.provinces.features) {
            provinces = this.regionData.provinces.features.map(feature => ({
                name: feature.properties.NAME_1 || feature.properties.name || feature.properties.NAME_ENG || feature.properties.name_eng || feature.properties.NAME,
                code: feature.properties.ID_1 || feature.properties.id || feature.properties.CODE
            }));
        } else {
            console.error("No province data available for dropdown population.");
            return;
        }

        // Remove duplicates and sort
        const uniqueProvinces = provinces.filter((province, index, self) => 
            index === self.findIndex(p => p.name === province.name)
        ).sort((a, b) => a.name.localeCompare(b.name));

        // Populate dropdown
        uniqueProvinces.forEach(province => {
            const option = document.createElement("option");
            option.value = province.name;
            option.textContent = province.name;
            provinceSelect.appendChild(option);
        });

        console.log("Province dropdown populated with", uniqueProvinces.length, "provinces");
    }

    populateMunicipalityDropdown(provinceName) {
        const municipalitySelect = document.getElementById("municipalitySelect");
        
        if (!municipalitySelect) {
            console.error("Municipality select element not found");
            return;
        }
        
        // Clear existing options
        municipalitySelect.innerHTML = "<option value=\"\">Select Municipality...</option>";
        
        if (!provinceName || !this.regionData.municipalities) {
            municipalitySelect.disabled = true;
            return;
        }

        // Filter municipalities by province
        const municipalities = this.regionData.municipalities.features
            .filter(feature => {
                const featureProvince = feature.properties.NAME_1 || feature.properties.province || feature.properties.NAME_ENG_1 || feature.properties.name_eng_1;
                return featureProvince === provinceName;
            })
            .map(feature => ({
                name: feature.properties.NAME_2 || feature.properties.name || feature.properties.NAME_ENG_2 || feature.properties.name_eng_2 || feature.properties.NAME,
                code: feature.properties.ID_2 || feature.properties.id || feature.properties.CODE
            }));

        // Remove duplicates and sort
        const uniqueMunicipalities = municipalities.filter((municipality, index, self) => 
            index === self.findIndex(m => m.name === municipality.name)
        ).sort((a, b) => a.name.localeCompare(b.name));

        // Populate dropdown
        uniqueMunicipalities.forEach(municipality => {
            const option = document.createElement("option");
            option.value = municipality.name;
            option.textContent = municipality.name;
            municipalitySelect.appendChild(option);
        });

        municipalitySelect.disabled = false;
        console.log("Municipality dropdown populated with", uniqueMunicipalities.length, "municipalities");
    }

    populateSubmunicipalityDropdown(provinceName, municipalityName) {
        const submunicipalitySelect = document.getElementById("submunicipalitySelect");
        
        if (!submunicipalitySelect) {
            console.error("Submunicipality select element not found");
            return;
        }
        
        // Clear existing options
        submunicipalitySelect.innerHTML = "<option value=\"\">Select Submunicipality...</option>";
        
        if (!provinceName || !municipalityName || !this.regionData.submunicipalities) {
            submunicipalitySelect.disabled = true;
            return;
        }

        // Filter submunicipalities by province and municipality
        const submunicipalities = this.regionData.submunicipalities.features
            .filter(feature => {
                const featureProvince = feature.properties.NAME_1 || feature.properties.province || feature.properties.NAME_ENG_1 || feature.properties.name_eng_1;
                const featureMunicipality = feature.properties.NAME_2 || feature.properties.municipality || feature.properties.NAME_ENG_2 || feature.properties.name_eng_2;
                return featureProvince === provinceName && featureMunicipality === municipalityName;
            })
            .map(feature => ({
                name: feature.properties.NAME_3 || feature.properties.name || feature.properties.NAME_ENG_3 || feature.properties.name_eng_3 || feature.properties.NAME,
                code: feature.properties.ID_3 || feature.properties.id || feature.properties.CODE
            }));

        // Remove duplicates and sort
        const uniqueSubmunicipalities = submunicipalities.filter((sub, index, self) => 
            index === self.findIndex(s => s.name === sub.name)
        ).sort((a, b) => a.name.localeCompare(b.name));

        // Populate dropdown
        uniqueSubmunicipalities.forEach(submunicipality => {
            const option = document.createElement("option");
            option.value = submunicipality.name;
            option.textContent = submunicipality.name;
            submunicipalitySelect.appendChild(option);
        });

        submunicipalitySelect.disabled = false;
        console.log("Submunicipality dropdown populated with", uniqueSubmunicipalities.length, "submunicipalities");
    }

    setupEventListeners() {
        // Menu toggle for mobile
        const menuToggle = document.getElementById("menuToggle");
        const sidebar = document.getElementById("sidebar");
        const closeSidebar = document.getElementById("closeSidebar");

        menuToggle?.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });

        closeSidebar?.addEventListener("click", () => {
            sidebar.classList.remove("open");
        });

        // Region selection dropdowns
        const provinceSelect = document.getElementById("provinceSelect");
        const municipalitySelect = document.getElementById("municipalitySelect");
        const submunicipalitySelect = document.getElementById("submunicipalitySelect");

        provinceSelect?.addEventListener("change", (e) => {
            const provinceName = e.target.value;
            this.selectedRegion.province = provinceName;
            this.selectedRegion.municipality = null;
            this.selectedRegion.submunicipality = null;
            
            this.updateSelectedInfo();
            this.populateMunicipalityDropdown(provinceName);
            
            // Show selected province on map
            this.showProvince(provinceName);
            
            // Reset dependent dropdowns
            if (municipalitySelect) {
                municipalitySelect.innerHTML = "<option value=\"\">Select Municipality...</option>";
                municipalitySelect.disabled = !provinceName; // Enable if a province is selected
            }
            if (submunicipalitySelect) {
                submunicipalitySelect.innerHTML = "<option value=\"\">Select Submunicipality...</option>";
                submunicipalitySelect.disabled = true;
            }
        });

        municipalitySelect?.addEventListener("change", (e) => {
            const municipalityName = e.target.value;
            this.selectedRegion.municipality = municipalityName;
            this.selectedRegion.submunicipality = null;
            
            this.updateSelectedInfo();
            this.populateSubmunicipalityDropdown(this.selectedRegion.province, municipalityName);
            
            // Reset dependent dropdown
            if (submunicipalitySelect) {
                submunicipalitySelect.innerHTML = "<option value=\"\">Select Submunicipality...</option>";
                submunicipalitySelect.disabled = !municipalityName;
            }
        });

        submunicipalitySelect?.addEventListener("change", (e) => {
            this.selectedRegion.submunicipality = e.target.value;
            this.updateSelectedInfo();
        });

        // Date selection event listeners
        const startDateInput = document.getElementById("startDate");
        const endDateInput = document.getElementById("endDate");

        startDateInput?.addEventListener("change", (e) => {
            this.updateSelectedInfo();
            this.validateDateRange();
        });

        endDateInput?.addEventListener("change", (e) => {
            this.updateSelectedInfo();
            this.validateDateRange();
        });

        // Budget slider
        const budgetRange = document.getElementById("budgetRange");
        const budgetValue = document.getElementById("budgetValue");

        budgetRange?.addEventListener("input", (e) => {
            const value = parseInt(e.target.value);
            if (budgetValue) {
                budgetValue.textContent = this.formatCurrency(value);
            }
            const selectedBudgetEl = document.getElementById("selectedBudget");
            if (selectedBudgetEl) {
                selectedBudgetEl.textContent = this.formatCurrency(value);
            }
        });

        // Map controls
        const zoomToKorea = document.getElementById("zoomToKorea");
        const toggleSatellite = document.getElementById("toggleSatellite");
        const fullscreenMap = document.getElementById("fullscreenMap");

        zoomToKorea?.addEventListener("click", () => {
            this.map.setView(this.koreaCenter, this.defaultZoom);
        });

        toggleSatellite?.addEventListener("click", () => {
            this.toggleSatelliteView();
        });

        fullscreenMap?.addEventListener("click", () => {
            this.toggleFullscreen();
        });

        // Filter buttons
        const applyFilters = document.getElementById("applyFilters");
        const resetFilters = document.getElementById("resetFilters");

        applyFilters?.addEventListener("click", () => {
            this.applyFilters();
        });

        resetFilters?.addEventListener("click", () => {
            this.resetFilters();
        });

        // Location services
        const getCurrentLocation = document.getElementById("getCurrentLocation");
        getCurrentLocation?.addEventListener("click", () => {
            this.getCurrentLocation();
        });

        // Use current location as destination button
        const useCurrentBtn = document.getElementById("useCurrentAsDestination");
        useCurrentBtn?.addEventListener("click", () => {
            this.useCurrentLocationAsDestination();
        });

        // Manual location mode button
        const manualLocationBtn = document.getElementById("manualLocationMode");
        manualLocationBtn?.addEventListener("click", () => {
            this.toggleManualLocationMode();
        });

        // Save location button
        const saveLocationBtn = document.getElementById("saveLocation");
        saveLocationBtn?.addEventListener("click", () => {
            this.saveCurrentLocation();
        });

        // View saved locations button
        const viewSavedBtn = document.getElementById("viewSavedLocations");
        viewSavedBtn?.addEventListener("click", () => {
            this.showSavedLocations();
        });

        // Tourism attractions button
        const findTourismVillage = document.getElementById("findTourismVillage");
        findTourismVillage?.addEventListener("click", () => {
            this.showTourismAttractionsForProvince();
        });

        // Hotel search button
        const findHotel = document.getElementById("findHotel");
        findHotel?.addEventListener("click", () => {
            this.searchHotelsForProvince();
        });

        // Flight search button
        const findFlights = document.getElementById("findFlights");
        findFlights?.addEventListener("click", () => {
            this.searchFlights();
        });

        // View bookings button
        const viewBookings = document.getElementById("viewBookings");
        viewBookings?.addEventListener("click", () => {
            this.viewAllBookings();
        });

        // Results panel close button
        const closeResults = document.getElementById("closeResults");
        closeResults?.addEventListener("click", () => {
            this.hideResults();
        });

        console.log("Event listeners set up");
    }

    updateSelectedInfo() {
        const selectedProvinceEl = document.getElementById("selectedProvince");
        const selectedMunicipalityEl = document.getElementById("selectedMunicipality");
        const selectedSubmunicipalityEl = document.getElementById("selectedSubmunicipality");
        const selectedStartDateEl = document.getElementById("selectedStartDate");
        const selectedEndDateEl = document.getElementById("selectedEndDate");
        
        if (selectedProvinceEl) {
            selectedProvinceEl.textContent = this.selectedRegion.province || "Select Province...";
        }
        if (selectedMunicipalityEl) {
            selectedMunicipalityEl.textContent = this.selectedRegion.municipality || "Select Municipality...";
        }
        if (selectedSubmunicipalityEl) {
            selectedSubmunicipalityEl.textContent = this.selectedRegion.submunicipality || "Select Submunicipality...";
        }

        // Update date displays
        const startDateInput = document.getElementById("startDate");
        const endDateInput = document.getElementById("endDate");
        
        if (selectedStartDateEl && startDateInput) {
            selectedStartDateEl.textContent = startDateInput.value || "Select Start Date...";
        }
        if (selectedEndDateEl && endDateInput) {
            selectedEndDateEl.textContent = endDateInput.value || "Select End Date...";
        }
    }

    // Validate date range
    validateDateRange() {
        const startDateInput = document.getElementById("startDate");
        const endDateInput = document.getElementById("endDate");
        
        if (!startDateInput || !endDateInput) return;

        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Validate start date is not in the past
        if (startDateInput.value && startDate < today) {
            startDateInput.setCustomValidity("Start date cannot be in the past");
            startDateInput.reportValidity();
            return false;
        } else {
            startDateInput.setCustomValidity("");
        }

        // Validate end date is after start date
        if (startDateInput.value && endDateInput.value && endDate <= startDate) {
            endDateInput.setCustomValidity("End date must be after start date");
            endDateInput.reportValidity();
            return false;
        } else {
            endDateInput.setCustomValidity("");
        }

        // Set minimum end date to start date + 1 day
        if (startDateInput.value) {
            const minEndDate = new Date(startDate);
            minEndDate.setDate(minEndDate.getDate() + 1);
            endDateInput.min = minEndDate.toISOString().split('T')[0];
        }

        return true;
    }

    // Initialize date inputs with current date as minimum
    initializeDateInputs() {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        
        const startDateInput = document.getElementById("startDate");
        const endDateInput = document.getElementById("endDate");
        
        if (startDateInput) {
            startDateInput.min = todayString;
        }
        if (endDateInput) {
            endDateInput.min = todayString;
        }

        console.log("Date inputs initialized with minimum date:", todayString);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0
        }).format(amount);
    }

    toggleSatelliteView() {
        if (this.currentLayer === this.mapLayers.osm) {
            this.map.removeLayer(this.mapLayers.osm);
            this.map.addLayer(this.mapLayers.satellite);
            this.currentLayer = this.mapLayers.satellite;
        } else {
            this.map.removeLayer(this.mapLayers.satellite);
            this.map.addLayer(this.mapLayers.osm);
            this.currentLayer = this.mapLayers.osm;
        }
    }

    toggleFullscreen() {
        const mapContainer = document.querySelector(".map-container");
        
        if (!document.fullscreenElement) {
            mapContainer.requestFullscreen().catch(err => {
                console.error("Error attempting to enable fullscreen:", err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showError("Geolocation is not supported by this browser.");
            return;
        }

        const getCurrentLocationBtn = document.getElementById("getCurrentLocation");
        const originalText = getCurrentLocationBtn.innerHTML;
        getCurrentLocationBtn.innerHTML = "<i class=\"fas fa-spinner fa-spin\"></i> Getting location...";
        getCurrentLocationBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.currentLocation = [position.coords.latitude, position.coords.longitude];
                
                // Add marker for current location
                const marker = L.marker(this.currentLocation, {
                    icon: L.divIcon({
                        className: 'current-location-marker',
                        html: '<i class="fas fa-crosshairs" style="color: #007bff; font-size: 20px;"></i>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                })
                    .addTo(this.map)
                    .bindPopup("Your current location")
                    .openPopup();
                
                this.markers.push(marker);
                
                // Center map on current location
                this.map.setView(this.currentLocation, 12);
                
                // Update UI to show current location is available
                this.updateCurrentLocationStatus(true);
                
                // Hide save location option (GPS location doesn't need saving)
                this.hideSaveLocationOption();
                
                // Enable the "Set Current as Destination" button
                const useCurrentBtn = document.getElementById("useCurrentAsDestination");
                if (useCurrentBtn) {
                    useCurrentBtn.disabled = false;
                }
                
                getCurrentLocationBtn.innerHTML = originalText;
                getCurrentLocationBtn.disabled = false;
                
                console.log("Current location obtained:", this.currentLocation);
            },
            (error) => {
                console.error("Error getting location:", error);
                this.showError("Unable to get your location. Please check your browser settings.");
                getCurrentLocationBtn.innerHTML = originalText;
                getCurrentLocationBtn.disabled = false;
                this.updateCurrentLocationStatus(false);
                this.hideSaveLocationOption();
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    }

    applyFilters() {
        this.showLoading(true);
        
        try {
            // Clear existing markers
            this.clearMarkers();
            
            // Get filter values
            const showTourism = document.getElementById("showTourism").checked;
            const showRestaurants = document.getElementById("showRestaurants").checked;
            const tourismType = document.getElementById("tourismType").value;
            const cuisineType = document.getElementById("cuisineType").value;
            const priceRange = document.getElementById("priceRange").value;
            const budget = parseInt(document.getElementById("budgetRange").value);
            const searchRadius = parseInt(document.getElementById("searchRadius").value);
            
            let results = [];
            
            // Filter and display tourism places
            if (showTourism) {
                const filteredTourism = this.filterTourismPlaces(tourismType, budget);
                results = results.concat(filteredTourism);
                this.displayTourismPlaces(filteredTourism);
            }
            
            // Filter and display restaurants
            if (showRestaurants) {
                const filteredRestaurants = this.filterRestaurants(cuisineType, priceRange, budget);
                results = results.concat(filteredRestaurants);
                this.displayRestaurants(filteredRestaurants);
            }
            
            // Show results panel
            this.showResults(results);
            
            console.log("Filters applied, showing", results.length, "results");
        } catch (error) {
            console.error("Error applying filters:", error);
            this.showError("Error applying filters. Please try again.");
        } finally {
            this.showLoading(false);
        }
    }

    filterTourismPlaces(type, budget) {
        let filtered = this.tourismData;
        
        // Filter by type
        if (type) {
            filtered = filtered.filter(place => place.type === type);
        }
        
        // Filter by budget (tourism places with entrance fees)
        filtered = filtered.filter(place => place.price <= budget);
        
        // Filter by selected region
        if (this.selectedRegion.province) {
            filtered = filtered.filter(place => place.province === this.selectedRegion.province);
        }
        
        return filtered;
    }

    filterRestaurants(cuisine, priceRange, budget) {
        let filtered = this.restaurantData;
        
        // Filter by cuisine type
        if (cuisine) {
            filtered = filtered.filter(restaurant => restaurant.cuisine === cuisine);
        }
        
        // Filter by price range
        if (priceRange) {
            filtered = filtered.filter(restaurant => {
                const avgPrice = restaurant.averagePrice;
                switch (priceRange) {
                    case "budget": return avgPrice < 15000;
                    case "moderate": return avgPrice >= 15000 && avgPrice <= 50000;
                    case "expensive": return avgPrice > 50000 && avgPrice <= 100000;
                    case "luxury": return avgPrice > 100000;
                    default: return true;
                }
            });
        }
        
        // Filter by budget
        filtered = filtered.filter(restaurant => restaurant.averagePrice <= budget);
        
        // Filter by selected region
        if (this.selectedRegion.province) {
            filtered = filtered.filter(restaurant => restaurant.province === this.selectedRegion.province);
        }
        
        return filtered;
    }

    displayTourismPlaces(places) {
        places.forEach(place => {
            const marker = L.marker(place.coordinates)
                .addTo(this.map)
                .bindPopup(this.createTourismPopup(place));
            
            this.markers.push(marker);
        });
    }

    displayRestaurants(restaurants) {
        restaurants.forEach(restaurant => {
            const marker = L.marker(restaurant.coordinates)
                .addTo(this.map)
                .bindPopup(this.createRestaurantPopup(restaurant));
            
            this.markers.push(marker);
        });
    }

    createTourismPopup(place) {
        return `
            <div class="popup-content">
                <h4><i class="fas fa-camera"></i> ${place.name}</h4>
                <p><strong>Type:</strong> ${place.type}</p>
                <p><strong>Location:</strong> ${place.municipality}, ${place.province}</p>
                <p><strong>Price:</strong> ${place.price === 0 ? "Free" : this.formatCurrency(place.price)}</p>
                <p><strong>Rating:</strong> ${"★".repeat(Math.floor(place.rating))} ${place.rating}/5</p>
                <p>${place.description}</p>
            </div>
        `;
    }

    createRestaurantPopup(restaurant) {
        return `
            <div class="popup-content">
                <h4><i class="fas fa-utensils"></i> ${restaurant.name}</h4>
                <p><strong>Cuisine:</strong> ${restaurant.cuisine}</p>
                <p><strong>Location:</strong> ${restaurant.municipality}, ${restaurant.province}</p>
                <p><strong>Price Range:</strong> ${restaurant.priceRange}</p>
                <p><strong>Rating:</strong> ${"★".repeat(Math.floor(restaurant.rating))} ${restaurant.rating}/5</p>
                <p>${restaurant.description}</p>
            </div>
        `;
    }

    showResults(results) {
        const resultsPanel = document.getElementById("resultsPanel");
        const resultsContent = document.getElementById("resultsContent");
        
        if (results.length === 0) {
            resultsContent.innerHTML = "<p>No results found matching your criteria.</p>";
        } else {
            resultsContent.innerHTML = `
                <p>Found ${results.length} result(s) matching your criteria:</p>
                <ul>
                    ${results.map(item => `
                        <li>
                            <strong>${item.name}</strong> - ${item.type || item.cuisine}
                            ${item.province ? ` (${item.province})` : ""}
                        </li>
                    `).join("")}
                </ul>
            `;
        }
        
        resultsPanel.classList.add("show");
    }

    hideResults() {
        const resultsPanel = document.getElementById("resultsPanel");
        resultsPanel.classList.remove("show");
    }

    clearMarkers() {
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
    }

    resetFilters() {
        // Reset form elements with defensive programming
        const provinceSelect = document.getElementById("provinceSelect");
        const municipalitySelect = document.getElementById("municipalitySelect");
        const submunicipalitySelect = document.getElementById("submunicipalitySelect");
        const budgetRange = document.getElementById("budgetRange");
        const budgetValue = document.getElementById("budgetValue");
        
        if (provinceSelect) provinceSelect.value = "";
        if (municipalitySelect) {
            municipalitySelect.value = "";
            municipalitySelect.disabled = true;
        }
        if (submunicipalitySelect) {
            submunicipalitySelect.value = "";
            submunicipalitySelect.disabled = true;
        }
        
        if (budgetRange) budgetRange.value = 1000;
        if (budgetValue) budgetValue.textContent = "$1,000";
        
        const showTourism = document.getElementById("showTourism");
        const showRestaurants = document.getElementById("showRestaurants");
        const tourismType = document.getElementById("tourismType");
        const cuisineType = document.getElementById("cuisineType");
        const priceRange = document.getElementById("priceRange");
        const searchRadius = document.getElementById("searchRadius");
        
        if (showTourism) showTourism.checked = true;
        if (showRestaurants) showRestaurants.checked = true;
        if (tourismType) tourismType.value = "";
        if (cuisineType) cuisineType.value = "";
        if (priceRange) priceRange.value = "";
        if (searchRadius) searchRadius.value = "10";
        
        // Reset selected region
        this.selectedRegion = {
            province: null,
            municipality: null,
            submunicipality: null
        };
        
        // Update info panel
        this.updateSelectedInfo();
        const selectedBudgetEl = document.getElementById("selectedBudget");
        if (selectedBudgetEl) {
            selectedBudgetEl.textContent = "$1,000";
        }
        
        // Clear map markers
        this.clearMarkers();
        
        // Hide results
        this.hideResults();
        
        // Reset map view
        this.map.setView(this.koreaCenter, this.defaultZoom);
        
        console.log("Filters reset");
    }

    showLoading(show) {
        const loadingOverlay = document.getElementById("loadingOverlay");
        if (show) {
            loadingOverlay.classList.add("show");
        } else {
            loadingOverlay.classList.remove("show");
        }
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper modal
        alert(message);
    }

    // Toggle manual location selection mode
    toggleManualLocationMode() {
        this.manualLocationMode = !this.manualLocationMode;
        this.updateManualLocationUI();
        
        if (this.manualLocationMode) {
            this.showLocationModeInfo("Click on the map to set your location manually");
        } else {
            this.hideLocationModeInfo();
        }
    }

    // Update UI for manual location mode
    updateManualLocationUI() {
        const manualLocationBtn = document.getElementById("manualLocationMode");
        const locationModeElement = document.getElementById("locationMode");
        
        if (manualLocationBtn) {
            if (this.manualLocationMode) {
                manualLocationBtn.innerHTML = '<i class="fas fa-times"></i> Cancel Manual Mode';
                manualLocationBtn.classList.add('btn-warning');
                manualLocationBtn.classList.remove('btn-location');
                this.map.getContainer().style.cursor = 'crosshair';
            } else {
                manualLocationBtn.innerHTML = '<i class="fas fa-mouse-pointer"></i> Set Location Manually';
                manualLocationBtn.classList.remove('btn-warning');
                manualLocationBtn.classList.add('btn-location');
                this.map.getContainer().style.cursor = '';
            }
        }
        
        if (locationModeElement) {
            if (this.manualLocationMode) {
                locationModeElement.innerHTML = '<i class="fas fa-mouse-pointer" style="color: orange;"></i> Manual Selection';
            } else {
                locationModeElement.innerHTML = '<i class="fas fa-satellite-dish"></i> GPS Detection';
            }
        }
    }

    // Set location manually by coordinates
    setManualLocation(lat, lng) {
        // Remove previous current location marker
        this.clearCurrentLocationMarker();
        
        // Set new current location
        this.currentLocation = [lat, lng];
        
        // Add marker for manually selected location
        const marker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'manual-location-marker',
                html: '<i class="fas fa-map-pin" style="color: #ff6b35; font-size: 20px;"></i>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        })
            .addTo(this.map)
            .bindPopup(`Manual location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
            .openPopup();
        
        this.markers.push(marker);
        
        // Update UI
        this.updateCurrentLocationStatus(true);
        
        // Enable the "Set Current as Destination" button
        const useCurrentBtn = document.getElementById("useCurrentAsDestination");
        if (useCurrentBtn) {
            useCurrentBtn.disabled = false;
        }
        
        // Exit manual mode after selection
        this.manualLocationMode = false;
        this.updateManualLocationUI();
        this.hideLocationModeInfo();
        
        // Show save location option
        this.showSaveLocationOption();
        
        console.log("Manual location set:", this.currentLocation);
    }

    // Clear current location marker only
    clearCurrentLocationMarker() {
        this.markers = this.markers.filter(marker => {
            const markerClasses = ['current-location-marker', 'manual-location-marker'];
            const hasLocationClass = markerClasses.some(cls => 
                marker.options.icon && marker.options.icon.options.className === cls
            );
            
            if (hasLocationClass) {
                this.map.removeLayer(marker);
                return false;
            }
            return true;
        });
    }

    // Show location mode info message
    showLocationModeInfo(message) {
        // Create or update info overlay
        let infoOverlay = document.getElementById('locationModeInfo');
        if (!infoOverlay) {
            infoOverlay = document.createElement('div');
            infoOverlay.id = 'locationModeInfo';
            infoOverlay.className = 'location-mode-info';
            document.body.appendChild(infoOverlay);
        }
        
        infoOverlay.innerHTML = `
            <div class="info-content">
                <i class="fas fa-info-circle"></i>
                <span>${message}</span>
                <button onclick="window.southKoreaMapApp.toggleManualLocationMode()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        infoOverlay.style.display = 'block';
    }

    // Hide location mode info message
    hideLocationModeInfo() {
        const infoOverlay = document.getElementById('locationModeInfo');
        if (infoOverlay) {
            infoOverlay.style.display = 'none';
        }
    }

    // Show save location option
    showSaveLocationOption() {
        const saveLocationGroup = document.getElementById('saveLocationGroup');
        if (saveLocationGroup) {
            saveLocationGroup.style.display = 'block';
            
            // Auto-generate location name based on coordinates
            const locationNameInput = document.getElementById('locationName');
            if (locationNameInput && this.currentLocation) {
                const [lat, lng] = this.currentLocation;
                const defaultName = `Location ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
                locationNameInput.placeholder = defaultName;
            }
        }
    }

    // Hide save location option
    hideSaveLocationOption() {
        const saveLocationGroup = document.getElementById('saveLocationGroup');
        if (saveLocationGroup) {
            saveLocationGroup.style.display = 'none';
            
            // Clear input
            const locationNameInput = document.getElementById('locationName');
            if (locationNameInput) {
                locationNameInput.value = '';
            }
        }
    }

    // Save current location to local storage
    saveCurrentLocation() {
        if (!this.currentLocation) {
            this.showError('No location to save.');
            return;
        }

        const locationNameInput = document.getElementById('locationName');
        const [lat, lng] = this.currentLocation;
        
        // Use input name or generate default name
        let locationName = locationNameInput?.value.trim();
        if (!locationName) {
            locationName = `Location ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
        }

        // Create location object
        const savedLocation = {
            id: Date.now(),
            name: locationName,
            coordinates: [lat, lng],
            savedDate: new Date().toISOString(),
            type: 'manual'
        };

        // Check if location already exists (within 100m)
        const existingLocation = this.savedLocations.find(loc => {
            const distance = this.calculateDistance(lat, lng, loc.coordinates[0], loc.coordinates[1]);
            return distance < 0.1; // 100 meters
        });

        if (existingLocation) {
            if (confirm(`A location named "${existingLocation.name}" already exists nearby. Replace it?`)) {
                // Replace existing location
                const index = this.savedLocations.findIndex(loc => loc.id === existingLocation.id);
                this.savedLocations[index] = savedLocation;
            } else {
                return;
            }
        } else {
            // Add new location
            this.savedLocations.push(savedLocation);
        }

        // Save to local storage
        this.saveSavedLocations();
        
        // Hide save option
        this.hideSaveLocationOption();
        
        // Show confirmation
        this.showSaveConfirmation(locationName);
        
        console.log('Location saved:', savedLocation);
    }

    // Load saved locations from local storage
    loadSavedLocations() {
        try {
            const saved = localStorage.getItem('southKoreaMapApp_savedLocations');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading saved locations:', error);
            return [];
        }
    }

    // Save locations to local storage
    saveSavedLocations() {
        try {
            localStorage.setItem('southKoreaMapApp_savedLocations', JSON.stringify(this.savedLocations));
        } catch (error) {
            console.error('Error saving locations:', error);
            this.showError('Failed to save location. Storage may be full.');
        }
    }

    // Show save confirmation
    showSaveConfirmation(locationName) {
        // Create or update confirmation overlay
        let confirmationOverlay = document.getElementById('saveConfirmation');
        if (!confirmationOverlay) {
            confirmationOverlay = document.createElement('div');
            confirmationOverlay.id = 'saveConfirmation';
            confirmationOverlay.className = 'save-confirmation';
            document.body.appendChild(confirmationOverlay);
        }
        
        confirmationOverlay.innerHTML = `
            <div class="confirmation-content">
                <i class="fas fa-check-circle"></i>
                <span>Location "${locationName}" saved successfully!</span>
            </div>
        `;
        confirmationOverlay.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            confirmationOverlay.style.display = 'none';
        }, 3000);
    }

    // Show saved locations in results panel
    showSavedLocations() {
        if (this.savedLocations.length === 0) {
            this.showError('No saved locations found.');
            return;
        }

        const resultsPanel = document.getElementById("resultsPanel");
        const resultsContent = document.getElementById("resultsContent");
        
        if (!resultsPanel || !resultsContent) return;

        let html = `
            <div class="results-summary">
                <h4><i class="fas fa-map-marked-alt"></i> Saved Locations</h4>
                <p>You have ${this.savedLocations.length} saved location${this.savedLocations.length > 1 ? 's' : ''}</p>
            </div>
            <div class="results-list">
        `;

        this.savedLocations.forEach(location => {
            const [lat, lng] = location.coordinates;
            const savedDate = new Date(location.savedDate).toLocaleDateString();
            
            html += `
                <div class="result-item saved-location-item">
                    <div class="location-info">
                        <h5>${location.name}</h5>
                        <p><i class="fas fa-map-marker-alt"></i> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
                        <p><i class="fas fa-calendar"></i> Saved: ${savedDate}</p>
                    </div>
                    <div class="location-actions">
                        <button class="btn btn-sm btn-primary" onclick="window.southKoreaMapApp.loadSavedLocation(${location.id})">
                            <i class="fas fa-map-pin"></i> Use
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.southKoreaMapApp.deleteSavedLocation(${location.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        resultsContent.innerHTML = html;
        resultsPanel.classList.add("show");
    }

    // Load a saved location
    loadSavedLocation(locationId) {
        const location = this.savedLocations.find(loc => loc.id === locationId);
        if (!location) {
            this.showError('Location not found.');
            return;
        }

        // Clear current location marker
        this.clearCurrentLocationMarker();
        
        // Set as current location
        this.currentLocation = location.coordinates;
        
        // Add marker
        const [lat, lng] = location.coordinates;
        const marker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'saved-location-marker',
                html: '<i class="fas fa-bookmark" style="color: #8b5cf6; font-size: 20px;"></i>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        })
            .addTo(this.map)
            .bindPopup(`Saved: ${location.name}<br>${lat.toFixed(4)}, ${lng.toFixed(4)}`)
            .openPopup();
        
        this.markers.push(marker);
        
        // Center map on location
        this.map.setView([lat, lng], 12);
        
        // Update UI
        this.updateCurrentLocationStatus(true);
        
        // Enable destination button
        const useCurrentBtn = document.getElementById("useCurrentAsDestination");
        if (useCurrentBtn) {
            useCurrentBtn.disabled = false;
        }
        
        // Hide results panel
        this.hideResults();
        
        console.log('Loaded saved location:', location);
    }

    // Delete a saved location
    deleteSavedLocation(locationId) {
        const location = this.savedLocations.find(loc => loc.id === locationId);
        if (!location) {
            this.showError('Location not found.');
            return;
        }

        if (confirm(`Are you sure you want to delete "${location.name}"?`)) {
            this.savedLocations = this.savedLocations.filter(loc => loc.id !== locationId);
            this.saveSavedLocations();
            
            // Refresh the saved locations view
            this.showSavedLocations();
            
            console.log('Deleted saved location:', location);
        }
    }
}

// Initialize the application when the DOM is loaded
// DISABLED: This conflicts with the new displayMap class in main.js
// document.addEventListener("DOMContentLoaded", () => {
//     window.southKoreaMapApp = new SouthKoreaMapApp();
// });

