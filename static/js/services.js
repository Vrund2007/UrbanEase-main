document.addEventListener('DOMContentLoaded', function() {
    // Save buttons (card overlay + inline)
    document.querySelectorAll('.service-save-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const serviceId = this.getAttribute('data-id');
            const isSaved = this.getAttribute('data-saved') === 'true';
            if (serviceId) {
                toggleSaveService(serviceId, isSaved, this);
            }
        });
    });

    // Book Service button - open modal
    const bookModal = document.getElementById('bookServiceModal');
    const bookModalBs = bookModal ? new bootstrap.Modal(bookModal) : null;

    document.querySelectorAll('.book-service-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const serviceId = this.getAttribute('data-service-id');
            const title = this.getAttribute('data-title');
            const price = this.getAttribute('data-price');
            if (!serviceId) return;

            document.getElementById('bookServiceId').value = serviceId;
            document.getElementById('bookServiceTitle').value = title || '';
            document.getElementById('bookServicePrice').value = price ? '₹' + parseFloat(price).toFixed(0) : '';
            document.getElementById('bookServiceDate').value = '';
            document.getElementById('bookServiceTime').value = '';
            document.getElementById('bookServiceAddress').value = '';
            document.getElementById('bookServiceNotes').value = '';

            if (bookModalBs) bookModalBs.show();
        });
    });

    // Confirm Booking
    const confirmBtn = document.getElementById('bookServiceConfirm');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            const serviceId = document.getElementById('bookServiceId').value;
            const bookingDate = document.getElementById('bookServiceDate').value.trim();
            const bookingTime = document.getElementById('bookServiceTime').value.trim();
            const address = document.getElementById('bookServiceAddress').value.trim();
            const notes = document.getElementById('bookServiceNotes').value.trim();

            if (!bookingDate) {
                showToast('Please select a booking date', true);
                return;
            }
            if (!bookingTime) {
                showToast('Please select a booking time', true);
                return;
            }
            if (!address) {
                showToast('Please enter the service address', true);
                return;
            }

            confirmBtn.disabled = true;
            fetch(`/services/${serviceId}/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking_date: bookingDate, booking_time: bookingTime, address, notes })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        if (bookModalBs) bookModalBs.hide();
                        showToast('Service booked successfully');
                    } else {
                        showToast(data.message || 'Booking failed', true);
                    }
                })
                .catch(err => {
                    console.error('Error booking:', err);
                    showToast('Server error. Please try again.', true);
                })
                .finally(() => { confirmBtn.disabled = false; });
        });
    }
});

function toggleSaveService(serviceId, isSaved, btn) {
    const endpoint = isSaved
        ? `/services/${serviceId}/unsave`
        : `/services/${serviceId}/save`;
    const method = isSaved ? 'DELETE' : 'POST';

    // Update all save buttons for this service
    const allBtns = document.querySelectorAll(`.service-save-btn[data-id="${serviceId}"]`);

    // Optimistic UI update
    const newSaved = !isSaved;
    allBtns.forEach(b => updateSaveButtonUI(b, newSaved));

    fetch(endpoint, { method: method })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast(data.message || (newSaved ? 'Service saved' : 'Service removed from saved'));
            } else {
                allBtns.forEach(b => updateSaveButtonUI(b, isSaved));
                showToast(data.message || 'Something went wrong', true);
            }
        })
        .catch(err => {
            console.error('Error toggling save:', err);
            allBtns.forEach(b => updateSaveButtonUI(b, isSaved));
            showToast('Server error. Please try again.', true);
        });
}

function updateSaveButtonUI(btn, isSaved) {
    btn.setAttribute('data-saved', isSaved ? 'true' : 'false');
    const icon = btn.querySelector('i');
    if (icon) {
        icon.classList.remove('far', 'fas');
        icon.classList.add(isSaved ? 'fas' : 'far', 'fa-heart');
        icon.style.color = isSaved ? '#ef4444' : '';
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
