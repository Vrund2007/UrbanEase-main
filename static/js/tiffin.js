document.addEventListener('DOMContentLoaded', function() {

    const kitchenListSection = document.getElementById('kitchensListSection');
    const kitchenDetailSection = document.getElementById('kitchenDetailSection');
    const backBtn = document.getElementById('backToKitchensBtn');

    // Order modal elements
    const orderMealModalEl = document.getElementById('orderMealModal');
    const orderMealModal = orderMealModalEl ? new bootstrap.Modal(orderMealModalEl) : null;

    const orderMealIdEl = document.getElementById('orderMealId');
    const orderTiffinIdEl = document.getElementById('orderTiffinId');
    const orderMealNameEl = document.getElementById('orderMealName');
    const orderMealPriceEl = document.getElementById('orderMealPrice');
    const orderQtyEl = document.getElementById('orderQuantity');
    const fastDeliveryWrapperEl = document.getElementById('fastDeliveryWrapper');
    const fastDeliveryEl = document.getElementById('orderFastDelivery');
    const fastDeliveryChargeEl = document.getElementById('fastDeliveryCharge');
    const orderAddressEl = document.getElementById('orderAddress');
    const orderNotesEl = document.getElementById('orderNotes');
    const orderTotalEl = document.getElementById('orderTotalPrice');
    const placeOrderBtn = document.getElementById('placeOrderBtn');

    let currentKitchen = null; // holds tiffin listing details

    // Handle "Order Food" clicks
    document.querySelectorAll('.order-food-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tiffinId = this.getAttribute('data-id');
            showKitchenDetails(tiffinId);
        });
    });

    // Handle Back Button
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            kitchenDetailSection.style.display = 'none';
            kitchenListSection.style.display = 'block';
            window.scrollTo(0, 0);
        });
    }

    function formatInr(amount) {
        const n = Number(amount || 0);
        if (Number.isNaN(n)) return '₹0';
        return `₹${Math.round(n)}`;
    }

    function calculateTotal() {
        const unitPrice = Number((orderMealPriceEl && orderMealPriceEl.getAttribute('data-raw-price')) || 0);
        let qty = Number(orderQtyEl ? orderQtyEl.value : 1);
        if (!Number.isFinite(qty) || qty < 1) qty = 1;

        const fastCharge = (fastDeliveryEl && fastDeliveryEl.checked) ? Number(window.FAST_DELIVERY_CHARGE || 20) : 0;
        const total = (unitPrice * qty) + fastCharge;

        if (orderTotalEl) orderTotalEl.value = formatInr(total);
    }

    // Function to fetch and display details
    function showKitchenDetails(tiffinId) {
        kitchenListSection.style.display = 'none';
        kitchenDetailSection.style.display = 'block';
        window.scrollTo(0, 0);

        fetch(`/tiffin/${tiffinId}/details`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    currentKitchen = data.listing;
                    populateKitchenDetails(data.listing, data.provider);
                    fetchMeals(tiffinId);
                } else {
                    showToast('Failed to load kitchen details.', true);
                    kitchenDetailSection.style.display = 'none';
                    kitchenListSection.style.display = 'block';
                }
            })
            .catch(err => {
                console.error('Error fetching details:', err);
                showToast('An error occurred while loading kitchen details.', true);
            });
    }

    function populateKitchenDetails(listing, provider) {
        document.getElementById('detailBusinessName').textContent = provider.business_name;
        document.getElementById('detailDietType').textContent = listing.diet_type.toUpperCase();

        const dietBadge = document.getElementById('detailDietType');
        dietBadge.className = 'badge mb-2';
        if (listing.diet_type.toLowerCase() === 'veg') dietBadge.classList.add('bg-success');
        else if (listing.diet_type.toLowerCase() === 'non-veg') dietBadge.classList.add('bg-danger');
        else dietBadge.classList.add('bg-warning', 'text-dark');

        document.getElementById('detailDays').textContent = listing.available_days || 'Mon-Sun';
        document.getElementById('detailRadius').textContent = listing.delivery_radius;
        document.getElementById('detailCreated').textContent = listing.created_at;

        const fdBadge = document.getElementById('detailFastDelivery');
        fdBadge.style.display = listing.fast_delivery_available ? 'inline-flex' : 'none';

        document.getElementById('providerName').textContent = provider.business_name;

        const verBadge = document.getElementById('providerVerified');
        verBadge.style.display = provider.verification_status === 'verified' ? 'inline-flex' : 'none';

        const avatarEl = document.getElementById('providerAvatar');
        if (provider.profile_pic) {
            avatarEl.innerHTML = `<img src="/static/images/database_images/${provider.profile_pic}" alt="Provider">`;
        } else {
            avatarEl.innerHTML = `<i class="fas fa-user"></i>`;
        }

        const carouselInner = document.getElementById('carouselInner');
        carouselInner.innerHTML = '';

        const images = (listing.images && listing.images.length > 0) ? listing.images : [null];

        images.forEach((img, index) => {
            const item = document.createElement('div');
            item.className = `carousel-item${index === 0 ? ' active' : ''}`;

            const imgEl = document.createElement('img');
            imgEl.className = 'd-block w-100';
            imgEl.style.height = '400px';
            imgEl.style.objectFit = 'cover';

            if (img) {
                imgEl.src = `/static/images/database_images/${img}`;
                imgEl.onerror = function() {
                    this.src = 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?q=80&w=2000&auto=format&fit=crop';
                };
            } else {
                imgEl.src = 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?q=80&w=2000&auto=format&fit=crop';
            }

            item.appendChild(imgEl);
            carouselInner.appendChild(item);
        });
    }

    function fetchMeals(tiffinId) {
        const grid = document.getElementById('mealsGrid');
        const loading = document.getElementById('mealsLoading');
        const empty = document.getElementById('noMealsMsg');

        grid.innerHTML = '';
        loading.style.display = 'block';
        empty.style.display = 'none';

        fetch(`/tiffin/${tiffinId}/meals`)
            .then(res => res.json())
            .then(data => {
                loading.style.display = 'none';
                if (data.success && data.meals.length > 0) {
                    renderMeals(data.meals, tiffinId);
                } else {
                    empty.style.display = 'block';
                }
            })
            .catch(err => {
                console.error('Error fetching meals:', err);
                loading.style.display = 'none';
                empty.style.display = 'block';
            });
    }

    function renderMeals(meals, tiffinId) {
        const grid = document.getElementById('mealsGrid');

        meals.forEach(meal => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';

            let dietClass = 'diet-veg';
            if (meal.diet_type.toLowerCase() === 'non-veg') dietClass = 'diet-non-veg';
            else if (meal.diet_type.toLowerCase() === 'both') dietClass = 'diet-both';

            const imgSrc = meal.image_path && meal.image_path !== 'placeholder.jpg'
                ? `/static/images/database_images/${meal.image_path}`
                : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=2000&auto=format&fit=crop';

            col.innerHTML = `
                <div class="meal-card">
                    <div class="meal-image">
                        <img src="${imgSrc}" alt="${meal.meal_name}" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=2000&auto=format&fit=crop'">
                        <span class="meal-badge">${meal.meal_category}</span>
                        <span class="diet-badge ${dietClass}">${meal.diet_type}</span>
                    </div>
                    <div class="meal-content">
                        <h4 class="meal-title">${meal.meal_name}</h4>
                        <span class="meal-price">${formatInr(meal.price)}</span>
                        <p class="meal-desc text-truncate-3">${meal.description || ''}</p>
                        <button class="btn btn-primary w-100 order-meal-btn"
                                data-meal-id="${meal.id}"
                                data-meal-name="${meal.meal_name}"
                                data-price="${meal.price}"
                                data-tiffin-id="${tiffinId}">
                            Order Now
                        </button>
                    </div>
                </div>
            `;

            grid.appendChild(col);
        });
    }

    // Event delegation: Order Now button click
    const mealsGrid = document.getElementById('mealsGrid');
    if (mealsGrid) {
        mealsGrid.addEventListener('click', function(e) {
            const btn = e.target.closest('.order-meal-btn');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();

            const mealId = btn.getAttribute('data-meal-id');
            const mealName = btn.getAttribute('data-meal-name');
            const price = btn.getAttribute('data-price');
            const tiffinId = btn.getAttribute('data-tiffin-id');

            if (!mealId || !orderMealModal) return;

            if (orderMealIdEl) orderMealIdEl.value = mealId;
            if (orderTiffinIdEl) orderTiffinIdEl.value = tiffinId || '';
            if (orderMealNameEl) orderMealNameEl.value = mealName || '';
            if (orderMealPriceEl) {
                orderMealPriceEl.value = price ? formatInr(price) : '';
                orderMealPriceEl.setAttribute('data-raw-price', price || '0');
            }

            if (orderQtyEl) orderQtyEl.value = 1;
            if (orderNotesEl) orderNotesEl.value = '';

            // Fast delivery visibility
            const fastAvailable = !!(currentKitchen && currentKitchen.fast_delivery_available);
            if (fastDeliveryWrapperEl) fastDeliveryWrapperEl.style.display = fastAvailable ? 'block' : 'none';
            if (fastDeliveryEl) fastDeliveryEl.checked = false;
            if (fastDeliveryChargeEl) {
                const charge = Number(window.FAST_DELIVERY_CHARGE || 20);
                fastDeliveryChargeEl.textContent = fastAvailable ? `( + ${formatInr(charge)} )` : '';
            }

            // Prefill address
            if (orderAddressEl) {
                const defaultAddr = (window.DEFAULT_CUSTOMER_ADDRESS || '').trim();
                orderAddressEl.value = defaultAddr;
            }

            calculateTotal();
            orderMealModal.show();
        });
    }

    if (orderQtyEl) {
        orderQtyEl.addEventListener('input', calculateTotal);
        orderQtyEl.addEventListener('change', calculateTotal);
    }

    if (fastDeliveryEl) {
        fastDeliveryEl.addEventListener('change', calculateTotal);
    }

    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', function() {
            const mealId = orderMealIdEl ? orderMealIdEl.value : '';
            const quantity = Number(orderQtyEl ? orderQtyEl.value : 1);
            const delivery_address = (orderAddressEl ? orderAddressEl.value : '').trim();
            const notes = (orderNotesEl ? orderNotesEl.value : '').trim();
            const fast_delivery = !!(fastDeliveryEl && fastDeliveryEl.checked);

            if (!mealId) {
                showToast('Please select a meal to order.', true);
                return;
            }
            if (!Number.isFinite(quantity) || quantity < 1) {
                showToast('Quantity must be at least 1.', true);
                return;
            }
            if (!delivery_address) {
                showToast('Delivery address is required.', true);
                return;
            }

            placeOrderBtn.disabled = true;
            fetch(`/meals/${mealId}/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity, fast_delivery, delivery_address, notes })
            })
                .then(res => res.json().then(j => ({ ok: res.ok, status: res.status, json: j })))
                .then(({ ok, json }) => {
                    if (ok && json.success) {
                        if (orderMealModal) orderMealModal.hide();
                        showToast('Order placed successfully');
                    } else {
                        showToast((json && json.message) ? json.message : 'Failed to place order', true);
                    }
                })
                .catch(err => {
                    console.error('Error placing order:', err);
                    showToast('Server error. Please try again.', true);
                })
                .finally(() => {
                    placeOrderBtn.disabled = false;
                });
        });
    }

});

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
