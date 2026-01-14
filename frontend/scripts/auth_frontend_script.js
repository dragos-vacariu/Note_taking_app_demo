// global variable
var PLATFORM = location.href.startsWith("https://dragos-vacariu.github.io") ? "GitHub" : "";
var API_URL = "";
var API_SCRIPT = "backend_api_manager";
var MEK = ""; /*Master Encryption Key (MEK) that will actually be used for encrypting and decrypting your data.*/
var oldMEK = null; /*pre-Migration Master Encryption Key (MEK)*/
var APP_LOCATION = "";
var NOTES_CACHE = []; // Cache for notes loaded from backend

/*
var variable have global scope (and can be used in external files).
let variable have global scope ONLY in the file in which is declared.
*/

document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible")
    {
        console.log("Tab is now active");

        const isValid = await validateTokenWithBackend();
        
        if (!isValid)
        {
            alert('Session expired. Please log in again.');
            //logoutUser();
        }
    }
});

if(PLATFORM.toLowerCase() == "github")
{
    API_URL = "https://dragos-vacariu-note-taking.vercel.app";
    APP_LOCATION = "https://dragos-vacariu.github.io/Note_taking_app_demo";
    //API_SCRIPT = "backend_api_manager_for_github";
}

// -------------------------------------------------------------------------------
// Function that returns the token from localStorage (persistent) or sessionStorage (session)
// -------------------------------------------------------------------------------
function getToken()
{
    return localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
}

// -------------------------------------------------------------------------------
// Function that decodes the JWT payload
// -------------------------------------------------------------------------------
async function getTokenPayload() 
{
    const token = getToken();
    if (!token)
    {
        return null;
    }
    
    const result = await validateTokenWithBackend();
    
    if (!result)
    {

        //logoutUser();
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

// -------------------------------------------------------------------------------
// Function that checks if the token looks valid (not expired)
// -------------------------------------------------------------------------------
async function isLoggedIn() 
{
    const payload = await getTokenPayload();
    
    if (!payload)
    {
        return false;
    }
    
    const now = Date.now() / 1000;
    return !payload.exp || payload.exp > now;
}

// -------------------------------------------------------------------------------
// Function to be called at page load to protect the page
// -------------------------------------------------------------------------------
async function requireLogin() 
{
    const payload = await getTokenPayload();
    
    if (!payload)
    {
        return null;
    }
    
    //Load the MEK
    MEK = await loadMEK();
    oldMEK = await loadOldMEK(); /*if any old MEK*/

    if (!MEK)
    {
        alert("Encryption key missing. Please log in again.");
        sessionStorage.removeItem("jwt_token");
        return null;
    }

    return payload;
}

// -------------------------------------------------------------------------------
// Function that returns the authentication headers to use in fetch requests
// -------------------------------------------------------------------------------
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

// -------------------------------------------------------------------------------
// Optional: Function used to validate token with backend before using page
// -------------------------------------------------------------------------------
async function validateTokenWithBackend()
{
    const token = getToken();
    
    if (!token)
    {
        return false;
    }
    
    try
    {
        const res = await fetch(API_URL + '/api/'  + API_SCRIPT, {
            method: 'POST',
            headers: authHeaders(),
            
            //HTTP can only send strings through web... JSON.stringify my content
            body: JSON.stringify({
                method_name: 'validateUserAuthenticationToken',
                method_params: {}
            })
        });
        
        const data = await res.json();

        console.log("Status:", res.status);
        console.log("Data:", data);

        if (res.status === 401)
        {
            return false;
        }
        
        if (data.success === true)
        {
            return true;
        }
        return false; // fallback
    }
    catch
    {
        return false;
    }
}

// -------------------------------------------------------------------------------
// Function used to derive a 256-bit MEK from user's password
// -------------------------------------------------------------------------------
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

// -------------------------------------------------------------------------------
// Function used to load MEK from the sessionStorage
// -------------------------------------------------------------------------------
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

// -------------------------------------------------------------------------------
// Function used to store the MEK throughtout the session.
// -------------------------------------------------------------------------------
async function storeMEK(MEK_key)
{
    const raw = await crypto.subtle.exportKey("raw", MEK_key);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(raw)));
    sessionStorage.setItem("MEK", base64);
}

// -------------------------------------------------------------------------------
// Function used to load oldMEK from the sessionStorage
// -------------------------------------------------------------------------------
async function loadOldMEK() 
{
    const stored = sessionStorage.getItem("oldMEK");
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

// -------------------------------------------------------------------------------
// Function used to store the oldMEK throughtout the session.
// -------------------------------------------------------------------------------
async function storeOldMEK(MEK_key)
{
    const raw = await crypto.subtle.exportKey("raw", MEK_key);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(raw)));
    sessionStorage.setItem("oldMEK", base64);
}

// -------------------------------------------------------------------------------
// Function used to discard the oldMEK from the session.
// -------------------------------------------------------------------------------
async function discardOldMEK()
{
    sessionStorage.removeItem("oldMEK");
}
