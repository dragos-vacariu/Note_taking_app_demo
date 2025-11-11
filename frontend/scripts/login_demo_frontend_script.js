document.addEventListener('DOMContentLoaded', async () => {
    LogIn_SignUp();
});


function LogIn_SignUp()
{
    const form = document.getElementById('authForm');
    const toggleBtn = document.getElementById('toggleMode');
    const messageDiv = document.getElementById('message');
    const extraOptions = document.getElementById('extraOptions');

    let mode = 'login'; // default mode
    
    //===========================
    // Handle form submission
    //===========================
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageDiv.innerText = '';

        // Disable the submit button immediately
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        const user_email = "demo@drva_admin.ro";
        const password = "admin_my_app_9401sfxk";

        if (!user_email || !password) 
        {
            messageDiv.innerText = 'Please enter both email and password.';
            submitBtn.disabled = false;  // re-enable
            return;
        }

        if (!/\S+@\S+\.\S+/.test(user_email)) 
        {
            messageDiv.innerText = 'Please enter a valid email';
            submitBtn.disabled = false;  // re-enable
            return;
        }
        
        const endpoint_function = mode === 'login' ? 'userLogin' : 'userSignUp';
        
        try {
            const res = await fetch('https://dragos-vacariu-note-taking.vercel.app/api/backend_api_manager', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                
                //HTTP can only send strings through web... JSON.stringify my content
                body: JSON.stringify({
                    user_email: user_email,
                    password: password,
                    method_name: endpoint_function,
                    method_params: {}
                })
            });

            let data;
            
            try
            {
                data = await res.json();
            }
            
            catch (err) 
            {
                console.error('Failed to parse JSON:', err);
                submitBtn.disabled = false;  // re-enable
                return;
            }

            if (res.ok) 
            {
                // Get the "Keep me logged in" checkbox value (if in login mode)
                const rememberMeCheckbox = document.getElementById('rememberMe');
                const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

                const token = data.token;

                // Save token to correct storage
                if(rememberMe)
                {
                    localStorage.setItem('jwt_token', token);
                } 
                else
                {
                    sessionStorage.setItem('jwt_token', token);
                }

                messageDiv.style.color = 'green';

                if (mode === 'signup') 
                {
                    messageDiv.innerText =
                        'Signup successful! Please verify your email before logging in.';
                }
                else
                {
                    messageDiv.innerText = 'Login successful! Redirecting...';
                    setTimeout(() => {
                        window.location.href = '/frontend/app.html';
                    }, 1000);
                }
            }
            else
            {
                messageDiv.style.color = 'red';
                messageDiv.innerText = data.message || 'Something went wrong';

                if (data.message?.includes('not verified'))
                {
                    showResendVerification(user_email);
                }
            }
        }
        catch (err)
        {
            console.error('Network or fetch error:', err);
            submitBtn.disabled = false;  // re-enable
        }
        finally
        {
            // Always re-enable button at the end
            submitBtn.disabled = false;
        }
    });
}

function showResendVerification(user_email) 
{
    const link = document.createElement('a');
    link.href = "#";
    link.innerText = "Resend verification email";
    link.style.display = 'block';
    link.style.marginTop = '5px';

    link.addEventListener('click', async (e) => {
        e.preventDefault();

        const messageDiv = document.getElementById('message'); // grab it again
        
        if (!user_email)
        {
            messageDiv.innerText = "Please enter your email first.";
            return;
        }

        try
        {
            const res = await fetch('https://dragos-vacariu-note-taking.vercel.app/api/backend_api_manager', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                
                //HTTP can only send strings through web... JSON.stringify my content
                body: JSON.stringify({
                    user_email: user_email,
                    method_name: 'resendVerificationEmail',
                    method_params: {}
                })
            });

            const data = await res.json();

            if (!res.ok) {
                console.error('Backend returned error:', data);
            }

            messageDiv.style.color = data.success ? 'green' : 'red';
            messageDiv.innerText = data.message;

        }
        catch (err)
        {
            console.error("Error resending verification email:", err);
            messageDiv.style.color = 'red';
            messageDiv.innerText = 'Failed to resend verification email. Please try again later.';
        }
    });

    const messageDiv = document.getElementById('message');
    messageDiv.appendChild(link);
}