document.addEventListener('DOMContentLoaded', function () {
    const menuBtn = document.getElementById('customerProfileMenu');
    const dropdown = document.getElementById('customerProfileDropdown');
    const arrow = document.getElementById('customerProfileArrow');

    if (!menuBtn || !dropdown) return;

    function openDropdown() {
        dropdown.classList.add('show');
        if (arrow) arrow.classList.add('open');
        menuBtn.setAttribute('aria-expanded', 'true');
    }

    function closeDropdown() {
        dropdown.classList.remove('show');
        if (arrow) arrow.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
    }

    function toggleDropdown() {
        const isOpen = dropdown.classList.contains('show');
        if (isOpen) closeDropdown();
        else openDropdown();
    }

    menuBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleDropdown();
    });

    document.addEventListener('click', function (e) {
        if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
            closeDropdown();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeDropdown();
        }
    });
});
