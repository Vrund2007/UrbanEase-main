// Apartment Page Script - Handles interaction using backend API
// Cloned and adapted from pg-script.js/hostel-script.js

document.addEventListener('DOMContentLoaded', function() {
    
    // --- Save Apartment Functionality (Card Button) ---
    const saveButtons = document.querySelectorAll('.btn-save');
    
    saveButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Prevent card click
            
            const card = this.closest('.listing-card');
            const viewBtn = card.querySelector('.view-details-btn');
            const listingId = viewBtn.getAttribute('data-id');
            const icon = this.querySelector('i');
            
            toggleSaveApartment(listingId, icon);
        });
        
        // Check initial state
        const card = btn.closest('.listing-card');
        const viewBtn = card.querySelector('.view-details-btn');
        const listingId = viewBtn.getAttribute('data-id');
        checkIfSaved(listingId, btn.querySelector('i'));
    });

    // --- View Details Modal ---
    const viewButtons = document.querySelectorAll('.view-details-btn');
    const modalElement = document.getElementById('apartmentDetailModal');
    const modal = new bootstrap.Modal(modalElement);
    
    // Elements to populate
    const detailTitle = document.getElementById('detailTitle');
    const detailLocation = document.getElementById('detailLocation');
    const detailPrice = document.getElementById('detailPrice');
    const detailDescription = document.getElementById('detailDescription');
    const detailType = document.getElementById('detailType');
    const detailDate = document.getElementById('detailDate');
    const providerName = document.getElementById('providerName');
    const providerPhone = document.getElementById('providerPhone');
    const providerEmail = document.getElementById('providerEmail');
    const providerAvatar = document.getElementById('providerAvatar');
    const providerBadge = document.getElementById('providerBadge');
    
    const loadingDiv = document.getElementById('detailLoading');
    const contentDiv = document.getElementById('detailContent');
    const searchParams = new URLSearchParams(window.location.search);

    // Filter Handling
    // (Search works via GET param submission, so no JS needed for filter inputs unless we want AJAX)

    viewButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const listingId = this.getAttribute('data-id');
            openModal(listingId);
        });
    });

    function openModal(id) {
        modal.show();
        loadingDiv.style.display = 'flex';
        contentDiv.style.display = 'none';
        
        // Reset specific save button in modal
        const modalSaveBtn = document.getElementById('detailSaveBtn');
        modalSaveBtn.innerHTML = '<i class="far fa-heart me-2"></i>Save Apartment';
        modalSaveBtn.onclick = null; // Clear previous handler

        fetch(`/housing/apartment/${id}/details`)
            .then(response => response.json())
            .then(data => {
                if(data.success) {
                    populateModal(data.listing, data.provider);
                    loadingDiv.style.display = 'none';
                    contentDiv.style.display = 'block';
                    
                    // Check if saved
                    checkIfSavedMsg(id, modalSaveBtn);
                    
                    // Attach save handler
                    modalSaveBtn.onclick = function() {
                        toggleSaveApartmentMsg(id, modalSaveBtn);
                    };
                } else {
                    alert('Failed to load details');
                    modal.hide();
                }
            })
            .catch(err => {
                console.error(err);
                alert('Error fetching details');
                modal.hide();
            });
    }

    function populateModal(listing, provider) {
        detailTitle.textContent = listing.title;
        detailLocation.innerHTML = `<i class="fas fa-map-marker-alt me-1"></i>${listing.location}`;
        detailPrice.innerHTML = `₹${listing.price} <span class="detail-price-period">/ month</span>`;
        detailDescription.textContent = listing.description;
        detailType.textContent = listing.type; // Should be "Apartment"
        
        // --- Populate Type-Specific Features (Apartment) ---
        const featuresHtml = `
            <h6 class="mb-2">Property Details:</h6>
            <div class="d-flex flex-wrap gap-2 mb-2">
                <span class="badge bg-primary">${listing.bhk} BHK</span>
                <span class="badge bg-secondary">${listing.listing_purpose}</span>
                <span class="badge bg-info text-dark">${listing.furnishing}</span>
                <span class="badge bg-warning text-dark">${listing.tenant_preference}</span>
            </div>
        `;
        document.getElementById('detailFeatures').innerHTML = featuresHtml;
        
        detailDate.textContent = `Posted on ${listing.created_at}`;
        
        providerName.textContent = provider.business_name;
        providerPhone.textContent = provider.phone;
        providerEmail.textContent = provider.email;
        
        if (provider.verification_status === 'verified') {
            providerBadge.style.display = 'inline-flex';
        } else {
            providerBadge.style.display = 'none';
        }
        
        // Provider Avatar
        if (provider.profile_pic) {
            providerAvatar.innerHTML = `<img src="/images/database_images/${provider.profile_pic}" alt="Provider">`;
        } else {
            providerAvatar.innerHTML = `<i class="fas fa-user"></i>`;
        }

        // Carousel
        const carouselInner = document.getElementById('carouselInner');
        carouselInner.innerHTML = '';
        if (listing.images && listing.images.length > 0) {
            listing.images.forEach((img, index) => {
                const item = document.createElement('div');
                item.className = `carousel-item ${index === 0 ? 'active' : ''}`;
                item.innerHTML = `<img src="/images/database_images/${img}" class="d-block w-100" alt="Listing Image">`;
                carouselInner.appendChild(item);
            });
        } else {
            // Placeholder if no images
             const item = document.createElement('div');
             item.className = `carousel-item active`;
             item.innerHTML = `<img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=2000&auto=format&fit=crop" class="d-block w-100" alt="Apartment Placeholder">`;
             carouselInner.appendChild(item);
        }
    }

    // --- Toast Notification ---
    function showToast(message, type = 'success') {
        let toast = document.querySelector('.custom-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'custom-toast';
            document.body.appendChild(toast);
        }
        
        const icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>';
        
        toast.className = `custom-toast ${type === 'error' ? 'error' : ''}`;
        toast.innerHTML = `${icon}<span>${message}</span>`;
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // --- Save Logic (Card Icon) ---
    function toggleSaveApartment(id, iconElement) {
        // First check state to determine action
        const isSaved = iconElement.classList.contains('fas'); // Solid = saved
        const url = isSaved ? `/housing/apartment/${id}/unsave` : `/housing/apartment/${id}/save`;
        const method = isSaved ? 'DELETE' : 'POST';
        
        fetch(url, { method: method })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    if (isSaved) {
                        iconElement.classList.remove('fas', 'text-danger');
                        iconElement.classList.add('far');
                        showToast('Apartment removed from saved');
                    } else {
                        iconElement.classList.remove('far');
                        iconElement.classList.add('fas', 'text-danger');
                        showToast('Apartment saved successfully');
                    }
                } else {
                    if (data.already_saved) {
                         iconElement.classList.remove('far');
                         iconElement.classList.add('fas', 'text-danger');
                    }
                    showToast(data.message || 'Error updating save status', 'error');
                }
            })
            .catch(err => showToast('Connection error', 'error'));
    }

    function checkIfSaved(id, iconElement) {
        fetch(`/housing/apartment/${id}/is-saved`)
            .then(res => res.json())
            .then(data => {
                if (data.saved) {
                    iconElement.classList.remove('far');
                    iconElement.classList.add('fas', 'text-danger');
                } else {
                    iconElement.classList.remove('fas', 'text-danger');
                    iconElement.classList.add('far');
                }
            });
    }

    // --- Save Logic (Modal Button) ---
    function toggleSaveApartmentMsg(id, btnElement) {
        const isSaved = btnElement.classList.contains('btn-saved'); 
        // We'll track state via class or text content
        const url = isSaved ? `/housing/apartment/${id}/unsave` : `/housing/apartment/${id}/save`;
         const method = isSaved ? 'DELETE' : 'POST';
        
        fetch(url, { method: method })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    if (isSaved) {
                        updateModalSaveBtn(btnElement, false);
                        showToast('Apartment removed from saved');
                        // Update card icon if visible
                        updateCardIcon(id, false);
                    } else {
                        updateModalSaveBtn(btnElement, true);
                        showToast('Apartment saved successfully');
                        updateCardIcon(id, true);
                    }
                } else {
                    showToast(data.message, 'error');
                }
            });
    }

    function checkIfSavedMsg(id, btnElement) {
        fetch(`/housing/apartment/${id}/is-saved`)
            .then(res => res.json())
            .then(data => {
                updateModalSaveBtn(btnElement, data.saved);
            });
    }

    function updateModalSaveBtn(btn, isSaved) {
        if (isSaved) {
            btn.innerHTML = '<i class="fas fa-heart me-2"></i>Saved';
            btn.classList.add('btn-saved'); // Add a marker class
            // Optionally change style to indicate active
             btn.style.background = '#5b21b6';
        } else {
            btn.innerHTML = '<i class="far fa-heart me-2"></i>Save Apartment';
            btn.classList.remove('btn-saved');
            btn.style.background = ''; // Revert to CSS default
        }
    }
    
    function updateCardIcon(id, isSaved) {
        // Find the card on the page
        const viewBtn = document.querySelector(`.view-details-btn[data-id="${id}"]`);
        if (viewBtn) {
            const card = viewBtn.closest('.listing-card');
            const icon = card.querySelector('.btn-save i');
            if (isSaved) {
                icon.classList.remove('far');
                icon.classList.add('fas', 'text-danger');
            } else {
                icon.classList.remove('fas', 'text-danger');
                icon.classList.add('far');
            }
        }
    }
});
