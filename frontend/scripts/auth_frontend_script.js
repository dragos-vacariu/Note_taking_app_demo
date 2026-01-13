// global variable
var PLATFORM = location.href.startsWith("https://dragos-vacariu.github.io") ? "GitHub" : "";
var API_URL = "";
var API_SCRIPT = "backend_api_manager";
var MEK = ""; /*Master Encryption Key (MEK) that will actually be used for encrypting and decrypting your data.*/
var APP_LOCATION = "";

/*
var variable have global scope (and can be used in external files).
let variable have global scope ONLY in the file in which is declared.
*/

if(PLATFORM.toLowerCase() == "github")
{
    API_URL = "https://dragos-vacariu-note-taking.vercel.app";
    APP_LOCATION = "https://dragos-vacariu.github.io/Note_taking_app_demo";
    API_SCRIPT = "backend_api_manager_for_github";
}


// Returns token from localStorage (persistent) or sessionStorage (session)
function getToken()
{
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
async function requireLogin() 
{
    const payload = getTokenPayload();
    if (!payload) {
        return null;
    }
    
    //Load the MEK
    MEK = await loadMEK();

    if (!MEK) {
        alert("Encryption key missing. Please log in again.");
        sessionStorage.removeItem("jwt_token");
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

// Derive a 256-bit MEK from user's password
async function deriveMEK(password, salt)
{
    // Convert password & salt to ArrayBuffer
    const enc = new TextEncoder();
    const passwordBuffer = enc.encode(password);
    const saltBuffer = enc.encode(salt); // unique per user

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    // Derive MEK
    const MEK = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: saltBuffer,
            iterations: 100_000,      // safe default
            hash: "SHA-256"
        },
        keyMaterial,
        {
            name: "AES-GCM",
            length: 256
        },
        true,   // extractable key, allows exporting if needed
        ["encrypt", "decrypt"]
    );

    return MEK;
}

async function loadMEK() 
{
    const stored = sessionStorage.getItem("MEK");
    if (!stored) return null;

    const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));

    return crypto.subtle.importKey(
        "raw",
        raw,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );
}