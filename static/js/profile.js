document.addEventListener('DOMContentLoaded', function () {
    const editBtn = document.getElementById('editProfileBtn');
    const saveBtn = document.getElementById('saveProfileBtn');
    const modalEl = document.getElementById('editProfileModal');
    const toastEl = document.getElementById('profileToast');

    if (!editBtn || !modalEl) return;

    const modal = new bootstrap.Modal(modalEl);
    const toast = toastEl ? new bootstrap.Toast(toastEl, { delay: 3000 }) : null;

    // Open modal
    editBtn.addEventListener('click', function () {
        modal.show();
    });

    // Save changes
    saveBtn.addEventListener('click', async function () {
        const username = document.getElementById('editUsername').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        const phone = document.getElementById('editPhone').value.trim();

        if (!username || !email || !phone) {
            alert('All fields are required.');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            const res = await fetch('/profile/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, phone })
            });

            const data = await res.json();

            if (data.success) {
                // Update profile page UI
                document.getElementById('profileUsername').textContent = username;
                document.getElementById('profileEmail').textContent = email;
                document.getElementById('profilePhone').textContent = phone;

                // Update navbar name if present
                const navName = document.querySelector('.profile-name');
                if (navName) navName.textContent = username;

                modal.hide();

                // Show toast
                if (toast) {
                    document.getElementById('profileToastMsg').textContent = 'Profile updated successfully';
                    toast.show();
                }
            } else {
                alert(data.message || 'Failed to update profile.');
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            alert('Something went wrong. Please try again.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    });
});
