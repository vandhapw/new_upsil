// Test Hotel Markers for Step Process
// Run this in browser console to test hotel and attraction functionality

function testStepProcessHotels() {
    console.log('🧪 Testing Step Process Hotel Functionality...');
    
    // Test data
    const testHotels = [
        {
            id: 'test-hotel-1',
            name: 'Grand Seoul Hotel',
            rating: 4.5,
            price: '$180',
            address: 'Jung-gu, Seoul',
            location: 'Downtown Seoul',
            amenities: ['WiFi', 'Pool', 'Spa', 'Gym'],
            description: 'Luxury hotel in the heart of Seoul',
            latitude: 37.5665,
            longitude: 126.9780,
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'
        },
        {
            id: 'test-hotel-2',
            name: 'Busan Beach Resort',
            rating: 4.2,
            price: '$120',
            address: 'Haeundae-gu, Busan',
            location: 'Haeundae Beach',
            amenities: ['WiFi', 'Beach Access', 'Restaurant'],
            description: 'Beautiful beachfront resort',
            latitude: 35.1588,
            longitude: 129.1603,
            image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'
        }
    ];
    
    // Set up test province data if not available
    if (!window.selectedProvinceData) {
        window.selectedProvinceData = {
            properties: {
                place_id: 'test-province',
                name: 'Test Province',
                lat: 37.5665,
                lon: 126.9780
            },
            lat: 37.5665,
            lon: 126.9780
        };
        console.log('✅ Set up test province data');
    }
    
    // Test functions
    console.log('1. Testing displayHotelsInStepProcess...');
    try {
        if (typeof displayHotelsInStepProcess === 'function') {
            displayHotelsInStepProcess(testHotels);
            console.log('✅ displayHotelsInStepProcess executed');
        } else {
            console.error('❌ displayHotelsInStepProcess function not found');
        }
    } catch (error) {
        console.error('❌ Error in displayHotelsInStepProcess:', error);
    }
    
    setTimeout(() => {
        console.log('2. Testing map instance...');
        try {
            if (typeof getMapInstanceForStep === 'function') {
                const mapInstance = getMapInstanceForStep();
                if (mapInstance) {
                    console.log('✅ Map instance found:', mapInstance);
                } else {
                    console.error('❌ Map instance not found');
                }
            } else {
                console.error('❌ getMapInstanceForStep function not found');
            }
        } catch (error) {
            console.error('❌ Error getting map instance:', error);
        }
        
        console.log('3. Testing horizontal overlay...');
        const overlay = document.getElementById('horizontal-hotel-overlay');
        if (overlay) {
            console.log('✅ Horizontal overlay found:', overlay);
            console.log('- Display style:', overlay.style.display);
            
            const scroller = overlay.querySelector('#scroller');
            if (scroller) {
                console.log('✅ Scroller found with', scroller.children.length, 'hotel cards');
            } else {
                console.error('❌ Scroller not found in overlay');
            }
        } else {
            console.error('❌ Horizontal overlay not found');
        }
        
        console.log('4. Testing map markers...');
        if (window.hotelMarkers && Array.isArray(window.hotelMarkers)) {
            console.log('✅ Hotel markers array found with', window.hotelMarkers.length, 'markers');
        } else {
            console.error('❌ Hotel markers array not found or empty');
        }
        
        console.log('🏁 Hotel test completed. Check above for any errors.');
    }, 1000);
}

function testStepProcessAttractions() {
    console.log('🧪 Testing Step Process Attractions Functionality...');
    
    // Test data
    const testAttractions = [
        {
            id: 'test-attraction-1',
            name: 'Gyeongbokgung Palace',
            rating: 4.6,
            price: 'Free',
            address: 'Jongno-gu, Seoul',
            location: 'Historic Seoul',
            amenities: ['Scenic Views', 'Photo Opportunities', 'Guided Tours'],
            description: 'Beautiful historic palace with traditional architecture',
            latitude: 37.5797,
            longitude: 126.9770,
            category: 'Historical Site',
            image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d89b05?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'
        },
        {
            id: 'test-attraction-2',
            name: 'Haeundae Beach',
            rating: 4.3,
            price: 'Free',
            address: 'Haeundae-gu, Busan',
            location: 'Busan Coast',
            amenities: ['Beach Access', 'Water Sports', 'Restaurants'],
            description: 'Popular beach destination with beautiful views',
            latitude: 35.1588,
            longitude: 129.1603,
            category: 'Beach',
            image: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'
        }
    ];
    
    // Set up test province data if not available
    if (!window.selectedProvinceData) {
        window.selectedProvinceData = {
            properties: {
                place_id: 'test-province',
                name: 'Test Province',
                lat: 37.5665,
                lon: 126.9780
            },
            lat: 37.5665,
            lon: 126.9780
        };
        console.log('✅ Set up test province data');
    }
    
    // Test functions
    console.log('1. Testing displayAttractionsInStepProcess...');
    try {
        if (typeof displayAttractionsInStepProcess === 'function') {
            displayAttractionsInStepProcess(testAttractions);
            console.log('✅ displayAttractionsInStepProcess executed');
        } else {
            console.error('❌ displayAttractionsInStepProcess function not found');
        }
    } catch (error) {
        console.error('❌ Error in displayAttractionsInStepProcess:', error);
    }
    
    setTimeout(() => {
        console.log('2. Testing attraction map instance...');
        try {
            if (typeof getMapInstanceForAttractionStep === 'function') {
                const mapInstance = getMapInstanceForAttractionStep();
                if (mapInstance) {
                    console.log('✅ Map instance found:', mapInstance);
                } else {
                    console.error('❌ Map instance not found');
                }
            } else {
                console.error('❌ getMapInstanceForAttractionStep function not found');
            }
        } catch (error) {
            console.error('❌ Error getting map instance:', error);
        }
        
        console.log('3. Testing horizontal attraction overlay...');
        const overlay = document.getElementById('horizontal-attraction-overlay');
        if (overlay) {
            console.log('✅ Horizontal attraction overlay found:', overlay);
            console.log('- Display style:', overlay.style.display);
            
            const scroller = overlay.querySelector('#scroller');
            if (scroller) {
                console.log('✅ Scroller found with', scroller.children.length, 'attraction cards');
            } else {
                console.error('❌ Scroller not found in overlay');
            }
        } else {
            console.error('❌ Horizontal attraction overlay not found');
        }
        
        console.log('4. Testing attraction map markers...');
        if (window.attractionMarkers && Array.isArray(window.attractionMarkers)) {
            console.log('✅ Attraction markers array found with', window.attractionMarkers.length, 'markers');
        } else {
            console.error('❌ Attraction markers array not found or empty');
        }
        
        console.log('🏁 Attractions test completed. Check above for any errors.');
    }, 1000);
}

// Function to clear test data
function clearTestHotels() {
    console.log('🧹 Clearing test hotels...');
    
    // Hide overlay
    const overlay = document.getElementById('horizontal-hotel-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    // Clear markers
    if (window.hotelMarkers && Array.isArray(window.hotelMarkers)) {
        const mapInstance = getMapInstanceForStep();
        if (mapInstance) {
            window.hotelMarkers.forEach(marker => {
                mapInstance.removeLayer(marker);
            });
        }
        window.hotelMarkers = [];
    }
    
    // Reset hotel button
    const hotelBtn = document.getElementById('Hotel');
    if (hotelBtn) {
        hotelBtn.innerHTML = 'Choose Hotels <i class="fa-solid fa-hotel"></i>';
        hotelBtn.className = 'btn btn-outline-primary';
    }
    
    console.log('✅ Test hotel data cleared');
}

// Function to clear test attractions
function clearTestAttractions() {
    console.log('🧹 Clearing test attractions...');
    
    // Hide overlay
    const overlay = document.getElementById('horizontal-attraction-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    // Clear markers
    if (window.attractionMarkers && Array.isArray(window.attractionMarkers)) {
        const mapInstance = getMapInstanceForAttractionStep();
        if (mapInstance) {
            window.attractionMarkers.forEach(marker => {
                mapInstance.removeLayer(marker);
            });
        }
        window.attractionMarkers = [];
    }
    
    // Reset attraction button
    const attractionBtn = document.getElementById('Attraction');
    if (attractionBtn) {
        attractionBtn.innerHTML = 'Choose Attractions <i class="fa-solid fa-map-marker-alt"></i>';
        attractionBtn.className = 'btn btn-outline-primary';
    }
    
    console.log('✅ Test attraction data cleared');
}

// Function to test both hotels and attractions
function testBothStepProcessFeatures() {
    console.log('🧪 Testing Both Hotels and Attractions...');
    
    // Test hotels first
    testStepProcessHotels();
    
    // Test attractions after a delay
    setTimeout(() => {
        testStepProcessAttractions();
    }, 2000);
}

// Make functions available globally
window.testStepProcessHotels = testStepProcessHotels;
window.testStepProcessAttractions = testStepProcessAttractions;
window.testBothStepProcessFeatures = testBothStepProcessFeatures;
window.clearTestHotels = clearTestHotels;
window.clearTestAttractions = clearTestAttractions;

console.log('🧪 Test functions loaded. Available functions:');
console.log('- testStepProcessHotels() - Test hotel functionality');
console.log('- testStepProcessAttractions() - Test attraction functionality');
console.log('- testBothStepProcessFeatures() - Test both features');
console.log('- clearTestHotels() - Clear hotel test data');
console.log('- clearTestAttractions() - Clear attraction test data');