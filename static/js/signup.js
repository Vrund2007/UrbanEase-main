document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const usernameInput = document.getElementById('floatingUsername');
    const phoneInput = document.getElementById('floatingPhone');
    const emailInput = document.getElementById('floatingInput');
    const passwordInput = document.getElementById('floatingPassword');
    const confirmPasswordInput = document.getElementById('floatingConfirmPassword');
    const accountTypeInput = document.getElementById('accountTypeInput');

    const otpSection = document.getElementById('otpSection');
    const otpInput = document.getElementById('floatingOtp');
    const submitBtn = signupForm.querySelector('button[type="submit"]');

    let isOtpMode = false;

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (isOtpMode) {
            // Step 2: Verify OTP
            const otp = otpInput.value.trim();
            
            if (!/^\d{6}$/.test(otp)) {
                alert('Please enter a valid 6-digit OTP.');
                return;
            }

            try {
                // IMPORTANT: In production, ensure CORS credentials are allowed
                const response = await fetch('/verify_otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ otp: otp })
                });

                const data = await response.json();

                if (data.success) {
                    alert('Account created successfully!');
                    if (data.account_type === 'customer') {
                        window.location.href = '/login';
                    } else if (data.account_type === 'provider' || data.account_type === 'service_provider') {
                        window.location.href = '/login';
                    }
                } else {
                    alert(data.message || 'OTP Verification failed.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please try again later.');
            }

        } else {
            // Step 1: Signup Details
            const username = usernameInput.value.trim();
            const phone = phoneInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            const accountType = accountTypeInput.value;
    
            const validEmail = /^\w+([.-]?\w+)*@\w+([.]?\w+)*(\.\w{2,3})+$/.test(email);
            const validPhone = /^[6-9]\d{9}$/.test(phone);
            
            // 1. Validation
            if (!username || !phone || !email || !password || !confirmPassword || !accountType) {
                alert('All fields are required!');
                return;
            }
    
            if (!validPhone) {
                alert('Please enter a valid 10-digit Indian mobile number.');
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
    
            // 2. Submission (Initial Signup)
            try {
                const response = await fetch('/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username,
                        phone: phone,
                        email: email,
                        password: password,
                        account_type: accountType
                    })
                });
    
                const data = await response.json();
    
                if (data.success) {
                    alert('OTP sent to your email. Please check and verify.');
                    
                    // Switch to OTP Mode
                    isOtpMode = true;
                    
                    // Hide/Disable original fields
                    usernameInput.disabled = true;
                    phoneInput.disabled = true;
                    emailInput.disabled = true;
                    passwordInput.disabled = true;
                    confirmPasswordInput.disabled = true;
                    // Hide account type dropdown roughly or disable logic if needed
                    // For simplicity, just disabling inputs and showing OTP field
                    
                    otpSection.style.display = 'block';
                    submitBtn.textContent = 'Verify OTP & Create Account';
                    otpInput.focus();
                    
                } else {
                    alert(data.message || 'Signup failed. Please try again.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please try again later.');
            }
        }
    });
});
