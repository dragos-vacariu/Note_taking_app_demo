// -------------------------------------------------------------------------------
// Function used to create a MEK from a password each time the user logs in, using a 
//deterministic method (PBKDF2, Argon2, etc.) so the key can be regenerated every session.
// -------------------------------------------------------------------------------
async function deriveMEK(password, salt)
{
    /*
    Purpose: To create a Master Encryption Key (MEK) that will actually be used for 
    encrypting and decrypting your data.
    
    How it works: It can be derived from the user’s password (plus a salt) or generated 
    randomly once per user.

    Returns: A Uint8Array (or ArrayBuffer) representing the raw key.
    */
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode(salt),
            iterations: 200000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    return key; // this is the MEK as a CryptoKey
}

// -------------------------------------------------------------------------------
// Function used to generate a Random MEK created once and stored securely.
// -------------------------------------------------------------------------------
async function generateMEK(password, salt) {
    /*
    Should be used if the intent is to randomly generate a MEK and to store it on the server.
    */
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode(salt),
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,           // extractable
        ["encrypt", "decrypt"]
    );

    return key;
}

// -------------------------------------------------------------------------------
// Function used to store the MEK throughtout the session.
// -------------------------------------------------------------------------------
async function storeMEK(MEK) {
    const raw = await crypto.subtle.exportKey("raw", MEK);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(raw)));
    sessionStorage.setItem("MEK", base64);
}

// -------------------------------------------------------------------------------
// Function used to generate a cryptographic key for encryption using MEK
// -------------------------------------------------------------------------------
async function importMEKKey(rawKey)
{
    return await crypto.subtle.importKey(
        "raw",
        rawKey,
        "AES-GCM",
        true,
        ["encrypt", "decrypt"]
    );
    // returns Uint8Array or ArrayBuffer
}

// -------------------------------------------------------------------------------
// Function used to encrypt data before sending it to the server
// -------------------------------------------------------------------------------
async function encryptData(plainText, cryptoKey)
{
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plainText);
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        encoded
    );
    // return IV + ciphertext so it can be used for decryption
    return {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(ciphertext))
    };
}

// -------------------------------------------------------------------------------
// Function used to decrypt data received from the server
// -------------------------------------------------------------------------------
async function decryptData(encryptedObj, cryptoKey)
{
    const iv = new Uint8Array(encryptedObj.iv);
    const ciphertext = new Uint8Array(encryptedObj.data);
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        ciphertext
    );
    return new TextDecoder().decode(decrypted);
}
