// Admin Dashboard - UI Interactions
(function () {
    'use strict';

    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebarLinks = document.querySelectorAll('.sidebar-link[data-section]');
    const sections = document.querySelectorAll('.admin-section');

    // -- Sidebar Toggle (mobile) --
    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', function () {
            if (sidebar.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // -- Section Navigation --
    sidebarLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            var targetSection = this.getAttribute('data-section');

            // Update active link
            sidebarLinks.forEach(function (l) {
                l.classList.remove('active');
            });
            this.classList.add('active');

            // Show target section
            sections.forEach(function (section) {
                section.classList.remove('active');
            });

            var target = document.getElementById('section-' + targetSection);
            if (target) {
                target.classList.add('active');
            }

            // Close sidebar on mobile after navigation
            if (window.innerWidth < 992) {
                closeSidebar();
            }
        });
    });
})();


// -- Dynamic Data Fetching --
document.addEventListener("DOMContentLoaded", function () {
    const brandLink = document.getElementById("brandLink");
    const dashboardLink = document.querySelector(
        '.sidebar-link[data-section="dashboard"]'
    );

    if (brandLink && dashboardLink) {
        brandLink.addEventListener("click", function (e) {
            e.preventDefault();
            dashboardLink.click();
        });
    }

    // Fetch Provider Profiles
    fetchProviderProfiles();
    
    // Fetch Users
    // Fetch Users
    fetchUsers();

    // Fetch House Listings
    fetchHouseListings();

    // Fetch Tiffin Listings
    fetchTiffinListings();

    // Fetch Service Listings
    fetchServiceListings();

    // Fetch Orders
    fetchOrders();

    // Fetch Service Bookings
    fetchServiceBookings();

    // Fetch Pending Providers Count
    fetchPendingProvidersCount();

    // Setup Pending Providers Card Click Handler
    setupPendingProvidersCardClick();

    // Fetch Pending Houses Count
    fetchPendingHousesCount();

    // Setup Pending Houses Card Click Handler
    setupPendingHousesCardClick();

    // Fetch Pending Tiffins Count
    fetchPendingTiffinsCount();

    // Setup Pending Tiffins Card Click Handler
    setupPendingTiffinsCardClick();

    // Fetch Pending Services Count
    fetchPendingServicesCount();

    // Setup Pending Services Card Click Handler
    setupPendingServicesCardClick();
});

// --- Pending Services Count ---
function fetchPendingServicesCount() {
    const countElement = document.getElementById('pending-services-count');
    if (!countElement) return;

    fetch('http://127.0.0.1:5000/admin/api/pending-services/count')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            countElement.textContent = data.count;
        })
        .catch(error => {
            console.error('Error fetching pending services count:', error);
            countElement.textContent = 'Error';
        });
}

// --- Pending Services Card Click Handler ---
function setupPendingServicesCardClick() {
    const card = document.getElementById('pending-services-card');
    const tableContainer = document.getElementById('pending-services-table-container');
    const providersTableContainer = document.getElementById('pending-providers-table-container');
    const housesTableContainer = document.getElementById('pending-houses-table-container');
    const tiffinsTableContainer = document.getElementById('pending-tiffins-table-container');

    if (!card || !tableContainer) return;

    card.addEventListener('click', function () {
        // Close other tables first
        if (providersTableContainer) providersTableContainer.style.display = 'none';
        if (housesTableContainer) housesTableContainer.style.display = 'none';
        if (tiffinsTableContainer) tiffinsTableContainer.style.display = 'none';

        if (tableContainer.style.display === 'none') {
            tableContainer.style.display = 'block';
            fetchPendingServices();
            // Smooth scroll to the table
            setTimeout(() => {
                tableContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        } else {
            tableContainer.style.display = 'none';
        }
    });
}

// --- Format Service Category ---
function formatServiceCategory(category) {
    const categoryMap = {
        'electrician': 'Electrician',
        'plumber': 'Plumber',
        'carpenter': 'Carpenter',
        'ac_repair': 'AC Repair',
        'cleaning': 'Cleaning',
        'packers_movers': 'Packers & Movers',
        'wifi_installation': 'WiFi Installation',
        'gas_connection': 'Gas Connection',
        'laundry': 'Laundry'
    };
    return categoryMap[category] || category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// --- Fetch Pending Services List ---
function fetchPendingServices() {
    const tbody = document.getElementById('pending-services-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Loading...</td></tr>';

    fetch('http://127.0.0.1:5000/admin/api/pending-services')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-5">No pending service approvals.</td></tr>';
                return;
            }

            data.forEach(service => {
                const tr = document.createElement('tr');

                tr.innerHTML = `
                    <td>${formatServiceCategory(service.service_category)}</td>
                    <td><div class="fw-bold">${service.service_title}</div></td>
                    <td>${service.provider_business_name}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="handleViewPendingService(${service.id})">View</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('Error fetching pending services:', error);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Error loading data.</td></tr>';
        });
}

// --- Handle View Pending Service Button Click ---
let currentServiceId = null;
let serviceModalInstance = null;

function handleViewPendingService(serviceId) {
    currentServiceId = serviceId;
    
    // Fetch service details
    fetch(`http://127.0.0.1:5000/admin/api/service/${serviceId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch service details');
            return response.json();
        })
        .then(data => {
            // Populate modal fields
            document.getElementById('modal-service-category').textContent = formatServiceCategory(data.service_category);
            document.getElementById('modal-service-title').textContent = data.service_title || '--';
            document.getElementById('modal-service-description').textContent = data.description || 'N/A';
            
            // Format price
            const priceFormatted = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(data.base_price);
            document.getElementById('modal-service-price').textContent = priceFormatted;
            
            // Format radius
            document.getElementById('modal-service-radius').textContent = data.service_radius ? `${data.service_radius} km` : 'N/A';
            
            document.getElementById('modal-service-availability').textContent = data.availability_days || '--';
            document.getElementById('modal-service-provider').textContent = data.provider_business_name || '--';
            document.getElementById('modal-service-email').textContent = data.provider_email || '--';
            document.getElementById('modal-service-phone').textContent = data.provider_phone || '--';
            document.getElementById('modal-service-created').textContent = data.created_at || '--';
            
            // Open modal
            const modalElement = document.getElementById('serviceModal');
            serviceModalInstance = new bootstrap.Modal(modalElement);
            serviceModalInstance.show();
        })
        .catch(error => {
            console.error('Error fetching service details:', error);
            alert('Error loading service details. Please try again.');
        });
}

function approveService() {
    if (!currentServiceId) return;
    
    fetch(`http://127.0.0.1:5000/admin/api/service/${currentServiceId}/approve`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal
            if (serviceModalInstance) {
                serviceModalInstance.hide();
            }
            
            // Remove service row from table
            removeServiceRow(currentServiceId);
            
            // Decrease pending count
            updatePendingServicesCount(-1);
            
            // Reset current service ID
            currentServiceId = null;
        } else {
            alert('Failed to approve service: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error approving service:', error);
        alert('An error occurred while approving the service.');
    });
}

function rejectService() {
    if (!currentServiceId) return;
    
    fetch(`http://127.0.0.1:5000/admin/api/service/${currentServiceId}/reject`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal
            if (serviceModalInstance) {
                serviceModalInstance.hide();
            }
            
            // Remove service row from table
            removeServiceRow(currentServiceId);
            
            // Decrease pending count
            updatePendingServicesCount(-1);
            
            // Reset current service ID
            currentServiceId = null;
        } else {
            alert('Failed to reject service: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error rejecting service:', error);
        alert('An error occurred while rejecting the service.');
    });
}

function removeServiceRow(serviceId) {
    const tbody = document.getElementById('pending-services-body');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        // Find the View button and check its onclick for the service ID
        const viewBtn = row.querySelector('button[onclick*="handleViewPendingService"]');
        if (viewBtn && viewBtn.getAttribute('onclick').includes(serviceId)) {
            row.remove();
        }
    });
    
    // Check if table is now empty
    if (tbody.querySelectorAll('tr').length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-5">No pending service approvals.</td></tr>';
    }
}

function updatePendingServicesCount(delta) {
    const countElement = document.getElementById('pending-services-count');
    if (!countElement) return;
    
    let currentCount = parseInt(countElement.textContent) || 0;
    currentCount += delta;
    countElement.textContent = Math.max(0, currentCount);
}

// --- Pending Tiffins Count ---
function fetchPendingTiffinsCount() {
    const countElement = document.getElementById('pending-tiffins-count');
    if (!countElement) return;

    fetch('http://127.0.0.1:5000/admin/api/pending-tiffins/count')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            countElement.textContent = data.count;
        })
        .catch(error => {
            console.error('Error fetching pending tiffins count:', error);
            countElement.textContent = 'Error';
        });
}

// --- Pending Tiffins Card Click Handler ---
function setupPendingTiffinsCardClick() {
    const card = document.getElementById('pending-tiffins-card');
    const tableContainer = document.getElementById('pending-tiffins-table-container');
    const providersTableContainer = document.getElementById('pending-providers-table-container');
    const housesTableContainer = document.getElementById('pending-houses-table-container');
    const servicesTableContainer = document.getElementById('pending-services-table-container');

    if (!card || !tableContainer) return;

    card.addEventListener('click', function () {
        // Close other tables first
        if (providersTableContainer) providersTableContainer.style.display = 'none';
        if (housesTableContainer) housesTableContainer.style.display = 'none';
        if (servicesTableContainer) servicesTableContainer.style.display = 'none';

        if (tableContainer.style.display === 'none') {
            tableContainer.style.display = 'block';
            fetchPendingTiffins();
            // Smooth scroll to the table
            setTimeout(() => {
                tableContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        } else {
            tableContainer.style.display = 'none';
        }
    });
}

// --- Fetch Pending Tiffins List ---
function fetchPendingTiffins() {
    const tbody = document.getElementById('pending-tiffins-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4">Loading...</td></tr>';

    fetch('http://127.0.0.1:5000/admin/api/pending-tiffins')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-5">No pending tiffin approvals.</td></tr>';
                return;
            }

            data.forEach(tiffin => {
                const tr = document.createElement('tr');

                // Format diet type
                let dietTypeFormatted = tiffin.diet_type;
                if (tiffin.diet_type === 'veg') {
                    dietTypeFormatted = 'Veg';
                } else if (tiffin.diet_type === 'non-veg') {
                    dietTypeFormatted = 'Non-Veg';
                } else if (tiffin.diet_type === 'both') {
                    dietTypeFormatted = 'Veg & Non-Veg';
                }

                tr.innerHTML = `
                    <td><div class="fw-bold">${tiffin.provider_business_name}</div></td>
                    <td>${dietTypeFormatted}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="handleViewPendingTiffin(${tiffin.id})">View</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('Error fetching pending tiffins:', error);
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger py-4">Error loading data.</td></tr>';
        });
}

// --- Handle View Pending Tiffin Button Click ---
let currentTiffinId = null;
let tiffinModalInstance = null;

function handleViewPendingTiffin(tiffinId) {
    currentTiffinId = tiffinId;
    
    // Fetch tiffin details
    fetch(`http://127.0.0.1:5000/admin/api/tiffin/${tiffinId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch tiffin details');
            return response.json();
        })
        .then(data => {
            // Populate modal fields
            document.getElementById('modal-tiffin-provider').textContent = data.provider_business_name || '--';
            document.getElementById('modal-tiffin-email').textContent = data.provider_email || '--';
            document.getElementById('modal-tiffin-phone').textContent = data.provider_phone || '--';
            document.getElementById('modal-tiffin-license').textContent = data.business_license || 'N/A';
            
            // Format radius
            document.getElementById('modal-tiffin-radius').textContent = data.delivery_radius ? `${data.delivery_radius} km` : 'N/A';
            
            // Format fast delivery badge
            const fastDeliveryEl = document.getElementById('modal-tiffin-fast-delivery');
            if (data.fast_delivery_available) {
                fastDeliveryEl.innerHTML = '<span class="badge bg-primary">Fast Delivery</span>';
            } else {
                fastDeliveryEl.innerHTML = '<span class="badge bg-secondary">Standard</span>';
            }
            
            document.getElementById('modal-tiffin-days').textContent = data.available_days || '--';
            
            // Format diet type
            let dietTypeFormatted = data.diet_type;
            if (data.diet_type === 'veg') {
                dietTypeFormatted = 'Veg';
            } else if (data.diet_type === 'non-veg') {
                dietTypeFormatted = 'Non-Veg';
            } else if (data.diet_type === 'both') {
                dietTypeFormatted = 'Veg & Non-Veg';
            }
            document.getElementById('modal-tiffin-diet').textContent = dietTypeFormatted;
            
            document.getElementById('modal-tiffin-created').textContent = data.created_at || '--';
            
            // Open modal
            const modalElement = document.getElementById('tiffinModal');
            tiffinModalInstance = new bootstrap.Modal(modalElement);
            tiffinModalInstance.show();
        })
        .catch(error => {
            console.error('Error fetching tiffin details:', error);
            alert('Error loading tiffin details. Please try again.');
        });
}

function approveTiffin() {
    if (!currentTiffinId) return;
    
    fetch(`http://127.0.0.1:5000/admin/api/tiffin/${currentTiffinId}/approve`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal
            if (tiffinModalInstance) {
                tiffinModalInstance.hide();
            }
            
            // Remove tiffin row from table
            removeTiffinRow(currentTiffinId);
            
            // Decrease pending count
            updatePendingTiffinsCount(-1);
            
            // Reset current tiffin ID
            currentTiffinId = null;
        } else {
            alert('Failed to approve tiffin: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error approving tiffin:', error);
        alert('An error occurred while approving the tiffin.');
    });
}

function rejectTiffin() {
    if (!currentTiffinId) return;
    
    fetch(`http://127.0.0.1:5000/admin/api/tiffin/${currentTiffinId}/reject`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal
            if (tiffinModalInstance) {
                tiffinModalInstance.hide();
            }
            
            // Remove tiffin row from table
            removeTiffinRow(currentTiffinId);
            
            // Decrease pending count
            updatePendingTiffinsCount(-1);
            
            // Reset current tiffin ID
            currentTiffinId = null;
        } else {
            alert('Failed to reject tiffin: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error rejecting tiffin:', error);
        alert('An error occurred while rejecting the tiffin.');
    });
}

function removeTiffinRow(tiffinId) {
    const tbody = document.getElementById('pending-tiffins-body');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        // Find the View button and check its onclick for the tiffin ID
        const viewBtn = row.querySelector('button[onclick*="handleViewPendingTiffin"]');
        if (viewBtn && viewBtn.getAttribute('onclick').includes(tiffinId)) {
            row.remove();
        }
    });
    
    // Check if table is now empty
    if (tbody.querySelectorAll('tr').length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-5">No pending tiffin approvals.</td></tr>';
    }
}

function updatePendingTiffinsCount(delta) {
    const countElement = document.getElementById('pending-tiffins-count');
    if (!countElement) return;
    
    let currentCount = parseInt(countElement.textContent) || 0;
    currentCount += delta;
    countElement.textContent = Math.max(0, currentCount);
}

// --- Pending Houses Count ---
function fetchPendingHousesCount() {
    const countElement = document.getElementById('pending-houses-count');
    if (!countElement) return;

    fetch('http://127.0.0.1:5000/admin/api/pending-houses/count')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            countElement.textContent = data.count;
        })
        .catch(error => {
            console.error('Error fetching pending houses count:', error);
            countElement.textContent = 'Error';
        });
}

// --- Pending Houses Card Click Handler ---
function setupPendingHousesCardClick() {
    const card = document.getElementById('pending-houses-card');
    const tableContainer = document.getElementById('pending-houses-table-container');
    const providersTableContainer = document.getElementById('pending-providers-table-container');
    const tiffinsTableContainer = document.getElementById('pending-tiffins-table-container');
    const servicesTableContainer = document.getElementById('pending-services-table-container');

    if (!card || !tableContainer) return;

    card.addEventListener('click', function () {
        // Close other tables first
        if (providersTableContainer) providersTableContainer.style.display = 'none';
        if (tiffinsTableContainer) tiffinsTableContainer.style.display = 'none';
        if (servicesTableContainer) servicesTableContainer.style.display = 'none';

        if (tableContainer.style.display === 'none') {
            tableContainer.style.display = 'block';
            fetchPendingHouses();
            // Smooth scroll to the table
            setTimeout(() => {
                tableContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        } else {
            tableContainer.style.display = 'none';
        }
    });
}

// --- Fetch Pending Houses List ---
function fetchPendingHouses() {
    const tbody = document.getElementById('pending-houses-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4">Loading...</td></tr>';

    fetch('http://127.0.0.1:5000/admin/api/pending-houses')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-5">No pending house approvals.</td></tr>';
                return;
            }

            data.forEach(house => {
                const tr = document.createElement('tr');

                tr.innerHTML = `
                    <td><div class="fw-bold">${house.title}</div></td>
                    <td>${house.provider_business_name}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="handleViewPendingHouse(${house.id})">View</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('Error fetching pending houses:', error);
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger py-4">Error loading data.</td></tr>';
        });
}

// --- Handle View Pending House Button Click ---
let currentHouseId = null;
let houseModalInstance = null;

function handleViewPendingHouse(houseId) {
    currentHouseId = houseId;
    
    // Fetch house details
    fetch(`http://127.0.0.1:5000/admin/api/house/${houseId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch house details');
            return response.json();
        })
        .then(data => {
            // Populate modal fields
            document.getElementById('modal-house-title').textContent = data.title || '--';
            document.getElementById('modal-house-location').textContent = data.location || '--';
            
            // Format price
            const priceFormatted = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(data.price);
            document.getElementById('modal-house-price').textContent = priceFormatted;
            
            document.getElementById('modal-house-type').textContent = data.type || '--';
            document.getElementById('modal-house-created').textContent = data.created_at || '--';
            document.getElementById('modal-house-description').textContent = data.description || 'N/A';
            document.getElementById('modal-house-provider').textContent = data.provider_business_name || '--';
            document.getElementById('modal-house-license').textContent = data.business_license || 'N/A';
            document.getElementById('modal-house-phone').textContent = data.provider_phone || '--';
            document.getElementById('modal-house-email').textContent = data.provider_email || '--';
            
            // Build image carousel
            buildImageCarousel(data.images);
            
            // Open modal
            const modalElement = document.getElementById('houseModal');
            houseModalInstance = new bootstrap.Modal(modalElement);
            houseModalInstance.show();
        })
        .catch(error => {
            console.error('Error fetching house details:', error);
            alert('Error loading house details. Please try again.');
        });
}

function buildImageCarousel(images) {
    const carouselInner = document.getElementById('carousel-inner');
    const carouselIndicators = document.getElementById('carousel-indicators');
    const carouselElement = document.getElementById('houseImageCarousel');
    
    // Clear previous content
    carouselInner.innerHTML = '';
    carouselIndicators.innerHTML = '';
    
    if (!images || images.length === 0) {
        // No images - show placeholder
        carouselInner.innerHTML = `
            <div class="carousel-item active">
                <div class="d-flex align-items-center justify-content-center bg-light" style="height: 300px; border-radius: 12px;">
                    <div class="text-center text-muted">
                        <i class="fas fa-image fa-3x mb-3"></i>
                        <p class="mb-0">No Images Uploaded</p>
                    </div>
                </div>
            </div>
        `;
        // Hide controls when no images
        carouselElement.querySelector('.carousel-control-prev').style.display = 'none';
        carouselElement.querySelector('.carousel-control-next').style.display = 'none';
        return;
    }
    
    // Show controls
    carouselElement.querySelector('.carousel-control-prev').style.display = '';
    carouselElement.querySelector('.carousel-control-next').style.display = '';
    
    // Build carousel items and indicators
    images.forEach((img, index) => {
        // Extract filename from absolute path and construct URL
        const imagePath = img.image_path;
        const filename = imagePath.split('\\').pop().split('/').pop();
        const imageUrl = `http://127.0.0.1:5000/images/${encodeURIComponent(filename)}`;
        
        // Carousel item
        const carouselItem = document.createElement('div');
        carouselItem.className = `carousel-item ${index === 0 ? 'active' : ''}`;
        carouselItem.innerHTML = `
            <img src="${imageUrl}" class="d-block w-100" alt="House Image ${index + 1}" 
                 style="height: 300px; object-fit: cover; border-radius: 12px;">
        `;
        carouselInner.appendChild(carouselItem);
        
        // Indicator
        const indicator = document.createElement('button');
        indicator.type = 'button';
        indicator.setAttribute('data-bs-target', '#houseImageCarousel');
        indicator.setAttribute('data-bs-slide-to', index);
        if (index === 0) indicator.classList.add('active');
        indicator.setAttribute('aria-label', `Slide ${index + 1}`);
        carouselIndicators.appendChild(indicator);
    });
}

function approveHouse() {
    if (!currentHouseId) return;
    
    fetch(`http://127.0.0.1:5000/admin/api/house/${currentHouseId}/approve`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal
            if (houseModalInstance) {
                houseModalInstance.hide();
            }
            
            // Remove house row from table
            removeHouseRow(currentHouseId);
            
            // Decrease pending count
            updatePendingHousesCount(-1);
            
            // Reset current house ID
            currentHouseId = null;
        } else {
            alert('Failed to approve house: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error approving house:', error);
        alert('An error occurred while approving the house.');
    });
}

function rejectHouse() {
    if (!currentHouseId) return;
    
    fetch(`http://127.0.0.1:5000/admin/api/house/${currentHouseId}/reject`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal
            if (houseModalInstance) {
                houseModalInstance.hide();
            }
            
            // Remove house row from table
            removeHouseRow(currentHouseId);
            
            // Decrease pending count
            updatePendingHousesCount(-1);
            
            // Reset current house ID
            currentHouseId = null;
        } else {
            alert('Failed to reject house: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error rejecting house:', error);
        alert('An error occurred while rejecting the house.');
    });
}

function removeHouseRow(houseId) {
    const tbody = document.getElementById('pending-houses-body');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        // Find the View button and check its onclick for the house ID
        const viewBtn = row.querySelector('button[onclick*="handleViewPendingHouse"]');
        if (viewBtn && viewBtn.getAttribute('onclick').includes(houseId)) {
            row.remove();
        }
    });
    
    // Check if table is now empty
    if (tbody.querySelectorAll('tr').length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-5">No pending house approvals.</td></tr>';
    }
}

function updatePendingHousesCount(delta) {
    const countElement = document.getElementById('pending-houses-count');
    if (!countElement) return;
    
    let currentCount = parseInt(countElement.textContent) || 0;
    currentCount += delta;
    countElement.textContent = Math.max(0, currentCount);
}

// --- Pending Providers Count ---
function fetchPendingProvidersCount() {
    const countElement = document.getElementById('pending-providers-count');
    if (!countElement) return;

    fetch('http://127.0.0.1:5000/admin/api/pending-providers/count')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            countElement.textContent = data.count;
        })
        .catch(error => {
            console.error('Error fetching pending providers count:', error);
            countElement.textContent = 'Error';
        });
}

function setupPendingProvidersCardClick() {
    const card = document.getElementById('pending-providers-card');
    const tableContainer = document.getElementById('pending-providers-table-container');
    const housesTableContainer = document.getElementById('pending-houses-table-container');
    const tiffinsTableContainer = document.getElementById('pending-tiffins-table-container');
    const servicesTableContainer = document.getElementById('pending-services-table-container');

    if (!card || !tableContainer) return;

    card.addEventListener('click', function () {
        // Close other tables first
        if (housesTableContainer) housesTableContainer.style.display = 'none';
        if (tiffinsTableContainer) tiffinsTableContainer.style.display = 'none';
        if (servicesTableContainer) servicesTableContainer.style.display = 'none';

        if (tableContainer.style.display === 'none') {
            tableContainer.style.display = 'block';
            fetchPendingProviders();
            // Smooth scroll to the table
            setTimeout(() => {
                tableContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        } else {
            tableContainer.style.display = 'none';
        }
    });
}

// --- Fetch Pending Providers List ---
function fetchPendingProviders() {
    const tbody = document.getElementById('pending-providers-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Loading...</td></tr>';

    fetch('http://127.0.0.1:5000/admin/api/pending-providers')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-5">No pending provider verifications.</td></tr>';
                return;
            }

            data.forEach(provider => {
                const tr = document.createElement('tr');

                // Provider Type Formatting (snake_case to Title Case)
                const typeFormatted = provider.provider_type
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

                tr.innerHTML = `
                    <td>${provider.id}</td>
                    <td><div class="fw-bold">${provider.business_name}</div></td>
                    <td><span class="text-capitalize">${typeFormatted}</span></td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="handleViewPendingProvider(${provider.id})">View</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('Error fetching pending providers:', error);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Error loading data.</td></tr>';
        });
}

// --- Handle View Button Click ---
let currentProviderId = null;
let providerModalInstance = null;

function handleViewPendingProvider(providerId) {
    currentProviderId = providerId;
    
    // Fetch provider details
    fetch(`http://127.0.0.1:5000/admin/api/provider/${providerId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch provider details');
            return response.json();
        })
        .then(data => {
            // Set profile image
            const profileImg = document.getElementById('modal-provider-image');
            if (data.profile_image) {
                // Extract just the filename from path (handles both / and \ separators)
                const filename = data.profile_image.split('/').pop().split('\\').pop();
                const imageUrl = `http://127.0.0.1:5000/images/${encodeURIComponent(filename)}`;
                profileImg.src = imageUrl;
            } else {
                // Placeholder avatar - using a simple SVG data URI
                profileImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNlOWVjZWYiLz48Y2lyY2xlIGN4PSI2MCIgY3k9IjQ1IiByPSIyMCIgZmlsbD0iI2FlYjRiYyIvPjxlbGxpcHNlIGN4PSI2MCIgY3k9IjEwNSIgcng9IjM1IiByeT0iMjUiIGZpbGw9IiNhZWI0YmMiLz48L3N2Zz4=';
            }
            
            // Populate modal fields
            document.getElementById('modal-business-name').textContent = data.business_name || '--';
            
            // Format provider type (snake_case to Title Case)
            const typeFormatted = data.provider_type
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            document.getElementById('modal-provider-type').textContent = typeFormatted;
            
            document.getElementById('modal-aadhaar').textContent = data.aadhaar_number || '--';
            document.getElementById('modal-license').textContent = data.business_license || 'N/A';
            document.getElementById('modal-email').textContent = data.email || '--';
            document.getElementById('modal-phone').textContent = data.phone || '--';
            document.getElementById('modal-created').textContent = data.created_at || '--';
            
            // Open modal
            const modalElement = document.getElementById('providerModal');
            providerModalInstance = new bootstrap.Modal(modalElement);
            providerModalInstance.show();
        })
        .catch(error => {
            console.error('Error fetching provider details:', error);
            alert('Error loading provider details. Please try again.');
        });
}

function approveProvider() {
    if (!currentProviderId) return;
    
    fetch(`http://127.0.0.1:5000/admin/api/provider/${currentProviderId}/approve`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal
            if (providerModalInstance) {
                providerModalInstance.hide();
            }
            
            // Remove provider row from table
            removeProviderRow(currentProviderId);
            
            // Decrease pending count
            updatePendingCount(-1);
            
            // Reset current provider ID
            currentProviderId = null;
        } else {
            alert('Failed to approve provider: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error approving provider:', error);
        alert('An error occurred while approving the provider.');
    });
}

function rejectProvider() {
    if (!currentProviderId) return;
    
    fetch(`http://127.0.0.1:5000/admin/api/provider/${currentProviderId}/reject`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal
            if (providerModalInstance) {
                providerModalInstance.hide();
            }
            
            // Remove provider row from table
            removeProviderRow(currentProviderId);
            
            // Decrease pending count
            updatePendingCount(-1);
            
            // Reset current provider ID
            currentProviderId = null;
        } else {
            alert('Failed to reject provider: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error rejecting provider:', error);
        alert('An error occurred while rejecting the provider.');
    });
}

function removeProviderRow(providerId) {
    const tbody = document.getElementById('pending-providers-body');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        const idCell = row.querySelector('td:first-child');
        if (idCell && idCell.textContent == providerId) {
            row.remove();
        }
    });
    
    // Check if table is now empty
    if (tbody.querySelectorAll('tr').length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-5">No pending provider verifications.</td></tr>';
    }
}

function updatePendingCount(delta) {
    const countElement = document.getElementById('pending-providers-count');
    if (!countElement) return;
    
    let currentCount = parseInt(countElement.textContent) || 0;
    currentCount += delta;
    countElement.textContent = Math.max(0, currentCount);
}

function fetchProviderProfiles() {
    // ... existing function ...
    const tbody = document.getElementById('provider-profiles-body');
    if (!tbody) return;

    // Show loading state (optional, or just keep placeholder if it was there)
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4">Loading...</td></tr>';

    fetch('http://127.0.0.1:5000/admin/api/provider-profiles')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            tbody.innerHTML = ''; // Clear loading

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5">No data available.</td></tr>';
                return;
            }

            data.forEach((profile, index) => {
                const tr = document.createElement('tr');
                
                // Status Badge Logic
                let statusBadge = '';
                const status = profile.verification_status.toLowerCase();
                if (status === 'verified') {
                    statusBadge = '<span class="badge bg-success">Verified</span>';
                } else if (status === 'pending') {
                    statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
                } else if (status === 'rejected') {
                    statusBadge = '<span class="badge bg-danger">Rejected</span>';
                } else {
                    statusBadge = `<span class="badge bg-secondary">${profile.verification_status}</span>`;
                }

                // Handle Null Dates
                const verifiedAt = profile.verified_at ? profile.verified_at : '-';
                const businessLicense = profile.business_license ? profile.business_license : '-';

                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>
                        <div class="fw-bold">${profile.business_name}</div>
                        <div class="small text-muted">${profile.username}</div>
                    </td>
                    <td>${profile.provider_type}</td>
                    <td>${statusBadge}</td>
                    <td>${profile.aadhaar_number}</td>
                    <td>${businessLicense}</td>
                    <td>${verifiedAt}</td>
                    <td>${profile.created_at}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('Error fetching provider profiles:', error);
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Error loading data.</td></tr>';
        });
}

// --- House Listings ---
function fetchHouseListings() {
    const tbody = document.getElementById('house-listings-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4">Loading...</td></tr>';

    fetch('http://127.0.0.1:5000/admin/api/house-listings')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-5">No data available.</td></tr>';
                return;
            }

            data.forEach((item, index) => {
                const tr = document.createElement('tr');

                // Status Badge
                let statusBadge = '';
                const status = item.status.toLowerCase();
                if (status === 'approved') {
                    statusBadge = '<span class="badge bg-success">Approved</span>';
                } else if (status === 'pending') {
                    statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
                } else if (status === 'rejected') {
                    statusBadge = '<span class="badge bg-danger">Rejected</span>';
                } else {
                    statusBadge = `<span class="badge bg-secondary">${item.status}</span>`;
                }

                // Price Formatting
                const priceFormatted = new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR'
                }).format(item.price);

                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>
                        <div class="fw-bold">${item.provider_business_name}</div>
                        <div class="small text-muted">${item.provider_username}</div>
                    </td>
                    <td>${item.title}</td>
                    <td>${item.type}</td>
                    <td>${item.location}</td>
                    <td>${priceFormatted}</td>
                    <td>${statusBadge}</td>
                    <td>${item.approved_at || '-'}</td>
                    <td>${item.created_at || '-'}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('Error fetching house listings:', error);
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger py-4">Error loading data.</td></tr>';
        });
}

// --- Tiffin Listings ---
function fetchTiffinListings() {
    const tbody = document.getElementById('tiffin-listings-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4">Loading...</td></tr>';

    fetch('http://127.0.0.1:5000/admin/api/tiffin-listings')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-5">No data available.</td></tr>';
                return;
            }

            data.forEach((item, index) => {
                const tr = document.createElement('tr');

                // Status Badge
                let statusBadge = '';
                const status = item.status.toLowerCase();
                if (status === 'approved') {
                    statusBadge = '<span class="badge bg-success">Approved</span>';
                } else if (status === 'pending') {
                    statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
                } else if (status === 'rejected') {
                    statusBadge = '<span class="badge bg-danger">Rejected</span>';
                } else {
                    statusBadge = `<span class="badge bg-secondary">${item.status}</span>`;
                }

                // Fast Delivery Badge
                const fastDeliveryBadge = item.fast_delivery_available 
                    ? '<span class="badge bg-primary">Fast Delivery</span>' 
                    : '<span class="badge bg-secondary">Standard</span>';

                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>
                        <div class="fw-bold">${item.provider_business_name}</div>
                        <div class="small text-muted">${item.provider_username}</div>
                    </td>
                    <td>${item.delivery_radius} km</td>
                    <td>${fastDeliveryBadge}</td>
                    <td><span class="text-capitalize">${item.diet_type}</span></td>
                    <td>${item.available_days}</td>
                    <td>${statusBadge}</td>
                    <td>${item.approved_at || '-'}</td>
                    <td>${item.created_at || '-'}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('Error fetching tiffin listings:', error);
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger py-4">Error loading data.</td></tr>';
        });
}

// --- Service Listings ---
function fetchServiceListings() {
    const tbody = document.getElementById('service-listings-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4">Loading...</td></tr>';

    fetch('http://127.0.0.1:5000/admin/api/service-listings')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-5">No data available.</td></tr>';
                return;
            }

            data.forEach((item, index) => {
                const tr = document.createElement('tr');

                // Status Badge
                let statusBadge = '';
                const status = item.status.toLowerCase();
                if (status === 'approved') {
                    statusBadge = '<span class="badge bg-success">Approved</span>';
                } else if (status === 'pending') {
                    statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
                } else if (status === 'rejected') {
                    statusBadge = '<span class="badge bg-danger">Rejected</span>';
                } else {
                    statusBadge = `<span class="badge bg-secondary">${item.status}</span>`;
                }

                // Price Formatting
                const priceFormatted = new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR'
                }).format(item.base_price);

                // Category Formatting (snake_case to Title Case)
                const categoryFormatted = item.service_category
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

                // Radius Formatting
                const radiusFormatted = item.service_radius ? `${item.service_radius} km` : 'N/A';

                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td><div class="fw-bold">${item.service_title}</div></td>
                    <td>
                        <div class="fw-bold">${item.provider_business_name}</div>
                        <div class="small text-muted">${item.provider_username}</div>
                    </td>
                    <td>${categoryFormatted}</td>
                    <td>${priceFormatted}</td>
                    <td>${radiusFormatted}</td>
                    <td>${item.availability_days}</td>
                    <td>${statusBadge}</td>
                    <td>${item.approved_at || '-'}</td>
                    <td>${item.created_at || '-'}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('Error fetching service listings:', error);
            tbody.innerHTML = '<tr><td colspan="10" class="text-center text-danger py-4">Error loading data.</td></tr>';
        });
}


// --- Service Bookings Management ---
function fetchServiceBookings() {
    const tbody = document.getElementById('service-bookings-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="11" class="text-center py-4">Loading...</td></tr>';

    fetch('http://127.0.0.1:5000/admin/api/service-bookings')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted py-5">No bookings found.</td></tr>';
                return;
            }

            data.forEach((booking, index) => {
                const tr = document.createElement('tr');

                // Status Badge
                const statusMap = {
                    'requested': 'bg-secondary',
                    'accepted': 'bg-primary',
                    'completed': 'bg-success',
                    'cancelled': 'bg-danger'
                };
                const badgeClass = statusMap[booking.booking_status.toLowerCase()] || 'bg-light text-dark';
                const statusText = booking.booking_status.charAt(0).toUpperCase() + booking.booking_status.slice(1);
                const statusBadge = `<span class="badge ${badgeClass}">${statusText}</span>`;

                // Price Formatting
                const priceDisplay = booking.quoted_price !== null 
                    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(booking.quoted_price)
                    : '<span class="text-muted">Not Quoted</span>';

                // Time Formatting (HH:MM to 12-hour format)
                let timeDisplay = '-';
                if (booking.booking_time) {
                    const [hours, minutes] = booking.booking_time.split(':');
                    const h = parseInt(hours);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const h12 = h % 12 || 12;
                    timeDisplay = `${h12}:${minutes} ${ampm}`;
                }

                // Notes Truncation
                let notesDisplay = booking.notes || '-';
                if (booking.notes && booking.notes.length > 40) {
                    notesDisplay = `<span title="${booking.notes}" data-bs-toggle="tooltip">${booking.notes.substring(0, 40)}...</span>`;
                }

                // Address Truncation 
                let addressDisplay = booking.address || '-';
                if (booking.address && booking.address.length > 40) {
                    addressDisplay = `<span title="${booking.address}" data-bs-toggle="tooltip">${booking.address.substring(0, 40)}...</span>`;
                }

                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td><div class="fw-bold">${booking.customer_username}</div></td>
                    <td><div class="fw-bold">${booking.provider_business_name}</div></td>
                    <td>${booking.service_title}</td>
                    <td>${booking.booking_date || '-'}</td>
                    <td>${timeDisplay}</td>
                    <td>${statusBadge}</td>
                    <td>${addressDisplay}</td>
                    <td>${notesDisplay}</td>
                    <td>${priceDisplay}</td>
                    <td>${booking.created_at || '-'}</td>
                `;
                tbody.appendChild(tr);
            });

            // Re-initialize tooltips
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        })
        .catch(error => {
            console.error('Error fetching service bookings:', error);
            tbody.innerHTML = '<tr><td colspan="11" class="text-center text-danger py-4">Error loading bookings.</td></tr>';
        });
}


// --- Orders Management ---
function fetchOrders() {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="11" class="text-center py-4">Loading...</td></tr>';

    fetch('http://127.0.0.1:5000/admin/api/orders')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted py-5">No orders found.</td></tr>';
                return;
            }

            data.forEach((order, index) => {
                const tr = document.createElement('tr');

                // Status Badge
                let statusBadge = '';
                const status = order.order_status.toLowerCase();
                const statusMap = {
                    'placed': 'bg-secondary',
                    'preparing': 'bg-info text-dark',
                    'out_for_delivery': 'bg-primary',
                    'delivered': 'bg-success',
                    'cancelled': 'bg-danger'
                };
                const badgeClass = statusMap[status] || 'bg-light text-dark';
                // Capitalize status
                const statusText = status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                statusBadge = `<span class="badge ${badgeClass}">${statusText}</span>`;

                // Currency Formatting
                const formatCurrency = (amount) => {
                    return new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR'
                    }).format(amount);
                };

                // Fast Delivery Badge
                const fastDeliveryBadge = order.fast_delivery 
                    ? '<span class="badge bg-warning text-dark">Fast</span>' 
                    : '<span class="badge bg-light text-dark">Standard</span>';

                // Address Truncation
                let address = order.delivery_address;
                let addressDisplay = address;
                if (address.length > 40) {
                    addressDisplay = `<span title="${address}" data-bs-toggle="tooltip">${address.substring(0, 40)}...</span>`;
                }

                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td><div class="fw-bold">${order.customer_username}</div></td>
                    <td><div class="fw-bold">${order.provider_business_name}</div></td>
                    <td>${order.meal_name}</td>
                    <td>${order.quantity}</td>
                    <td>${formatCurrency(order.base_price)}</td>
                    <td><div class="fw-bold">${formatCurrency(order.total_price)}</div></td>
                    <td>${fastDeliveryBadge}</td>
                    <td>${statusBadge}</td>
                    <td>${addressDisplay}</td>
                    <td>${order.order_date || '-'}</td>
                `;
                tbody.appendChild(tr);
            });
            
            // Re-initialize tooltips if needed (Bootstrap 5)
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        })
        .catch(error => {
            console.error('Error fetching orders:', error);
            tbody.innerHTML = '<tr><td colspan="11" class="text-center text-danger py-4">Error loading orders.</td></tr>';
        });
}


// --- Users Management ---

function fetchUsers() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4">Loading...</td></tr>';

    fetch('http://127.0.0.1:5000/admin/api/users')
        .then(response => {
             if (!response.ok) throw new Error('Network response was not ok');
             return response.json();
        })
        .then(data => {
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5">No users found.</td></tr>';
                return;
            }

            data.forEach((user, index) => {
                const tr = document.createElement('tr');

                // Status Badge
                let statusBadge = '';
                if (user.status === 'active') {
                    statusBadge = '<span class="badge bg-success">Active</span>';
                } else if (user.status === 'suspended') {
                    statusBadge = '<span class="badge bg-danger">Suspended</span>';
                } else {
                    statusBadge = `<span class="badge bg-secondary">${user.status}</span>`;
                }

                // Action Button Logic
                let actionBtn = '';
                if (user.account_type === 'admin') {
                     actionBtn = '<span class="text-muted small">Admin Account</span>';
                } else if (user.status === 'active') {
                    actionBtn = `<button class="btn btn-danger btn-sm" onclick="confirmSuspend(${user.id})">Suspend</button>`;
                } else if (user.status === 'suspended') {
                    actionBtn = `<button class="btn btn-secondary btn-sm" disabled>Suspended</button>`;
                }

                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td><div class="fw-bold">${user.username}</div></td>
                    <td>${user.email}</td>
                    <td>${user.phone}</td>
                    <td><span class="text-capitalize">${user.account_type}</span></td>
                    <td>${statusBadge}</td>
                    <td>${user.created_at || '-'}</td>
                    <td>${actionBtn}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('Error fetching users:', error);
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Error loading users.</td></tr>';
        });
}

function confirmSuspend(userId) {
    if (confirm("Are you sure you want to suspend this account?")) {
        fetch(`http://127.0.0.1:5000/admin/api/users/${userId}/suspend`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("User suspended successfully.");
                fetchUsers(); // Refresh table
            } else {
                alert("Failed to suspend user: " + data.message);
            }
        })
        .catch(error => {
            console.error('Error suspending user:', error);
            alert("An error occurred while suspending the user.");
        });
    }
}
