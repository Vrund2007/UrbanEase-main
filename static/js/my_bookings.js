document.addEventListener('DOMContentLoaded', function() {
    // Profile dropdown (shared with customer.js pattern)
    const profileTrigger = document.getElementById('profileTrigger');
    const profileDropdown = document.getElementById('profileDropdown');
    const profileArrow = document.getElementById('profileArrow');

    if (profileTrigger && profileDropdown) {
        profileTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            const isOpen = profileDropdown.classList.contains('show');
            if (isOpen) {
                profileDropdown.classList.remove('show');
                if (profileArrow) profileArrow.classList.remove('open');
            } else {
                profileDropdown.classList.add('show');
                if (profileArrow) profileArrow.classList.add('open');
            }
        });

        document.addEventListener('click', function(e) {
            if (!profileTrigger.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('show');
                if (profileArrow) profileArrow.classList.remove('open');
            }
        });
    }
});
