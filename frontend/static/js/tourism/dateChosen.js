// South Korea Interactive Map Application
class dateChosen {
    constructor() {        
        this.init();
    }

    init() {
        console.log("Date Chosen functionality initialized");
        // You can add date picker initialization or validation setup here if needed
    }

    // Get start date
    getStartDate() {
        const startDateInput = document.getElementById('startDate');
        if (!startDateInput || !startDateInput.value) {
            return null;
        }
        return startDateInput.value; // Returns in YYYY-MM-DD format
    }

    // Get end date
    getEndDate() {
        const endDateInput = document.getElementById('endDate');
        if (!endDateInput || !endDateInput.value) {
            return null;
        }
        return endDateInput.value; // Returns in YYYY-MM-DD format
    }

// Get start time
getStartTime() {
    const startTimeInput = document.getElementById('startTime');
    if (!startTimeInput || !startTimeInput.value) {
        return '09:00'; // Default start time
    }
    return startTimeInput.value; // Returns in HH:MM format
}

// Get end time
getEndTime() {
    const endTimeInput = document.getElementById('endTime');
    if (!endTimeInput || !endTimeInput.value) {
        return '18:00'; // Default end time
    }
    return endTimeInput.value; // Returns in HH:MM format
}

// Get all date and time information at once
getAllDateTimeInfo() {
    return {
        startDate: this.getStartDate(),
        endDate: this.getEndDate(),
        startTime: this.getStartTime(),
        endTime: this.getEndTime(),
        isValid: this.validateDateRange()
    };
}

// Get formatted date and time for display
getFormattedDateTimeInfo() {
    const info = this.getAllDateTimeInfo();
    
    if (!info.startDate || !info.endDate) {
        return null;
    }
    
    const startDate = new Date(info.startDate);
    const endDate = new Date(info.endDate);
    
    return {
        startDate: info.startDate,
        endDate: info.endDate,
        startTime: info.startTime,
        endTime: info.endTime,
        startDateFormatted: startDate.toLocaleDateString(),
        endDateFormatted: endDate.toLocaleDateString(),
        duration: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)),
        isValid: info.isValid
    };
}

// Validate if all required fields are filled
hasValidDateTime() {
    const startDate = this.getStartDate();
    const endDate = this.getEndDate();
    
    if (!startDate || !endDate) {
        return false;
    }
    
    return this.validateDateRange();
}

// Validate date range
validateDateRange() {
    const startDate = this.getStartDate();
    const endDate = this.getEndDate();
    
    if (!startDate || !endDate) {
        return false;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if start date is not in the past
    if (start < today) {
        return false;
    }
    
    // Check if end date is after start date
    if (end <= start) {
        return false;
    }
    
    return true;
}
}

