// Trip Planning Step Process
document.addEventListener('DOMContentLoaded', function() {
    let currentStep = 1;
    const totalSteps = 4;
    let tripData = {
        destination: '',
        startDate: '',
        endDate: '',
        duration: '',
        interests: [],
        budget: ''
    };

    // Initialize step process
    function initStepProcess() {
        updateStepDisplay();
        updateNavigation();
        updateProgressBar();
        
        // Event listeners
        document.getElementById('nextStep')?.addEventListener('click', handleNextStep);
        document.getElementById('prevStep')?.addEventListener('click', handlePrevStep);
        document.getElementById('generateItineraryBtn')?.addEventListener('click', handleGenerateItinerary);
        
        // Form field listeners
        document.getElementById('provinceSelect')?.addEventListener('change', handleDestinationChange);
        document.getElementById('startDateTime')?.addEventListener('change', handleDateChange);
        document.getElementById('endDateTime')?.addEventListener('change', handleDateChange);
        document.getElementById('budgetRange')?.addEventListener('change', handleBudgetChange);
        
        // Interest checkboxes
        const interestCheckboxes = document.querySelectorAll('.interest-tags input[type="checkbox"]');
        interestCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', handleInterestChange);
        });
        
        console.log('Trip planning step process initialized');
    }

    // Handle destination change
    function handleDestinationChange() {
        const destination = document.getElementById('provinceSelect')?.value || '';
        tripData.destination = destination;
        updateSummary();
        
        if (destination) {
            markStepCompleted(1);
        }
    }

    // Handle date changes
    function handleDateChange() {
        const startDate = document.getElementById('startDateTime')?.value || '';
        const endDate = document.getElementById('endDateTime')?.value || '';
        
        tripData.startDate = startDate;
        tripData.endDate = endDate;
        
        if (startDate && endDate) {
            const duration = calculateDuration(startDate, endDate);
            tripData.duration = duration;
            
            // Update duration display
            const durationElement = document.getElementById('tripDuration');
            if (durationElement) {
                durationElement.textContent = `Duration: ${duration}`;
                durationElement.className = 'badge bg-success';
            }
            
            markStepCompleted(2);
        }
        
        updateSummary();
    }

    // Handle interest changes
    function handleInterestChange() {
        const selectedInterests = Array.from(document.querySelectorAll('.interest-tags input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        
        tripData.interests = selectedInterests;
        updateSummary();
        
        // Check if step 3 should be marked as completed
        if (selectedInterests.length > 0 && tripData.budget) {
            markStepCompleted(3);
        }
    }

    // Handle budget change
    function handleBudgetChange() {
        const budget = document.getElementById('budgetRange')?.value || '';
        tripData.budget = budget;
        updateSummary();
        
        // Check if step 3 should be marked as completed
        if (tripData.interests.length > 0 && budget) {
            markStepCompleted(3);
        }
    }

    // Calculate duration between dates
    function calculateDuration(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            return '1 day';
        } else if (diffDays < 7) {
            return `${diffDays} days`;
        } else {
            const weeks = Math.floor(diffDays / 7);
            const remainingDays = diffDays % 7;
            if (remainingDays === 0) {
                return weeks === 1 ? '1 week' : `${weeks} weeks`;
            } else {
                return `${weeks} week${weeks > 1 ? 's' : ''} ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
            }
        }
    }

    // Handle next step
    function handleNextStep() {
        if (validateCurrentStep()) {
            if (currentStep < totalSteps) {
                currentStep++;
                updateStepDisplay();
                updateNavigation();
                updateProgressBar();
            }
        }
    }

    // Handle previous step
    function handlePrevStep() {
        if (currentStep > 1) {
            currentStep--;
            updateStepDisplay();
            updateNavigation();
            updateProgressBar();
        }
    }

    // Validate current step
    function validateCurrentStep() {
        switch (currentStep) {
            case 1:
                if (!tripData.destination) {
                    showValidationError('Please select a destination before proceeding.');
                    return false;
                }
                break;
            case 2:
                if (!tripData.startDate || !tripData.endDate) {
                    showValidationError('Please select both start and end dates.');
                    return false;
                }
                break;
            case 3:
                if (tripData.interests.length === 0) {
                    showValidationError('Please select at least one interest.');
                    return false;
                }
                if (!tripData.budget) {
                    showValidationError('Please select a budget range.');
                    return false;
                }
                break;
        }
        return true;
    }

    // Show validation error
    function showValidationError(message) {
        // You can integrate with your notification system here
        alert(message);
    }

    // Update step display
    function updateStepDisplay() {
        // Hide all step forms
        document.querySelectorAll('.step-form').forEach(form => {
            form.style.display = 'none';
        });
        
        // Remove active class from all steps
        document.querySelectorAll('.step-item').forEach(step => {
            step.classList.remove('active');
        });
        
        // Show current step form and mark as active
        const currentStepElement = document.querySelector(`.step-item[data-step="${currentStep}"]`);
        const currentStepForm = document.getElementById(`step${currentStep}-form`);
        
        if (currentStepElement) {
            currentStepElement.classList.add('active');
        }
        
        if (currentStepForm) {
            currentStepForm.style.display = 'block';
        }
        
        // Update step number display
        const stepNumberElement = document.getElementById('currentStepNumber');
        if (stepNumberElement) {
            stepNumberElement.textContent = currentStep;
        }
    }

    // Mark step as completed
    function markStepCompleted(stepNumber) {
        const stepElement = document.querySelector(`.step-item[data-step="${stepNumber}"]`);
        if (stepElement) {
            stepElement.classList.add('completed');
        }
    }

    // Update navigation buttons
    function updateNavigation() {
        const prevBtn = document.getElementById('prevStep');
        const nextBtn = document.getElementById('nextStep');
        
        if (prevBtn) {
            prevBtn.style.display = currentStep > 1 ? 'block' : 'none';
        }
        
        if (nextBtn) {
            if (currentStep === totalSteps) {
                nextBtn.style.display = 'none';
            } else {
                nextBtn.style.display = 'block';
                nextBtn.innerHTML = `Next <i class="fas fa-chevron-right"></i>`;
            }
        }
    }

    // Update progress bar
    function updateProgressBar() {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            const progressPercentage = (currentStep / totalSteps) * 100;
            progressBar.style.width = `${progressPercentage}%`;
        }
    }

    // Update summary display
    function updateSummary() {
        const summaryElements = {
            destination: document.getElementById('summaryDestination'),
            duration: document.getElementById('summaryDuration'),
            interests: document.getElementById('summaryInterests'),
            budget: document.getElementById('summaryBudget')
        };
        
        if (summaryElements.destination) {
            summaryElements.destination.textContent = tripData.destination || 'Not selected';
        }
        
        if (summaryElements.duration) {
            summaryElements.duration.textContent = tripData.duration || 'Not set';
        }
        
        if (summaryElements.interests) {
            const interestText = tripData.interests.length > 0 
                ? tripData.interests.join(', ') 
                : 'None selected';
            summaryElements.interests.textContent = interestText;
        }
        
        if (summaryElements.budget) {
            const budgetLabels = {
                'budget': 'Budget (₩50,000-100,000/day)',
                'mid': 'Mid-range (₩100,000-300,000/day)',
                'luxury': 'Luxury (₩300,000+/day)'
            };
            summaryElements.budget.textContent = budgetLabels[tripData.budget] || 'Not set';
        }
    }

    // Handle generate itinerary
    function handleGenerateItinerary() {
        if (validateAllSteps()) {
            console.log('Generating itinerary with data:', tripData);
            
            // Emit custom event for integration with other parts of the app
            const generateEvent = new CustomEvent('generateItinerary', {
                detail: tripData
            });
            document.dispatchEvent(generateEvent);
            
            // Show success message
            const btn = document.getElementById('generateItineraryBtn');
            if (btn) {
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> Generating...';
                btn.disabled = true;
                
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-magic"></i> Itinerary Generated!';
                    btn.classList.remove('btn-success');
                    btn.classList.add('btn-info');
                    
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.classList.remove('btn-info');
                        btn.classList.add('btn-success');
                        btn.disabled = false;
                    }, 3000);
                }, 2000);
            }
        }
    }

    // Validate all steps
    function validateAllSteps() {
        if (!tripData.destination) {
            showValidationError('Please complete Step 1: Select a destination');
            return false;
        }
        if (!tripData.startDate || !tripData.endDate) {
            showValidationError('Please complete Step 2: Select travel dates');
            return false;
        }
        if (tripData.interests.length === 0 || !tripData.budget) {
            showValidationError('Please complete Step 3: Set your preferences');
            return false;
        }
        return true;
    }

    // Public methods for external integration
    window.tripStepProcess = {
        goToStep: function(stepNumber) {
            if (stepNumber >= 1 && stepNumber <= totalSteps) {
                currentStep = stepNumber;
                updateStepDisplay();
                updateNavigation();
                updateProgressBar();
            }
        },
        
        getCurrentStep: function() {
            return currentStep;
        },
        
        getTripData: function() {
            return { ...tripData };
        },
        
        setTripData: function(data) {
            tripData = { ...tripData, ...data };
            updateSummary();
        }
    };

    // Initialize when DOM is ready
    initStepProcess();
});

// Listen for custom events
document.addEventListener('generateItinerary', function(e) {
    console.log('Generate itinerary event received:', e.detail);
    // Integration point for your itinerary generation system
});

// Integration with region modal
document.addEventListener('itemSelected', function(e) {
    const { type, name, region } = e.detail;
    console.log(`Item selected in step process: ${type} - ${name} from ${region}`);
    
    // Update trip data based on selection
    if (window.tripStepProcess && region) {
        const currentData = window.tripStepProcess.getTripData();
        if (!currentData.destination) {
            window.tripStepProcess.setTripData({ destination: region });
            document.getElementById('provinceSelect').value = region;
        }
    }
});