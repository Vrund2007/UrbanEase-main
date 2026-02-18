document.addEventListener('DOMContentLoaded', function () {

    // --- Profile Dropdown Toggle ---
    const profileTrigger = document.getElementById('profileTrigger');
    const profileDropdown = document.getElementById('profileDropdown');
    const profileArrow = document.getElementById('profileArrow');

    if (profileTrigger && profileDropdown) {
        profileTrigger.addEventListener('click', function (e) {
            e.stopPropagation();
            const isOpen = profileDropdown.classList.contains('show');

            if (isOpen) {
                closeDropdown();
            } else {
                openDropdown();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function (e) {
            if (!profileTrigger.contains(e.target) && !profileDropdown.contains(e.target)) {
                closeDropdown();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeDropdown();
            }
        });
    }

    function openDropdown() {
        profileDropdown.classList.add('show');
        if (profileArrow) profileArrow.classList.add('open');
    }

    function closeDropdown() {
        profileDropdown.classList.remove('show');
        if (profileArrow) profileArrow.classList.remove('open');
    }


    // --- Housing Modal Logic ---
    const housingOptions = document.querySelectorAll('.housing-option-card');
    const btnContinueHousing = document.getElementById('btnContinueHousing');
    let selectedType = null;

    if (housingOptions.length > 0 && btnContinueHousing) {
        housingOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Deselect all
                housingOptions.forEach(opt => opt.classList.remove('selected'));
                
                // Select clicked
                this.classList.add('selected');
                selectedType = this.getAttribute('data-type');
                
                // Enable continue button
                btnContinueHousing.disabled = false;
            });
        });

        btnContinueHousing.addEventListener('click', function() {
            if (!selectedType) return;

            // Close modal (optional but cleaner UX before redirect)
            const modalEl = document.getElementById('housingModal');
            const modal = bootstrap.Modal.getInstance(modalEl); // Correct usage of Bootstrap 5 API
            if (modal) {
                modal.hide();
            }

            // Redirect Logic
            // Hostel -> /frontend/housing/hostel/hostel.html
            // PG -> /frontend/housing/pg/pg.html
            // Apartment -> /frontend/housing/apartment/apartment.html
            
            let redirectPath = '';
            
            switch(selectedType) {
                case 'hostel':
                    redirectPath = '/housing/hostel';
                    break;
                case 'pg':
                    redirectPath = '/housing/pg';
                    break;
                case 'apartment':
                    redirectPath = '/housing/apartment';
                    break;
            }

            if (redirectPath) {
                // Smooth transition delay can be added here if needed, but direct redirect is requested
                 window.location.href = redirectPath;
            }
        });
    }

});
