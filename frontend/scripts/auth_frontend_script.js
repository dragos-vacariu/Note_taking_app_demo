let domain = "GitHub";
var API_URL = "";

if(domain.toLowerCase() == "github")
{
    API_URL = "https://dragos-vacariu-note-taking.vercel.app";
}


// Returns token from localStorage (persistent) or sessionStorage (session)
function getToken() {
    return localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
}

// Decode JWT payload
function getTokenPayload() 
{
    const token = getToken();
    if (!token)
    {
        return null;
    }
    try 
    {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    }
    catch
    {
        return null;
    }
}

// Checks if the token looks valid (not expired)
function isLoggedIn() 
{
    const payload = getTokenPayload();
    
    if (!payload)
    {
        return false;
    }
    
    const now = Date.now() / 1000;
    return !payload.exp || payload.exp > now;
}

// Must be called at page load to protect the page
function requireLogin() 
{
    const payload = getTokenPayload();
    if (!payload)
    {
        // Redirect if token missing or malformed
        //window.location.href = '/frontend/login.html';
        return null;
    }
    return payload;
}

// Headers to use in fetch requests
function authHeaders()
{
    const token = getToken();
    if (!token)
    {
        throw new Error('No token found');
    }
    
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Optional: validate token with backend before using page
async function validateTokenWithBackend()
{
    const token = getToken();
    
    if (!token)
    {
        return false;
    }
    
    try
    {
        const res = await fetch(API_URL + '/api/backend_api_manager_for_github', {
            method: 'POST',
            headers: authHeaders(),
            
            //HTTP can only send strings through web... JSON.stringify my content
            body: JSON.stringify({
                method_name: 'validateUserAuthenticationToken',
                method_params: {}
            })
        });
        return res.ok;
    }
    catch
    {
        return false;
    }
}
