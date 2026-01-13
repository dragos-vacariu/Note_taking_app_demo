const enabledEditableDivBorderStyle = "inset 1px rgba(0,0,0,0.5)";
let notesCache = []; // Cache for notes loaded from backend

window.onload = async function() {
    // Ensure user is logged in; redirects to login if not
    const user = await requireLogin();
    
    if (!user) 
    {
        window.location.href = APP_LOCATION + '/frontend/login.html';
        return;
    }
    // Show logged user info
    await showLoggedUser();

    // Load notes from backend
    loadNotes();
    
    //Get the addEntry button
    const addEntryButton = document.getElementById("add_entry_button");
    
    if(addEntryButton)
    {
         //Adding async function for button onclick 
        addEntryButton.addEventListener("click" , async () => {
            await addPost();
            // You can add more code here to run after addPost() finishes
        });
    }
};

// ---------------------------------------------------------
// Function triggered when the Edit option is clicked from the 
// context menu button
// ---------------------------------------------------------
function toggleEdit()
{
    const dropdownContent = this.closest('.dropdown').querySelector('.dropdown-content');
    
    if (dropdownContent)
    {
        dropdownContent.classList.remove('show');
    }
    
    const entry_post = this.closest('.jour_entry');

    // Enable editing
    const toggleDropdownButton = entry_post.querySelector('#dropbtn');
    
    if(toggleDropdownButton)
    {
        toggleDropdownButton.textContent = "Post";
        toggleDropdownButton.onclick = async (e) => {
          await saveEdit(e);
          // other code after async operation completes
        };
    }
    
    const titleDiv = entry_post.querySelector("#jour_entry_title");
    if(titleDiv)
    {
        titleDiv.contentEditable = "true";
        titleDiv.style.border = enabledEditableDivBorderStyle;
    }
    
    const contentDiv = entry_post.querySelector("#jour_entry_content");
    if(contentDiv)
    {
        contentDiv.contentEditable = "true";
        contentDiv.style.border = enabledEditableDivBorderStyle;
    }
    
    const toolbar = entry_post.querySelector("#text_editor_toolbar");
    if(toolbar)
    {
        toolbar.style.display = "inline-block";
    }
}

function toggleDropdown(button)
{
    const dropdownContent = button.nextElementSibling;
    
    if (dropdownContent)
    {
        dropdownContent.classList.toggle("show");
    }
}

// ---------------------------------------------------------
// Function used to connect to the server and receive all 
// the Posts/Notes
// ---------------------------------------------------------
function loadNotes()
{
    fetch(API_URL + '/api/' + API_SCRIPT, {
        method: 'POST',
        headers: authHeaders(),
        
        //HTTP can only send strings through web... JSON.stringify my content
        body: JSON.stringify({
            method_name: 'getUserNotes',
            method_params: {}
        })
    })//no ; means the following .then/.catch will wait for the server response before executing
        .then(async res => {
            if (!res.ok) {
                if (res.status === 401) {
                    alert('Session expired. Please log in again.');
                    logoutUser();
                    return;
                }
                throw new Error('Failed to load notes');
            }
            return res.json();
        })
        .then(data => {
            if (!data) return;

            notesCache = data.notes || [];
            data.notes.forEach(note => addNoteToUI(note.title, note.content, note.id));
        })
        .catch(err => {
            console.error('Failed to load notes:', err);
            alert('Failed to load notes');
        });
}

// ---------------------------------------------------------
// Function used to add a Note to the UI/Web Page
// ---------------------------------------------------------
async function addNoteToUI(title, content, id, edit_mode=false) 
{
    //CREATING A POST
    const entryDiv = document.createElement('div');
    entryDiv.className = 'jour_entry';
    entryDiv.dataset.id = id;
    
    //============================================================
    //ADDING BUTTONS AND FORM ELEMENTS
    const postControls = document.createElement('div');
    postControls.id = "postControls"
    
    const dropdownDiv = document.createElement('div');
    dropdownDiv.className = 'dropdown';
    postControls.appendChild(dropdownDiv);
    
    const toggleDropdownButton = document.createElement('button');
    toggleDropdownButton.className = 'page_button';
    toggleDropdownButton.id = 'dropbtn';
    toggleDropdownButton.innerText = '...';
    toggleDropdownButton.onclick = function() {
        toggleDropdown(this); 
    };
    dropdownDiv.appendChild(toggleDropdownButton);
    
    const statusInfo = document.createElement('span');
    statusInfo.id = 'statusInfo';
    statusInfo.innerText = 'status';

    postControls.appendChild(statusInfo);

    const dropdownContentDiv = document.createElement('div');
    dropdownContentDiv.className = 'dropdown-content';
    dropdownDiv.appendChild(dropdownContentDiv);

    const editBtn = document.createElement('a');
    editBtn.innerText = 'Edit';
    editBtn.href = '#';
    editBtn.id = 'editButton';

    editBtn.onclick = function() {
        toggleEdit.call(this); 
    };
    dropdownContentDiv.appendChild(editBtn);

    const removeBtn = document.createElement('a');
    removeBtn.innerText = 'Remove';
    removeBtn.href = '#';
    removeBtn.onclick = remove_entry;
    dropdownContentDiv.appendChild(removeBtn);
    
    //============================================================
    //ADDING THE DATA TO THE POST
    const titleDiv = document.createElement('div');
    titleDiv.id = 'jour_entry_title';
    if(edit_mode==false)
    {
        titleDiv.innerHTML = await decryptData(MEK, title);
    }
    else
    {
        titleDiv.innerHTML = title;
    }
    titleDiv.contentEditable = false;

    const contentDiv = document.createElement('div');
    contentDiv.id = 'jour_entry_content';
    
    if(edit_mode==false)
    {
        contentDiv.innerHTML = await decryptData(MEK, content);
    }
    else
    {
        contentDiv.innerHTML = content;
    }
    contentDiv.contentEditable = false;
    
    // simulate "5 rows"
    contentDiv.style.minHeight = '10em';  // 1em ≈ 1 line of text
    contentDiv.style.lineHeight = '1em'; // make each line roughly 1em
    contentDiv.style.whiteSpace = 'pre-wrap'; // respect line breaks
    
    const toolbar = createToolbar();
    toolbar.style.display = "none";
    
    entryDiv.appendChild(postControls);
    entryDiv.appendChild(titleDiv);
    entryDiv.appendChild(toolbar);
    entryDiv.appendChild(contentDiv);

    const journalled_content = document.getElementById('journalled_content');
    journalled_content.insertBefore(entryDiv, journalled_content.firstChild);

    if (edit_mode)
    {
        editBtn.onclick();
    }
}

// ---------------------------------------------------------
// Function used to create a textEditor toolbar for the Post/Note
// ---------------------------------------------------------
function createToolbar()
{
    const toolbar = document.createElement('div');
    toolbar.id = 'text_editor_toolbar';
    
    // Helper to create a button
    const addButton = (label, command, title, value = null) => {
        const btn = document.createElement('button');
        btn.innerHTML = label;
        btn.type = 'button';
        btn.title = title;
        btn.classList.add('toolbar_button');
        btn.addEventListener('click', () => {
            document.execCommand(command, false, value);
        });
        btn.style.marginRight = '3px';
        return btn;
    };
    
    // Basic formatting buttons
    toolbar.appendChild(addButton('<b>B</b>', 'bold', "bold font"));
    toolbar.appendChild(addButton('<i>I</i>', 'italic', "italic font"));
    toolbar.appendChild(addButton('<u>U</u>', 'underline', "underline font"));
    toolbar.appendChild(addButton('S', 'strikeThrough', "strikeThrough font"));
    
    // Lists
    toolbar.appendChild(addButton('• List', 'insertUnorderedList', "unoderedList"));
    toolbar.appendChild(addButton('1. List', 'insertOrderedList', "orderedList"));
    
    // Alignment
    toolbar.appendChild(addButton('Left', 'justifyLeft', "Text Allign Left"));
    toolbar.appendChild(addButton('Center', 'justifyCenter', "Text Allign Center"));
    toolbar.appendChild(addButton('Right', 'justifyRight', "Text Allign Right"));
    
    // Color picker
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.title = 'Font Color';
    colorInput.classList.add("colorPicker");
    colorInput.addEventListener('input', (e) => 
                    document.execCommand('foreColor', false, e.target.value));
    toolbar.appendChild(colorInput);
    
    // Highlight (background color)
    const highlightInput = document.createElement('input');
    highlightInput.type = 'color';
    highlightInput.title = 'Highlight';
    highlightInput.classList.add("colorPicker");
    highlightInput.addEventListener('input', (e) => 
                    document.execCommand('hiliteColor', false, e.target.value));
    toolbar.appendChild(highlightInput);
    
    // Font size (1-7 scale)
    const fontSizeSelect = document.createElement('select');
    fontSizeSelect.classList.add("fontSizeSelect");
    for(let i=1; i<=7; i++)
    {
        const option = document.createElement('option');
        option.value = i;
        option.text = `Size ${i}`;
        fontSizeSelect.appendChild(option);
    }
    
    fontSizeSelect.addEventListener('change', (e) => 
                    document.execCommand('fontSize', false, e.target.value));
    toolbar.appendChild(fontSizeSelect);
    
    return toolbar;
}

// ---------------------------------------------------------
// Function used to display messages during Post/Note modifications
// ---------------------------------------------------------
function showStatusMessage(entryDiv, message, duration = 2000, result = "none")
{
    const statusBox = entryDiv.querySelector('#statusInfo');
    if (!statusBox)
    {
        return;
    }
    statusBox.textContent = message;
    statusBox.style.opacity = '1';
    statusBox.style.transform = 'translateY(0)';
    if(result.toLowerCase() == "success")
    {
        statusBox.style.color = "#009900";
    }
    else if(result.toLowerCase() == "failure")
    {
        statusBox.style.color = "#990000";
    }

    setTimeout(() => {
        statusBox.style.opacity = '0';
        statusBox.style.transform = 'translateY(-2px)';
    }, duration);
}

// ---------------------------------------------------------
// Function that executes when Post button is clicked
// used to save the note to the server
// ---------------------------------------------------------
async function saveEdit(e)
{
    /*
        e.target
        The actual element that triggered the event.
        It’s the deepest element that was clicked or interacted with.
        Can be a child element inside the element the event listener is attached to.
        
        e.currentTarget
        The element the event listener is actually attached to.
        Never changes during event propagation (bubbling).
        Always what you expect if you want the “owner” element.
    */
    const entry_post = e.currentTarget.closest('.jour_entry');
    const noteId = entry_post.dataset.id;
    
    const titleDiv = entry_post.querySelector("#jour_entry_title");
    const contentDiv = entry_post.querySelector("#jour_entry_content");
    const toolbar = entry_post.querySelector("#text_editor_toolbar");
        
    if(titleDiv && contentDiv)
    {
        /*Remove formatting for the post title*/
        titleDiv.innerHTML = titleDiv.innerText;
        
        const title = titleDiv.innerHTML;
        
        //Encrypting data:
        const encryptedTitle = await encryptData(MEK, title);
        
        const content = contentDiv.innerHTML;
        
        //Encrypting data:
        const encryptedContent = await encryptData(MEK, content);
        console.log(MEK)
        
        const idx = notesCache.findIndex(n => n.id === noteId);
    
        if (idx !== -1)
        {
            notesCache[idx].title = encryptedTitle;
            notesCache[idx].content = encryptedContent;
        }
        
        else
        {
            notesCache.push({ id: noteId, title, content });
        }

        fetch(API_URL + '/api/' + API_SCRIPT, {
            method: 'POST',
            headers: authHeaders(),
            
            //HTTP can only send strings through web... JSON.stringify my content
            body: JSON.stringify({
                notes: notesCache,
                method_name: 'saveUserNotes',
                method_params: {}
            })
        })//no ; means the following .then/.catch will wait for the server response before executing
            .then(res => res.json())
            .then(() => showStatusMessage(entry_post, "Saved successfully!", 3000, "success"))
            .catch(() => showStatusMessage(entry_post, "Server failure - note not saved!", 3000, "failure"));

        titleDiv.contentEditable = "false";
        titleDiv.style.border = "none";
        contentDiv.contentEditable = "false";
        contentDiv.style.border = "none";
        
        if(toolbar)
        {
            toolbar.style.display = "none";
        }

        //display the edit once again
        const toggleDropdownButton = entry_post.querySelector('#dropbtn');
        if(toggleDropdownButton)
        {
            toggleDropdownButton.innerText = '...';
            toggleDropdownButton.onclick = function() {
                toggleDropdown(e.currentTarget); 
            };
        }
        
    }
    else
    {
        alert('');
        showStatusMessage(entry_post, "Error. Refresh and try again!", 3000, "failure")
    }
}

// ---------------------------------------------------------
// Function that triggers when the AddPost button is clicked
// ---------------------------------------------------------
async function addPost() {
    const newId = 'note-' + Date.now();
    const newNote = { id: newId, title: "New Note", content: "Add your content here..." };
    notesCache.push(newNote);
    await addNoteToUI(newNote.title, newNote.content, newNote.id, true);
}

// ---------------------------------------------------------
// Function to remove note/post
// ---------------------------------------------------------
function remove_entry() {
    const entryDiv = this.closest('.jour_entry');
    const noteId = entryDiv.dataset.id;

    const idx = notesCache.findIndex(n => n.id === noteId);
    if (idx !== -1) notesCache.splice(idx, 1);

    fetch(API_URL + '/api/' + API_SCRIPT, {
        method: 'POST',
        headers: authHeaders(),
        
        //HTTP can only send strings through web... JSON.stringify my content
        body: JSON.stringify({
            notes: notesCache,
            method_name: 'saveUserNotes',
            method_params: {}
        })
    })//no ; means the following .then/.catch will wait for the server response before executing
        .then(res => res.json())
        .then(() => {
            alert('Note removed');
            const journalled_content = document.getElementById('journalled_content');
            journalled_content.removeChild(entryDiv);
        })
        .catch(() => {
            alert('Failed to remove note')
        });
}

// ---------------------------------------------------------
// Show logged_user session
// ---------------------------------------------------------
async function showLoggedUser()
{
    const payload = await requireLogin(); // ensures user is logged in
    const userInfo = document.getElementById('user_logged');

    const userEmail = payload.user_email || payload.username;
    userInfo.textContent = `${userEmail}`;
}
