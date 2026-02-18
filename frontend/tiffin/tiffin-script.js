document.addEventListener('DOMContentLoaded', function() {
    
    const kitchenListSection = document.getElementById('kitchensListSection');
    const kitchenDetailSection = document.getElementById('kitchenDetailSection');
    const backBtn = document.getElementById('backToKitchensBtn');

    // Handle "Order Food" clicks
    const orderButtons = document.querySelectorAll('.order-food-btn');
    orderButtons.forEach(btn => {
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

    // Function to fetch and display details
    function showKitchenDetails(tiffinId) {
        // Switch Views
        kitchenListSection.style.display = 'none';
        kitchenDetailSection.style.display = 'block';
        window.scrollTo(0, 0);

        // Show Loading State (Optional optimization: Skeleton loaders)
        // For now, clear previous content or show spinner if implemented

        // Fetch Details
        fetch(`/tiffin/${tiffinId}/details`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    populateKitchenDetails(data.listing, data.provider);
                    fetchMeals(tiffinId); // Fetch meals after details
                } else {
                    alert('Failed to load kitchen details.');
                    // Go back
                    kitchenDetailSection.style.display = 'none';
                    kitchenListSection.style.display = 'block';
                }
            })
            .catch(err => {
                console.error('Error fetching details:', err);
                alert('An error occurred.');
            });
    }

    function populateKitchenDetails(listing, provider) {
        // Text Fields
        document.getElementById('detailBusinessName').textContent = provider.business_name;
        document.getElementById('detailDietType').textContent = listing.diet_type.toUpperCase();
        
        // Diet Badge Color
        const dietBadge = document.getElementById('detailDietType');
        dietBadge.className = 'badge mb-2'; // Reset
        if (listing.diet_type.toLowerCase() === 'veg') dietBadge.classList.add('bg-success');
        else if (listing.diet_type.toLowerCase() === 'non-veg') dietBadge.classList.add('bg-danger');
        else dietBadge.classList.add('bg-warning', 'text-dark');

        document.getElementById('detailDays').textContent = listing.available_days || 'Mon-Sun'; // Default if null
        document.getElementById('detailRadius').textContent = listing.delivery_radius;
        document.getElementById('detailCreated').textContent = listing.created_at;

        // Fast Delivery Badge
        const fdBadge = document.getElementById('detailFastDelivery');
        fdBadge.style.display = listing.fast_delivery_available ? 'inline-flex' : 'none';

        // Provider Info
        document.getElementById('providerName').textContent = provider.business_name;
        
        const verBadge = document.getElementById('providerVerified');
        verBadge.style.display = provider.verification_status === 'verified' ? 'inline-flex' : 'none';

        // Provider Avatar
        const avatarEl = document.getElementById('providerAvatar');
        if (provider.profile_pic) {
            avatarEl.innerHTML = `<img src="/images/database_images/${provider.profile_pic}" alt="Provider">`;
        } else {
            avatarEl.innerHTML = `<i class="fas fa-user"></i>`;
        }

        // Carousel
        const carouselInner = document.getElementById('carouselInner');
        carouselInner.innerHTML = '';
        
        const images = (listing.images && listing.images.length > 0) ? listing.images : [null]; // Handle empty
        
        images.forEach((img, index) => {
            const item = document.createElement('div');
            item.className = `carousel-item${index === 0 ? ' active' : ''}`;
            
            const imgEl = document.createElement('img');
            imgEl.className = 'd-block w-100';
            imgEl.style.height = '400px'; // Fixed height for carousel
            imgEl.style.objectFit = 'cover';
            
            if (img) {
                imgEl.src = `/images/database_images/${img}`; // Assuming database_images for tiffin too
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

        grid.innerHTML = ''; // Clear
        loading.style.display = 'block';
        empty.style.display = 'none';

        fetch(`/tiffin/${tiffinId}/meals`)
            .then(res => res.json())
            .then(data => {
                loading.style.display = 'none';
                if (data.success && data.meals.length > 0) {
                    renderMeals(data.meals);
                } else {
                    empty.style.display = 'block';
                }
            })
            .catch(err => {
                console.error('Error fetching meals:', err);
                loading.style.display = 'none';
                empty.style.display = 'block'; // Or error message
            });
    }

    function renderMeals(meals) {
        const grid = document.getElementById('mealsGrid');
        
        meals.forEach(meal => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            
            // Diet Badge Color Logic
            let dietClass = 'diet-veg';
            if (meal.diet_type.toLowerCase() === 'non-veg') dietClass = 'diet-non-veg';
            else if (meal.diet_type.toLowerCase() === 'both') dietClass = 'diet-both';

            const imgSrc = meal.image_path && meal.image_path !== 'placeholder.jpg' 
                ? `/images/database_images/${meal.image_path}` // Assuming meals in same bucket
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
                        <span class="meal-price">₹${meal.price}</span>
                        <p class="meal-desc text-truncate-3">${meal.description}</p>
                        <button class="btn btn-primary w-100 order-now-btn">Order Now</button>
                    </div>
                </div>
            `;
            grid.appendChild(col);
        });
    }

});
