// Function to open the region selected modal
function openRegionSelectedModal(regionId, regionName) {
    const modal = document.getElementById('regionModal');
    if (modal) {
        // Update modal content with region details
        const modalTitle = modal.querySelector('.modal-title');
        const modalBody = modal.querySelector('.modal-body');
        
        // Show the modal (Bootstrap 5)
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

// Function to open the Datetime selected modal
function openDatetimeModal(regionId, regionName) {
    const modal = document.getElementById('datetimeModal');
    if (modal) {
        // Update modal content with region details
        const modalTitle = modal.querySelector('.modal-title');
        const modalBody = modal.querySelector('.modal-body');
        
        // Show the modal (Bootstrap 5)
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

// hotelListModal
function openHotelModal() {
    const modal = document.getElementById('hotelListModal');
    if (modal) {
        // Show the modal (Bootstrap 5)
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

// attrationListModal
function openAttractionModal() {
    const modal = document.getElementById('attractionListModal');
    if (modal) {
        // Show the modal (Bootstrap 5)
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}