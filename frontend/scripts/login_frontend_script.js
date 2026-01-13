let mode = 'login'; // default mode

if(PLATFORM.toLowerCase() == "github")
{
    API_URL = "https://dragos-vacariu-note-taking.vercel.app";
    
    document.getElementById("login_sigup").onclick = LogIn_SignUp;
    document.getElementById("login_as_guest_button").onclick = LogIn_AsGuest;
    document.getElementById("toggleMode").addEventListener('click', () => toggleLoginSignup());
}

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
    
    //Checking if user is already authenticated
    if (token) 
    {
        try {
            // Validate token with backend
            const res = await fetch(API_URL + '/api/' + API_SCRIPT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                
                //HTTP can only send strings through web... JSON.stringify my content
                body: JSON.stringify({
                    method_name: 'validateUserAuthenticationToken',
                    method_params: {}
                })
            });

            if (res.ok) 
            {
                // Token is valid, redirect user to app
                window.location.href = APP_LOCATION + '/frontend/app.html';
                return; // stop execution
            }
            else 
            {
                // Invalid or expired token → clear and go to login
                localStorage.removeItem('jwt_token');
                LogIn_SignUp();
            }
        } 
        catch (err) 
        {
            console.error('Token validation failed:', err);
            localStorage.removeItem('jwt_token');
            LogIn_SignUp();
        }
    }
    else
    {
        if(PLATFORM.toLowerCase() == "github")
        {
            renderExtraOptions();
        }
        else
        {
            LogIn_SignUp();
        }
    }
});

//======================================================
//Helper function that executes when Switch SignUp / Login button is pressed
//======================================================
function toggleLoginSignup()
{
    const form = document.getElementById('authForm');
    mode = mode === 'login' ? 'signup' : 'login';
    
    form.querySelector('button[type="submit"]').innerText =
        mode === 'login' ? 'Login' : 'Sign Up';
    
    document.getElementById("toggleMode").innerText =
        mode === 'login' ? 'Switch to Sign Up' : 'Switch to Login';
    
    document.getElementById('message').innerText = '';
    renderExtraOptions(mode);
}

//======================================================
//Helper function to render extraOptions checkboxes dynamically
//======================================================
function renderExtraOptions() 
{
    const extraOptions = document.getElementById('extraOptions');
    extraOptions.innerHTML = '';
    
    if (mode === 'login') 
    {
        //Creating 'Keep me logged in' form
        const ul = document.createElement('ul');
        ul.id = "keep_me_logged_in_ul";
        
        const li_label = document.createElement('li');
        li_label.innerHTML = "<span>Keep me logged in:</span>";
        ul.appendChild(li_label);
        
        const li_checkbox = document.createElement('li');
        li_checkbox.innerHTML = `<input type="checkbox" id="rememberMe" name="rememberMe" />`
        ul.appendChild(li_checkbox);
        
        //Appending 'Keep me logged in' form
        extraOptions.appendChild(ul);
        
        //Create a forgot password link
        const li_forgotPasswordLink = document.createElement('li');
        
        li_forgotPasswordLink.innerHTML = `<a id="forgotPasswordLink" href="#">Forgot Password?</a>`
        
        //Append the forgot password link element to extraOptions form.
        extraOptions.appendChild(li_forgotPasswordLink);
    }
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
            const res = await fetch(API_URL + '/api/' + API_SCRIPT, {
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

/*Function to attempt to connect to the server for login/signup */
function LogIn_SignUp()
{
    const form = document.getElementById('authForm');
    const toggleBtn = document.getElementById('toggleMode');
    const messageDiv = document.getElementById('message');

    let mode = 'login'; // default mode
    
    //Initial render for login mode
    renderExtraOptions(mode);
    
    //===========================
    //Toggle login/signup mode
    //===========================
    toggleBtn.addEventListener('click', () => toggleLoginSignup());
    
    //===========================
    // Handle form submission
    //===========================
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageDiv.innerText = '';

        // Disable the submit button immediately
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        const user_email = form.email_address.value.trim();
        const password = form.password.value.trim();

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
            const res = await fetch(API_URL + '/api/' + API_SCRIPT, {
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
                
                //Generating encryption/decryption key
                const salt = user_email; // simplest: unique per user
                
                MEK = await deriveMEK(password, salt); // stays in memory throught the session
                await storeMEK(MEK);
                
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
                        window.location.href = APP_LOCATION + '/frontend/app.html';
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

async function LogIn_AsGuest()
{
    const messageDiv = document.getElementById('message');

    document.querySelector('input[name="password"]').removeAttribute('required');
    document.querySelector('input[name="email_address"]').removeAttribute('required');
    
    
    const user_email = "guest@admin_drva_apps.com";
    const password = "demoLMI09238#!";
    
    try
    {
        const res = await fetch(API_URL + '/api/' + API_SCRIPT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            
            //HTTP can only send strings through web... JSON.stringify my content
            body: JSON.stringify({
                user_email: user_email,
                password: password,
                method_name: "userLogin",
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
            //Generating encryption/decryption key
            const salt = user_email; // simplest: unique per user
            MEK = await deriveMEK(password, salt); // stays in memory throught the session
            await storeMEK(MEK);
            
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

            messageDiv.innerText = 'Login successful! Redirecting...';
            setTimeout(() => {
                window.location.href = APP_LOCATION + '/frontend/app.html';
            }, 1000);
        }
        else
        {
            messageDiv.style.color = 'red';
            messageDiv.innerText = data.message || 'Something went wrong';
        }
    }
    catch (err)
    {
        console.error('Network or fetch error:', err);
    }
}