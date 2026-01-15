// global variable
var PLATFORM = "";
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

if(location.href.startsWith("https://dragos-vacariu.github.io"))
{
    PLATFORM = "github";
    API_URL = "https://dragos-vacariu-note-taking.vercel.app";
    APP_LOCATION = "https://dragos-vacariu.github.io/Note_taking_app_demo";
}
else if(location.href.startsWith("http://localhost:8003"))
{
     PLATFORM = "localhost";
     API_URL = "https://dragos-vacariu-note-taking.vercel.app";
     APP_LOCATION = "http://localhost:8003";
}

document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible")
    {
        await requirePassword();
    }
});

// -------------------------------------------------------------------------------
// Function that returns the token from localStorage (persistent) or sessionStorage (session)
// -------------------------------------------------------------------------------
function getSessionToken()
{
    return sessionStorage.getItem('jwt_token');
}

function getLocalToken()
{
    return localStorage.getItem('jwt_token');
}

function getToken()
{
    let token = getSessionToken();
    if (!token)
    {
        token = getLocalToken();
    }
    if(!token)
    {
        return null;
    }
    return token;
}

// -------------------------------------------------------------------------------
// Function that decodes the JWT payload
// -------------------------------------------------------------------------------
async function getTokenPayload() 
{
    const token = getToken();
    if(!token)
    {
        alert("Authentication token not found. Please log in again.")
        //throw new Error('No token found');
        logoutUser();
        return null;
    }
    
    const result = await validateTokenWithBackend(token);
    
    if (!result)
    {
        alert("Authentication token invalid. Please log in again.");
        logoutUser();
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
        alert("Authentication token could not be parsed. Please log in again.");
        logoutUser();
        return null;
    }
}

// -------------------------------------------------------------------------------
// Function that checks if the token looks valid (not expired)
// -------------------------------------------------------------------------------
async function isLoggedIn(payload) 
{
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
    
    return payload;
}

// -------------------------------------------------------------------------------
// Function to check if MEK is still available or to regenerate it if its invalid.
// -------------------------------------------------------------------------------
async function requirePassword()
{
    if(document.getElementById("unlockModal"))
    {
        const session_result = await checkUserSessionValability();
        const localToken = getLocalToken();
        const sessionToken = getToken();
        
        //console.log("Session Token: " + sessionToken)
        //console.log("Local Token: " + localToken)
        //console.log("session_result: " + session_result.success + " " + session_result.sessionVerified + " " + session_result.message);
        
        if (localToken === sessionToken && session_result.success == false && session_result.sessionVerified)
        {
            /*Session was invalidated from a different device*/
            alert("Session was invalidated from a different device.");
            logoutUser();
            return
        }
        if (localToken !== sessionToken)
        {
            /*Session was invalidated from  this device*/
            
            /*Use localStorage token for this session*/
            sessionStorage.setItem('jwt_token', localToken);
            
            alert("Session was invalidated from your current device.");
            
            showUnlockModal();
            const unlockBtn = document.getElementById("unlockBtn");
            unlockBtn.replaceWith(unlockBtn.cloneNode(true)); // removes old listeners
            document.getElementById("unlockBtn").addEventListener("click", unlockBtnAction);
            
            return true;
        }
        //Load the MEK
        MEK = await loadMEK();
        
        if (!MEK)
        {
            showUnlockModal();

            const unlockBtn = document.getElementById("unlockBtn");
            unlockBtn.replaceWith(unlockBtn.cloneNode(true)); // removes old listeners
            document.getElementById("unlockBtn").addEventListener("click", unlockBtnAction);
            
            //console.log("MEK regenerated: ");
            return true;
        }
        return null;
    }
    return null;
}

// -------------------------------------------------------------------------------
// Function to show the unlock modal
// -------------------------------------------------------------------------------
function showUnlockModal()
{
    document.getElementById("unlockModal").classList.remove("hidden");
}

// -------------------------------------------------------------------------------
// Function to hide the unlock modal
// -------------------------------------------------------------------------------
function hideUnlockModal()
{
    document.getElementById("unlockModal").classList.add("hidden");
}

// -------------------------------------------------------------------------------
// Function triggered when the unlock button from unlock modal is pressed
// -------------------------------------------------------------------------------
async function unlockBtnAction()
{
    const password = document.getElementById("unlockPassword").value;
    const error = document.getElementById("unlockError");

    if (!password)
    {
        error.textContent = "Please enter your password.";
        return;
    }

    try
    {
        const res = await fetch(API_URL + '/api/'  + API_SCRIPT, {
            method: 'POST',
            headers: authHeaders(),
            
            //HTTP can only send strings through web... JSON.stringify my content
            body: JSON.stringify({
                password: password,
                method_name: 'confirmPassword',
                method_params: {}
            })
        });
        
        const data = await res.json(); //parse JSON first
        
        if(res.ok && data.success)
        {
            const payload = await getTokenPayload();
            const email = payload.user_email;

            const newMEK = await deriveMEK(password, email);

            await storeMEK(newMEK);   // sessionStorage
            MEK = newMEK;

            hideUnlockModal();
            location.reload();  // reload app with MEK available
        }
        else
        {
            document.getElementById("unlockPassword").value = "";
            error.textContent = "Wrong password.";
        }
    }
    catch (err)
    {
        error.textContent = "Incorrect password. Please try again.";
    }
}

// -------------------------------------------------------------------------------
// Function that returns the authentication headers to use in fetch requests
// -------------------------------------------------------------------------------
function authHeaders()
{
    const token = getToken();
    if(!token)
    {
        alert("Authentication token not found. Please log in again.")
        //throw new Error('No token found');
        logoutUser();
        return;
    }
    
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// -------------------------------------------------------------------------------
// Optional: Function used to validate token with backend before using page
// -------------------------------------------------------------------------------
async function validateTokenWithBackend(token)
{
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

        return data.success;
    }
    catch
    {
        return false;
    }
}

// -------------------------------------------------------------------------------
// Function used to verify if the user session is still valid
// -------------------------------------------------------------------------------
async function checkUserSessionValability()
{
    const res = await fetch(API_URL + '/api/'  + API_SCRIPT, {
        method: 'POST',
        headers: authHeaders(),
        
        //HTTP can only send strings through web... JSON.stringify my content
        body: JSON.stringify({
            method_name: 'verifyUserSessionValability',
            method_params: {}
        })
    });
    
    const data = await res.json();
    
    return data;
}

// -------------------------------------------------------------------------------
// Function used to update the user session is when invalid
// -------------------------------------------------------------------------------
async function updateUserSession()
{
    const res = await fetch(API_URL + '/api/'  + API_SCRIPT, {
        method: 'POST',
        headers: authHeaders(),
        
        //HTTP can only send strings through web... JSON.stringify my content
        body: JSON.stringify({
            method_name: 'updateUserSessionValability',
            method_params: {}
        })
    });
    
    const data = await res.json();
    
    if(data.success && data.newToken)
    {
        // Save newToken to local storage for longterm use.
        localStorage.setItem('jwt_token', data.newToken); //works with multitabs
        //sessionStorage.setItem('jwt_token', token); //sessioStorage only works with 1 tab.
    }
    return data.success;
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
