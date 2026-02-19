document.addEventListener('DOMContentLoaded', function() {
    const modalEl = document.getElementById('orderDetailsModal');
    const bsModal = modalEl ? new bootstrap.Modal(modalEl) : null;

    const elMealName = document.getElementById('odMealName');
    const elProvider = document.getElementById('odProvider');
    const elDiet = document.getElementById('odDiet');
    const elCategory = document.getElementById('odCategory');
    const elQty = document.getElementById('odQty');
    const elFast = document.getElementById('odFast');
    const elStatus = document.getElementById('odStatus');
    const elAddress = document.getElementById('odAddress');
    const elDate = document.getElementById('odDate');
    const elTotal = document.getElementById('odTotal');

    function setText(el, value) {
        if (!el) return;
        el.textContent = (value === null || value === undefined || value === '') ? '—' : String(value);
    }

    document.querySelectorAll('.view-order-details-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const raw = this.getAttribute('data-order') || '{}';
            let o = {};
            try {
                o = JSON.parse(raw);
            } catch (err) {
                console.error('Failed to parse order JSON:', err);
                o = {};
            }

            setText(elMealName, o.meal_name);
            setText(elProvider, o.provider_business_name);
            setText(elDiet, o.diet_type ? String(o.diet_type).replace('_', ' ') : '');
            setText(elCategory, o.meal_category ? String(o.meal_category).replace('_', ' ') : '');
            setText(elQty, o.quantity);
            setText(elFast, o.fast_delivery ? 'Yes' : 'No');
            setText(elStatus, o.order_status ? String(o.order_status).replace('_', ' ') : '');
            setText(elAddress, o.delivery_address);
            setText(elDate, o.order_date);
            setText(elTotal, (o.total_price !== undefined && o.total_price !== null) ? `₹${Math.round(Number(o.total_price) || 0)}` : '');

            if (bsModal) bsModal.show();
        });
    });
});
