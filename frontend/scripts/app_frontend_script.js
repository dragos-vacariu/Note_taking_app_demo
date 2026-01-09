const enabledEditableDivBorderStyle = "inset 1px rgba(0,0,0,0.5)";

window.onload = function() {
    // Ensure user is logged in; redirects to login if not
    requireLogin();

    // Show logged user info
    showLoggedUser();

    // Load notes from backend
    loadNotes();
};

let notesCache = []; // Cache for notes loaded from backend

// ------------------------
// Note UI functions
// ------------------------

function toggleEdit() {
    const dropdownContent = this.closest('.dropdown').querySelector('.dropdown-content');
    
    if (dropdownContent)
    {
        dropdownContent.classList.remove('show');
    }
    
    const entry_post = this.closest('.jour_entry');

    // Enable editing
    entry_post.children[0].children[0].textContent = "Post";
    entry_post.children[0].children[0].onclick = saveEdit;
    entry_post.children[1].contentEditable = "true";
    entry_post.children[2].contentEditable = "true";
    entry_post.children[1].style.border = enabledEditableDivBorderStyle;
    entry_post.children[2].style.border = enabledEditableDivBorderStyle;
}

function toggleDropdown(button)
{
    const dropdownContent = button.nextElementSibling;
    
    if (dropdownContent)
    {
        dropdownContent.classList.toggle("show");
    }
}

// ------------------------
// Backend interaction
// ------------------------

function loadNotes()
{
    // Show logged user info
    showLoggedUser();

    fetch(API_URL + '/api/backend_api_manager_for_github', {
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

function addNoteToUI(title, content, id, edit_mode=false) 
{
    //CREATING A POST
    const entryDiv = document.createElement('div');
    entryDiv.className = 'jour_entry';
    entryDiv.dataset.id = id;
    
    //============================================================
    //ADDING BUTTONS AND FORM ELEMENTS
    const dropdownDiv = document.createElement('div');
    dropdownDiv.className = 'dropdown';

    const toggleDropdownButton = document.createElement('button');
    toggleDropdownButton.className = 'page_button';
    toggleDropdownButton.id = 'dropbtn';
    toggleDropdownButton.innerText = '...';
    toggleDropdownButton.onclick = function() {
        toggleDropdown(this); 
    };
    dropdownDiv.appendChild(toggleDropdownButton);

    const dropdownContentDiv = document.createElement('div');
    dropdownContentDiv.className = 'dropdown-content';
    dropdownDiv.appendChild(dropdownContentDiv);

    const editBtn = document.createElement('a');
    editBtn.innerText = 'Edit';
    editBtn.href = '#';

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
    titleDiv.className = 'jour_entry_title';
    titleDiv.innerHTML = title;
    titleDiv.contentEditable = false;
    titleDiv.addEventListener("keydown", (e) => { textFormatting_KeyboardShortcuts(e)});

    const contentDiv = document.createElement('div');
    contentDiv.className = 'jour_entry_content';
    contentDiv.innerHTML = content;
    contentDiv.contentEditable = false;
    contentDiv.addEventListener("keydown", (e) => { textFormatting_KeyboardShortcuts(e)});
    
    entryDiv.appendChild(dropdownDiv);
    entryDiv.appendChild(titleDiv);
    entryDiv.appendChild(contentDiv);

    const journalled_content = document.getElementById('journalled_content');
    journalled_content.insertBefore(entryDiv, journalled_content.firstChild);

    if (edit_mode)
    {
        editBtn.onclick();
    }
}

function textFormatting_KeyboardShortcuts(e)
{
        const editableDiv = e.target; // this is the element that triggered the event
        
        if (editableDiv.contentEditable == true)
        {
            if (e.ctrlKey && e.key === "h" ) { // Ctrl+H for highlight
                e.preventDefault();
                document.execCommand("hiliteColor", false, "yellow");
            }
            if (e.ctrlKey && e.key === "l") { // Ctrl+L for bullet list
                e.preventDefault();
                document.execCommand("insertUnorderedList");
            }
            if (e.ctrlKey && e.key === "s") { // Ctrl+S for strikethrough
                e.preventDefault();
                document.execCommand("strikeThrough");
            }
        }
}

// ------------------------
// Note modification
// ------------------------

function saveEdit()
{
    const entry_post = this.closest('.jour_entry');
    const noteId = entry_post.dataset.id;
    const title = entry_post.children[1].innerHTML;
    const content = entry_post.children[2].innerHTML;

    const idx = notesCache.findIndex(n => n.id === noteId);
    
    if (idx !== -1)
    {
        notesCache[idx].title = title;
        notesCache[idx].content = content;
    }
    
    else
    {
        notesCache.push({ id: noteId, title, content });
    }

    fetch(API_URL + '/api/backend_api_manager_for_github', {
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
        .then(() => alert('Note saved'))
        .catch(() => alert('Failed to save note'));

    entry_post.children[1].contentEditable = "false";
    entry_post.children[2].contentEditable = "false";
    entry_post.children[1].style.border = "none";
    entry_post.children[2].style.border = "none";
    
    //display the edit once again
    const toggleDropdownButton = entry_post.querySelector('#dropbtn');
    if(toggleDropdownButton)
    {
        toggleDropdownButton.innerText = '...';
    }
}

function addPost() {
    const newId = 'note-' + Date.now();
    const newNote = { id: newId, title: "New Note", content: "Add your content here..." };
    notesCache.push(newNote);
    addNoteToUI(newNote.title, newNote.content, newNote.id, true);
}

function remove_entry() {
    const entryDiv = this.closest('.jour_entry');
    const noteId = entryDiv.dataset.id;

    const idx = notesCache.findIndex(n => n.id === noteId);
    if (idx !== -1) notesCache.splice(idx, 1);

    fetch(API_URL + '/api/backend_api_manager_for_github', {
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

// ------------------------
// User session
// ------------------------



function showLoggedUser()
{
    const payload = requireLogin(); // ensures user is logged in
    const userInfo = document.getElementById('user_logged');

    const userEmail = payload.user_email || payload.username;
    userInfo.textContent = `${userEmail}`;
}
