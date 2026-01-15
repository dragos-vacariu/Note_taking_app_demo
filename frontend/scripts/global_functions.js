// ---------------------------------------------------------
// Function used to load/decrypt userNotes from the Database
// ---------------------------------------------------------
async function loadNotes(payload)
{
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
            //similar to alert('Failed to load notes');
            throw new Error('ERROR: No server response. Failed to load notes');
        }

        const data = await res.json();
        if (!data || !data.notes)
        {
            return;
        }
        
        if (!oldMEK && data.preMigrationEmailAddress)
        {
            alert("Hello user!" +
                  "\n\nYour account's migration from: " + data.preMigrationEmailAddress + " to " + 
                  data.email + " is ongoing." +
                  "\n\nTo complete the migration - you will need to login again!" +
                  "\n\nThank you, \n\nAdmin"
                  );
            logoutUser();
        }
        
        NOTES_CACHE = [];

        for (const note of data.notes)
        {
            // Use await properly inside an async function
            
            let decryptedTitle;
            let decryptedContent;
            let decryptedTags;
            
            // If notes read for the first time after account migration to a new email address:
            //console.log("MEK: " + MEK)
            //console.log("oldMEK: " + oldMEK)
            
            if(oldMEK)
            {
                decryptedTitle = await decryptData(oldMEK, note.title);
                //console.log("PostMigration - Decrypting Title: " + note.title);
                
                decryptedContent = await decryptData(oldMEK, note.content);
                //console.log("PostMigration - Decrypting Content: " + note.content);
                
                if(note.tags)
                {
                    decryptedTags = await decryptData(oldMEK, note.tags);
                    //console.log("PostMigration - Decrypting Tags: " + note.tags);
                }
            }
            else
            {
                decryptedTitle = await decryptData(MEK, note.title);
                //console.log("Decrypting Title: " + note.title);
                
                decryptedContent = await decryptData(MEK, note.content);
                //console.log("Decrypting Content: " + note.content);
                
                if(note.tags)
                {
                    decryptedTags = await decryptData(MEK, note.tags);
                    //console.log("Decrypting Tags: " + note.tags);
                }
            }
            
            NOTES_CACHE.push({ id: note.id, title: decryptedTitle, content: decryptedContent, tags: decryptedTags});
        }

        //console.log("Notes read: ", NOTES_CACHE);
        
        // If notes read for the first time after account migration to a new email address:
        if(oldMEK)
        {
            let result = saveUserNotesToDatabase(migration_flag = true);
            discardOldMEK();
            
            if(result)
            {
                /*Send notification mail that migration is complete.*/
            }
        }
    }
    catch (err)
    {
        console.error('Failed to load notes: ' + err);
        alert('Failed to load notes ' + err);
    }
}

// ---------------------------------------------------------
// Function used to save user notes to server
// ---------------------------------------------------------
async function saveUserNotesToDatabase(migration_flag = false) 
{
    try
    {
        const encryptedNotes = await getEncryptedNotes(MEK);

        const res = await fetch(API_URL + '/api/' + API_SCRIPT, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                notes: encryptedNotes,
                migration_flag: migration_flag,
                method_name: 'saveUserNotes',
                method_params: {}
            })
        });

        if (!res.ok)
        {
            throw new Error('ERROR: No server response. Failed to save notes');
        }

        const data = await res.json();

        return true;
    }
    catch (err)
    {
        console.error(err);
        return false;
    }
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
        const encryptedTags = await encryptData(MEK_Key, note.tags);
        encrypted_notes.push( {id: note.id, title: encryptedTitle, 
                                content: encryptedContent, tags: encryptedTags} );
    }
    return encrypted_notes;
}

// ---------------------------------------------------------
// Function used to logout the user
// ---------------------------------------------------------
function logoutUser()
{
    localStorage.removeItem('jwt_token');
    sessionStorage.removeItem('jwt_token');
    sessionStorage.removeItem("MEK");
    
    setTimeout(() => {
        window.location.href = APP_LOCATION + '/frontend/login.html';
    }, 1000);
}