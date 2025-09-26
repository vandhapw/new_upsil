const showLoading = function(statusLabel, autoclose = false) {
    // Use SweetAlert2 to show loading indicator
    Swal.fire({
        title: statusLabel,
        allowEscapeKey: false,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    // If autoclose is true, set a timer to close the alert
    if (autoclose) {
        setTimeout(() => {
            Swal.close(); // Close the SweetAlert2 dialog
        }, 2000); // Adjust the time as needed
    }
};
