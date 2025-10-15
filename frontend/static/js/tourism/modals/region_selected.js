// Function to close the region selected modal
function show_region_modal() {
    const modal = document.getElementById('regionModal');
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) {
            bsModal.hide();
        }
    }
    // alert("Region modal function called");
}

// Function to open the region selected modal
function openRegionSelectedModal(regionId, regionName) {
    const modal = document.getElementById('regionModal');
    if (modal) {
        // Update modal content with region details
        const modalTitle = modal.querySelector('.modal-title');
        const modalBody = modal.querySelector('.modal-body');
        
        // if (modalTitle) {
        //     modalTitle.textContent = regionName || 'Region Selected';
        // }
        
        // if (modalBody) {
        //     modalBody.innerHTML = `
        //         <p>You have selected region: <strong>${regionName}</strong></p>
        //         <p>Region ID: ${regionId}</p>
        //     `;
        // }
        
        // Show the modal (Bootstrap 5)
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

// Event listener example
document.addEventListener('DOMContentLoaded', function() {
    // Example: Attach to region selection buttons
    const regionButtons = document.querySelectorAll('.region-select-btn');
    
    regionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const regionId = this.dataset.regionId;
            const regionName = this.dataset.regionName;
            openRegionSelectedModal(regionId, regionName);
        });
    });
});