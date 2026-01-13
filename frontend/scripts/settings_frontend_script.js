document.addEventListener('DOMContentLoaded', async () => {
    const payload = requireLogin(); // local JWT validation
    
    if (!payload)
    {
        // redirects to login if missing/expired
        return;
    }
    
    const token = getToken();
    const emailForm = document.getElementById('updateEmailForm');
    const passwordForm = document.getElementById('updatePasswordForm');
    const emailMessage = document.getElementById('emailMessage');
    const passwordMessage = document.getElementById('passwordMessage');
    const currentEmailEl = document.getElementById('currentEmail');

    if (currentEmailEl) currentEmailEl.textContent = payload.user_email;

    // --- Change Email ---
    emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newEmail = document.getElementById('newEmail').value.trim();
        
        try
        {
            const token = getToken();
            const res = await fetch(API_URL + '/api/' + API_SCRIPT, {
                method: 'POST',
                headers: authHeaders(),
                
                //HTTP can only send strings through web... JSON.stringify my content
                body: JSON.stringify({
                    newEmail: newEmail,
                    token: token,
                    method_name: 'updateUserSettings',
                    method_params: {}
                })
            });
            const data = await res.json();
            emailMessage.textContent = data.message;
            emailMessage.className = data.success ? 'success' : 'error';
        }
        catch
        {
            emailMessage.textContent = 'Network error';
            emailMessage.className = 'error';
        }
    });

    // --- Change Password ---
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value.trim();
        const newPassword = document.getElementById('newPassword').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();

        if (newPassword !== confirmPassword)
        {
            passwordMessage.textContent = 'Passwords do not match';
            passwordMessage.className = 'error';
            return;
        }

        try {
            const token = getToken();
            const res = await fetch(API_URL + '/api/' + API_SCRIPT, {
                method: 'POST',
                headers: authHeaders(),
                
                //HTTP can only send strings through web... JSON.stringify my content
                body: JSON.stringify({
                    currentPassword: currentPassword,
                    newPassword: newPassword,
                    token: token,
                    method_name: 'updateUserSettings',
                    method_params: {}
                })
            });
            const data = await res.json();
            passwordMessage.textContent = data.message;
            passwordMessage.className = data.success ? 'success' : 'error';
        }
        catch
        {
            passwordMessage.textContent = 'Network error';
            passwordMessage.className = 'error';
        }
    });
});
