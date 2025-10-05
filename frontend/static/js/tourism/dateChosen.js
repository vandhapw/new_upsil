// South Korea Interactive Map Application
class dateChosen {
    constructor() {        
        this.init();
    }

    init() {
        console.log("Date Chosen functionality initialized");
        this.initializeDateTimePickers();
    }

    // Initialize datetime pickers with proper settings
    initializeDateTimePickers() {
        // Wait for jQuery and datetimepicker to be available
        if (typeof $ !== 'undefined' && $.fn.datetimepicker) {
            this.setupDateTimePickers();
        } else {
            // Retry after a short delay
            setTimeout(() => this.initializeDateTimePickers(), 100);
        }
    }

    // Setup datetime pickers
    setupDateTimePickers() {
        const self = this;
        
        // Initialize start datetime picker
        $('#startDateTime').datetimepicker({
            format: 'Y-m-d H:i',
            minDate: 0,
            step: 30,
            onShow: function() {
                const endValue = $('#endDateTime').val();
                if (endValue) {
                    this.setOptions({
                        maxDate: endValue
                    });
                }
            },
            onChangeDateTime: function() {
                self.validateAndUpdateEndDateMin();
            }
        });
        
        // Initialize end datetime picker
        $('#endDateTime').datetimepicker({
            format: 'Y-m-d H:i',
            minDate: 0,
            step: 30,
            onShow: function() {
                const startValue = $('#startDateTime').val();
                if (startValue) {
                    this.setOptions({
                        minDate: startValue
                    });
                }
            }
        });
    }

    // Update end date minimum when start date changes
    validateAndUpdateEndDateMin() {
        const startDateTime = $('#startDateTime').val();
        if (startDateTime) {
            $('#endDateTime').datetimepicker('setOptions', {
                minDate: startDateTime
            });
        }
    }

    // Set start datetime programmatically
    setStartDateTime(dateTimeString) {
        const startInput = document.getElementById('startDateTime');
        if (startInput) {
            startInput.value = dateTimeString;
            $(startInput).trigger('change');
        }
    }

    // Set end datetime programmatically
    setEndDateTime(dateTimeString) {
        const endInput = document.getElementById('endDateTime');
        if (endInput) {
            endInput.value = dateTimeString;
            $(endInput).trigger('change');
        }
    }

    // Get start date and time from datetime picker
    getStartDateTime() {
        const startDateTimeInput = document.getElementById('startDateTime');
        if (!startDateTimeInput || !startDateTimeInput.value) {
            return null;
        }
        return startDateTimeInput.value; // Returns in YYYY-MM-DD HH:MM format
    }

    // Get end date and time from datetime picker
    getEndDateTime() {
        const endDateTimeInput = document.getElementById('endDateTime');
        if (!endDateTimeInput || !endDateTimeInput.value) {
            return null;
        }
        return endDateTimeInput.value; // Returns in YYYY-MM-DD HH:MM format
    }

    // Get start date only (extracted from datetime)
    getStartDate() {
        const startDateTime = this.getStartDateTime();
        if (!startDateTime) {
            return null;
        }
        return startDateTime.split(' ')[0]; // Returns in YYYY-MM-DD format
    }

    // Get end date only (extracted from datetime)
    getEndDate() {
        const endDateTime = this.getEndDateTime();
        if (!endDateTime) {
            return null;
        }
        return endDateTime.split(' ')[0]; // Returns in YYYY-MM-DD format
    }

    // Get start time only (extracted from datetime)
    getStartTime() {
        const startDateTime = this.getStartDateTime();
        if (!startDateTime) {
            return '09:00'; // Default start time
        }
        const timePart = startDateTime.split(' ')[1];
        return timePart || '09:00'; // Returns in HH:MM format
    }

    // Get end time only (extracted from datetime)
    getEndTime() {
        const endDateTime = this.getEndDateTime();
        if (!endDateTime) {
            return '18:00'; // Default end time
        }
        const timePart = endDateTime.split(' ')[1];
        return timePart || '18:00'; // Returns in HH:MM format
    }

// Get all date and time information at once
getAllDateTimeInfo() {
    return {
        startDateTime: this.getStartDateTime(),
        endDateTime: this.getEndDateTime(),
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
    const startDateTime = this.getStartDateTime();
    const endDateTime = this.getEndDateTime();
    
    // Check if both datetime fields have values
    if (!startDateTime || !endDateTime) {
        return false;
    }
    
    return this.validateDateRange();
}

// Additional validation method for new datetime format
isDateTimeValid() {
    return this.hasValidDateTime();
}

// Get current date in YYYY-MM-DD format
getCurrentDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Set minimum date for datetime pickers
setMinimumDate() {
    const today = this.getCurrentDate();
    const startInput = document.getElementById('startDateTime');
    const endInput = document.getElementById('endDateTime');
    
    if (startInput) {
        startInput.setAttribute('min', today);
    }
    if (endInput) {
        endInput.setAttribute('min', today);
    }
}

// Validate date range
validateDateRange() {
    const startDateTime = this.getStartDateTime();
    const endDateTime = this.getEndDateTime();
    
    if (!startDateTime || !endDateTime) {
        return false;
    }
    
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    const now = new Date();
    
    // Check if start datetime is not in the past
    if (start < now) {
        return false;
    }
    
    // Check if end datetime is after start datetime
    if (end <= start) {
        return false;
    }
    
    return true;
}
}

document.addEventListener("DOMContentLoaded", () => {
    window.dateChosenInstance = new dateChosen();
});

