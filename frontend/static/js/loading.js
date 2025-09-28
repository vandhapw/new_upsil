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

const showLoadingRegister = function(statusLabel, autoclose = false, redirect_url = null) {
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
            if (redirect_url) {
                setTimeout(() => {
                    window.location.href = redirect_url;
                }, 300); // Add a slight delay to ensure the dialog is closed before redirecting
            }
        }, 2000); // Adjust the time as needed
    }
};
