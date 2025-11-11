document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    
    e.preventDefault();
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = '';

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (!token)
    {
        messageDiv.textContent = 'Missing token.';
        messageDiv.className = 'error';
        return;
    }

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        messageDiv.textContent = "Passwords do not match.";
        messageDiv.className = 'error';
        return;
    }

    try {
        const res = await fetch('/api/backend_api_manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            
            //HTTP can only send strings through web... JSON.stringify my content
            body: JSON.stringify({
                newPassword: newPassword,
                token: token,
                method_name: 'resetUserPassword',
                method_params: {}
            })
        });

        const data = await res.json();
        messageDiv.textContent = data.message;
        messageDiv.className = data.success ? 'success' : 'error';

        if(data.success) setTimeout(() => window.location.href='/frontend/login.html', 2000);
    }
    
    catch(err)
    {
        console.error(err);
        messageDiv.textContent = "Failed to change password.";
        messageDiv.className = 'error';
    }
});
