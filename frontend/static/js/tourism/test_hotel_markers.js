/**
 * Test script to verify hotel map markers are working in step process
 */

function testHotelMapMarkers() {
    console.log('🧪 Testing hotel map markers integration...');
    
    // Check if Leaflet is available
    if (typeof window.L === 'undefined') {
        console.error('❌ Leaflet (L) is not available. Map markers cannot be created.');
        return;
    }
    
    // Check if map instance is available
    const mapInstance = getMapInstanceForStep();
    if (!mapInstance) {
        console.error('❌ Map instance not found. Available map objects:', {
            'window.displayMap': !!window.displayMap,
            'window.map': !!window.map,
            'window.displayMapInstance': !!window.displayMapInstance
        });
        return;
    }
    
    console.log('✅ Map instance found:', mapInstance);
    
    // Check if province data is available
    if (!window.selectedProvinceData) {
        console.warn('⚠️ No province data available. Setting mock data for testing...');
        
        // Set mock province data
        window.selectedProvinceData = {
            lat: 37.5665,
            lon: 126.9780,
            properties: {
                name: 'Seoul',
                place_id: 'test_place_123'
            }
        };
    }
    
    console.log('✅ Province data available:', window.selectedProvinceData);
    
    // Create test hotels
    const testHotels = [
        {
            id: 'test-marker-1',
            name: 'Test Hotel 1',
            rating: 4.5,
            price: '$150',
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
            address: 'Test Address 1',
            amenities: ['WiFi', 'Pool', 'Spa'],
            description: 'Test hotel description 1',
            lat: 37.5665 + 0.005,
            lon: 126.9780 + 0.005
        },
        {
            id: 'test-marker-2',
            name: 'Test Hotel 2',
            rating: 4.2,
            price: '$120',
            image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
            address: 'Test Address 2',
            amenities: ['WiFi', 'Gym', 'Restaurant'],
            description: 'Test hotel description 2',
            lat: 37.5665 - 0.005,
            lon: 126.9780 - 0.005
        }
    ];
    
    console.log('🧪 Creating test hotel markers...');
    
    try {
        // Test the marker creation function
        addHotelMarkersToMapFromStep(testHotels);
        
        // Check if markers were created
        if (window.hotelMarkers && window.hotelMarkers.length > 0) {
            console.log(`✅ Successfully created ${window.hotelMarkers.length} test hotel markers`);
            
            // Test marker interaction
            setTimeout(() => {
                console.log('🧪 Testing marker popup...');
                if (window.hotelMarkers[0]) {
                    window.hotelMarkers[0].openPopup();
                    console.log('✅ First marker popup opened');
                }
            }, 2000);
            
            // Test highlighting
            setTimeout(() => {
                console.log('🧪 Testing marker highlighting...');
                highlightHotelInStepList('test-marker-1');
            }, 4000);
            
        } else {
            console.error('❌ No hotel markers were created');
        }
        
    } catch (error) {
        console.error('❌ Error creating test markers:', error);
    }
    
    // Summary
    console.log('\n📋 Test Summary:');
    console.log('- Leaflet available:', typeof window.L !== 'undefined');
    console.log('- Map instance available:', !!mapInstance);
    console.log('- Province data available:', !!window.selectedProvinceData);
    console.log('- Hotel markers created:', window.hotelMarkers?.length || 0);
    
    return {
        leafletAvailable: typeof window.L !== 'undefined',
        mapInstanceAvailable: !!mapInstance,
        provinceDataAvailable: !!window.selectedProvinceData,
        markersCreated: window.hotelMarkers?.length || 0
    };
}

// Function to clear test markers
function clearTestMarkers() {
    console.log('🧹 Clearing test markers...');
    
    const mapInstance = getMapInstanceForStep();
    if (!mapInstance) {
        console.warn('No map instance available to clear markers');
        return;
    }
    
    if (window.hotelMarkers && Array.isArray(window.hotelMarkers)) {
        window.hotelMarkers.forEach(marker => {
            mapInstance.removeLayer(marker);
        });
        window.hotelMarkers = [];
        console.log('✅ Test markers cleared');
    } else {
        console.log('No markers to clear');
    }
}

// Function to test map bounds fitting
function testMapBoundsForHotels() {
    console.log('🧪 Testing map bounds for hotels...');
    
    const mapInstance = getMapInstanceForStep();
    if (!mapInstance || !window.hotelMarkers || window.hotelMarkers.length === 0) {
        console.warn('Map instance or markers not available for bounds test');
        return;
    }
    
    try {
        // Create a bounds object to include all markers
        const group = window.L.featureGroup(window.hotelMarkers);
        mapInstance.fitBounds(group.getBounds(), {
            padding: [20, 20],
            maxZoom: 12
        });
        
        console.log('✅ Map bounds fitted to include all hotel markers');
    } catch (error) {
        console.error('❌ Error fitting map bounds:', error);
    }
}

// Export functions for testing
if (typeof window !== 'undefined') {
    window.testHotelMapMarkers = testHotelMapMarkers;
    window.clearTestMarkers = clearTestMarkers;
    window.testMapBoundsForHotels = testMapBoundsForHotels;
    
    console.log('Hotel map markers test functions loaded:');
    console.log('- testHotelMapMarkers(): Test marker creation');
    console.log('- clearTestMarkers(): Clear test markers');
    console.log('- testMapBoundsForHotels(): Test map bounds fitting');
}