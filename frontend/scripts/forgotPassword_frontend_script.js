const domain = "GitHub";
var API_URL = "";

if(domain.toLowerCase() == "github")
{
    API_URL = "https://dragos-vacariu-note-taking.vercel.app";
}


document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('requestChangePassword');
    const emailInput = document.getElementById('email');
    const messageDiv = document.getElementById('message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageDiv.textContent = '';
        messageDiv.className = ''; // reset classes

        const email = emailInput.value.trim();

        // Basic email format check
        if (!email || !/\S+@\S+\.\S+/.test(email))
        {
            messageDiv.textContent = 'Please enter a valid email.';
            messageDiv.classList.add('error');
            return;
        }

        messageDiv.textContent = 'Checking email...';

        try
        {
            const res = await fetch(API_URL  + '/api/backend_api_manager', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                
                //HTTP can only send strings through web... JSON.stringify my content
                body: JSON.stringify({
                    user_email: email, 
                    method_name: 'userRequestPasswordReset',
                    method_params: {}
                })
            });

            const data = await res.json();

            if (res.ok)
            {
                messageDiv.textContent = data.message || 'If your email is registered, a reset link has been sent.';
                messageDiv.classList.add('success');
            }
            else
            {
                messageDiv.textContent = data.message || 'Error checking email.';
                messageDiv.classList.add('error');
            }
        }
        catch (err)
        {
            console.error(err);
            messageDiv.textContent = 'Network error. Please try again later.';
            messageDiv.classList.add('error');
        }
    });
});
