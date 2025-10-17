# DateTime Storage - Usage Guide

## Overview
The datetime storage system automatically saves start and end datetime when the Apply button in the modal is clicked. The data is stored in both `window` object and `localStorage` for persistence.

---

## How It Works

### 1. User Selects Dates in Modal
- User opens the datetime modal
- Selects start date & time
- Selects end date & time
- Clicks "Apply" button

### 2. Data is Saved Automatically
The system saves the following data:

```javascript
{
    startDateTime: "2025-10-20 09:00",
    endDateTime: "2025-10-23 18:00",
    startDate: "2025-10-20",
    endDate: "2025-10-23",
    startTime: "09:00",
    endTime: "18:00",
    duration: {
        days: 3,
        hours: 81,
        text: "3 days"
    },
    savedAt: "2025-10-17T10:30:00.000Z"
}
```

### 3. Data is Available Globally

The data is stored in multiple places for easy access:

1. **Window Object** (immediate access):
   ```javascript
   window.selectedDateTimeData
   window.selectedDatetimeData  // Backward compatibility
   ```

2. **LocalStorage** (persists across page refreshes):
   ```javascript
   localStorage.getItem('tripDateTimeData')
   ```

---

## Accessing Stored Data

### Method 1: Direct Access
```javascript
// Get the stored data
const dateTimeData = window.selectedDateTimeData;

if (dateTimeData) {
    console.log('Start Date:', dateTimeData.startDate);        // "2025-10-20"
    console.log('End Date:', dateTimeData.endDate);            // "2025-10-23"
    console.log('Start Time:', dateTimeData.startTime);        // "09:00"
    console.log('End Time:', dateTimeData.endTime);            // "18:00"
    console.log('Duration:', dateTimeData.duration.text);      // "3 days"
    console.log('Duration (days):', dateTimeData.duration.days); // 3
}
```

### Method 2: Using Global Function
```javascript
// Use the helper function
const dateTimeData = window.getStoredDatetimeData();

if (dateTimeData) {
    console.log('Trip duration:', dateTimeData.duration.text);
}
```

---

## Checking if Data Exists

```javascript
// Check if datetime is stored
if (window.selectedDateTimeData) {
    console.log('✅ DateTime data is available');
    console.log('Duration:', window.selectedDateTimeData.duration.text);
} else {
    console.log('❌ No datetime data stored');
    alert('Please select your travel dates first!');
}
```

---

## Using in Your Code

### Example 1: Validate Before Hotel Selection
```javascript
function selectHotel(hotel) {
    // Check if dates are selected
    const dateTimeData = window.selectedDateTimeData;
    
    if (!dateTimeData) {
        alert('Please select your travel dates first!');
        return;
    }
    
    // Calculate how many hotels can be selected
    const tripDuration = dateTimeData.duration.days;
    console.log(`Trip is ${tripDuration} days, can select ${tripDuration} hotels`);
    
    // Proceed with hotel selection...
}
```

### Example 2: Display Trip Summary
```javascript
function showTripSummary() {
    const dateTimeData = window.selectedDateTimeData;
    
    if (!dateTimeData) {
        return 'No dates selected';
    }
    
    return `
        Trip: ${dateTimeData.startDate} to ${dateTimeData.endDate}
        Duration: ${dateTimeData.duration.text}
        Start Time: ${dateTimeData.startTime}
        End Time: ${dateTimeData.endTime}
    `;
}
```

### Example 3: Calculate Days Array
```javascript
function getTripDays() {
    const dateTimeData = window.selectedDateTimeData;
    
    if (!dateTimeData) return [];
    
    const days = [];
    const start = new Date(dateTimeData.startDate);
    const end = new Date(dateTimeData.endDate);
    
    const current = new Date(start);
    let dayNumber = 1;
    
    while (current <= end) {
        days.push({
            date: current.toISOString().split('T')[0],
            dayNumber: dayNumber,
            label: `Day ${dayNumber}`
        });
        current.setDate(current.getDate() + 1);
        dayNumber++;
    }
    
    return days;
}

// Usage:
const days = getTripDays();
// [
//   { date: "2025-10-20", dayNumber: 1, label: "Day 1" },
//   { date: "2025-10-21", dayNumber: 2, label: "Day 2" },
//   { date: "2025-10-22", dayNumber: 3, label: "Day 3" }
// ]
```

---

## Listening to Changes

You can listen for datetime updates using custom events:

```javascript
// Listen for datetime updates
window.addEventListener('datetimeRangeUpdated', function(event) {
    console.log('DateTime was updated!', event.detail);
    
    const data = event.detail;
    console.log('New start date:', data.startDate);
    console.log('New end date:', data.endDate);
    console.log('Duration:', data.duration.text);
    
    // Update your UI or perform actions
    updateHotelOptions();
    refreshItinerary();
});

// Listen for clearing
window.addEventListener('datetimeRangeCleared', function() {
    console.log('DateTime was cleared');
    // Reset your UI
});
```

---

## Clearing Stored Data

```javascript
// Clear all stored datetime data
window.clearDatetimeData();

// This will:
// 1. Remove from window.selectedDateTimeData
// 2. Remove from window.selectedDatetimeData
// 3. Remove from localStorage
// 4. Dispatch 'datetimeRangeCleared' event
```

---

## Data Persistence

### Automatic Loading
The data is automatically loaded from localStorage when:
- Page loads
- Page refreshes
- User returns to the site

```javascript
// On page load, this happens automatically:
document.addEventListener('DOMContentLoaded', function() {
    // Data is loaded from localStorage
    // Form fields are populated if data exists
    const data = window.getStoredDatetimeData();
    if (data) {
        console.log('Loaded saved trip:', data.duration.text);
    }
});
```

---

## Integration with Step Process

The datetime data automatically integrates with the step process:

```javascript
// stepProcess.js automatically updates when datetime changes
window.addEventListener('datetimeRangeUpdated', function(e) {
    // tripData is automatically updated
    // Duration badge is updated
    // Step 2 is marked as completed
});
```

---

## Console Messages

When datetime is saved/loaded, you'll see these console messages:

- `✅ DateTime data saved successfully:` - Data was saved
- `📅 DateTime data loaded from storage:` - Data was loaded on page load
- `DateTime range updated:` - Event was dispatched
- `🗑️ DateTime data cleared` - Data was cleared

---

## Common Use Cases

### Use Case 1: Hotel Selection Limit
```javascript
const dateTimeData = window.selectedDateTimeData;
const maxHotels = dateTimeData ? dateTimeData.duration.days : 0;

if (selectedHotels.length >= maxHotels) {
    alert(`You can only select ${maxHotels} hotels for your ${maxHotels}-day trip`);
}
```

### Use Case 2: Date Range Picker
```javascript
const dateTimeData = window.selectedDateTimeData;

if (dateTimeData) {
    $('#datepicker').datepicker({
        minDate: new Date(dateTimeData.startDate),
        maxDate: new Date(dateTimeData.endDate)
    });
}
```

### Use Case 3: API Request
```javascript
async function fetchHotels() {
    const dateTimeData = window.selectedDateTimeData;
    
    if (!dateTimeData) {
        alert('Please select dates first');
        return;
    }
    
    const response = await fetch('/api/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            startDate: dateTimeData.startDate,
            endDate: dateTimeData.endDate,
            duration: dateTimeData.duration.days
        })
    });
    
    return await response.json();
}
```

---

## Debugging

### Check if data is stored:
```javascript
console.log('Window:', window.selectedDateTimeData);
console.log('LocalStorage:', localStorage.getItem('tripDateTimeData'));
```

### Check if modal is working:
```javascript
// After clicking Apply button, check console for:
// "✅ DateTime data saved successfully:"
```

### Test the event:
```javascript
window.addEventListener('datetimeRangeUpdated', function(e) {
    console.log('Event received!', e.detail);
});
```

---

## Summary

**Key Points:**
1. ✅ Data is automatically saved when Apply button is clicked
2. ✅ Data persists across page refreshes (localStorage)
3. ✅ Data is available globally via `window.selectedDateTimeData`
4. ✅ Events are dispatched for reactive updates
5. ✅ Includes helper functions for easy access
6. ✅ Automatically calculates duration in days/hours

**Main Access Pattern:**
```javascript
const data = window.selectedDateTimeData;
if (data) {
    // Use data.startDate, data.endDate, data.duration.days, etc.
}
```

That's it! The datetime storage system is ready to use. 🚀
