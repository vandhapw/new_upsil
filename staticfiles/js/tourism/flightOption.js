// South Korea Interactive Map Application
class flightOption {
    // Add these methods to your SouthKoreaMapApp class

// Show flight search modal
showFlightSearchModal() {
    // Initialize modal if not already done
    this.initializeFlightModal();
    
    // Set default dates if trip dates are selected
    this.prefillFlightDates();
    
    // Show modal using Bootstrap
    const modal = new bootstrap.Modal(document.getElementById('flightSearchModal'));
    modal.show();
}

// Initialize flight modal functionality
initializeFlightModal() {
    if (this.flightModalInitialized) return;
    
    // Setup autocomplete for modal airport inputs
    this.setupModalAirportAutocomplete();
    
    // Setup other modal event listeners
    this.setupFlightModalEvents();
    
    this.flightModalInitialized = true;
}

// Setup autocomplete for modal airport inputs
setupModalAirportAutocomplete() {
    const modalSourceAirport = document.getElementById('modalSourceAirport');
    const modalTargetAirport = document.getElementById('modalTargetAirport');

    this.setupModalSingleAirportAutocomplete(modalSourceAirport, 'source');
    this.setupModalSingleAirportAutocomplete(modalTargetAirport, 'target');
}

// Setup autocomplete for a single modal airport input
setupModalSingleAirportAutocomplete(inputElement, type) {
    if (!inputElement) return;

    let selectedIndex = -1;

    inputElement.addEventListener('input', (e) => {
        selectedIndex = -1;
        const results = this.searchAirports(e.target.value);
        this.createModalAutocompleteDropdown(inputElement, results, type);
    });

    inputElement.addEventListener('keydown', (e) => {
        const dropdown = inputElement.parentElement.querySelector('.autocomplete-dropdown');
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
        setTimeout(() => {
            const dropdown = inputElement.parentElement.querySelector('.autocomplete-dropdown');
            if (dropdown) dropdown.remove();
        }, 200);
    });
}

// Create autocomplete dropdown for modal
createModalAutocompleteDropdown(inputElement, results, type) {
    // Remove existing dropdown
    const existingDropdown = inputElement.parentElement.querySelector('.autocomplete-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }

    if (results.length === 0) return;

    const dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown';

    results.forEach(airport => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        
        item.innerHTML = `
            <div><strong>${airport.name}</strong> (${airport.iata_code || airport.iata})</div>
            <div class="text-muted">${airport.city}, ${airport.country}</div>
        `;
        
        item.addEventListener('click', () => {
            inputElement.value = `${airport.name} (${airport.iata_code || airport.iata}) - ${airport.city}`;
            inputElement.dataset.selectedAirport = JSON.stringify(airport);
            
            // Update selected airports display
            this.updateSelectedAirportsDisplay(type, airport);
            
            dropdown.remove();
        });
        
        dropdown.appendChild(item);
    });

    // Position dropdown relative to input group
    inputElement.parentElement.style.position = 'relative';
    inputElement.parentElement.appendChild(dropdown);
}

// Update selected airports display
updateSelectedAirportsDisplay(type, airport) {
    const display = document.getElementById('selectedAirportsDisplay');
    
    if (type === 'source') {
        document.getElementById('selectedSourceName').textContent = airport.name;
        document.getElementById('selectedSourceCode').textContent = `${airport.iata_code || airport.iata} - ${airport.city}`;
    } else if (type === 'target') {
        document.getElementById('selectedTargetName').textContent = airport.name;
        document.getElementById('selectedTargetCode').textContent = `${airport.iata_code || airport.iata} - ${airport.city}`;
    }
    
    // Show display if both airports are selected
    const sourceInput = document.getElementById('modalSourceAirport');
    const targetInput = document.getElementById('modalTargetAirport');
    
    if (sourceInput.dataset.selectedAirport && targetInput.dataset.selectedAirport) {
        display.style.display = 'block';
        document.getElementById('searchFlightsBtn').disabled = false;
    } else {
        document.getElementById('searchFlightsBtn').disabled = true;
    }
}

// Setup flight modal events
setupFlightModalEvents() {
    // Trip type change
    const tripTypeInputs = document.querySelectorAll('input[name="tripType"]');
    tripTypeInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const returnDateField = document.getElementById('modalReturnDate');
            const returnDateGroup = returnDateField.closest('.form-group');
            
            if (e.target.value === 'round_trip') {
                returnDateGroup.style.display = 'block';
                returnDateField.required = true;
            } else {
                returnDateGroup.style.display = 'none';
                returnDateField.required = false;
                returnDateField.value = '';
            }
        });
    });

    // Search flights button
    const searchFlightsBtn = document.getElementById('searchFlightsBtn');
    searchFlightsBtn.addEventListener('click', () => {
        this.searchFlightsFromModal();
    });

    // Date validation
    const departureDate = document.getElementById('modalDepartureDate');
    const returnDate = document.getElementById('modalReturnDate');
    
    departureDate.addEventListener('change', () => {
        returnDate.min = departureDate.value;
        if (returnDate.value && returnDate.value <= departureDate.value) {
            returnDate.value = '';
        }
    });
}

// Prefill flight dates from trip dates
prefillFlightDates() {
    const tripStartDate = document.getElementById('startDate');
    const tripEndDate = document.getElementById('endDate');
    const modalDepartureDate = document.getElementById('modalDepartureDate');
    const modalReturnDate = document.getElementById('modalReturnDate');
    
    if (tripStartDate && tripStartDate.value) {
        modalDepartureDate.value = tripStartDate.value;
        modalDepartureDate.min = tripStartDate.value;
    } else {
        const today = new Date().toISOString().split('T')[0];
        modalDepartureDate.min = today;
    }
    
    if (tripEndDate && tripEndDate.value) {
        modalReturnDate.value = tripEndDate.value;
    }
}

// Search flights from modal
searchFlightsFromModal() {
    const sourceInput = document.getElementById('modalSourceAirport');
    const targetInput = document.getElementById('modalTargetAirport');
    const departureDate = document.getElementById('modalDepartureDate');
    const returnDate = document.getElementById('modalReturnDate');
    const tripType = document.querySelector('input[name="tripType"]:checked');
    const passengers = document.getElementById('modalPassengers');

    // Validate inputs
    if (!sourceInput.dataset.selectedAirport) {
        alert('Please select a source airport');
        sourceInput.focus();
        return;
    }

    if (!targetInput.dataset.selectedAirport) {
        alert('Please select a destination airport');
        targetInput.focus();
        return;
    }

    if (!departureDate.value) {
        alert('Please select a departure date');
        departureDate.focus();
        return;
    }

    if (tripType.value === 'round_trip' && !returnDate.value) {
        alert('Please select a return date for round trip');
        returnDate.focus();
        return;
    }

    // Get selected airports
    const sourceAirport = JSON.parse(sourceInput.dataset.selectedAirport);
    const targetAirport = JSON.parse(targetInput.dataset.selectedAirport);

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('flightSearchModal'));
    modal.hide();

    // Search flights using existing method
    this.searchFlightsWithDetails(sourceAirport, targetAirport, {
        departureDate: departureDate.value,
        returnDate: returnDate.value,
        tripType: tripType.value,
        passengers: parseInt(passengers.value)
    });
}

// Enhanced flight search with details
searchFlightsWithDetails(sourceAirport, targetAirport, searchDetails) {
    this.showLoading(true);
    
    try {
        // Search for flights in the data
        const flights = this.findFlights(sourceAirport.iata_code || sourceAirport.iata, targetAirport.iata_code || targetAirport.iata);
        
        if (flights.length === 0) {
            alert(`No flights found from ${sourceAirport.city} to ${targetAirport.city}`);
            return;
        }

        // Show enhanced flight results with search details
        this.showEnhancedFlightResults(flights, sourceAirport, targetAirport, searchDetails);
        
        console.log(`Found ${flights.length} flights from ${sourceAirport.iata_code || sourceAirport.iata} to ${targetAirport.iata_code || targetAirport.iata}`);
        
    } catch (error) {
        console.error("Error searching flights:", error);
        alert("Failed to search flights. Please try again.");
    } finally {
        this.showLoading(false);
    }
}

// Show enhanced flight results
showEnhancedFlightResults(flights, sourceAirport, targetAirport, searchDetails) {
    const resultsPanel = document.getElementById("resultsPanel");
    const resultsContent = document.getElementById("resultsContent");
    
    if (!resultsPanel || !resultsContent) return;

    const tripTypeText = searchDetails.tripType === 'round_trip' ? 'Round Trip' : 'One Way';
    const dateText = searchDetails.tripType === 'round_trip' 
        ? `${searchDetails.departureDate} - ${searchDetails.returnDate}`
        : searchDetails.departureDate;

    let html = `
        <div class="results-summary">
            <h4><i class="fas fa-plane"></i> Flight Search Results</h4>
            <div class="search-summary">
                <p><strong>Route:</strong> ${sourceAirport.city} → ${targetAirport.city}</p>
                <p><strong>Date(s):</strong> ${dateText}</p>
                <p><strong>Trip Type:</strong> ${tripTypeText}</p>
                <p><strong>Passengers:</strong> ${searchDetails.passengers}</p>
                <p><strong>Found:</strong> ${flights.length} flight option${flights.length > 1 ? 's' : ''}</p>
            </div>
        </div>
        <div class="results-list">
    `;

    flights.forEach((flight, index) => {
        const oneWayPrice = flight.prices.one_way * searchDetails.passengers;
        const roundTripPrice = flight.prices.round_trip * searchDetails.passengers;
        
        html += `
            <div class="result-item flight-item enhanced">
                <div class="flight-header">
                    <h5>
                        <i class="fas fa-plane-departure"></i> 
                        ${flight.origin.city} → ${flight.destination.city}
                    </h5>
                    <span class="flight-code">${flight.origin.id} → ${flight.destination.id}</span>
                </div>
                <div class="flight-details">
                    <div class="route-details">
                        <div class="origin-info">
                            <strong>${flight.origin.name}</strong><br>
                            <small>${flight.origin.city}</small>
                        </div>
                        <div class="flight-duration">
                            <i class="fas fa-plane"></i>
                            <small>Direct Flight</small>
                        </div>
                        <div class="destination-info">
                            <strong>${flight.destination.name}</strong><br>
                            <small>${flight.destination.city}</small>
                        </div>
                    </div>
                    <div class="price-details">
                        <div class="price-option">
                            <span class="price-label">One Way (${searchDetails.passengers} pax):</span>
                            <span class="price-value">$${oneWayPrice.toFixed(2)}</span>
                        </div>
                        <div class="price-option">
                            <span class="price-label">Round Trip (${searchDetails.passengers} pax):</span>
                            <span class="price-value">$${roundTripPrice.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                <div class="flight-actions">
                    <button class="btn btn-outline-primary" onclick="window.southKoreaMapApp.bookEnhancedFlight(${index}, 'one_way', ${JSON.stringify(searchDetails).replace(/"/g, '&quot;')})">
                        <i class="fas fa-ticket-alt"></i> Book One Way ($${oneWayPrice.toFixed(2)})
                    </button>
                    <button class="btn btn-primary" onclick="window.southKoreaMapApp.bookEnhancedFlight(${index}, 'round_trip', ${JSON.stringify(searchDetails).replace(/"/g, '&quot;')})">
                        <i class="fas fa-exchange-alt"></i> Book Round Trip ($${roundTripPrice.toFixed(2)})
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    resultsContent.innerHTML = html;
    resultsPanel.classList.add("show");
}

// Book enhanced flight
bookEnhancedFlight(flightIndex, tripType, searchDetails) {
    const sourceInput = document.getElementById('modalSourceAirport');
    const targetInput = document.getElementById('modalTargetAirport');
    
    if (!sourceInput.dataset.selectedAirport || !targetInput.dataset.selectedAirport) {
        alert('Airport information not found!');
        return;
    }

    const sourceAirport = JSON.parse(sourceInput.dataset.selectedAirport);
    const targetAirport = JSON.parse(targetInput.dataset.selectedAirport);
    const flights = this.findFlights(sourceAirport.iata_code || sourceAirport.iata, targetAirport.iata_code || targetAirport.iata);
    const flight = flights[flightIndex];
    
    if (!flight) {
        alert('Flight information not found!');
        return;
    }

    const basePrice = tripType === 'one_way' ? flight.prices.one_way : flight.prices.round_trip;
    const totalPrice = basePrice * searchDetails.passengers;
    
    // Create enhanced flight booking object
    const flightBooking = {
        id: `flight_${Date.now()}`,
        origin: flight.origin,
        destination: flight.destination,
        tripType: tripType,
        basePrice: basePrice,
        totalPrice: totalPrice,
        passengers: searchDetails.passengers,
        departureDate: searchDetails.departureDate,
        returnDate: searchDetails.returnDate,
        bookingDate: new Date()
    };

    // Save flight booking
    this.saveFlightBooking(flightBooking);

    // Show enhanced confirmation
    this.showEnhancedFlightBookingConfirmation(flightBooking);
}
}

document.addEventListener("DOMContentLoaded", () => {
    window.flightOption = new flightOption();
});

