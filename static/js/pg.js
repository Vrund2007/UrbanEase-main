document.addEventListener('DOMContentLoaded', function() {
    // Save Button Toggle (on listing cards)
    const saveBtns = document.querySelectorAll('.btn-save');
    saveBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
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
                openPGDetails(listingId);
            }
        });
    });
});

// Global state
let currentListingId = null;

// Open PG details modal
function openPGDetails(listingId) {
    currentListingId = listingId;
    const modal = new bootstrap.Modal(document.getElementById('pgDetailModal'));
    const loadingEl = document.getElementById('detailLoading');
    const contentEl = document.getElementById('detailContent');
    const saveBtn = document.getElementById('detailSaveBtn');
    
    // Show loading, hide content
    loadingEl.style.display = 'flex';
    contentEl.style.display = 'none';
    
    // Reset Save Button
    updateSaveButtonUI(false);
    
    // Handle Save Button Click
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', () => toggleSavePG(listingId));

    // Open modal
    modal.show();
    
    // Fetch details
    fetch(`/housing/pg/${listingId}/details`)
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
                        this.src = 'https://images.unsplash.com/photo-1522771753918-725f5d6443a4?q=80&w=2000&auto=format&fit=crop';
                    };
                } else {
                    imgEl.src = 'https://images.unsplash.com/photo-1522771753918-725f5d6443a4?q=80&w=2000&auto=format&fit=crop';
                }
                
                imgEl.alt = listing.title;
                item.appendChild(imgEl);
                carouselInner.appendChild(item);
            });
            
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
            
            // --- Populate Type-Specific Features (PG) ---
            const featuresHtml = `
                <h6 class="mb-2">Features:</h6>
                <div class="d-flex flex-wrap gap-2 mb-2">
                    <span class="badge bg-primary">${listing.gender}</span>
                    <span class="badge bg-secondary">${listing.sharing} Sharing</span>
                    ${listing.ac_available ? '<span class="badge bg-info text-dark"><i class="fas fa-snowflake"></i> AC Available</span>' : ''}
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
            
            // --- Check Is Saved ---
            fetch(`/housing/pg/${listingId}/is-saved`)
                .then(res => res.json())
                .then(savedData => {
                    if (savedData.saved) {
                        updateSaveButtonUI(true);
                    }
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
            console.error('Error fetching details:', err);
            loadingEl.innerHTML = '<p class="text-danger">Failed to load. Please try again.</p>';
        });
}

function toggleSavePG(listingId) {
    const saveBtn = document.getElementById('detailSaveBtn');
    const isSaved = saveBtn.classList.contains('saved-state');
    
    const endpoint = isSaved 
        ? `/housing/pg/${listingId}/unsave` 
        : `/housing/pg/${listingId}/save`;
    
    const method = isSaved ? 'DELETE' : 'POST';

    updateSaveButtonUI(!isSaved);

    fetch(endpoint, { method: method })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast(data.message || (isSaved ? 'PG removed from saved' : 'PG saved successfully'));
            } else {
                updateSaveButtonUI(isSaved);
                showToast(data.message || "Something went wrong", true);
            }
        })
        .catch(err => {
            console.error("Error toggling save:", err);
            updateSaveButtonUI(isSaved);
            showToast("Server error. Please try again.", true);
        });
}

function updateSaveButtonUI(isSaved) {
    const btn = document.getElementById('detailSaveBtn');
    if (isSaved) {
        btn.innerHTML = '<i class="fas fa-heart me-2"></i>Saved';
        btn.classList.add('saved-state');
        btn.style.background = '#0ea5e9';
        btn.style.borderColor = '#0ea5e9';
        btn.style.color = 'white';
    } else {
        btn.innerHTML = '<i class="far fa-heart me-2"></i>Save PG';
        btn.classList.remove('saved-state');
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
    }
}

function showToast(message, isError = false) {
    const existingToast = document.querySelector('.custom-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `custom-toast ${isError ? 'error' : ''}`;
    toast.innerHTML = `
        <i class="${isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
