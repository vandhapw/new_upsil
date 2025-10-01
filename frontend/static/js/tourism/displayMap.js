// South Korea Interactive Map Application
class displayMap {
    constructor() {
        // Singleton pattern - prevent multiple instances
        if (displayMap.instance) {
            console.log("displayMap instance already exists, returning existing instance");
            return displayMap.instance;
        }

        this.map = null;
        this.currentLayer = null;
        this.markers = [];      
        
        // South Korea center coordinates
        this.koreaCenter = [36.5, 127.5];
        this.defaultZoom = 7;
        
        // Store the instance
        displayMap.instance = this;
        
        this.init();
    }

    async init() {
        this.showLoading(true);
        
        try {
            await this.initializeMap();           
            this.setupEventListeners();
            
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

        // Add custom hotel control
    const HotelControl = L.Control.extend({
    options: {
        position: 'topright'
    },
    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'custom-map-control hotel-control');
        container.innerHTML = '<i class="fas fa-hotel" style="font-size: 16px; color: #333;"></i>';
        container.title = 'Search Hotels';

        container.onclick = function() {
            if (window.displayHotelInstance) {
                window.displayHotelInstance.searchHotels();
            } else {
                alert('Please select a province first to search for hotels');
            }
        };

        return container;
    }
});

// Add custom flight control with responsive CSS classes
const FlightControl = L.Control.extend({
    options: {
        position: 'topright'
    },
    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'custom-map-control flight-control');
        container.innerHTML = '<i class="fas fa-plane" style="font-size: 16px; color: #333;"></i>';
        container.title = 'Search Flights';

        container.onclick = function() {
            // Show flight search modal instead of triggering sidebar button
            window.flightOption.showFlightSearchModal();
        };

        return container;
    }
});

const AttractionControl = L.Control.extend({
    options: {
        position: 'topright'
    },
    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'custom-map-control attraction-control');
        container.innerHTML = '<i class="fas fa-map-marker-alt" style="font-size: 16px; color: #333;"></i>';
        container.title = 'Search Attractions';

        container.onclick = function() {
            if (window.displayAttractionInstance) {
                window.displayAttractionInstance.searchAttractions();
            } else {
                alert('Please select a province first to search for attractions');
            }
        };

        return container;
    }
});

    // Add the controls to the map
    new HotelControl().addTo(this.map);
    new FlightControl().addTo(this.map);
    new AttractionControl().addTo(this.map);

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

        // add hotel icon 


        console.log("Map initialized");
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

        console.log("Event listeners set up");
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

    getMap() {
        return this.map;
    }

    // Also add a method to check if map is ready
    isMapReady() {
        return this.map !== null;
    }

    // Static method to clear the singleton instance (useful for debugging)
    static clearInstance() {
        if (displayMap.instance) {
            if (displayMap.instance.map) {
                displayMap.instance.map.remove();
            }
            displayMap.instance = null;
            console.log("displayMap instance cleared");
        }
    }

    // Static method to get the singleton instance
    static getInstance() {
        return displayMap.instance;
    }
}

// Export the class for use in main.js (remove auto-initialization)
// document.addEventListener("DOMContentLoaded", () => {
//     window.displayMap = new displayMap();
// });

