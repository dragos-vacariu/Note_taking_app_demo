document.addEventListener('DOMContentLoaded', async () => {
    let payload = await requireLogin(); // local JWT validation
    
    if (!payload)
    {
        // redirects to login if missing/expired
        return;
    }
    
    let passwordRequired;
    passwordRequired = await requirePassword();
    if(passwordRequired)
    {
        return;
    }
    
    const emailForm = document.getElementById('updateEmailForm');
    const passwordForm = document.getElementById('updatePasswordForm');
    const emailMessage = document.getElementById('emailMessage');
    const passwordMessage = document.getElementById('passwordMessage');
    const currentEmail = payload.user_email;
    
    // --- Change Email ---
    emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userPassword = document.getElementById('userPassword').value.trim();
        const newEmail = document.getElementById('newEmail').value.trim();
        
        try
        {
            let token = getToken();
            if(!token)
            {
                alert("Token not found. Please log in again.")
                throw new Error('No token found');
                logoutUser();
            }
            
            const res = await fetch(API_URL + '/api/' + API_SCRIPT, {
                method: 'POST',
                headers: authHeaders(),
                
                //HTTP can only send strings through web... JSON.stringify my content
                body: JSON.stringify({
                    newEmail: newEmail,
                    currentPassword: userPassword,
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

        try
        {
            let token = getToken();
            if(!token)
            {
                alert("Token not found. Please log in again.")
                throw new Error('No token found');
                logoutUser();
            }
            const res = await fetch(API_URL + '/api/' + API_SCRIPT, {
                method: 'POST',
                headers: authHeaders(),
                
                //HTTP can only send strings through web... JSON.stringify my content
                body: JSON.stringify({
                    currentPassword: currentPassword,
                    newPassword: newPassword,
                    method_name: 'updateUserSettings',
                    method_params: {}
                })
            });
            const data = await res.json();
            
            if (!data.success)
            {
                return;   //STOP if password wrong
            }
            
            if(data.token)
            {
                token = data.token;
                // Save token to local storage for longterm use.
                localStorage.setItem('jwt_token', token); //works with multitabs
                sessionStorage.setItem('jwt_token', token); //sessionStorage only works with 1 tab.
                
                console.log("Token changed: " + token);
                
                payload = await getTokenPayload();
    
                if (!payload)
                {
                    return null;
                }
            }
            
            passwordMessage.textContent = "PLEASE WAIT. DO NOT CLOSE/REFRESH THE PAGE.";
            passwordMessage.className = 'warning';
            
            // Load notes from backend
            await loadNotes(payload);
            
            //Generating encryption/decryption key
            const salt = currentEmail; // simplest: unique per user
            
            MEK = await deriveMEK(newPassword, salt); // stays in memory throught the session
            await storeMEK(MEK);
            
            await saveUserNotesToDatabase();
            
            /*Cleaning the fields.*/
            document.getElementById('currentPassword').value = "";
            document.getElementById('newPassword').value = "";
            document.getElementById('confirmPassword').value = "";
            
            passwordMessage.textContent = data.message;
            passwordMessage.className = data.success ? 'success' : 'error';
        }
        catch
        {
            passwordMessage.textContent = 'Error occured while changing the password.';
            passwordMessage.className = 'error';
        }
    });
});
