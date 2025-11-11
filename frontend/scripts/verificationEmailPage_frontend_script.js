const domain = "GitHub";
var API_URL = "";

if(domain.toLowerCase() == "github")
{
    API_URL = "https://dragos-vacariu-note-taking.vercel.app";
}


// Top-level variables accessible to both functions
const messageEl = document.querySelector('.message');
const resendBtn = document.getElementById('resendBtn');
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const email = params.get('email'); // optional: include email in URL

// Load verification page
async function loadVerificationEmailPage() 
{
    const messageEl = document.querySelector('.message');
    const resendBtn = document.getElementById('resendBtn');

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
        messageEl.textContent = "Verification token missing.";
        messageEl.classList.add('error');
        return;
    }

    // Run verification on page load
    await verifyEmail(token);
}

// Function to verify email
async function verifyEmail(token) 
{
    const messageEl = document.querySelector('.message');

    try {
        //const res = await fetch(`/api/verifyEmail_backend?token=${token}`);
        
        const res = await fetch(`${API_URL}/api/backend_api_manager_for_github?token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },

            //HTTP can only send strings through web... JSON.stringify my content
            body: JSON.stringify({
                //token: token,
                method_name: 'verifyUserEmail',
                method_params: {}
            })
        });
        const data = await res.json();

        if (data.success) 
        {
            messageEl.textContent = data.message;
            messageEl.classList.add('success');

            setTimeout(() => {
                window.location.href = '/frontend/login.html';
            }, 3000);
        }
        
        else
        {
            messageEl.textContent = data.message;
            messageEl.classList.add('error');

            // Show resend button if token expired
            if (data.message.toLowerCase().includes('expired'))
            {
                document.getElementById('resendBtn').style.display = 'inline-block';
            }
        }
    }
    catch (err)
    {
        console.error(err);
        messageEl.textContent = "Network error during verification.";
        messageEl.classList.add('error');
    }
}

// Resend verification email function
async function resendBtnFunction(e) 
{
    e.preventDefault();
    
    resendBtn.disabled = true;
    messageEl.textContent = "Resending verification email...";
    messageEl.classList.remove('error', 'success');

    try
    {
        const res = await fetch(API_URL + '/api/backend_api_manager_for_github', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },

            //HTTP can only send strings through web... JSON.stringify my content
            body: JSON.stringify({
                token: token, // pass token, not email
                method_name: 'getUserNotes',
                method_params: {}
            })
        });

        const data = await res.json();
        messageEl.textContent = data.message;
        messageEl.classList.add(data.success ? 'success' : 'error');
    }
    catch (err)
    {
        console.error(err);
        messageEl.textContent = "Failed to resend verification email.";
        messageEl.classList.add('error');
    }
    finally
    {
        resendBtn.disabled = false;
    }
}

// Event listener for resend button
resendBtn.addEventListener('click', resendBtnFunction);

// Initialize page
loadVerificationEmailPage();
