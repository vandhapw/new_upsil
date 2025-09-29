// South Korea Interactive Map Application
class provinceDisplay {
    constructor(map) {
        if (!map){
             throw new Error("Map instance is required for provinceDisplay");
        }
        this.map = map;
        this.currentLayer = null;
        this.markers = [];
        this.regionData = {
            provinces: null,
        };
        this.provincesGeoJSON = null;
        this.provinceLayer = null;
        this.selectedRegion = {
            province: null,
        };
        
        // Initialize map layers if they don't exist
        if (!this.mapLayers) {
            this.mapLayers = {
                osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }),
                satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    attribution: 'Tiles © Esri'
                })
            };
        }
        
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
            await this.loadRegionDataFromDjango();
            await this.loadProvincesFromDjango();
            
            this.setupEventListeners();
            this.populateProvinceDropdown();
            
            console.log("South Korea Map App initialized successfully");
        } catch (error) {
            console.error("Error initializing app:", error);
            this.showError("Failed to initialize the application. Please refresh the page.");
        } finally {
            this.showLoading(false);
        }
    }


    // Load region data from Django API instead of JSON files
    // Load region data from Django API instead of JSON files
    async loadRegionDataFromDjango() {
        try {
            const response = await fetch("/dashboard/kaidashboard/tourism/api/provinces/");
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || "Failed to load provinces data");
            }
            
            // The data is in TopoJSON format, extract provinces from the first item
            const topoJsonData = data.provinces[0]; // Assuming the first item contains the topology
            
            if (topoJsonData && topoJsonData.objects && topoJsonData.objects.skorea_provinces_2018_geo) {
                // Extract province data from TopoJSON geometries
                const geometries = topoJsonData.objects.skorea_provinces_2018_geo.geometries;
                
                // Store the original TopoJSON data for proper conversion later
                this.topoJsonData = topoJsonData;
                
                // Create a simple feature collection for dropdown population
                // Don't convert geometry yet - we'll do that when needed
                this.regionData.provinces = {
                    type: "FeatureCollection",
                    features: geometries.map((geometry, index) => ({
                        type: "Feature",
                        id: index,
                        properties: {
                            NAME_1: geometry.properties.name,
                            name: geometry.properties.name,
                            NAME_ENG: geometry.properties.name_eng,
                            name_eng: geometry.properties.name_eng,
                            ID_1: geometry.properties.code,
                            code: geometry.properties.code,
                            base_year: geometry.properties.base_year
                        },
                        geometry: geometry, // Keep original TopoJSON geometry for conversion
                        geometryIndex: index // Store index for TopoJSON conversion
                    }))
                };
                
                console.log("Region data loaded from Django successfully", this.regionData.provinces);
            } else {
                throw new Error("Invalid TopoJSON structure in API response");
            }
            
        } catch (error) {
            console.error("Error loading region data from Django:", error);
            // Fallback to original method if needed
            await this.loadRegionDataFallback();
        }
    }

    // Load provinces GeoJSON from Django API
    async loadProvincesFromDjango() {
        try {
            const response = await fetch('/dashboard/kaidashboard/tourism/api/provinces/geojson/');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.provincesGeoJSON = await response.json();
            console.log("Provinces GeoJSON loaded from Django successfully");
        } catch (error) {
            console.error("Failed to load province GeoJSON data from Django:", error);
            // Fallback to external JSON if needed
            await this.loadProvincesFallback();
        }
    }

    // Fallback method to load from external JSON (original method)
    async loadRegionDataFallback() {
        try {
            const provincesResponse = await fetch("data/skorea-provinces-2018-topo-simple.json");
            const provincesTopoJson = await provincesResponse.json();
            this.regionData.provinces = this.topojsonToGeoJson(provincesTopoJson, "skorea_provinces_2018_geo");
            
            console.log("Region data loaded from fallback successfully");
        } catch (error) {
            console.error("Error loading fallback region data:", error);
            throw error;
        }
    }

    // Fallback method for GeoJSON (original method)
    async loadProvincesFallback() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/southkorea/southkorea-maps/refs/heads/master/gadm/json/skorea-provinces-geo.json');
            this.provincesGeoJSON = await response.json();
            console.log("Provinces GeoJSON loaded from external source successfully");
        } catch (error) {
            console.error("Failed to load province GeoJSON data from external source:", error);
            // Try local data
            try {
                const localResponse = await fetch("data/skorea-provinces-2018-geo.json");
                this.provincesGeoJSON = await localResponse.json();
                console.log("Local provinces GeoJSON loaded successfully");
            } catch (localError) {
                console.error("Failed to load local province data:", localError);
            }
        }
    }

    // Rest of your existing methods remain the same...
    populateProvinceDropdown() {
    const provinceSelect = document.getElementById("provinceSelect");
    
    if (!provinceSelect) {
        console.error("Province select element not found");
        return;
    }
    
    // Clear existing options
    provinceSelect.innerHTML = "<option value=\"\">Select Province...</option>";

    let provinces = [];

    // Extract provinces from the regionData
    if (this.regionData.provinces && this.regionData.provinces.features) {
        provinces = this.regionData.provinces.features.map(feature => ({
            name: feature.properties.name,
            name_eng: feature.properties.name_eng,
            code: feature.properties.code,
            // Use English name as value for easier handling, but show both
            value: feature.properties.name_eng || feature.properties.name,
            display: `${feature.properties.name_eng} (${feature.properties.name})`
        }));
    } else {
        console.error("No province data available for dropdown population.", this.regionData);
        return;
    }

    // Remove duplicates based on code and sort by English name
    const uniqueProvinces = provinces.filter((province, index, self) => 
        index === self.findIndex(p => p.code === province.code)
    ).sort((a, b) => (a.name_eng || a.name).localeCompare(b.name_eng || b.name));

    // Populate dropdown
    uniqueProvinces.forEach(province => {
        const option = document.createElement("option");
        option.value = province.value;
        option.textContent = province.display;
        // Store additional data as data attributes
        option.dataset.code = province.code;
        option.dataset.nameKor = province.name;
        option.dataset.nameEng = province.name_eng;
        provinceSelect.appendChild(option);
    });

    console.log("Province dropdown populated with", uniqueProvinces.length, "provinces:", uniqueProvinces);
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

     provinceSelect?.addEventListener("change", (e) => {
        const selectedOption = e.target.selectedOptions[0];
        const provinceName = e.target.value;
        
        if (selectedOption && provinceName) {
            // Get additional data from the selected option
            const provinceCode = selectedOption.dataset.code;
            const nameKor = selectedOption.dataset.nameKor;
            const nameEng = selectedOption.dataset.nameEng;
            
            // Store selected region info
            this.selectedRegion.province = {
                name: provinceName,
                nameKor: nameKor,
                nameEng: nameEng,
                code: provinceCode
            };
            
            console.log("Selected province:", this.selectedRegion.province);
            
            // Show selected province on map
            this.showProvince(provinceName);
        } else {
            // Clear selection when no province is selected
            this.selectedRegion.province = null;
            this.clearProvinceSelection();
        }
        
        this.updateSelectedInfo();
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

    updateSelectedInfo() {
    const selectedProvinceEl = document.getElementById("selectedProvince");
    if (selectedProvinceEl) {
        if (this.selectedRegion.province) {
            // Show both English and Korean names
            const displayName = typeof this.selectedRegion.province === 'object' 
                ? `${this.selectedRegion.province.nameEng} (${this.selectedRegion.province.nameKor})`
                : this.selectedRegion.province;
            selectedProvinceEl.textContent = displayName;
        } else {
            selectedProvinceEl.textContent = "Select Province...";
        }
    }

    }

     topojsonToGeoJson(topology, objectName) {
        // Simple TopoJSON to GeoJSON converter
        // You might want to use a proper library like topojson-client for complex conversions
        
        if (!topology.objects || !topology.objects[objectName]) {
            console.error("Invalid TopoJSON structure");
            return null;
        }
        
        const geometries = topology.objects[objectName].geometries;
        
        return {
            type: "FeatureCollection",
            features: geometries.map(geom => ({
                type: "Feature",
                properties: geom.properties,
                geometry: geom // Note: This is simplified - real TopoJSON conversion is more complex
            }))
        };
    }

    // Convert a single TopoJSON feature to proper GeoJSON format
    convertTopoJSONFeatureToGeoJSON(feature, topologyData) {
        try {
            if (!feature || !feature.geometry || !topologyData) {
                console.error("Invalid feature or topology data");
                return null;
            }

            // Get the transform data from TopoJSON
            const transform = topologyData.transform;
            const arcs = topologyData.arcs;

            if (!arcs || !transform) {
                console.error("Missing arcs or transform in topology data");
                return null;
            }

            // Convert TopoJSON arc indices to coordinates
            const convertArcs = (arcIndices) => {
                const coordinates = [];
                
                arcIndices.forEach(arcIndex => {
                    const isReversed = arcIndex < 0;
                    const realIndex = isReversed ? ~arcIndex : arcIndex;
                    
                    if (arcs[realIndex]) {
                        let arcCoords = arcs[realIndex].map(point => [
                            point[0] * transform.scale[0] + transform.translate[0],
                            point[1] * transform.scale[1] + transform.translate[1]
                        ]);
                        
                        if (isReversed) {
                            arcCoords = arcCoords.reverse();
                        }
                        
                        coordinates.push(...arcCoords);
                    }
                });
                
                return coordinates;
            };

            let geoJSONGeometry;

            if (feature.geometry.type === "Polygon") {
                const coordinates = feature.geometry.arcs.map(ring => convertArcs(ring));
                geoJSONGeometry = {
                    type: "Polygon",
                    coordinates: coordinates
                };
            } else if (feature.geometry.type === "MultiPolygon") {
                const coordinates = feature.geometry.arcs.map(polygon => 
                    polygon.map(ring => convertArcs(ring))
                );
                geoJSONGeometry = {
                    type: "MultiPolygon",
                    coordinates: coordinates
                };
            } else {
                console.error("Unsupported geometry type:", feature.geometry.type);
                return null;
            }

            return {
                type: "Feature",
                properties: feature.properties,
                geometry: geoJSONGeometry
            };
        } catch (error) {
            console.error("Error converting TopoJSON to GeoJSON:", error);
            return null;
        }
    }

    // Show selected province on the map
    showProvince(provinceName) {
        try {
            // Clear previous province layer if exists
            if (this.provinceLayer) {
                this.map.removeLayer(this.provinceLayer);
                this.provinceLayer = null;
            }

            // Find the province feature in the data
            let provinceFeature = null;
            
            // First try to find in provincesGeoJSON (fallback data)
            if (this.provincesGeoJSON && this.provincesGeoJSON.features) {
                provinceFeature = this.provincesGeoJSON.features.find(feature => 
                    feature.properties.NAME_ENG === provinceName ||
                    feature.properties.name_eng === provinceName ||
                    feature.properties.NAME_1 === provinceName ||
                    feature.properties.name === provinceName
                );
                console.log("Found province in fallback GeoJSON data");
            }
            
            // If not found, try to convert from TopoJSON
            if (!provinceFeature && this.regionData.provinces && this.regionData.provinces.features && this.topoJsonData) {
                const rawFeature = this.regionData.provinces.features.find(feature => 
                    feature.properties.NAME_ENG === provinceName ||
                    feature.properties.name_eng === provinceName ||
                    feature.properties.NAME_1 === provinceName ||
                    feature.properties.name === provinceName
                );
                
                if (rawFeature && window.topojson) {
                    // Use topojson-client library for proper conversion
                    try {
                        const geoJson = topojson.feature(this.topoJsonData, this.topoJsonData.objects.skorea_provinces_2018_geo);
                        
                        // Find the specific province in the converted GeoJSON
                        provinceFeature = geoJson.features.find(feature => 
                            feature.properties.name_eng === provinceName ||
                            feature.properties.NAME_ENG === provinceName ||
                            feature.properties.name === provinceName ||
                            feature.properties.NAME_1 === provinceName
                        );
                        console.log("Found province using TopoJSON conversion");
                    } catch (conversionError) {
                        console.error("Error converting TopoJSON:", conversionError);
                    }
                } else if (rawFeature) {
                    console.log("TopoJSON client not available, trying manual conversion");
                    // Fallback to manual conversion
                    provinceFeature = this.convertTopoJSONFeatureToGeoJSON(rawFeature, this.topoJsonData);
                }
            }

            if (provinceFeature) {
                console.log("Found province feature:", provinceFeature);
                
                // Create a Leaflet GeoJSON layer for the province
                this.provinceLayer = L.geoJSON(provinceFeature, {
                    style: {
                        fillColor: '#ff7800',
                        weight: 2,
                        opacity: 1,
                        color: '#ffffff',
                        dashArray: '3',
                        fillOpacity: 0.5
                    },
                    onEachFeature: (feature, layer) => {
                        // Add popup with province information
                        const provinceName = feature.properties.name_eng || feature.properties.NAME_ENG || feature.properties.name || feature.properties.NAME_1;
                        const provinceNameKor = feature.properties.name || feature.properties.NAME_1;
                        
                        layer.bindPopup(`
                            <div style="text-align: center;">
                                <h3>${provinceName}</h3>
                                <p>${provinceNameKor}</p>
                            </div>
                        `);
                    }
                }).addTo(this.map);

                // Zoom to the province bounds
                this.map.fitBounds(this.provinceLayer.getBounds(), {
                    padding: [20, 20]
                });

                console.log(`Showing province: ${provinceName}`);
            } else {
                console.error(`Province not found: ${provinceName}`);
                console.log("Available provinces:", this.regionData.provinces?.features?.map(f => ({
                    name: f.properties.name,
                    name_eng: f.properties.name_eng
                })));
                this.showError(`Province "${provinceName}" not found in map data.`);
            }
        } catch (error) {
            console.error('Error showing province:', error);
            this.showError('Error displaying selected province on map.');
        }
    }

    // Clear province selection from map
    clearProvinceSelection() {
        if (this.provinceLayer) {
            this.map.removeLayer(this.provinceLayer);
            this.provinceLayer = null;
        }
        
        // Reset map view to Korea
        this.map.setView(this.koreaCenter, this.defaultZoom);
    }

    // Highlight province on hover (optional enhancement)
    highlightProvince(provinceName) {
        // This could be used for hover effects if needed
        if (this.provinceLayer) {
            this.provinceLayer.setStyle({
                fillColor: '#ffaa00',
                fillOpacity: 0.7
            });
        }
    }

    // Reset province highlight (optional enhancement)
    resetProvinceHighlight() {
        if (this.provinceLayer) {
            this.provinceLayer.setStyle({
                fillColor: '#ff7800',
                fillOpacity: 0.5
            });
        }
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

}

