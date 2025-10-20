/**
 * Debug script to check if all required DOM elements exist for hotel fetching
 */

function debugStepProcessElements() {
    console.log('🔍 Debugging step process DOM elements...');
    
    const requiredElements = [
        'Hotel',           // Hotel button
        'hotels-container', // Hotels container
        'hotels-count'     // Hotels count badge
    ];
    
    const optionalElements = [
        'horizontal-hotel-overlay', // Horizontal overlay (may not exist initially)
    ];
    
    console.log('\n📋 Required Elements Check:');
    let allRequiredExist = true;
    
    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`✅ ${id}: Found`, element);
        } else {
            console.error(`❌ ${id}: NOT FOUND`);
            allRequiredExist = false;
        }
    });
    
    console.log('\n📋 Optional Elements Check:');
    optionalElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`✅ ${id}: Found`, element);
        } else {
            console.warn(`⚠️ ${id}: Not found (may be created dynamically)`);
        }
    });
    
    console.log('\n📋 Global Functions Check:');
    const requiredFunctions = [
        'showHorizontalHotelOverlay',
        'initializeHorizontalScrollOverlay',
        'getRandomHotelImage'
    ];
    
    requiredFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`✅ window.${funcName}: Available`);
        } else {
            console.warn(`⚠️ window.${funcName}: Not available`);
        }
    });
    
    console.log('\n📋 Global Data Check:');
    if (window.selectedProvinceData) {
        console.log('✅ window.selectedProvinceData: Available', window.selectedProvinceData);
    } else {
        console.warn('⚠️ window.selectedProvinceData: Not set (select a province first)');
    }
    
    console.log('\n📋 Summary:');
    if (allRequiredExist) {
        console.log('✅ All required DOM elements found!');
        console.log('🎯 fetchHotelsForStepProcess should work without null pointer errors');
    } else {
        console.error('❌ Missing required DOM elements!');
        console.log('🚨 fetchHotelsForStepProcess may encounter errors');
    }
    
    return {
        allRequiredExist,
        requiredElements: requiredElements.map(id => ({
            id,
            exists: !!document.getElementById(id)
        })),
        hasProvinceData: !!window.selectedProvinceData
    };
}

// Auto-run when script loads
if (typeof window !== 'undefined') {
    console.log('Step process debug script loaded. Run debugStepProcessElements() to check DOM.');
    
    // Also add this as a window function for easy access
    window.debugStepProcessElements = debugStepProcessElements;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { debugStepProcessElements };
}