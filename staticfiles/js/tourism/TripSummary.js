class TripSummary {
    constructor() {
        this.tripData = {
            province: null,
            startDate: null,
            endDate: null,
            currentLocation: null,
            attractions: [],
            hotels: [],
            restaurants: []
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSavedTripData();
    }

    setupEventListeners() {
        // Show trip summary modal
        const showTripBtn = document.getElementById('showTripSummary');
        showTripBtn?.addEventListener('click', () => {
            this.showTripSummaryModal();
        });

        // Save trip summary
        const saveTripBtn = document.getElementById('saveTripSummary');
        saveTripBtn?.addEventListener('click', () => {
            this.saveTripData();
        });

        // Share trip summary
        const shareTripBtn = document.getElementById('shareTripSummary');
        shareTripBtn?.addEventListener('click', () => {
            this.shareTripData();
        });

        // Listen for province changes
        const provinceSelect = document.getElementById('provinceSelect');
        provinceSelect?.addEventListener('change', (e) => {
            this.updateProvince(e.target.value);
        });

        // Listen for date changes
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        startDateInput?.addEventListener('change', (e) => {
            this.updateStartDate(e.target.value);
        });
        
        endDateInput?.addEventListener('change', (e) => {
            this.updateEndDate(e.target.value);
        });
    }

    // Update trip data methods
    updateProvince(province) {
        this.tripData.province = province;
        this.saveTripData();
        console.log('Province updated:', province);
    }

    updateStartDate(startDate) {
        this.tripData.startDate = startDate;
        this.saveTripData();
        console.log('Start date updated:', startDate);
    }

    updateEndDate(endDate) {
        this.tripData.endDate = endDate;
        this.saveTripData();
        console.log('End date updated:', endDate);
    }

    updateCurrentLocation(location) {
        this.tripData.currentLocation = location;
        this.saveTripData();
    }

    updateAttractions(attractions) {
        this.tripData.attractions = attractions || [];
        this.saveTripData();
    }

    updateHotels(hotels) {
        this.tripData.hotels = hotels || [];
        this.saveTripData();
    }

    updateRestaurants(restaurants) {
        this.tripData.restaurants = restaurants || [];
        this.saveTripData();
    }

    // Show trip summary modal
    showTripSummaryModal() {
        this.updateModalContent();
        
        // Show modal (Bootstrap 5)
        const modal = new bootstrap.Modal(document.getElementById('tripSummaryModal'));
        modal.show();
    }

    // Update modal content with current trip data
    updateModalContent() {
        // Update province
        const modalProvince = document.getElementById('modalProvince');
        modalProvince.textContent = this.tripData.province || 'Not selected';

        // Update dates
        const modalStartDate = document.getElementById('modalStartDate');
        const modalEndDate = document.getElementById('modalEndDate');
        const modalDuration = document.getElementById('modalDuration');

        if (this.tripData.startDate) {
            modalStartDate.textContent = new Date(this.tripData.startDate).toLocaleDateString();
        } else {
            modalStartDate.textContent = 'Not selected';
        }

        if (this.tripData.endDate) {
            modalEndDate.textContent = new Date(this.tripData.endDate).toLocaleDateString();
        } else {
            modalEndDate.textContent = 'Not selected';
        }

        // Calculate and display duration
        if (this.tripData.startDate && this.tripData.endDate) {
            const start = new Date(this.tripData.startDate);
            const end = new Date(this.tripData.endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            modalDuration.textContent = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
        } else {
            modalDuration.textContent = 'Not calculated';
        }

        // Update current location
        const modalCurrentLocation = document.getElementById('modalCurrentLocation');
        const locationSection = document.getElementById('locationSection');
        
        if (this.tripData.currentLocation) {
            const [lat, lng] = this.tripData.currentLocation;
            modalCurrentLocation.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            locationSection.style.display = 'block';
        } else {
            locationSection.style.display = 'none';
        }

        // Update statistics
        document.getElementById('attractionsCount').textContent = this.tripData.attractions.length;
        document.getElementById('hotelsCount').textContent = this.tripData.hotels.length;
        document.getElementById('restaurantsCount').textContent = this.tripData.restaurants.length;
    }

    // Save trip data to localStorage
    saveTripData() {
        try {
            localStorage.setItem('southKoreaTripData', JSON.stringify(this.tripData));
            console.log('Trip data saved successfully');
        } catch (error) {
            console.error('Error saving trip data:', error);
        }
    }

    // Load saved trip data from localStorage
    loadSavedTripData() {
        try {
            const savedData = localStorage.getItem('southKoreaTripData');
            if (savedData) {
                this.tripData = { ...this.tripData, ...JSON.parse(savedData) };
                console.log('Trip data loaded successfully');
            }
        } catch (error) {
            console.error('Error loading trip data:', error);
        }
    }

    // Share trip data
    shareTripData() {
        const shareText = this.generateShareText();
        
        if (navigator.share) {
            // Use Web Share API if available
            navigator.share({
                title: 'My South Korea Trip Plan',
                text: shareText,
                url: window.location.href
            }).catch(err => console.log('Error sharing:', err));
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                alert('Trip summary copied to clipboard!');
            }).catch(err => {
                console.error('Error copying to clipboard:', err);
                // Show the text in a new window as final fallback
                const newWindow = window.open();
                newWindow.document.write(`<pre>${shareText}</pre>`);
            });
        }
    }

    // Generate share text
    generateShareText() {
        let text = '🇰🇷 My South Korea Trip Plan\n\n';
        
        if (this.tripData.province) {
            text += `📍 Destination: ${this.tripData.province}\n`;
        }
        
        if (this.tripData.startDate && this.tripData.endDate) {
            const start = new Date(this.tripData.startDate).toLocaleDateString();
            const end = new Date(this.tripData.endDate).toLocaleDateString();
            text += `📅 Dates: ${start} - ${end}\n`;
        }
        
        if (this.tripData.attractions.length > 0) {
            text += `🎯 Attractions: ${this.tripData.attractions.length} found\n`;
        }
        
        if (this.tripData.hotels.length > 0) {
            text += `🏨 Hotels: ${this.tripData.hotels.length} available\n`;
        }
        
        text += '\nPlanned using South Korea Interactive Map 🗺️';
        
        return text;
    }

    // Get current trip data
    getTripData() {
        return { ...this.tripData };
    }

    // Clear trip data
    clearTripData() {
        this.tripData = {
            province: null,
            startDate: null,
            endDate: null,
            currentLocation: null,
            attractions: [],
            hotels: [],
            restaurants: []
        };
        this.saveTripData();
    }
}

window.TripSummary = TripSummary;