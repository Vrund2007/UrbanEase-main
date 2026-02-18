document.addEventListener('DOMContentLoaded', function() {
    // Save Button Toggle (on listing cards - Visual only for now, or link to same login if needed)
    const saveBtns = document.querySelectorAll('.btn-save');
    saveBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // detailed logic to be implemented if card save is required, 
            // for now just visual toggle as per previous state
            const icon = this.querySelector('i');
            if (icon.classList.contains('far')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                icon.style.color = '#ef4444';
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                icon.style.color = '';
            }
        });
    });

    // View Details Buttons
    const viewDetailBtns = document.querySelectorAll('.view-details-btn');
    viewDetailBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const listingId = this.getAttribute('data-id');
            if (listingId) {
                openHostelDetails(listingId);
            }
        });
    });
});

// Global state for current listing in modal
let currentListingId = null;

// Open hostel details modal
function openHostelDetails(listingId) {
    currentListingId = listingId;
    const modal = new bootstrap.Modal(document.getElementById('hostelDetailModal'));
    const loadingEl = document.getElementById('detailLoading');
    const contentEl = document.getElementById('detailContent');
    const saveBtn = document.getElementById('detailSaveBtn');
    
    // Show loading, hide content
    loadingEl.style.display = 'flex';
    contentEl.style.display = 'none';
    
    // Reset Save Button to default state
    updateSaveButtonUI(false);
    
    // Remove old listeners to prevent duplicates (cloning trick)
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', () => toggleSaveHostel(listingId));

    // Open modal immediately
    modal.show();
    
    // Fetch details
    fetch(`/housing/hostel/${listingId}/details`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                loadingEl.innerHTML = '<p class="text-danger">Could not load details.</p>';
                return;
            }
            
            const listing = data.listing;
            const provider = data.provider;
            
            // --- Populate Carousel ---
            const carouselInner = document.getElementById('carouselInner');
            carouselInner.innerHTML = '';
            
            const images = listing.images && listing.images.length > 0 
                ? listing.images 
                : [null]; 
            
            images.forEach((img, index) => {
                const item = document.createElement('div');
                item.className = `carousel-item${index === 0 ? ' active' : ''}`;
                
                const imgEl = document.createElement('img');
                imgEl.className = 'd-block w-100';
                
                if (img) {
                    imgEl.src = `/static/images/database_images/${img}`;
                    imgEl.onerror = function() {
                        this.src = 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=2000&auto=format&fit=crop';
                    };
                } else {
                    imgEl.src = 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=2000&auto=format&fit=crop';
                }
                
                imgEl.alt = listing.title;
                item.appendChild(imgEl);
                carouselInner.appendChild(item);
            });
            
            // Carousel controls logic
            const prevBtn = document.querySelector('.carousel-control-prev');
            const nextBtn = document.querySelector('.carousel-control-next');
            if (images.length <= 1) {
                prevBtn.style.display = 'none';
                nextBtn.style.display = 'none';
            } else {
                prevBtn.style.display = '';
                nextBtn.style.display = '';
            }
            
            // --- Populate Listing Details ---
            document.getElementById('detailType').textContent = listing.type;
            document.getElementById('detailTitle').textContent = listing.title;
            document.getElementById('detailLocation').innerHTML = `<i class="fas fa-map-marker-alt me-1"></i>${listing.location}`;
            document.getElementById('detailPrice').innerHTML = `₹${listing.price.toLocaleString('en-IN')}<span class="detail-price-period">/month</span>`;
            document.getElementById('detailDescription').textContent = listing.description;
            
            // --- Populate Type-Specific Features (Hostel) ---
            const featuresHtml = `
                <h6 class="mb-2">Features:</h6>
                <div class="d-flex flex-wrap gap-2 mb-2">
                    <span class="badge bg-primary">${listing.gender}</span>
                    <span class="badge bg-secondary">${listing.room_type}</span>
                    ${listing.wifi ? '<span class="badge bg-info text-dark"><i class="fas fa-wifi"></i> WiFi</span>' : ''}
                    ${listing.attached_bathroom ? '<span class="badge bg-success"><i class="fas fa-bath"></i> Attached Bathroom</span>' : ''}
                    ${listing.food_included ? '<span class="badge bg-success"><i class="fas fa-utensils"></i> Food Included</span>' : ''}
                    ${listing.laundry ? '<span class="badge bg-warning text-dark"><i class="fas fa-tshirt"></i> Laundry</span>' : ''}
                </div>
            `;
            document.getElementById('detailFeatures').innerHTML = featuresHtml;
            
            document.getElementById('detailDate').textContent = listing.created_at ? `Listed on ${listing.created_at}` : '';
            
            // --- Populate Provider Card ---
            document.getElementById('providerName').textContent = provider.business_name;
            document.getElementById('providerPhone').textContent = provider.phone;
            document.getElementById('providerEmail').textContent = provider.email;
            
            const avatarEl = document.getElementById('providerAvatar');
            if (provider.profile_pic) {
                avatarEl.innerHTML = `<img src="/static/images/database_images/${provider.profile_pic}" alt="${provider.business_name}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>'">`;
            } else {
                avatarEl.innerHTML = '<i class="fas fa-user"></i>';
            }
            
            const badgeEl = document.getElementById('providerBadge');
            badgeEl.style.display = provider.verification_status === 'verified' ? 'inline-flex' : 'none';
            
            // --- Check Input API: Is Saved? ---
            fetch(`/housing/hostel/${listingId}/is-saved`)
                .then(res => res.json())
                .then(savedData => {
                    if (savedData.saved) {
                        updateSaveButtonUI(true);
                    }
                    // Show content after both details and saved status are fetched
                    loadingEl.style.display = 'none';
                    contentEl.style.display = 'block';
                })
                .catch(err => {
                    console.error("Error checking saved status:", err);
                    loadingEl.style.display = 'none';
                    contentEl.style.display = 'block';
                });
        })
        .catch(err => {
            console.error('Error fetching hostel details:', err);
            loadingEl.innerHTML = '<p class="text-danger">Failed to load. Please try again.</p>';
        });
}

function toggleSaveHostel(listingId) {
    const saveBtn = document.getElementById('detailSaveBtn');
    const isSaved = saveBtn.classList.contains('saved-state');
    
    const endpoint = isSaved 
        ? `/housing/hostel/${listingId}/unsave` 
        : `/housing/hostel/${listingId}/save`;
    
    const method = isSaved ? 'DELETE' : 'POST';

    // Optimistic UI update
    updateSaveButtonUI(!isSaved);

    fetch(endpoint, { method: method })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast(data.message || (isSaved ? 'Hostel removed from saved' : 'Hostel saved successfully'));
                // Ensure UI is synced with server response (optional, but safely handled by optimistic update)
            } else {
                // Revert UI on error
                updateSaveButtonUI(isSaved);
                showToast(data.message || "Something went wrong", true);
            }
        })
        .catch(err => {
            console.error("Error toggling save:", err);
            updateSaveButtonUI(isSaved); // Revert
            showToast("Server error. Please try again.", true);
        });
}

function updateSaveButtonUI(isSaved) {
    const btn = document.getElementById('detailSaveBtn');
    if (isSaved) {
        btn.innerHTML = '<i class="fas fa-heart me-2"></i>Saved';
        btn.classList.add('saved-state');
        btn.style.background = '#0ea5e9'; // Secondary color (Sky Blue) or Muted
        btn.style.borderColor = '#0ea5e9';
        btn.style.color = 'white';
    } else {
        btn.innerHTML = '<i class="far fa-heart me-2"></i>Save Hostel';
        btn.classList.remove('saved-state');
        // Revert to CSS default (Purple)
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
    }
}

function showToast(message, isError = false) {
    // Remove existing toast
    const existingToast = document.querySelector('.custom-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `custom-toast ${isError ? 'error' : ''}`;
    toast.innerHTML = `
        <i class="${isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
