# Hotel Date Selection Integration Guide

## 📋 Overview
This guide explains how to integrate the hotel date selection modal with your map markers.

## 🎯 What This Does
1. When a hotel marker is clicked and user clicks "Select Hotel"
2. A small modal appears showing available dates from your trip
3. User selects which date they'll stay at this hotel
4. Hotel is saved with the specific date
5. Already booked dates are marked/disabled to prevent double-booking

## 📦 Files Created
- `hotel_date_selection_modal.html` - The date selection modal

## 🔧 Integration Steps

### Step 1: Include the Modal in Your Main Page
Add this line to your main page (where hotel markers are displayed):

```django
{% include 'dashboard/tourism/korean_tourism/modals/hotel_date_selection_modal.html' %}
```

### Step 2: Modify Your Hotel Marker Click Handler

Find where you handle hotel marker clicks (usually in a map initialization file or hotel marker code) and modify the "Select Hotel" button/action:

**BEFORE:**
```javascript
// Old code that directly selects hotel
selectHotelButton.addEventListener('click', function() {
    selectedHotels.push(hotelData);
    marker.setSelected(true);
    popup.remove();
});
```

**AFTER:**
```javascript
// New code that shows date selection modal
selectHotelButton.addEventListener('click', function() {
    // Close the hotel info popup first
    if (popup) popup.remove();
    
    // Show the date selection modal
    window.showHotelDateSelection(hotelData, marker);
});
```

### Step 3: Data Structure
The modal will save hotels to `window.selectedHotelsData` with this structure:

```javascript
{
    id: "hotel_123",
    name: "Hotel Name",
    address: "Hotel Address",
    lat: 37.5665,
    lng: 126.9780,
    // ... other hotel properties ...
    stayDate: "2025-10-20",        // Date user will stay
    dayNumber: 3,                   // Which day of the trip (Day 3)
    savedAt: "2025-10-17T10:30:00Z" // When this was selected
}
```

## 🎨 Features

### ✅ Date Validation
- Only shows dates within your selected trip range
- Marks already booked dates as disabled
- Shows which hotel is already booked for each date

### ✅ Visual Feedback
- Shows "Day X" labels for each date
- Displays trip duration at top of modal
- Updates marker to show day number when confirmed

### ✅ Duplicate Prevention
- Prevents booking same date twice
- Shows warning if date is already taken
- Allows updating an existing hotel's date

## 📊 Available Functions

### `window.showHotelDateSelection(hotelData, marker)`
Opens the date selection modal for a specific hotel.

**Parameters:**
- `hotelData` - Object containing hotel information
- `marker` (optional) - Map marker to update after selection

**Example:**
```javascript
window.showHotelDateSelection({
    id: 'hotel_123',
    name: 'Grand Hotel',
    address: '123 Main St',
    lat: 37.5665,
    lng: 126.9780
}, markerInstance);
```

### `window.getSelectedHotelsWithDates()`
Returns array of all selected hotels with their dates.

**Example:**
```javascript
const hotels = window.getSelectedHotelsWithDates();
console.log(`You have ${hotels.length} hotels booked`);
hotels.forEach(hotel => {
    console.log(`${hotel.name} on Day ${hotel.dayNumber}`);
});
```

### `window.validateHotelSchedule()`
Checks if all days in the trip have hotels assigned.

**Example:**
```javascript
const validation = window.validateHotelSchedule();
if (validation.valid) {
    console.log('✅ All days have hotels!');
} else {
    console.log(`❌ ${validation.message}`);
}
```

## 🔔 Events

### `hotelWithDateSelected`
Fired when a hotel is successfully booked with a date.

**Listen to it:**
```javascript
window.addEventListener('hotelWithDateSelected', function(event) {
    const { hotel, date, dayNumber, totalSelected } = event.detail;
    console.log(`${hotel.name} booked for Day ${dayNumber}`);
    console.log(`Total hotels: ${totalSelected}`);
    
    // Update your UI, refresh lists, etc.
});
```

## 🎯 Example: Complete Integration

```javascript
// In your map initialization or hotel marker code

function createHotelMarker(hotelData) {
    const marker = new mapboxgl.Marker()
        .setLngLat([hotelData.lng, hotelData.lat])
        .addTo(map);
    
    const popup = new mapboxgl.Popup()
        .setHTML(`
            <div class="hotel-popup">
                <h6>${hotelData.name}</h6>
                <p>${hotelData.address}</p>
                <button class="btn btn-primary btn-sm" id="selectHotelBtn">
                    Select Hotel
                </button>
            </div>
        `);
    
    marker.setPopup(popup);
    
    // When popup opens, bind the select button
    popup.on('open', function() {
        const selectBtn = document.getElementById('selectHotelBtn');
        if (selectBtn) {
            selectBtn.addEventListener('click', function() {
                // Close popup
                popup.remove();
                
                // Show date selection modal
                window.showHotelDateSelection(hotelData, marker);
            });
        }
    });
    
    return marker;
}

// Listen for successful bookings
window.addEventListener('hotelWithDateSelected', function(event) {
    const { hotel, date, dayNumber, totalSelected } = event.detail;
    
    // Update your hotel list UI
    updateHotelListDisplay();
    
    // Check if schedule is complete
    const validation = window.validateHotelSchedule();
    if (validation.valid) {
        showCompletionMessage();
    }
});

function updateHotelListDisplay() {
    const hotels = window.getSelectedHotelsWithDates();
    const listElement = document.getElementById('selectedHotelsList');
    
    listElement.innerHTML = hotels.map(hotel => `
        <div class="hotel-item">
            <strong>Day ${hotel.dayNumber}:</strong> ${hotel.name}
            <br>
            <small>${new Date(hotel.stayDate).toLocaleDateString()}</small>
        </div>
    `).join('');
}
```

## ⚠️ Prerequisites

Make sure you have:
1. ✅ Bootstrap 5 (for modal functionality)
2. ✅ DateTime modal with saved start/end dates
3. ✅ `window.selectedDateTimeData` or `window.selectedDatetimeData` exists
4. ✅ Font Awesome (for icons) - optional but recommended
5. ✅ SweetAlert2 (for nice alerts) - optional, falls back to regular alerts

## 🎨 Customization

### Change Modal Size
In `hotel_date_selection_modal.html`, modify:
```css
#hotelDateModal .modal-sm {
    max-width: 400px; /* Change this value */
}
```

### Change Colors
Modify the gradient colors in the CSS:
```css
#hotelDateModal .modal-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    /* Change to your brand colors */
}
```

### Customize Date Format
In the `formatDate` function:
```javascript
const options = { 
    weekday: 'short',  // Mon, Tue, Wed...
    month: 'short',    // Jan, Feb, Mar...
    day: 'numeric',    // 1, 2, 3...
    year: 'numeric'    // 2025
};
```

## 🐛 Troubleshooting

### Modal doesn't appear
1. Check console for errors
2. Verify datetime modal has been used to select dates first
3. Check that Bootstrap 5 is loaded
4. Verify `window.showHotelDateSelection` function exists

### No dates in dropdown
1. Ensure `window.selectedDateTimeData` exists
2. Check console for "Please select your travel dates first" alert
3. Verify start and end dates are set

### Dates not being saved
1. Check console for "Hotel added with date" message
2. Verify `window.selectedHotelsData` array exists
3. Check browser console for any JavaScript errors

## 📝 Testing Checklist

- [ ] Datetime modal can be opened and dates saved
- [ ] Hotel date modal includes the small modal file
- [ ] Clicking hotel marker shows date selection modal
- [ ] Modal shows all dates between start and end
- [ ] Selecting date and clicking Confirm saves the hotel
- [ ] Already booked dates show as disabled
- [ ] Success message appears after booking
- [ ] `hotelWithDateSelected` event fires
- [ ] Can book all days of the trip
- [ ] `validateHotelSchedule()` works correctly

## 🚀 Next Steps

After integration:
1. Test the complete flow from datetime selection to hotel booking
2. Add visual feedback on your map for booked hotels
3. Create a summary view showing all booked hotels by day
4. Add ability to change/remove hotel dates
5. Save to backend/database for persistence

## 📞 Support

If you encounter issues:
1. Check browser console for error messages
2. Verify all prerequisites are met
3. Test datetime selection modal first
4. Check that hotel data has required fields (id, name, lat, lng)
