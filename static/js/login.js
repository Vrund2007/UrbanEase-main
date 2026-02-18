document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('form');

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // 1. Extract form data
            const emailInput = document.getElementById('floatingInput');
            const passwordInput = document.getElementById('floatingPassword');
            
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            // 2. Client-side validation
            if (!email || !password) {
                alert("All fields are required");
                return;
            }

            // 3. Send login request
            fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Redirect based on account_type
                    if (data.account_type === 'customer') {
                        window.location.href = '/customer/dashboard';
                    } else if (data.account_type === 'service_provider' || data.account_type === 'provider') {
                        // Redirect to provider dashboard (backend will serve HTML)
                        window.location.href = '/provider/dashboard';
                    }
                    else if (data.account_type === 'admin') {
                        window.location.href = '/admin';
                    } else {
                        // Fallback or unknown type
                        alert("Unknown account type: " + data.account_type);
                    }
                } else {
                    // Login failed
                    alert(data.message || "Invalid email or password");
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert("An error occurred. Please try again.");
            });
        });
    }
});
