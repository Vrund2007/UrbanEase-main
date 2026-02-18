// UrbanEase Provider Dashboard Script

document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard
    initSidebar();
    fetchProviderStatus();
    fetchUserProfile();
    setupVerificationForm();
    setupFilePreview();
    setupFilePreview();
    setupDashboardCardClicks();
    fetchHouseListings();
    fetchDashboardStats();
    fetchActiveOrdersCount();
    fetchActiveServiceBookingsCount();
    fetchServiceListingsForBookings();
});

// --- Active Orders Count ---
function fetchActiveOrdersCount() {
    fetch('/provider/orders/active-count', { method: 'GET', credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            const el = document.getElementById('food-order-count');
            if (el) {
                const newCount = data.active_count || 0;
                animateCountChange(el, newCount);
            }
        })
        .catch(err => console.error('Error fetching active orders count:', err));
}

function animateCountChange(element, newValue) {
    const currentValue = parseInt(element.textContent) || 0;
    if (currentValue === newValue) return;
    
    element.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
    element.style.transform = 'scale(1.2)';
    element.style.opacity = '0.7';
    
    setTimeout(() => {
        element.textContent = newValue;
        element.style.transform = 'scale(1)';
        element.style.opacity = '1';
    }, 200);
}

// --- Dashboard Card Click Handlers ---
function setupDashboardCardClicks() {
    const foodOrdersCard = document.getElementById('active-food-orders-card');
    const serviceBookingsCard = document.getElementById('active-service-bookings-card');
    
    if (foodOrdersCard) {
        foodOrdersCard.addEventListener('click', function() {
            console.log('Active Food Orders clicked');
        });
    }
    
    if (serviceBookingsCard) {
        serviceBookingsCard.addEventListener('click', function() {
            console.log('Active Service Bookings clicked');
        });
    }
}

// --- Sidebar Navigation ---
function initSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('providerSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const sidebarLinks = document.querySelectorAll('.sidebar-link[data-section]');

    // Mobile sidebar toggle
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
    }

    // Close sidebar on overlay click
    if (overlay) {
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    // Section navigation
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Skip if disabled
            if (this.classList.contains('disabled')) {
                return;
            }

            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);

            // Update active state
            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            // Close mobile sidebar
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    });
}

function showSection(sectionId) {
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById('section-' + sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        if (sectionId === 'food-orders') {
            fetchFoodOrdersTiffins();
        }
    }
}

// --- Fetch Provider Status ---
function fetchProviderStatus() {
    fetch('/provider/api/status', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        if (response.status === 401) {
            window.location.href = '/login';
            return null;
        }
        if (response.status === 403) {
            window.location.href = '/';
            return null;
        }
        return response.json();
    })
    .then(data => {
        if (!data) return;
        
        updateDashboardBasedOnStatus(data);
    })
    .catch(error => {
        console.error('Error fetching provider status:', error);
    });
}

function fetchDashboardStats() {
    fetch('/provider/api/dashboard-stats')
        .then(res => res.json())
        .then(data => {
            if (data.error) return;
            
            // House Count
            const houseCount = document.getElementById('house-count');
            if (houseCount) houseCount.textContent = data.house_count || 0;
            
            // Tiffin Count
            const tiffinCount = document.getElementById('tiffin-count');
            if (tiffinCount) tiffinCount.textContent = data.tiffin_count || 0;
            
            // Service Count
            const serviceCount = document.getElementById('service-count');
            if (serviceCount) serviceCount.textContent = data.service_count || 0;

            // Food Orders
             const foodOrderCount = document.getElementById('food-order-count');
             if (foodOrderCount) foodOrderCount.textContent = data.order_count || 0;

             // Service Bookings
             const serviceBookingCount = document.getElementById('service-booking-count');
             if (serviceBookingCount) serviceBookingCount.textContent = data.booking_count || 0;
        })
        .catch(err => console.error('Error fetching dashboard stats:', err));
}

function updateDashboardBasedOnStatus(data) {
    const bannerContainer = document.getElementById('status-banner-container');
    const verificationContent = document.getElementById('verification-required-content');
    const verifiedContent = document.getElementById('verified-dashboard-content');
    const requiresVerificationLinks = document.querySelectorAll('.requires-verification');

    // Clear any existing banners
    bannerContainer.innerHTML = '';

    if (!data.has_profile) {
        // CASE 1: No profile exists - show verification form
        showBanner(bannerContainer, 'info', 'fa-info-circle', 'Complete your verification to start offering services on UrbanEase.');
        verificationContent.style.display = 'block';
        verifiedContent.style.display = 'none';
        lockSidebar(requiresVerificationLinks);
    } 
    else if (data.verification_status === 'pending') {
        // CASE 2: Pending verification
        showBanner(bannerContainer, 'warning', 'fa-clock', 'Your verification is under review. We will notify you once it is approved.');
        verificationContent.style.display = 'none';
        verifiedContent.style.display = 'none';
        lockSidebar(requiresVerificationLinks);
    }
    else if (data.verification_status === 'rejected') {
        // CASE 3: Rejected - show form again
        showBanner(bannerContainer, 'danger', 'fa-times-circle', 'Your verification was rejected. Please review your information and reapply.');
        verificationContent.style.display = 'block';
        verifiedContent.style.display = 'none';
        lockSidebar(requiresVerificationLinks);
        
        // Pre-fill form with existing data
        if (data.profile) {
            prefillVerificationForm(data.profile);
        }
    }
    else if (data.verification_status === 'verified') {
        // CASE 4: Verified - full access
        showBanner(bannerContainer, 'success', 'fa-check-circle', 'Your account is verified. You can now access all features.');
        verificationContent.style.display = 'none';
        verifiedContent.style.display = 'block';
        unlockSidebar(requiresVerificationLinks);
    }

    // Update profile section
    if (data.profile) {
        updateProfileSection(data.profile, data.verification_status);
    }
    
    // Update Add Listing Button Visibility
    const addHouseBtn = document.getElementById('add-house-btn');
    if (addHouseBtn) {
        if (data.verification_status === 'verified') {
            addHouseBtn.style.display = 'block';
        } else {
            addHouseBtn.style.display = 'none';
        }
    }
}

function showBanner(container, type, icon, message) {
    const banner = document.createElement('div');
    banner.className = `status-banner ${type}`;
    banner.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    container.appendChild(banner);
}

function lockSidebar(links) {
    links.forEach(link => {
        link.classList.add('disabled');
        link.setAttribute('title', 'Complete verification to unlock this feature');
    });
}

function unlockSidebar(links) {
    links.forEach(link => {
        link.classList.remove('disabled');
        link.removeAttribute('title');
    });
}

function prefillVerificationForm(profile) {
    document.getElementById('business_name').value = profile.business_name || '';
    document.getElementById('aadhaar_number').value = profile.aadhaar_number || '';
    document.getElementById('business_license').value = profile.business_license || '';
}

function updateProfileSection(profile, status) {
    // Update profile card
    document.getElementById('profile-business').textContent = profile.business_name || '--';
    document.getElementById('profile-aadhaar').textContent = profile.aadhaar_number ? maskAadhaar(profile.aadhaar_number) : '--';
    document.getElementById('profile-license').textContent = profile.business_license || 'N/A';
    
    // Update status badge
    const badge = document.getElementById('profile-badge');
    if (status === 'verified') {
        badge.className = 'badge bg-success';
        badge.textContent = 'Verified';
    } else if (status === 'pending') {
        badge.className = 'badge bg-warning';
        badge.textContent = 'Pending';
    } else if (status === 'rejected') {
        badge.className = 'badge bg-danger';
        badge.textContent = 'Rejected';
    }

    // Update profile image
    const profileImage = document.getElementById('profile-image');
    if (profile.profile_image) {
        profileImage.src = '/static/images/database_images/' + (profile.profile_image || '');
    } else {
        profileImage.src = 'https://via.placeholder.com/120?text=No+Photo';
    }
}


function maskAadhaar(aadhaar) {
    if (aadhaar && aadhaar.length === 12) {
        return 'XXXX XXXX ' + aadhaar.slice(-4);
    }
    return aadhaar;
}

// --- Fetch User Profile ---
function fetchUserProfile() {
    fetch('/provider/api/user-profile', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.phone) {
            document.getElementById('phone').value = data.phone;
        }
        if (data.username) {
            document.getElementById('profile-name').textContent = data.username;
        }
        if (data.email) {
            document.getElementById('profile-email').textContent = data.email;
        }
        if (data.phone) {
            document.getElementById('profile-phone').textContent = data.phone;
        }
    })
    .catch(error => {
        console.error('Error fetching user profile:', error);
    });
}

// --- Verification Form ---
function setupVerificationForm() {
    const form = document.getElementById('verification-form');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validate Aadhaar
            const aadhaar = document.getElementById('aadhaar_number').value;
            if (!/^\d{12}$/.test(aadhaar)) {
                alert('Please enter a valid 12-digit Aadhaar number');
                return;
            }

            // Validate file if uploaded
            const fileInput = document.getElementById('profile_photo');
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                if (!['image/jpeg', 'image/jpg'].includes(file.type)) {
                    alert('Only JPEG images are allowed for profile photo');
                    return;
                }
                if (file.size > 5 * 1024 * 1024) {
                    alert('Profile photo must be less than 5MB');
                    return;
                }
            }

            submitVerification(new FormData(form));
        });
    }
}

function submitVerification(formData) {
    const submitBtn = document.getElementById('submit-verification');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting...';

    fetch('/provider/api/apply-verification', {
        method: 'POST',
        credentials: 'include',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Verification application submitted successfully! Your application is now under review.');
            // Refresh the page to show updated status
            window.location.reload();
        } else {
            alert('Error: ' + (data.message || 'Failed to submit verification'));
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Submit for Verification';
        }
    })
    .catch(error => {
        console.error('Error submitting verification:', error);
        alert('An error occurred. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Submit for Verification';
    });
}

// --- File Preview ---
function setupFilePreview() {
    const fileInput = document.getElementById('profile_photo');
    const previewContainer = document.getElementById('image-preview-container');
    const previewImage = document.getElementById('image-preview');

    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            
            if (file) {
                // Validate file type
                if (!['image/jpeg', 'image/jpg'].includes(file.type)) {
                    alert('Only JPEG images are allowed');
                    fileInput.value = '';
                    previewContainer.style.display = 'none';
                    return;
                }

                // Show preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImage.src = e.target.result;
                    previewContainer.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                previewContainer.style.display = 'none';
            }
        });
    }
}
document.getElementById("brandLink").addEventListener("click", function (e) {
    e.preventDefault(); // prevent #
    document.getElementById("dashboardLink").click();
});
// --- House Listings ---

function fetchHouseListings() {
    const container = document.getElementById('house-listings-container');
    if (!container) return;

    fetch('/provider/api/house-listings')
        .then(response => {
            if (response.status === 403 || response.status === 404) {
                // Not verified or no profile, just clear container or show message if needed
                // For now, we'll handle this via status check for the button, 
                // and here we just show empty if failed.
                return []; 
            }
            return response.json();
        })
        .then(data => {
            renderHouseListings(data);
            // Update dashboard count
            const countElement = document.getElementById('house-count');
            if (countElement) countElement.textContent = data.length || 0;
        })
        .catch(error => {
            console.error('Error fetching house listings:', error);
            container.innerHTML = '<p class="text-center text-danger py-5">Error loading listings.</p>';
        });
}

function renderHouseListings(listings) {
    const container = document.getElementById('house-listings-container');
    if (!listings || listings.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-home fa-3x text-muted mb-3"></i>
                <h4 class="text-muted">No house listings yet.</h4>
                <p class="text-muted mb-4">Start by adding your first property listing.</p>
                <div id="empty-state-action"></div> 
            </div>
        `;
        // Move the add button here if logic requires, but we have a fixed header button.
        // The requirements said: "Show button... Button style must be EXACT same as login button".
        // We have the button in the header. We can also duplicate it here or just point to it.
        // For now, the header button is sufficient as per standard UI patterns, 
        // but to strictly follow "Show centered message... Show button...", I'll add one here too if verified.
        
        // Check verification status to show button in empty state
        const addBtn = document.getElementById('add-house-btn');
        if (addBtn && addBtn.style.display !== 'none') {
             const actionDiv = document.getElementById('empty-state-action');
             actionDiv.innerHTML = `
                <button class="btn btn-primary" onclick="openAddHouseModal()">
                    <i class="fas fa-plus me-2"></i>Add New Listing
                </button>
             `;
        }
        return;
    }

    container.className = 'house-listings-grid';
    container.innerHTML = '';

    listings.forEach(listing => {
        const card = document.createElement('div');
        card.className = 'listing-card';
        
        // Status Badge
        let statusClass = 'badge-pending';
        if (listing.status === 'approved') statusClass = 'badge-approved';
        else if (listing.status === 'rejected') statusClass = 'badge-rejected';
        
        // Image
        const imageSrc = listing.preview_image 
            ? `/static/images/database_images/${listing.preview_image}` 
            : 'https://via.placeholder.com/400x300?text=No+Image';

        card.innerHTML = `
            <div class="listing-image-container">
                <img src="${imageSrc}" alt="${listing.title}" class="listing-image">
                <span class="listing-badge ${statusClass}">${listing.status}</span>
            </div>
            <div class="listing-details">
                <div class="listing-type">${listing.type}</div>
                <h3 class="listing-title">${listing.title}</h3>
                <div class="listing-location">
                    <i class="fas fa-map-marker-alt"></i>
                    <span class="text-truncate">${listing.location}</span>
                </div>
                <div class="listing-price">
                    <span>₹${listing.price.toLocaleString('en-IN')}</span>
                    <button class="btn btn-sm btn-outline-primary" onclick='openViewHouseModal(${JSON.stringify(listing).replace(/'/g, "&#39;")})'>
                        View Details
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- Add Listing Modal ---

function openAddHouseModal() {
    const modal = new bootstrap.Modal(document.getElementById('addHouseModal'));
    document.getElementById('addHouseForm').reset();
    updatePriceLabel(); // Reset label
    toggleTypeFields(); // Show initial type fields
    modal.show();
}

function updatePriceLabel() {
    const type = document.getElementById('house-type').value;
    const label = document.getElementById('price-label');
    if (type === 'Apartment') {
        label.innerHTML = 'Full Property Price <span class="text-danger">*</span>';
    } else {
        label.innerHTML = 'Monthly Rent <span class="text-danger">*</span>';
    }
}

function toggleTypeFields() {
    const type = document.getElementById('house-type').value;
    const container = document.getElementById('type-specific-fields');
    
    if (!container) return;
    
    let html = '';
    
    if (type === 'Hostel') {
        html = `
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">Gender <span class="text-danger">*</span></label>
                    <select class="form-select" name="gender" required>
                        <option value="boys">Boys</option>
                        <option value="girls">Girls</option>
                        <option value="coed">Co-ed</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Room Type <span class="text-danger">*</span></label>
                    <select class="form-select" name="room_type" required>
                        <option value="single">Single</option>
                        <option value="double">Double</option>
                        <option value="dorm">Dorm</option>
                    </select>
                </div>
                <div class="col-md-12">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="wifi" id="hostel-wifi" value="true">
                        <label class="form-check-label" for="hostel-wifi">WiFi Available</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="attached_bathroom" id="hostel-bathroom" value="true">
                        <label class="form-check-label" for="hostel-bathroom">Attached Bathroom</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="food_included" id="hostel-food" value="true">
                        <label class="form-check-label" for="hostel-food">Food Included</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="laundry" id="hostel-laundry" value="true">
                        <label class="form-check-label" for="hostel-laundry">Laundry Service</label>
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'PG') {
        html = `
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">Gender <span class="text-danger">*</span></label>
                    <select class="form-select" name="gender" required>
                        <option value="boys">Boys</option>
                        <option value="girls">Girls</option>
                        <option value="coed">Co-ed</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Sharing <span class="text-danger">*</span></label>
                    <select class="form-select" name="sharing" required>
                        <option value="1">1 Sharing</option>
                        <option value="2">2 Sharing</option>
                        <option value="3">3 Sharing</option>
                        <option value="4+">4+ Sharing</option>
                    </select>
                </div>
                <div class="col-md-12">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="ac_available" id="pg-ac" value="true">
                        <label class="form-check-label" for="pg-ac">AC Available</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="food_included" id="pg-food" value="true">
                        <label class="form-check-label" for="pg-food">Food Included</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="laundry" id="pg-laundry" value="true">
                        <label class="form-check-label" for="pg-laundry">Laundry Service</label>
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'Apartment') {
        html = `
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">Listing Purpose <span class="text-danger">*</span></label>
                    <select class="form-select" name="listing_purpose" required>
                        <option value="rent">Rent</option>
                        <option value="sale">Sale</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">BHK <span class="text-danger">*</span></label>
                    <select class="form-select" name="bhk" required>
                        <option value="1">1 BHK</option>
                        <option value="2">2 BHK</option>
                        <option value="3">3 BHK</option>
                        <option value="4+">4+ BHK</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Tenant Preference <span class="text-danger">*</span></label>
                    <select class="form-select" name="tenant_preference" required>
                        <option value="family">Family</option>
                        <option value="bachelor">Bachelor</option>
                        <option value="any">Any</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Furnishing <span class="text-danger">*</span></label>
                    <select class="form-select" name="furnishing" required>
                        <option value="furnished">Furnished</option>
                        <option value="semi">Semi-Furnished</option>
                        <option value="unfurnished">Unfurnished</option>
                    </select>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// --- IndexedDB Utilities for Payment Flow ---
const DB_NAME = 'UrbanEaseProviderDB';
const DB_VERSION = 1;
const STORE_NAME = 'pendingListings';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
        request.onerror = function(event) {
            reject('IndexedDB error: ' + event.target.errorCode);
        };
    });
}

function savePendingListing(data) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            // Use fixed ID 'current_listing' as we only process one at a time
            const request = store.put({ id: 'current_listing', ...data });
            request.onsuccess = () => resolve();
            request.onerror = () => reject('Error saving pending listing');
        });
    });
}

function getPendingListing() {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get('current_listing');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject('Error retrieving pending listing');
        });
    });
}

function clearPendingListing() {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete('current_listing');
            request.onsuccess = () => resolve();
            request.onerror = () => reject('Error clearing pending listing');
        });
    });
}

// --- Submit Handler with Payment ---

function startListingPaymentFlow(event) {
    event.preventDefault();
    
    const form = document.getElementById('addHouseForm');
    const formData = new FormData(form);
    
    // Convert FormData to object for storage
    const listingData = {};
    for (const [key, value] of formData.entries()) {
        // Handle files separately
        if (value instanceof File) {
             if (!listingData.files) listingData.files = [];
             listingData.files.push(value);
        } else {
             listingData[key] = value;
        }
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Redirecting to Payment...';
    
    // Add type for return handler
    listingData.listing_type = 'house';

    // Store data in IndexedDB and redirect
    savePendingListing(listingData)
        .then(() => {
            window.location.href = '/payment';
        })
        .catch(err => {
            console.error(err);
            alert('Failed to initiate payment flow. Please try again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        });
}

// --- Payment Return Handler ---

function handlePaymentReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
        // Clear URL param
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Show processing toast/modal? For now just log
        console.log('Payment successful. Submitting listing...');
        
        getPendingListing().then(data => {
            if (!data) return;
            
            // Reconstruct FormData
            const formData = new FormData();
            for (const key in data) {
                if (key !== 'id' && key !== 'files') {
                    formData.append(key, data[key]);
                }
            }
            if (data.files) {
                data.files.forEach(file => formData.append('images', file));
            }
            // Add payment success flag
            formData.append('payment_status', 'success');
            
            // Determine endpoint based on type
            let endpoint;
            if (data.listing_type === 'tiffin') {
                endpoint = '/provider/api/tiffin-listings/add';
            } else if (data.listing_type === 'service') {
                endpoint = '/provider/api/service-listings/add';
            } else {
                endpoint = '/provider/api/house-listings/add';
            }

            // Send to backend
            fetch(endpoint, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(res => {
                if (res.success) {
                    alert('Payment successful! Listing added.');
                    clearPendingListing();
                    if (data.listing_type === 'tiffin') fetchTiffinListings();
                    else if (data.listing_type === 'service') fetchServiceListings();
                    else fetchHouseListings();
                } else {
                    alert('Error adding listing: ' + res.message);
                }
            })
            .catch(err => {
                console.error('Submission error:', err);
                alert('Error submitting listing after payment.');
            });
        });
    }
}

// Check for payment return on load
document.addEventListener('DOMContentLoaded', function() {
    handlePaymentReturn();
});

// --- View Listing Modal ---

function openViewHouseModal(listing) {
    // Populate details
    document.getElementById('view-title').textContent = listing.title;
    document.getElementById('view-status').textContent = listing.status;
    document.getElementById('view-status').className = `badge ${listing.status === 'approved' ? 'bg-success' : listing.status === 'rejected' ? 'bg-danger' : 'bg-warning'}`;
    document.getElementById('view-price').textContent = '₹' + listing.price.toLocaleString('en-IN');
    document.getElementById('view-type').textContent = listing.type;
    document.getElementById('view-location').textContent = listing.location;
    document.getElementById('view-created').textContent = listing.created_at || '--';
    document.getElementById('view-approved').textContent = listing.approved_at || '--';
    document.getElementById('view-description').textContent = listing.description;
    
    // Populate carousel
    const carouselInner = document.getElementById('view-carousel-inner');
    const carouselIndicators = document.getElementById('view-carousel-indicators');
    carouselInner.innerHTML = '';
    carouselIndicators.innerHTML = '';
    
    if (listing.images && listing.images.length > 0) {
        listing.images.forEach((img, index) => {
            // Indicator
            const indicator = document.createElement('button');
            indicator.type = 'button';
            indicator.dataset.bsTarget = '#houseDetailsCarousel';
            indicator.dataset.bsSlideTo = index;
            if (index === 0) indicator.classList.add('active');
            carouselIndicators.appendChild(indicator);
            
            // Slide
            const slide = document.createElement('div');
            slide.className = `carousel-item ${index === 0 ? 'active' : ''}`;
            slide.innerHTML = `<img src="/static/images/database_images/${img.image_path}" class="d-block w-100" style="height: 350px; object-fit: cover;" alt="House Image">`;
            carouselInner.appendChild(slide);
        });
    } else {
        carouselInner.innerHTML = '<div class="carousel-item active"><div class="d-flex align-items-center justify-content-center h-100 bg-secondary text-white">No Images</div></div>';
    }
    
    const modal = new bootstrap.Modal(document.getElementById('viewHouseModal'));
    modal.show();
}

// --- Tiffin Listings ---

function fetchTiffinListings() {
    const container = document.getElementById('tiffin-listings-container');
    // If element doesn't exist, we might be on a different view or section hidden
    if (!container) return;

    fetch('/provider/api/tiffin-listings')
        .then(response => {
            if (response.status === 403 || response.status === 404) return [];
            return response.json();
        })
        .then(data => {
            renderTiffinListings(data);
        })
        .catch(error => {
            console.error('Error fetching tiffin listings:', error);
            container.innerHTML = '<p class="text-center text-danger py-5">Error loading listings.</p>';
        });
}

function renderTiffinListings(listings) {
    const container = document.getElementById('tiffin-listings-container');
    if (!container) return;
    
    // Add Button Visibility
    const addBtn = document.getElementById('add-tiffin-btn');
    if (addBtn) addBtn.style.display = 'block'; 

    if (!listings || listings.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-utensils fa-3x text-muted mb-3"></i>
                <h4 class="text-muted">No tiffin services yet.</h4>
                <p class="text-muted mb-4">Start by adding your first tiffin service.</p>
                <button class="btn btn-primary" onclick="openAddTiffinModal()">
                    <i class="fas fa-plus me-2"></i>Add New Tiffin Service
                </button>
            </div>
        `;
        if (addBtn) addBtn.style.display = 'none';
        return;
    }

    container.className = 'house-listings-grid'; // Reuse grid class
    container.innerHTML = '';

    listings.forEach(listing => {
        const card = document.createElement('div');
        card.className = 'listing-card';
        
        let statusClass = 'badge-pending';
        if (listing.status === 'approved') statusClass = 'badge-approved';
        else if (listing.status === 'rejected') statusClass = 'badge-rejected';
        
        const imageSrc = listing.preview_image 
            ? `/static/images/database_images/${listing.preview_image}` 
            : 'https://via.placeholder.com/400x300?text=No+Image';

        card.innerHTML = `
            <div class="listing-image-container">
                <img src="${imageSrc}" alt="Tiffin Service" class="listing-image">
                <span class="listing-badge ${statusClass}">${listing.status}</span>
                ${listing.fast_delivery_available ? '<span class="badge bg-info position-absolute top-0 start-0 m-2"><i class="fas fa-bolt me-1"></i>Fast</span>' : ''}
            </div>
            <div class="listing-details">
                <div class="d-flex justify-content-between">
                    <div class="listing-type text-capitalize">${listing.diet_type}</div>
                    <small class="text-muted">${listing.delivery_radius} km</small>
                </div>
                <h3 class="listing-title">Tiffin Service</h3>
                <div class="listing-location">
                    <i class="fas fa-calendar-alt me-1"></i>
                    <span class="text-truncate" style="max-width: 100%; display: inline-block;">${listing.available_days}</span>
                </div>
                <div class="listing-price mt-2">
                     <button class="btn btn-sm btn-outline-primary w-100" onclick='openViewTiffinModal(${JSON.stringify(listing).replace(/'/g, "&#39;")})'>
                        View Details
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function openAddTiffinModal() {
    const modal = new bootstrap.Modal(document.getElementById('addTiffinModal'));
    document.getElementById('addTiffinForm').reset();
    document.getElementById('tiffin-diet-type').value = '';
    document.getElementById('tiffin-days').value = '';
    
    // Reset errors and checks
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    document.querySelectorAll('.invalid-feedback').forEach(el => el.style.display = 'none');
    
    modal.show();
}

function validateTiffinForm(event) {
    // Diet Type Logic
    const veg = document.getElementById('diet-veg').checked;
    const nonveg = document.getElementById('diet-nonveg').checked;
    const dietInput = document.getElementById('tiffin-diet-type');
    const dietError = document.getElementById('diet-error');
    
    if (veg && nonveg) dietInput.value = 'both';
    else if (veg) dietInput.value = 'veg';
    else if (nonveg) dietInput.value = 'non-veg';
    else dietInput.value = '';
    
    if (!dietInput.value) {
        dietError.style.display = 'block';
        if(event) event.preventDefault();
        return false;
    } else {
        dietError.style.display = 'none';
    }

    // Available Days Logic
    const days = [];
    document.querySelectorAll('.day-check:checked').forEach(cb => days.push(cb.value));
    
    const daysInput = document.getElementById('tiffin-days');
    const daysError = document.getElementById('days-error');
    
    if (days.length === 0) {
        daysInput.value = '';
        daysError.style.display = 'block';
        if(event) event.preventDefault();
        return false;
    } else {
        daysError.style.display = 'none';
    }
    
    if (days.length === 7) daysInput.value = 'All Days';
    else if (days.length === 5 && !days.includes('Saturday') && !days.includes('Sunday')) daysInput.value = 'Weekdays';
    else if (days.length === 2 && days.includes('Saturday') && days.includes('Sunday')) daysInput.value = 'Weekends';
    else daysInput.value = days.join(', ');
    
    return true;
}

function startTiffinPaymentFlow(event) {
    if (!validateTiffinForm(event)) return;
    event.preventDefault();
    
    const form = document.getElementById('addTiffinForm');
    const formData = new FormData(form);
    
    const listingData = {};
    for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
             if (!listingData.files) listingData.files = [];
             listingData.files.push(value);
        } else {
             listingData[key] = value;
        }
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Redirecting to Pay...';

    // Store data in IndexedDB
    savePendingListing({ ...listingData, listing_type: 'tiffin' })
        .then(() => {
            window.location.href = '/payment'; 
        })
        .catch(err => {
            console.error(err);
            alert('Failed to initiate payment flow.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        });
}

function openViewTiffinModal(listing) {
    document.getElementById('tiffin-view-status').textContent = listing.status;
    document.getElementById('tiffin-view-status').className = 'badge ' + 
        (listing.status === 'approved' ? 'bg-success' : listing.status === 'rejected' ? 'bg-danger' : 'bg-warning');
        
    document.getElementById('tiffin-view-radius').textContent = listing.delivery_radius + ' km';
    document.getElementById('tiffin-view-fast').textContent = listing.fast_delivery_available ? 'Yes' : 'No';
    document.getElementById('tiffin-view-diet').textContent = listing.diet_type;
    document.getElementById('tiffin-view-days').textContent = listing.available_days || 'N/A';
    document.getElementById('tiffin-view-created').textContent = listing.created_at;

    // Carousel
    const indicators = document.getElementById('tiffin-carousel-indicators');
    const inner = document.getElementById('tiffin-carousel-inner');
    indicators.innerHTML = '';
    inner.innerHTML = '';
    
    const images = listing.preview_image ? [listing.preview_image] : [];
    
    if (images.length === 0) {
        inner.innerHTML = '<div class="carousel-item active"><div class="d-flex align-items-center justify-content-center h-100 bg-secondary text-white">No Images</div></div>';
    } else {
        images.forEach((img, index) => {
            const isActive = index === 0 ? 'active' : '';
            
            const indicator = document.createElement('button');
            indicator.type = 'button';
            indicator.dataset.bsTarget = '#tiffinDetailsCarousel';
            indicator.dataset.bsSlideTo = index;
            if (index === 0) indicator.className = 'active';
            indicators.appendChild(indicator);
            
            const item = document.createElement('div');
            item.className = `carousel-item ${isActive}`;
            item.innerHTML = `<img src="/static/images/database_images/${img}" class="d-block w-100" style="height: 350px; object-fit: cover;" alt="Tiffin Image">`;
            inner.appendChild(item);
        });
    }

    new bootstrap.Modal(document.getElementById('viewTiffinModal')).show();
}

// --- Service Listings ---
// --- Service Listings ---

function fetchServiceListings() {
    const container = document.getElementById('service-listings-container');
    if (!container) return;

    fetch('/provider/api/service-listings')
        .then(response => {
            if (response.status === 403 || response.status === 404) return [];
            return response.json();
        })
        .then(data => {
            renderServiceListings(data);
        })
        .catch(error => {
            console.error('Error fetching service listings:', error);
            container.innerHTML = '<p class="text-center text-danger py-5">Error loading services.</p>';
        });
}

function renderServiceListings(listings) {
    const container = document.getElementById('service-listings-container');
    if (!container) return;
    
    const addBtn = document.getElementById('add-service-btn');
    if (addBtn) addBtn.style.display = 'block'; 

    if (!listings || listings.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-tools fa-3x text-muted mb-3"></i>
                <h4 class="text-muted">No services added yet.</h4>
                <p class="text-muted mb-4">Start by adding your first professional service.</p>
                <button class="btn btn-primary" onclick="openAddServiceModal()">
                    <i class="fas fa-plus me-2"></i>Add New Service
                </button>
            </div>
        `;
        if (addBtn) addBtn.style.display = 'none';
        return;
    }

    container.className = 'house-listings-grid'; // Reuse grid class
    container.innerHTML = '';

    listings.forEach(listing => {
        const card = document.createElement('div');
        card.className = 'listing-card';
        
        let statusClass = 'badge-pending';
        if (listing.status === 'approved') statusClass = 'badge-approved';
        else if (listing.status === 'rejected') statusClass = 'badge-rejected';
        
        // Map category to icon/image placeholder if needed, or just use category name
        // For now, no images for services, so maybe a colored pattern or icon?
        // Let's use a generic service placeholder or icon based on category.
        
        const categoryIcons = {
            'electrician': 'fa-bolt',
            'plumber': 'fa-faucet',
            'carpenter': 'fa-hammer',
            'ac_repair': 'fa-snowflake',
            'cleaning': 'fa-broom',
            'packers_movers': 'fa-truck',
            'wifi_installation': 'fa-wifi',
            'gas_connection': 'fa-burn',
            'laundry': 'fa-tshirt'
        };
        
        const icon = categoryIcons[listing.service_category] || 'fa-tools';
        
        card.innerHTML = `
            <div class="listing-image-container d-flex align-items-center justify-content-center bg-light" style="height: 200px;">
                <i class="fas ${icon} fa-4x text-secondary"></i>
                <span class="listing-badge ${statusClass}">${listing.status}</span>
            </div>
            <div class="listing-details">
                <div class="d-flex justify-content-between">
                    <span class="badge bg-secondary text-capitalize">${listing.service_category.replace('_', ' ')}</span>
                    <small class="text-muted">${listing.service_radius} km</small>
                </div>
                <h3 class="listing-title mt-2">${listing.service_title}</h3>
                <div class="listing-price text-primary fw-bold">₹${listing.base_price} <small class="text-muted fw-normal">/ visit</small></div>
                
                <div class="listing-location mt-2">
                    <i class="fas fa-calendar-alt me-1"></i>
                    <span class="text-truncate" style="max-width: 100%; display: inline-block;">${listing.availability_days}</span>
                </div>
                
                <div class="mt-3">
                     <button class="btn btn-sm btn-outline-primary w-100" onclick='openViewServiceModal(${JSON.stringify(listing).replace(/'/g, "&#39;")})'>
                        View Details
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function openAddServiceModal() {
    const modal = new bootstrap.Modal(document.getElementById('addServiceModal'));
    document.getElementById('addServiceForm').reset();
    document.getElementById('service-days').value = '';
    
    // Reset errors
    document.getElementById('svc-days-error').style.display = 'none';
    
    modal.show();
}

function startServicePaymentFlow(event) {
    event.preventDefault();
    
    // Validation
    const form = document.getElementById('addServiceForm');
    
    // Days validation
    const days = [];
    document.querySelectorAll('.service-day-check:checked').forEach(cb => days.push(cb.value));
    
    const daysInput = document.getElementById('service-days');
    const daysError = document.getElementById('svc-days-error');
    
    if (days.length === 0) {
        daysInput.value = '';
        if (daysError) daysError.style.display = 'block';
        return;
    } else {
        if (daysError) daysError.style.display = 'none';
    }
    
    if (days.length === 7) daysInput.value = 'All Days';
    else if (days.length === 5 && !days.includes('Saturday') && !days.includes('Sunday')) daysInput.value = 'Weekdays';
    else if (days.length === 2 && days.includes('Saturday') && days.includes('Sunday')) daysInput.value = 'Weekends';
    else daysInput.value = days.join(', ');

    const formData = new FormData(form);
    const listingData = {};
    for (const [key, value] of formData.entries()) {
        listingData[key] = value;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';

    // Store data in IndexedDB
    savePendingListing({ ...listingData, listing_type: 'service' })
        .then(() => {
            window.location.href = '/payment'; 
        })
        .catch(err => {
            console.error(err);
            alert('Failed to initiate payment flow.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        });
}

function openViewServiceModal(listing) {
    document.getElementById('svc-view-title').textContent = listing.service_title;
    document.getElementById('svc-view-category').textContent = listing.service_category.replace('_', ' ');
    
    const statusBadge = document.getElementById('svc-view-status');
    statusBadge.textContent = listing.status;
    statusBadge.className = 'badge ' + 
        (listing.status === 'approved' ? 'bg-success' : listing.status === 'rejected' ? 'bg-danger' : 'bg-warning');

    document.getElementById('svc-view-price').textContent = listing.base_price;
    document.getElementById('svc-view-desc').textContent = listing.description;
    document.getElementById('svc-view-radius').textContent = listing.service_radius + ' km';
    document.getElementById('svc-view-created').textContent = listing.created_at;
    document.getElementById('svc-view-days').textContent = listing.availability_days;

    new bootstrap.Modal(document.getElementById('viewServiceModal')).show();
}

// --- Food Orders Logic ---

let currentManageTiffinId = null;

function fetchFoodOrdersTiffins() {
    const container = document.getElementById('food-orders-tiffins-container');
    if (!container) return;
    
    fetch('/provider/api/tiffin-listings', { method: 'GET', credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) {
                container.innerHTML = '<div class="text-center py-5"><p class="text-muted">No tiffin listings found. Add a listing first.</p></div>';
                return;
            }

            container.innerHTML = '';
            
            data.forEach(listing => {
                const card = document.createElement('div');
                card.className = 'house-listing-card';
                
                const statusBadgeClass = listing.status === 'approved' ? 'bg-success' : listing.status === 'rejected' ? 'bg-danger' : 'bg-warning';
                
                // Image
                let imageHtml = '<div class="house-listing-image d-flex align-items-center justify-content-center bg-light"><i class="fas fa-utensils fa-2x text-secondary"></i></div>';
                if (listing.preview_image) {
                     imageHtml = `<img src="/static/images/database_images/${listing.preview_image}" alt="Tiffin" class="house-listing-image">`;
                }

                const isApproved = listing.status === 'approved';

                card.innerHTML = `
                    ${imageHtml}
                    <div class="house-listing-details">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge ${statusBadgeClass}">${listing.status}</span>
                            <span class="badge bg-info text-dark">${listing.diet_type}</span>
                        </div>
                        <p class="text-muted small mb-3"><i class="fas fa-map-marker-alt me-1"></i>Radius: ${listing.delivery_radius} km</p>
                        
                        <div class="d-grid">
                            <button class="btn btn-manage-kitchen btn-sm" 
                                onclick="openManageKitchen(${listing.id}, '${listing.diet_type} Tiffin', ${listing.kitchen_open})"
                                ${!isApproved ? 'disabled' : ''}>
                                ${!isApproved ? 'Pending Approval' : 'Manage Kitchen'}
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        })
        .catch(err => {
            console.error('Error fetching food orders tiffins:', err);
            container.innerHTML = '<div class="text-center py-5 text-danger"><p>Failed to load listings.</p></div>';
        });
}

function openManageKitchen(id, title, isOpen) {
    currentManageTiffinId = id;
    
    document.getElementById('food-orders-list-view').style.display = 'none';
    document.getElementById('manage-kitchen-view').style.display = 'block';
    
    document.getElementById('kitchen-manage-title').textContent = 'Managing: ' + title;
    
    const toggle = document.getElementById('kitchen-toggle');
    toggle.checked = isOpen;
    
    updateKitchenStatusUI(isOpen);
    fetchMeals(id);
    fetchOrders(id);
}

function closeManageKitchen() {
    currentManageTiffinId = null;
    document.getElementById('manage-kitchen-view').style.display = 'none';
    document.getElementById('food-orders-list-view').style.display = 'block';
    fetchFoodOrdersTiffins(); 
}

function updateKitchenStatusUI(isOpen) {
    const badge = document.getElementById('kitchen-status-badge');
    if (isOpen) {
        badge.className = 'badge bg-success rounded-pill px-3 py-2';
        badge.textContent = 'Kitchen Open';
    } else {
        badge.className = 'badge bg-danger rounded-pill px-3 py-2';
        badge.textContent = 'Kitchen Closed';
    }
}

// --- Meal Management Logic ---

function openAddMealModal() {
    document.getElementById('addMealForm').reset();
    document.getElementById('meal-image-preview-container').style.display = 'none';
    const modal = new bootstrap.Modal(document.getElementById('addMealModal'));
    modal.show();
}

function previewMealImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('meal-image-preview');
            preview.src = e.target.result;
            document.getElementById('meal-image-preview-container').style.display = 'block';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function fetchMeals(tiffinId) {
    const container = document.getElementById('meals-container');
    if (!container) return;

    container.innerHTML = '<div class="text-center py-5 w-100"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';

    fetch(`/provider/tiffin/${tiffinId}/meals`, { method: 'GET', credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            // Handle error responses from backend
            if (data.success === false) {
                container.innerHTML = `<div class="text-center py-5 w-100"><p class="text-muted">${data.message || 'Could not load meals.'}</p></div>`;
                return;
            }
            
            if (!Array.isArray(data) || data.length === 0) {
                container.innerHTML = '<div class="text-center py-5 w-100"><p class="text-muted">No meals added yet.</p></div>';
                return;
            }

            container.innerHTML = '';
            
            data.forEach(meal => {
                const card = document.createElement('div');
                card.className = 'house-listing-card';
                
                const availabilityBadge = meal.is_available 
                    ? '<span class="badge bg-success position-absolute top-0 end-0 m-2">Available</span>' 
                    : '<span class="badge bg-danger position-absolute top-0 end-0 m-2">Unavailable</span>';

                let imageHtml = '<div class="house-listing-image d-flex align-items-center justify-content-center bg-light"><i class="fas fa-utensils fa-2x text-secondary"></i></div>';
                if (meal.meal_image_path) {
                     imageHtml = `<div class="position-relative"><img src="/static/images/database_images/${meal.meal_image_path}" alt="${meal.meal_name}" class="house-listing-image">${availabilityBadge}</div>`;
                }

                card.innerHTML = `
                    ${imageHtml}
                    <div class="house-listing-details">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                             <h5 class="fw-bold mb-0 text-truncate" style="max-width: 150px;">${meal.meal_name}</h5>
                             <span class="badge bg-primary">₹${meal.price}</span>
                        </div>
                        <div class="d-flex gap-2 mb-2">
                            <span class="badge bg-secondary" style="font-size: 0.7rem;">${meal.meal_category}</span>
                            <span class="badge bg-info text-dark" style="font-size: 0.7rem;">${meal.diet_type}</span>
                        </div>
                        
                        <div class="d-flex gap-2 mt-auto">
                            <button class="btn btn-outline-primary btn-sm flex-fill" onclick='viewMeal(${JSON.stringify(meal).replace(/'/g, "&#39;")})'>
                                View
                            </button>
                            <button class="btn btn-outline-secondary btn-sm flex-fill" onclick='openEditMealModal(${JSON.stringify(meal).replace(/'/g, "&#39;")})'>
                                Edit
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        })
        .catch(err => {
            console.error('Error fetching meals:', err);
            container.innerHTML = '<div class="text-center py-5 w-100 text-danger"><p>Failed to load meals.</p></div>';
        });
}

// --- Orders Management Logic ---

function fetchOrders(tiffinId) {
    const container = document.getElementById('orders-container');
    if (!container) return;

    container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></div>';

    fetch(`/provider/tiffin/${tiffinId}/orders`, { method: 'GET', credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            if (data.success === false) {
                container.innerHTML = `<div class="text-center py-4 text-muted">${data.message}</div>`;
                return;
            }
            
            if (!Array.isArray(data) || data.length === 0) {
                container.innerHTML = '<div class="text-center py-4 text-muted">No orders yet.</div>';
                return;
            }

            // Create responsive table
            let html = `
                <div class="table-responsive d-none d-md-block">
                    <table class="table table-hover align-middle">
                        <thead class="table-light">
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Meal</th>
                                <th>Qty</th>
                                <th>Total</th>
                                <th>Fast</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            data.forEach(order => {
                const statusBadge = getStatusBadge(order.order_status);
                const actionBtn = getActionButton(order);
                const fastBadge = order.fast_delivery 
                    ? '<span class="badge bg-warning text-dark">Fast</span>' 
                    : '<span class="badge bg-light text-muted">Standard</span>';
                
                html += `
                    <tr>
                        <td>#${order.id}</td>
                        <td>${order.customer_name}</td>
                        <td>${order.meal_name}</td>
                        <td>${order.quantity}</td>
                        <td class="fw-bold">₹${order.total_price}</td>
                        <td>${fastBadge}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <div class="d-flex gap-1">
                                <button class="btn btn-outline-primary btn-sm" onclick='viewOrderDetails(${JSON.stringify(order).replace(/'/g, "&#39;")})'>View</button>
                                ${actionBtn}
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table></div>';

            // Mobile card view
            html += '<div class="d-md-none">';
            data.forEach(order => {
                const statusBadge = getStatusBadge(order.order_status);
                const actionBtn = getActionButton(order);
                const fastBadge = order.fast_delivery 
                    ? '<span class="badge bg-warning text-dark">Fast</span>' 
                    : '';
                
                html += `
                    <div class="card mb-3 border">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <strong>#${order.id}</strong> ${fastBadge}
                                    <p class="mb-0 text-muted small">${order.customer_name}</p>
                                </div>
                                ${statusBadge}
                            </div>
                            <p class="mb-1"><strong>${order.meal_name}</strong> x ${order.quantity}</p>
                            <p class="fw-bold text-success mb-2">₹${order.total_price}</p>
                            <div class="d-flex gap-2">
                                <button class="btn btn-outline-primary btn-sm flex-fill" onclick='viewOrderDetails(${JSON.stringify(order).replace(/'/g, "&#39;")})'>View</button>
                                ${actionBtn}
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            container.innerHTML = html;
        })
        .catch(err => {
            console.error('Error fetching orders:', err);
            container.innerHTML = '<div class="text-center py-4 text-danger">Failed to load orders.</div>';
        });
}

function getStatusBadge(status) {
    const badges = {
        'placed': '<span class="badge bg-secondary">Placed</span>',
        'preparing': '<span class="badge bg-warning text-dark">Preparing</span>',
        'out_for_delivery': '<span class="badge bg-info">Out for Delivery</span>',
        'delivered': '<span class="badge bg-success">Delivered</span>',
        'cancelled': '<span class="badge bg-danger">Cancelled</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
}

function getActionButton(order) {
    const actions = {
        'placed': { nextStatus: 'preparing', label: 'Prepare', confirmMsg: 'Mark this order as preparing?' },
        'preparing': { nextStatus: 'out_for_delivery', label: 'Out for Delivery', confirmMsg: 'Mark this order as out for delivery?' },
        'out_for_delivery': { nextStatus: 'delivered', label: 'Delivered', confirmMsg: 'Mark this order as delivered?' }
    };
    
    if (!actions[order.order_status]) return '';
    
    const action = actions[order.order_status];
    return `<button class="btn btn-primary btn-sm flex-fill" onclick="updateOrderStatus(${order.id}, '${action.nextStatus}', '${action.confirmMsg}')">${action.label}</button>`;
}

function viewOrderDetails(order) {
    document.getElementById('od-id').textContent = '#' + order.id;
    document.getElementById('od-customer').textContent = order.customer_name;
    document.getElementById('od-phone').textContent = order.customer_phone;
    document.getElementById('od-meal').textContent = order.meal_name;
    document.getElementById('od-category').textContent = order.meal_category;
    document.getElementById('od-diet').textContent = order.diet_type;
    document.getElementById('od-qty').textContent = order.quantity;
    document.getElementById('od-base').textContent = order.base_price;
    document.getElementById('od-fast').textContent = order.fast_delivery ? 'Yes' : 'No';
    document.getElementById('od-fast-charge').textContent = order.fast_delivery_charge;
    document.getElementById('od-total').textContent = order.total_price;
    document.getElementById('od-status').innerHTML = getStatusBadge(order.order_status);
    document.getElementById('od-address').textContent = order.delivery_address;
    document.getElementById('od-date').textContent = order.order_date;
    
    new bootstrap.Modal(document.getElementById('orderDetailsModal')).show();
}

function updateOrderStatus(orderId, newStatus, confirmMsg) {
    if (!confirm(confirmMsg)) return;
    
    fetch(`/provider/order/${orderId}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ new_status: newStatus })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Order status updated!');
            fetchActiveOrdersCount();
            if (currentManageTiffinId) {
                fetchOrders(currentManageTiffinId);
            }
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(err => {
        console.error(err);
        alert('Failed to update order status.');
    });
}

function viewMeal(meal) {
    document.getElementById('view-meal-name').textContent = meal.meal_name;
    document.getElementById('view-meal-price').textContent = '₹' + meal.price;
    document.getElementById('view-meal-category').textContent = meal.meal_category;
    document.getElementById('view-meal-diet').textContent = meal.diet_type;
    document.getElementById('view-meal-desc').textContent = meal.description || 'No description available.';
    
    const statusBadge = document.getElementById('view-meal-status');
    if (meal.is_available) {
        statusBadge.className = 'badge bg-success';
        statusBadge.textContent = 'Available';
    } else {
        statusBadge.className = 'badge bg-danger';
        statusBadge.textContent = 'Unavailable';
    }
    
    const img = document.getElementById('view-meal-image');
    if (meal.meal_image_path) {
        img.src = '/static/images/database_images/' + meal.meal_image_path;
        img.style.display = 'block';
    } else {
        img.style.display = 'none';
    }
    
    new bootstrap.Modal(document.getElementById('viewMealModal')).show();
}

function openEditMealModal(meal) {
    document.getElementById('edit-meal-id').value = meal.id;
    document.getElementById('edit-meal-name').value = meal.meal_name;
    document.getElementById('edit-meal-desc').value = meal.description || '';
    document.getElementById('edit-meal-category').value = meal.meal_category;
    document.getElementById('edit-meal-price').value = meal.price;
    document.getElementById('editMealAvailable').checked = meal.is_available;
    
    // Set diet type radio
    if (meal.diet_type === 'veg') {
        document.getElementById('edit-diet-veg').checked = true;
    } else {
        document.getElementById('edit-diet-nonveg').checked = true;
    }
    
    // Show current image
    const previewImg = document.getElementById('edit-meal-image-preview');
    if (meal.meal_image_path) {
        previewImg.src = '/static/images/database_images/' + meal.meal_image_path;
        previewImg.style.display = 'block';
    } else {
        previewImg.style.display = 'none';
    }
    
    new bootstrap.Modal(document.getElementById('editMealModal')).show();
}

function previewEditMealImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('edit-meal-image-preview');
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// Edit Meal Form Submission
document.addEventListener('DOMContentLoaded', function() {
    const editMealForm = document.getElementById('editMealForm');
    if (editMealForm) {
        editMealForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const mealId = document.getElementById('edit-meal-id').value;
            if (!mealId) {
                alert('No meal selected.');
                return;
            }
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
            
            const formData = new FormData(this);
            formData.set('is_available', document.getElementById('editMealAvailable').checked);
            formData.set('diet_type', document.querySelector('input[name="edit_diet_type"]:checked').value);
            
            fetch(`/provider/meal/${mealId}/edit`, {
                method: 'PUT',
                body: formData,
                credentials: 'include'
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const modalEl = document.getElementById('editMealModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    modal.hide();
                    
                    if (currentManageTiffinId) {
                        fetchMeals(currentManageTiffinId);
                    }
                    
                    alert('Meal updated successfully!');
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(err => {
                console.error(err);
                alert('An error occurred while updating the meal.');
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            });
        });
    }
});

// Add Meal Form Submission
document.addEventListener('DOMContentLoaded', function() {
    const addMealForm = document.getElementById('addMealForm');
    if (addMealForm) {
        addMealForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!currentManageTiffinId) {
                alert('No active tiffin listing selected.');
                return;
            }
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Adding...';
            
            const formData = new FormData(this);
            formData.set('is_available', document.getElementById('mealAvailable').checked);
            
            fetch(`/provider/tiffin/${currentManageTiffinId}/add-meal`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Close modal
                    const modalEl = document.getElementById('addMealModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    modal.hide();
                    
                    // Reset form
                    this.reset();
                    document.getElementById('meal-image-preview-container').style.display = 'none';
                    
                    // Refresh grid
                    fetchMeals(currentManageTiffinId);
                    
                    alert('Meal added successfully!');
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(err => {
                console.error(err);
                alert('An error occurred while adding the meal.');
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            });
        });
    }
});

// Toggle Event Listener
document.addEventListener('DOMContentLoaded', function() {
    fetchTiffinListings();
    fetchServiceListings();
    
    const kitchenToggle = document.getElementById('kitchen-toggle');
    if (kitchenToggle) {
        kitchenToggle.addEventListener('change', function(e) {
            if (!currentManageTiffinId) return;
            
            const isChecked = e.target.checked;
            
            // Optimistic UI update
            updateKitchenStatusUI(isChecked);
            
            fetch(`/provider/tiffin/${currentManageTiffinId}/toggle-kitchen`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(res => res.json())
            .then(data => {
                if (!data.success) {
                    alert('Failed to update status: ' + data.message);
                    e.target.checked = !isChecked; 
                    updateKitchenStatusUI(!isChecked);
                } else {
                    updateKitchenStatusUI(data.kitchen_open);
                    e.target.checked = data.kitchen_open;
                }
            })
            .catch(err => {
                console.error('Error toggling kitchen:', err);
                alert('Error updating status.');
                e.target.checked = !isChecked; 
                updateKitchenStatusUI(!isChecked);
            });
        });
    }
});

// --- Service Bookings Section ---

let currentManageServiceId = null;

function fetchServiceListingsForBookings() {
    const container = document.getElementById('service-for-bookings-container');
    if (!container) return;

    container.innerHTML = '<div class="text-center py-5 w-100"><div class="spinner-border text-primary" role="status"></div></div>';

    fetch('/provider/api/service-listings', { method: 'GET', credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            if (data.success === false || !Array.isArray(data) || data.length === 0) {
                container.innerHTML = '<div class="text-center py-5 w-100"><p class="text-muted">No service listings yet.</p></div>';
                return;
            }

            container.innerHTML = '';
            data.forEach(service => {
                const card = document.createElement('div');
                card.className = 'house-listing-card';
                
                const statusBadge = {
                    'approved': '<span class="badge bg-success position-absolute top-0 end-0 m-2">Approved</span>',
                    'pending': '<span class="badge bg-warning text-dark position-absolute top-0 end-0 m-2">Pending</span>',
                    'rejected': '<span class="badge bg-danger position-absolute top-0 end-0 m-2">Rejected</span>'
                }[service.status] || '';

                const isApproved = service.status === 'approved';
                const buttonHtml = isApproved
                    ? `<button class="btn btn-primary btn-manage-kitchen" onclick="openManageServices(${service.id}, '${service.service_title.replace(/'/g, "\\'")}')">Manage Services</button>`
                    : `<button class="btn btn-secondary btn-manage-kitchen" disabled style="opacity: 0.6; cursor: not-allowed;" title="Service must be approved before managing bookings.">Manage Services</button>`;

                card.innerHTML = `
                    <div class="position-relative house-listing-image d-flex align-items-center justify-content-center bg-light">
                        <i class="fas fa-tools fa-3x text-secondary"></i>
                        ${statusBadge}
                    </div>
                    <div class="house-listing-details">
                        <h5 class="fw-bold mb-1 text-truncate" style="max-width: 200px;">${service.service_title}</h5>
                        <span class="badge bg-secondary text-light mb-2">${formatServiceCategory(service.service_category) || 'Service'}</span>
                        <p class="text-muted mb-2">Base Price: <strong>Rs.${service.base_price || 0}</strong></p>
                        <div class="d-grid mt-auto">
                            ${buttonHtml}
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        })
        .catch(err => {
            console.error('Error fetching service listings:', err);
            container.innerHTML = '<div class="text-center py-5 w-100 text-danger"><p>Failed to load services.</p></div>';
        });
}

function openManageServices(id, title) {
    currentManageServiceId = id;
    document.getElementById('manage-services-title').textContent = title;
    document.getElementById('service-bookings-list-view').style.display = 'none';
    document.getElementById('manage-services-view').style.display = 'block';
    fetchServiceBookings(id);
}

function closeManageServices() {
    currentManageServiceId = null;
    document.getElementById('manage-services-view').style.display = 'none';
    document.getElementById('service-bookings-list-view').style.display = 'block';
}

function fetchServiceBookings(serviceId) {
    const container = document.getElementById('service-bookings-container');
    if (!container) return;

    container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></div>';

    fetch(`/provider/service/${serviceId}/bookings`, { method: 'GET', credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            if (data.success === false) {
                container.innerHTML = `<div class="text-center py-4 text-muted">${data.message}</div>`;
                return;
            }
            
            if (!Array.isArray(data) || data.length === 0) {
                container.innerHTML = '<div class="text-center py-4 text-muted">No bookings yet.</div>';
                return;
            }

            let html = `
                <div class="table-responsive d-none d-md-block">
                    <table class="table table-hover align-middle">
                        <thead class="table-light">
                            <tr>
                                <th>Booking ID</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Price</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            data.forEach(booking => {
                const statusBadge = getServiceBookingStatusBadge(booking.booking_status);
                
                html += `
                    <tr>
                        <td>#${booking.id}</td>
                        <td>${booking.customer_name}</td>
                        <td>${booking.booking_date}</td>
                        <td>${booking.booking_time}</td>
                        <td class="fw-bold">Rs.${booking.quoted_price}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <button class="btn btn-primary btn-sm" onclick='viewServiceBookingDetails(${JSON.stringify(booking).replace(/'/g, "&#39;")})'>View</button>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table></div>';

            // Mobile card view
            html += '<div class="d-md-none">';
            data.forEach(booking => {
                const statusBadge = getServiceBookingStatusBadge(booking.booking_status);
                
                html += `
                    <div class="card mb-3 border">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <strong>#${booking.id}</strong>
                                    <p class="mb-0 text-muted small">${booking.customer_name}</p>
                                </div>
                                ${statusBadge}
                            </div>
                            <p class="mb-1">${booking.booking_date} at ${booking.booking_time}</p>
                            <p class="fw-bold text-success mb-2">Rs.${booking.quoted_price}</p>
                            <div class="d-grid">
                                <button class="btn btn-primary btn-sm" onclick='viewServiceBookingDetails(${JSON.stringify(booking).replace(/'/g, "&#39;")})'>View</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            container.innerHTML = html;
        })
        .catch(err => {
            console.error('Error fetching service bookings:', err);
            container.innerHTML = '<div class="text-center py-4 text-danger">Failed to load bookings.</div>';
        });
}

function getServiceBookingStatusBadge(status) {
    const badges = {
        'requested': '<span class="badge bg-secondary">Requested</span>',
        'accepted': '<span class="badge bg-info">Accepted</span>',
        'completed': '<span class="badge bg-success">Completed</span>',
        'cancelled': '<span class="badge bg-danger">Cancelled</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
}

function formatServiceCategory(category) {
    if (!category) return '';
    return category
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

let currentViewingBooking = null;

function viewServiceBookingDetails(booking) {
    currentViewingBooking = booking;
    
    document.getElementById('sb-id').textContent = '#' + booking.id;
    document.getElementById('sb-customer').textContent = booking.customer_name;
    document.getElementById('sb-phone').textContent = booking.customer_phone;
    document.getElementById('sb-title').textContent = booking.service_title;
    document.getElementById('sb-category').textContent = formatServiceCategory(booking.service_category);
    document.getElementById('sb-date').textContent = booking.booking_date;
    document.getElementById('sb-time').textContent = booking.booking_time;
    document.getElementById('sb-price').textContent = 'Rs.' + booking.quoted_price;
    document.getElementById('sb-status').innerHTML = getServiceBookingStatusBadge(booking.booking_status);
    document.getElementById('sb-address').textContent = booking.address;
    document.getElementById('sb-notes').textContent = booking.notes || 'No notes provided.';
    document.getElementById('sb-created').textContent = booking.created_at;
    
    // Update footer buttons based on status
    const footer = document.getElementById('sb-modal-footer');
    let footerHtml = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>';
    
    if (booking.booking_status === 'requested') {
        footerHtml = `
            <button type="button" class="btn btn-danger" onclick="updateServiceBookingStatus(${booking.id}, 'cancelled', 'Reject this booking?')">Reject</button>
            <button type="button" class="btn btn-primary" onclick="updateServiceBookingStatus(${booking.id}, 'accepted', 'Accept this booking?')">Accept</button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        `;
    } else if (booking.booking_status === 'accepted') {
        footerHtml = `
            <button type="button" class="btn btn-primary" onclick="updateServiceBookingStatus(${booking.id}, 'completed', 'Mark service as completed?')">Complete Service</button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        `;
    }
    
    footer.innerHTML = footerHtml;
    
    new bootstrap.Modal(document.getElementById('serviceBookingDetailsModal')).show();
}

function updateServiceBookingStatus(bookingId, newStatus, confirmMsg) {
    if (!confirm(confirmMsg)) return;
    
    fetch(`/provider/service-booking/${bookingId}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ new_status: newStatus })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const modalEl = document.getElementById('serviceBookingDetailsModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            
            alert('Booking status updated!');
            fetchActiveServiceBookingsCount();
            if (currentManageServiceId) {
                fetchServiceBookings(currentManageServiceId);
            }
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(err => {
        console.error(err);
        alert('Failed to update booking status.');
    });
}

function fetchActiveServiceBookingsCount() {
    fetch('/provider/service-bookings/active-count', { method: 'GET', credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            const el = document.getElementById('service-booking-count');
            if (el) {
                const newCount = data.active_count || 0;
                animateCountChange(el, newCount);
            }
        })
        .catch(err => console.error('Error fetching active service bookings count:', err));
}
