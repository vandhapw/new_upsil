// Trip History Management
class TripHistoryManager {
    constructor() {
        this.historyData = [];
        this.isVisible = false;
        this.isExpanded = false;
        this.currentRowId = 1;
        
        // Load existing data from localStorage
        this.loadHistoryData();
        
        // Initialize UI
        this.initializeEventListeners();
        
        // Initialize container
        this.container = document.getElementById('tripHistoryContainer');
        this.tableBody = document.getElementById('tripHistoryTableBody');
        
        // Render existing data
        this.renderHistoryTable();
    }
    
    initializeEventListeners() {
        // Create new entry button
        document.getElementById('createNewEntryButton')?.addEventListener('click', () => {
            this.createNewEntry();
        });
        
        // Toggle visibility
        document.getElementById('toggleHistoryTable')?.addEventListener('click', () => {
            this.toggleVisibility();
        });
        
        // Clear all history
        document.getElementById('clearHistoryTable')?.addEventListener('click', () => {
            this.clearAllHistory();
        });
        
        // Export history
        document.getElementById('exportHistoryTable')?.addEventListener('click', () => {
            this.exportHistory();
        });
        
        // Header click to expand/collapse
        document.querySelector('.trip-history-header')?.addEventListener('click', (e) => {
            // Don't toggle if clicking on control buttons
            if (!e.target.closest('.trip-history-controls')) {
                this.toggleExpansion();
            }
        });
    }

    // Add this new method to the TripHistoryManager class
    displayRoutes(entryId) {
        const entry = this.historyData.find(e => e.id === entryId);
        // if (!entry) {
        //     alert('Trip entry not found!');
        //     return;
        // }

        // Get the map instance using multiple fallback methods
        let map = null;
        
        // Try multiple ways to get the map
        if (window.mapInstance && window.mapInstance.getMap) {
            map = window.mapInstance.getMap();
        } else if (window.displayMapInstance && window.displayMapInstance.getMap) {
            map = window.displayMapInstance.getMap();
        } else if (window.displayMap && window.displayMap.getMap) {
            map = window.displayMap.getMap();
        } else if (window.map) {
            map = window.map;
        }
        
        if (!map) {
            alert('Map not available. Please ensure the map is loaded.');
            return;
        }

        // Check if display_routes.js is loaded
        if (typeof displayRoutes === 'undefined') {
            console.error('display_routes.js not loaded');
            alert('Route display functionality not available. Please reload the page.');
            return;
        }

        // Show loading message
        if (typeof showLoading === 'function') {
            showLoading(`Loading route details for Trip Entry #${entryId}...`);
        }

        // Call the display routes function
        try {
            displayRoutes(entryId, map);
            
            // Hide loading after a short delay
            setTimeout(() => {
                if (typeof showLoading === 'function') {
                    showLoading(`Route details loaded for Trip Entry #${entryId}`, true);
                }
            }, 1000);

            console.log(`Route display initiated for trip entry ${entryId}`);
        } catch (error) {
            console.error('Error displaying routes:', error);
            alert('Failed to display routes. Please try again.');
        }
    }

    // Add method to clear route displays
    clearRouteDisplays() {
        // Get the map instance using multiple fallback methods
        let map = null;
        
        if (window.mapInstance && window.mapInstance.getMap) {
            map = window.mapInstance.getMap();
        } else if (window.displayMapInstance && window.displayMapInstance.getMap) {
            map = window.displayMapInstance.getMap();
        } else if (window.displayMap && window.displayMap.getMap) {
            map = window.displayMap.getMap();
        } else if (window.map) {
            map = window.map;
        }
        
        if (map && typeof clearRouteDisplay === 'function') {
            clearRouteDisplay(map);
        }
    }

    // Add method to display Gantt chart
    async displayGanttChart(entryId) {
        console.log(`Displaying Gantt chart for trip entry ID: ${entryId}`);
        
        // Check if gantt chart manager is available
        if (typeof ganttChartManager === 'undefined') {
            console.error('Gantt chart manager not loaded');
            alert('Gantt chart functionality not available. Please reload the page.');
            return;
        }

        // Show loading message
        if (typeof showLoading === 'function') {
            showLoading(`Loading Gantt chart for Trip Entry #${entryId}...`);
        }

        try {
            // Call the Gantt chart display function (now async)
            await ganttChartManager.displayGanttChart(entryId);
            
            console.log(`Gantt chart display completed for trip entry ${entryId}`);
        } catch (error) {
            console.error('Error displaying Gantt chart:', error);
            alert('Failed to display Gantt chart. Please try again.');
            
            // Hide loading on error
            if (typeof showLoading === 'function') {
                showLoading('Failed to load Gantt chart', true);
            }
        }
    }
    
    // Update or add trip entry (update existing row instead of creating new)
    updateTripEntry(tripData) {
        // Check if we have an existing entry to update
        let entry;
        let isNewEntry = false;
        
        if (this.historyData.length > 0) {
            // Update the most recent entry
            entry = this.historyData[0];
            entry.province = tripData.province || 'Not selected';
            entry.startDate = tripData.startDate || 'Not set';
            entry.startTime = tripData.startTime || 'Not set';
            entry.endDate = tripData.endDate || 'Not set';
            entry.endTime = tripData.endTime || 'Not set';
            entry.duration = this.calculateDuration(tripData.startDate, tripData.endDate);
            entry.hotels = tripData.hotels || [];
            entry.attractions = tripData.attractions || [];
            entry.timestamp = new Date().toISOString();
            entry.formattedTimestamp = new Date().toLocaleString();
        } else {
            // Create new entry if none exists
            entry = {
                id: this.currentRowId++,
                province: tripData.province || 'Not selected',
                startDate: tripData.startDate || 'Not set',
                startTime: tripData.startTime || 'Not set',
                endDate: tripData.endDate || 'Not set',
                endTime: tripData.endTime || 'Not set',
                duration: this.calculateDuration(tripData.startDate, tripData.endDate),
                hotels: tripData.hotels || [],
                attractions: tripData.attractions || [],
                timestamp: new Date().toISOString(),
                formattedTimestamp: new Date().toLocaleString()
            };
            this.historyData.unshift(entry);
            isNewEntry = true;
        }
        
        this.saveHistoryData();
        
        // Update the display
        if (isNewEntry) {
            this.appendRowToTable(entry, true);
            this.hideCurrentEntryIndicator();
        } else {
            this.updateRowInTable(entry);
            this.showCurrentEntryIndicator();
        }
        
        // Auto-show and expand table when entry is updated
        // if (!this.isVisible) {
        //     this.showTable();
        // }
        // if (!this.isExpanded) {
        //     this.expandTable();
        // }
        
        console.log('Trip entry updated:', entry);
        return entry;
    }
    
    // Create a new entry (forces new row instead of updating existing)
    createNewEntry() {
        // Get current form data
        const selectedProvince = window.provinceDisplayInstance?.selectedRegion?.province?.name || 'Not selected';
        
        let dateTimeInfo = null;
        if (window.dateChosenInstance && window.dateChosenInstance.hasValidDateTime()) {
            dateTimeInfo = window.dateChosenInstance.getAllDateTimeInfo();
        } else {
            const startDate = document.getElementById('startDate')?.value || 'Not set';
            const endDate = document.getElementById('endDate')?.value || 'Not set';
            const startTime = document.getElementById('startTime')?.value || 'Not set';
            const endTime = document.getElementById('endTime')?.value || 'Not set';
            
            dateTimeInfo = {
                startDate: startDate,
                endDate: endDate,
                startTime: startTime,
                endTime: endTime
            };
        }
        
        const selectedHotels = window.displayHotelInstance ? 
            window.displayHotelInstance.getSelectedHotels().map(hotel => hotel.name) : [];
        const selectedAttractions = window.displayAttractionInstance ? 
            window.displayAttractionInstance.getSelectedAttractions().map(attraction => attraction.name) : [];
        
        // Create new entry
        const entry = {
            id: this.currentRowId++,
            province: selectedProvince,
            startDate: dateTimeInfo.startDate,
            startTime: dateTimeInfo.startTime,
            endDate: dateTimeInfo.endDate,
            endTime: dateTimeInfo.endTime,
            duration: this.calculateDuration(dateTimeInfo.startDate, dateTimeInfo.endDate),
            hotels: selectedHotels,
            attractions: selectedAttractions,
            timestamp: new Date().toISOString(),
            formattedTimestamp: new Date().toLocaleString()
        };
        
        // Add to beginning of array
        this.historyData.unshift(entry);
        this.saveHistoryData();
        this.appendRowToTable(entry, true);
        
        // Hide the updating indicator since this is a new entry
        this.hideCurrentEntryIndicator();
        
        // Auto-show and expand table
        if (!this.isVisible) {
            this.showTable();
        }
        if (!this.isExpanded) {
            this.expandTable();
        }
        
        console.log('New trip entry created:', entry);
        
        // Show success message
        if (typeof showLoading === 'function') {
            showLoading(`New trip entry #${entry.id} created with ${selectedHotels.length} hotels and ${selectedAttractions.length} attractions`, true);
        }
        
        return entry;
    }
    
    // Append a single row to the table
    appendRowToTable(entry, isNew = false) {
        const row = document.createElement('tr');
        if (isNew) {
            row.classList.add('new-row');
        }
        
        row.innerHTML = `
            <td class="row-number">${entry.id}</td>
            <td class="timestamp-cell">${entry.formattedTimestamp}</td>            
            <td class="province-cell">${entry.province}</td>
            <td class="date-cell">${entry.startDate} & ${entry.startTime}</td>
            <td class="date-cell">${entry.endDate} & ${entry.endTime}</td>
            <td class="duration-cell">${entry.duration}</td>
            <td class="hotels-cell">
                ${this.renderItemList(entry.hotels, 'hotels')}
            </td>
            <td class="attractions-cell">
                ${this.renderItemList(entry.attractions, 'attractions')}
            </td>
            <td class="actions-cell" style="width: 25%;">
                    <button class="action-btn view" onclick="tripHistoryManager.displayRoutes(${entry.id})" title="View Route Details">
                        <i class="fa-solid fa-route"> Details Route</i>
                    </button>
                    <button class="action-btn success" onclick="tripHistoryManager.displayGanttChart(${entry.id})" title="View Gantt Chart">
                        <i class="fa-solid fa-chart-gantt"> Gantt-Chart</i>
                    </button>
                    <button class="action-btn delete" onclick="tripHistoryManager.deleteEntry(${entry.id})" title="Delete Entry">
                        <i class="fa-solid fa-trash"> Delete</i>
                    </button>
            </td>
        `;
        
        // Insert at the beginning of table body
        if (this.tableBody.firstChild) {
            this.tableBody.insertBefore(row, this.tableBody.firstChild);
        } else {
            this.tableBody.appendChild(row);
        }
        
        // Remove the new-row class after animation
        if (isNew) {
            setTimeout(() => {
                row.classList.remove('new-row');
            }, 300);
        }
    }
    
    // Update existing row in the table
    updateRowInTable(entry) {
        // Find the row with matching ID
        const rows = this.tableBody.querySelectorAll('tr');
        let targetRow = null;
        
        for (let row of rows) {
            const rowNumberCell = row.querySelector('.row-number');
            if (rowNumberCell && rowNumberCell.textContent == entry.id) {
                targetRow = row;
                break;
            }
        }
        
        if (targetRow) {
            // Add update animation class
            targetRow.classList.add('updating-row');
            
            // Update row content
            targetRow.innerHTML = `
                <td class="row-number">${entry.id}</td>
                <td class="timestamp-cell">${entry.formattedTimestamp}</td>
                <td class="province-cell">${entry.province}</td>
                <td class="date-cell">${entry.startDate} & ${entry.startTime}</td>
                <td class="date-cell">${entry.endDate} & ${entry.endTime}</td>
                <td class="duration-cell">${entry.duration}</td>
                <td class="hotels-cell">
                    ${this.renderItemList(entry.hotels, 'hotels')}
                </td>
                <td class="attractions-cell">
                    ${this.renderItemList(entry.attractions, 'attractions')}
                </td>
                <td class="timestamp-cell">${entry.formattedTimestamp}</td>
                <td class="actions-cell">
                    <button class="action-btn view" onclick="tripHistoryManager.displayRoutes(${entry.id})" title="View Route Details">
                        <i class="fa-solid fa-route"> Details Route</i>
                    </button>
                    <button class="action-btn success" onclick="tripHistoryManager.displayGanttChart(${entry.id})" title="View Gantt Chart">
                        <i class="fa-solid fa-chart-gantt"> Gantt-Chart</i>
                    </button>
                    <button class="action-btn delete" onclick="tripHistoryManager.deleteEntry(${entry.id})" title="Delete Entry">
                        <i class="fa-solid fa-trash"> Delete</i>
                    </button>
                </td>
            `;
            
            // Remove animation class after a short delay
            setTimeout(() => {
                targetRow.classList.remove('updating-row');
            }, 600);
            
            console.log(`Row ${entry.id} updated in table`);
        } else {
            console.warn(`Row with ID ${entry.id} not found, appending new row`);
            this.appendRowToTable(entry, true);
        }
    }
    
    // Render item list (hotels or attractions)
    renderItemList(items, type) {
        if (!items || items.length === 0) {
            return `<span class="text-muted">None selected</span>`;
        }
        
        if (items.length <= 3) {
            const itemsHtml = items.map(item => `<li>${item}</li>`).join('');
            return `<ul class="item-list ${type}">${itemsHtml}</ul>`;
        } else {
            const firstThree = items.slice(0, 3);
            const remaining = items.length - 3;
            const itemsHtml = firstThree.map(item => `<li>${item}</li>`).join('');
            return `
                <ul class="item-list ${type}">
                    ${itemsHtml}
                </ul>
                <span class="item-count">+${remaining} more</span>
            `;
        }
    }
    
    // Calculate duration between dates
    calculateDuration(startDate, endDate) {
        if (!startDate || !endDate) return 'N/A';
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return '1 day';
        return `${diffDays} days`;
    }
    
    // Render entire table
    renderHistoryTable() {
        this.tableBody.innerHTML = '';
        
        if (this.historyData.length === 0) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="11" class="trip-history-empty">
                        <div>
                            <i class="fas fa-history"></i>
                            <p>No trip history yet. Start planning your trip!</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        this.historyData.forEach(entry => {
            this.appendRowToTable(entry, false);
        });
    }
    
    // Toggle table visibility
    toggleVisibility() {
        if (this.isVisible) {
            this.hideTable();
        } else {
            this.showTable();
        }
    }
    
    showTable() {
        this.container.classList.remove('hidden');
        this.isVisible = true;
        const button = document.getElementById('toggleHistoryTable');
        if (button) {
            button.innerHTML = '<i class="fas fa-eye-slash"></i> Hide';
        }
    }
    
    hideTable() {
        this.container.classList.add('hidden');
        this.isVisible = false;
        this.isExpanded = false;
        this.container.classList.remove('expanded');
        const button = document.getElementById('toggleHistoryTable');
        if (button) {
            button.innerHTML = '<i class="fas fa-eye"></i> Show';
        }
    }
    
    // Toggle table expansion
    toggleExpansion() {
        if (this.isExpanded) {
            this.collapseTable();
        } else {
            this.expandTable();
        }
    }
    
    expandTable() {
        this.container.classList.add('expanded');
        this.isExpanded = true;
    }
    
    collapseTable() {
        this.container.classList.remove('expanded');
        this.isExpanded = false;
    }
    
    // View entry details
    viewEntry(entryId) {
        const entry = this.historyData.find(e => e.id === entryId);
        if (!entry) return;
        
        const modalContent = `
            <div class="trip-entry-details">
                <h4><i class="fas fa-map-marker-alt"></i> Trip Entry #${entry.id}</h4>
                <div class="detail-section">
                    <h5><i class="fas fa-map"></i> Destination</h5>
                    <p><strong>Province:</strong> ${entry.province}</p>
                </div>
                <div class="detail-section">
                    <h5><i class="fas fa-calendar"></i> Schedule</h5>
                    <p><strong>Start:</strong> ${entry.startDate} at ${entry.startTime}</p>
                    <p><strong>End:</strong> ${entry.endDate} at ${entry.endTime}</p>
                    <p><strong>Duration:</strong> ${entry.duration}</p>
                </div>
                <div class="detail-section">
                    <h5><i class="fas fa-hotel"></i> Hotels (${entry.hotels.length})</h5>
                    ${entry.hotels.length > 0 ? 
                        `<ul>${entry.hotels.map(hotel => `<li>${hotel}</li>`).join('')}</ul>` :
                        '<p>No hotels selected</p>'
                    }
                </div>
                <div class="detail-section">
                    <h5><i class="fas fa-map-marker-alt"></i> Attractions (${entry.attractions.length})</h5>
                    ${entry.attractions.length > 0 ? 
                        `<ul>${entry.attractions.map(attraction => `<li>${attraction}</li>`).join('')}</ul>` :
                        '<p>No attractions selected</p>'
                    }
                </div>
                <div class="detail-section">
                    <h5><i class="fas fa-clock"></i> Created</h5>
                    <p>${entry.formattedTimestamp}</p>
                </div>
            </div>
        `;
        
        this.showModal('Trip Entry Details', modalContent);
    }
    
    // Delete entry
    deleteEntry(entryId) {
        if (confirm('Are you sure you want to delete this trip entry?')) {
            this.historyData = this.historyData.filter(e => e.id !== entryId);
            this.saveHistoryData();
            this.renderHistoryTable();
            console.log(`Trip entry #${entryId} deleted`);
        }
    }
    
    // Clear all history
    clearAllHistory() {
        if (confirm('Are you sure you want to clear all trip history? This action cannot be undone.')) {
            this.historyData = [];
            this.currentRowId = 1;
            this.saveHistoryData();
            this.renderHistoryTable();
            console.log('All trip history cleared');
        }
    }
    
    // Export history
    exportHistory() {
        if (this.historyData.length === 0) {
            alert('No trip history to export.');
            return;
        }
        
        const exportData = {
            exportDate: new Date().toISOString(),
            totalEntries: this.historyData.length,
            entries: this.historyData
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `trip-history-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        console.log('Trip history exported successfully');
    }
    
    // Save data to localStorage
    saveHistoryData() {
        localStorage.setItem('tripHistoryData', JSON.stringify({
            data: this.historyData,
            currentRowId: this.currentRowId
        }));
    }
    
    // Load data from localStorage
    loadHistoryData() {
        const stored = localStorage.getItem('tripHistoryData');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                this.historyData = parsed.data || [];
                this.currentRowId = parsed.currentRowId || 1;
            } catch (error) {
                console.error('Error loading trip history data:', error);
                this.historyData = [];
                this.currentRowId = 1;
            }
        }
    }
    
    // Show modal (simple implementation)
    showModal(title, content) {
        // Remove existing modal if any
        const existingModal = document.getElementById('tripEntryModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'tripEntryModal';
        modal.className = 'trip-entry-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h4>${title}</h4>
                        <button class="modal-close" onclick="this.closest('.trip-entry-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add modal styles if not exists
        if (!document.getElementById('tripEntryModalStyles')) {
            const styles = document.createElement('style');
            styles.id = 'tripEntryModalStyles';
            styles.textContent = `
                .trip-entry-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                    animation: fadeIn 0.3s ease-out;
                }
                .trip-entry-modal .modal-overlay {
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .trip-entry-modal .modal-content {
                    background: var(--bg-primary);
                    border-radius: 8px;
                    max-width: 600px;
                    width: 100%;
                    max-height: 80vh;
                    overflow: auto;
                    animation: slideInUp 0.3s ease-out;
                }
                .trip-entry-modal .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    border-bottom: 1px solid var(--border-color);
                }
                .trip-entry-modal .modal-header h4 {
                    margin: 0;
                    color: var(--text-primary);
                }
                .trip-entry-modal .modal-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: var(--text-secondary);
                    padding: 5px;
                }
                .trip-entry-modal .modal-close:hover {
                    color: var(--danger-color);
                }
                .trip-entry-modal .modal-body {
                    padding: 20px;
                }
                .trip-entry-details .detail-section {
                    margin-bottom: 20px;
                }
                .trip-entry-details .detail-section h5 {
                    color: var(--primary-color);
                    margin-bottom: 10px;
                    font-size: 14px;
                    font-weight: 600;
                }
                .trip-entry-details .detail-section p {
                    margin: 5px 0;
                    color: var(--text-primary);
                }
                .trip-entry-details .detail-section ul {
                    margin: 10px 0;
                    padding-left: 20px;
                }
                .trip-entry-details .detail-section li {
                    margin: 5px 0;
                    color: var(--text-primary);
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideInUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            document.head.appendChild(styles);
        }
    }
    
    // Show current entry indicator
    showCurrentEntryIndicator() {
        const indicator = document.getElementById('currentEntryIndicator');
        if (indicator) {
            indicator.style.display = 'inline-block';
            indicator.textContent = 'Updating Current Entry';
        }
    }
    
    // Hide current entry indicator
    hideCurrentEntryIndicator() {
        const indicator = document.getElementById('currentEntryIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
}

// Initialize trip history manager
let tripHistoryManager;

// Update the document ready event listener
document.addEventListener("DOMContentLoaded", async () => {
    // ... existing initialization code ...
    
    // Initialize trip history manager
    tripHistoryManager = new TripHistoryManager();
    window.tripHistoryManager = tripHistoryManager;
    
    console.log("Trip history manager initialized");
});

// Update the handleOptimize function to capture and store trip data
function handleOptimize(provinceDisplayInstance){
    try{
        // ... existing handleOptimize code ...
        
        // After successful optimization, capture the trip data
        const tripData = {
            province: selectedProvince?.name || 'Not selected',
            startDate: dateTimeInfo?.startDate || 'Not set',
            startTime: dateTimeInfo?.startTime || 'Not set',
            endDate: dateTimeInfo?.endDate || 'Not set',
            endTime: dateTimeInfo?.endTime || 'Not set',
            hotels: window.displayHotelInstance ? 
                window.displayHotelInstance.getSelectedHotels().map(hotel => hotel.name) : [],
            attractions: window.displayAttractionInstance ? 
                window.displayAttractionInstance.getSelectedAttractions().map(attraction => attraction.name) : []
        };
        
        // Add to trip history
        if (window.tripHistoryManager) {
            window.tripHistoryManager.addTripEntry(tripData);
            console.log('Trip data added to history table:', tripData);
        }
        
        // ... rest of existing handleOptimize code ...
        
    } catch(error){
        console.error("Error in handleOptimize:", error);
        alert("An error occurred during optimization. Please try again.");
    }
}

// Also update the clear history function to clear the table
function handleClearHistory() {
    try {
        if (confirm('Are you sure you want to clear all trip history and selected data?\n\nThis will remove:\n• Province selection trails\n• Hotel booking history trails\n• Timeline information\n• Map visualizations\n• ALL selected/booked hotels\n• Attraction selections\n• Trip history table\n\nThis action cannot be undone.')) {
            
            // ... existing clear code ...
            
            // Clear trip history table
            if (window.tripHistoryManager) {
                window.tripHistoryManager.historyData = [];
                window.tripHistoryManager.currentRowId = 1;
                window.tripHistoryManager.saveHistoryData();
                window.tripHistoryManager.renderHistoryTable();
                console.log('Trip history table cleared');
            }
            
            showLoading('All trip history, selected hotels, attractions, and data cleared successfully! You can start planning a new trip.', true);
        }
    } catch(error) {
        console.error("Error in handleClearHistory:", error);
        alert("An error occurred while clearing history. Please try again.");
    }
}