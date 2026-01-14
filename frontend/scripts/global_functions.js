// ---------------------------------------------------------
// Function used to load/decrypt userNotes from the Database
// ---------------------------------------------------------
async function loadNotes()
{
    const user = await requireLogin();

    if (!user)
    {
        window.location.href = APP_LOCATION + '/frontend/login.html';
        return;
    }

    try
    {
        const res = await fetch(API_URL + '/api/' + API_SCRIPT, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                method_name: 'getUserNotes',
                method_params: {}
            })
        });

        if (!res.ok)
        {
            if (res.status === 401)
            {
                alert('Session expired. Please log in again.');
                logoutUser();
                return;
            }
            throw new Error('Failed to load notes');
        }

        const data = await res.json();
        if (!data || !data.notes)
        {
            return;
        }
        NOTES_CACHE = [];

        for (const note of data.notes)
        {
            // Use await properly inside an async function
            console.log("Decrypting Title: " + note.title);
            let decryptedTitle = await decryptData(MEK, note.title);
            console.log("Decrypting Content: " + note.content);
            let decryptedContent = await decryptData(MEK, note.content);
            
            NOTES_CACHE.push({ id: note.id, title: decryptedTitle, content: decryptedContent });
        }

        console.log("Notes read: ", NOTES_CACHE);
        // Optionally: render notes to UI
        // NOTES_CACHE.forEach(note => addNoteToUI(note.decryptedTitle, note.decryptedContent, note.id));

    }
    catch (err)
    {
        console.error('Failed to load notes:', err);
        alert('Failed to load notes');
    }
}

// ---------------------------------------------------------
// Function used to save user notes to server
// ---------------------------------------------------------
async function saveUserNotesToDatabase()
{
    const encryptedNotes = await getEncryptedNotes(MEK);
        
    fetch(API_URL + '/api/' + API_SCRIPT, {
        method: 'POST',
        headers: authHeaders(),
        
        //HTTP can only send strings through web... JSON.stringify my content
        body: JSON.stringify({
            notes: encryptedNotes,
            method_name: 'saveUserNotes',
            method_params: {}
        })
    })//no ; means the following .then/.catch will wait for the server response before executing
        .then(res => res.json())
        .then(() => showStatusMessage(entry_post, "Saved successfully!", 3000, "success"))
        .catch(() => showStatusMessage(entry_post, "Server failure - changes not saved!", 3000, "failure"));
}

// ---------------------------------------------------------
// Helper Function used to encrypt user notes
// ---------------------------------------------------------
async function getEncryptedNotes(MEK_Key)
{
    let encrypted_notes = [];
    
    for (note of NOTES_CACHE)
    {
        const encryptedTitle = await encryptData(MEK_Key, note.title);
        const encryptedContent = await encryptData(MEK_Key, note.content);
        encrypted_notes.push( {id: note.id, title: encryptedTitle, content: encryptedContent} );
    }
    return encrypted_notes;
}