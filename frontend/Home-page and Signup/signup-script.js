document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const emailInput = document.getElementById('floatingInput');
    const passwordInput = document.getElementById('floatingPassword');
    const confirmPasswordInput = document.getElementById('floatingConfirmPassword');
    const accountTypeInput = document.getElementById('accountTypeInput');

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const accountType = accountTypeInput.value;

        const validEmail = /^\w+([.-]?\w+)*@\w+([.]?\w+)*(\.\w{2,3})+$/.test(email)
        // 1. Validation
        if (!email || !password || !confirmPassword || !accountType) {
            alert('All fields are required!');
            return;
        }

        if (!validEmail) {
            alert('This is not a valid email address.');
            return;
        }

        if (password.length < 8) {
            alert('Password must be at least 8 characters long.');
            return;
        }

        const hasUpperCase = /[A-Z]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!hasUpperCase || !hasSpecialChar) {
            alert('Password must contain at least one uppercase letter and one special character.');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }

        // 2. Submission
        try {
            const response = await fetch('http://localhost:5000/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    account_type: accountType
                })
            });

            const data = await response.json();

            if (data.success) {
                alert('Account created successfully!');
                
                if (data.account_type === 'customer') {
                    window.location.href = '../dashboards/demo-cust.html';
                } else if (data.account_type === 'service_provider') {
                    window.location.href = '../dashboards/demo-ser.html';
                }
            } else {
                alert(data.message || 'Signup failed. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again later.');
        }
    });
});
