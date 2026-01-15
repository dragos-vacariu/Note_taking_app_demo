
window.onload = async function() 
{
    const payload = await requireLogin(); // local JWT validation
    
    if(!payload)
    {
        return
    }
    
    // Load notes from backend
    await loadNotes(payload);

    // Show logged user info
    await showLoggedUser(payload);
    
    // Load notes from backend
    await displayNotes();
    
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
// Function displaying the Notes/Posts on the UI
// ---------------------------------------------------------
async function displayNotes()
{   
    //console.log(NOTES_CACHE);
    const tags = new Set(); // Use a Set to avoid duplicates
    for (const note of NOTES_CACHE)
    {
        await addNoteToUI(note.title, note.content, note.tags, note.id);

        if (note.tags)
        {
            const noteTagList = note.tags.split(" "); // array of tags
            noteTagList.forEach(tag => {
                if (tag.trim()) { // avoid empty strings
                    tags.add(tag);
                }
            });
        }
    }
    truncatedContentHandling(); // attach click handler
    populateTags(tags);
    updateNotesCount(NOTES_CACHE.length);
}

// ---------------------------------------------------------
// Function triggered when the Edit option is clicked from the 
// context menu button
// ---------------------------------------------------------
function toggleEdit(e)
{
    e.preventDefault(); // <- important if this is triggered by an <a>
    //it prevents scrolling to the top of the page after click
    
    const dropdownContent = e.currentTarget.closest('.dropdown').querySelector('.dropdown-content');
    
    if (dropdownContent)
    {
        dropdownContent.classList.remove('show');
    }
    
    const entry_post = e.currentTarget.closest('.jour_entry');
    
    const titleDiv = entry_post.querySelector("#jour_entry_title");
    if(titleDiv)
    {
        titleDiv.contentEditable = "true";
    }
    
    const contentDiv = entry_post.querySelector("#jour_entry_content");
    if(contentDiv)
    {
        contentDiv.contentEditable = "true";
    }
        
    const tagsDiv = entry_post.querySelector("#jour_entry_tags");
    if(tagsDiv)
    {
        tagsDiv.contentEditable = "true";
    }
    
    const toolbar = entry_post.querySelector("#text_editor_toolbar");
    if(toolbar)
    {
        toolbar.style.display = "inline-block";
    }
    
    // Display the save button
    const saveButton = entry_post.querySelector("#save_button");
    saveButton.style.display = 'block';
    
    
    const truncatedElement = entry_post.querySelector(".truncated_entries");

    //If the entry is truncated... show the full content during edit mode
    if(truncatedElement != null)
    {
        truncatedElement.classList.remove("truncated_entries");
        const showMoreButton = entry_post.querySelector("#show_more_button");
        
        //Hide the showMore button
        showMoreButton.style.display = "none";
    }
    enterEditMode(entry_post);
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
// Function used to add a Note to the UI/Web Page
// ---------------------------------------------------------
async function addNoteToUI(title, content, tags, id, edit_mode=false) 
{
    //CREATING A POST
    const entryDiv = document.createElement('div');
    entryDiv.className = 'jour_entry';
    entryDiv.dataset.id = id;
    entryDiv.draggable = "true";
    
    const collapsableContent = document.createElement('div');
    collapsableContent.id = "collapseableDiv";
    //collapsableContent.classList.add("truncated_entries");
    
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

    editBtn.onclick = function(e) {
        toggleEdit(e); 
    };
    dropdownContentDiv.appendChild(editBtn);

    const removeBtn = document.createElement('a');
    removeBtn.innerText = 'Remove';
    removeBtn.href = '#';
    removeBtn.onclick = async (e) =>  {
        await remove_entry(e);
    };
    dropdownContentDiv.appendChild(removeBtn);
    
    //============================================================
    //ADDING THE DATA TO THE POST
    const titleDiv = document.createElement('div');
    titleDiv.id = 'jour_entry_title';
    titleDiv.innerHTML = title;
    titleDiv.contentEditable = false;

    const contentDiv = document.createElement('div');
    contentDiv.id = 'jour_entry_content';
    
    contentDiv.innerHTML = content;
    contentDiv.contentEditable = false;
    
    // simulate "5 rows"
    //contentDiv.style.minHeight = '10em';  // 1em ≈ 1 line of text
    //contentDiv.style.lineHeight = '1em'; // make each line roughly 1em
    contentDiv.style.whiteSpace = 'pre-wrap'; // respect line breaks
    
    const toolbar = createToolbar();
    toolbar.style.display = "none";
    
    const tagsDiv = document.createElement('div');
    tagsDiv.id = 'jour_entry_tags';
    
    if(tags)
    {
        let formatted_tags = "#" + tags.replaceAll(" ", ", #");
    
        tagsDiv.innerHTML = formatted_tags;
    }
    else
    {
        tagsDiv.innerHTML = "#";
    }
    tagsDiv.contentEditable = false;
    
    collapsableContent.appendChild(titleDiv);
    collapsableContent.appendChild(toolbar);
    collapsableContent.appendChild(contentDiv);
    collapsableContent.appendChild(tagsDiv);
    
    // Create the button save button
    const saveButton = document.createElement('button');
    saveButton.id = 'save_button';
    saveButton.textContent = 'Save';
    saveButton.style.display = 'none';
    saveButton.onclick = async (e) => {
      await saveEdit(e);
      // other code after async operation completes
    };
    entryDiv.appendChild(saveButton);
    
    entryDiv.appendChild(postControls);
    entryDiv.appendChild(collapsableContent);
    entryDiv.appendChild(saveButton);
    
    // Create the button showMoreButton
    const showMoreButton = document.createElement('button');
    showMoreButton.id = 'show_more_button';
    showMoreButton.textContent = 'Show More';
    showMoreButton.style.display = 'none';
    entryDiv.appendChild(showMoreButton);
    
    const journalled_content = document.getElementById('journalled_content');
    journalled_content.insertBefore(entryDiv, journalled_content.firstChild);
    
    // --- NOW the entryDiv element is in the DOM and we can measure the scrollHeight---
    
    checkAddTruncationToEntry(collapsableContent, showMoreButton);
    
    if (edit_mode)
    {
        editBtn.onclick();
    }
}

function checkAddTruncationToEntry(collapsableContent, showMoreButton)
{
    // Measure full height
    const fullHeight = collapsableContent.scrollHeight;

    // Measure truncated height
    collapsableContent.classList.add("truncated_entries");
    const truncatedHeight = collapsableContent.clientHeight;

    // Decide if truncation is needed
    if (fullHeight > truncatedHeight)
    {
        showMoreButton.style.display = "inline-block";
    }
    else
    {
        collapsableContent.classList.remove("truncated_entries");
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
    
    
    toolbar.appendChild(addButton('<b>Tx</b>', 'removeFormat', "Clear formatting"));
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
    const tagsDiv = entry_post.querySelector("#jour_entry_tags");
    const collapsableDiv = entry_post.querySelector("#collapseableDiv");
    const toolbar = entry_post.querySelector("#text_editor_toolbar");
    const saveButton = entry_post.querySelector("#save_button");
    const showMoreButton = entry_post.querySelector("#show_more_button");
        
    if(titleDiv && contentDiv)
    {
        /*Remove formatting for the post title*/
        titleDiv.innerHTML = titleDiv.innerText;
        
        const title = titleDiv.innerHTML;
        const content = contentDiv.innerHTML;
        let unformatted_tags = tagsDiv.innerHTML;
        unformatted_tags = unformatted_tags.trim();
        unformatted_tags = unformatted_tags.replaceAll("#", "");
        unformatted_tags = unformatted_tags.replaceAll(",", "");
        const tags = unformatted_tags;
        tagsDiv.innerHTML = "#" + tags.replaceAll(" ", ", #");
        
        const idx = NOTES_CACHE.findIndex(n => n.id === noteId);
    
        if (idx !== -1)
        {
            /*If note already exists in the database*/
            NOTES_CACHE[idx].title = title;
            NOTES_CACHE[idx].content = content;
            NOTES_CACHE[idx].tags = tags;
        }
        
        else
        {
            /*Add the note to database*/
            NOTES_CACHE.push({ id: noteId, title: title, content: content, tags: tags });
        }
        
        let result = await saveUserNotesToDatabase();
        
        if (result)
        {
            showStatusMessage(entry_post, "Saved successfully!", 3000, "success");
        }
        else
        {
            showStatusMessage(entry_post, "Server failure - changes not saved!", 3000, "failure");
        }
        
        titleDiv.contentEditable = "false";
        contentDiv.contentEditable = "false";
        tagsDiv.contentEditable = "false";
        
        if(toolbar)
        {
            toolbar.style.display = "none";
        }

        //Hide the button back after the content was saved
        saveButton.style.display = 'none';
        
        //Add truncation if needed
        checkAddTruncationToEntry(collapsableDiv, showMoreButton);
        entry_post.classList.remove("edit_mode");
        exitEditMode(entry_post);
    }
    else
    {
        showStatusMessage(entry_post, "Error. Refresh and try again!", 3000, "failure");
    }
}

function enterEditMode(entry)
{
    const overlay = document.createElement("div");
    overlay.className = "edit_mode";
    
    // Save original position
    entry._originalParent = entry.parentNode;
    entry._originalNext = entry.nextSibling;
    
    entry.draggable = false;
    overlay.appendChild(entry);
    document.body.appendChild(overlay);
}

function exitEditMode(entry)
{
    const parent = entry._originalParent;
    const next = entry._originalNext;

    if (next)
    {
        parent.insertBefore(entry, next);
    }
    else
    {
        parent.appendChild(entry);
    }
    entry.draggable = true;
    document.querySelector(".edit_mode").remove();
}

// ---------------------------------------------------------
// Function that triggers when the AddPost button is clicked
// ---------------------------------------------------------
async function addPost()
{
    /*Check if user's authentication is still valid*/
    const res = await fetch(API_URL + '/api/' + API_SCRIPT, {
        method: 'POST',
        headers: authHeaders(),
        
        //HTTP can only send strings through web... JSON.stringify my content
        body: JSON.stringify({
            method_name: 'validateUserAuthenticationToken',
            method_params: {}
        })
    });
    if (!res.ok)
    {
        alert('Server error. No response.');
    }
    
    const newId = 'note-' + Date.now();
    const newNote = { id: newId, title: "New Note", content: "Add your content here...", tags: "" };
    NOTES_CACHE.push(newNote);
    await addNoteToUI(newNote.title, newNote.content, newNote.id, newNote.tags, true);
}

// ---------------------------------------------------------
// Function to remove note/post
// ---------------------------------------------------------
async function remove_entry(e)
{
    const entryDiv = e.currentTarget.closest('.jour_entry');
    const noteId = entryDiv.dataset.id;

    const idx = NOTES_CACHE.findIndex(n => n.id === noteId);
    if (idx !== -1)
    {
        NOTES_CACHE.splice(idx, 1);
    }
    await saveUserNotesToDatabase();
}

// ---------------------------------------------------------
// Function used to display logged_user session
// ---------------------------------------------------------
async function showLoggedUser(payload)
{
    const userInfo = document.getElementById('user_logged');

    const userEmail = payload.user_email || payload.username;
    userInfo.textContent = `${userEmail}`;
}

function truncatedContentHandling()
{
    const divs = document.getElementsByClassName("jour_entry");
    if(divs)
    {
        for (let index = 0; index < divs.length; index++)
        {
                const para = divs[index]; // single element
                const toggle_button = para.querySelector("#show_more_button");
                
                if(toggle_button)
                {
                    toggle_button.addEventListener("click", 
                           (e) => {showMoreLessToggleButton(e.currentTarget) } );
                }
        }

        function showMoreLessToggleButton(btn)
        {
            const content = btn.parentElement.querySelector("#collapseableDiv");
            if(content)
            {
                if (content.classList.contains("truncated_entries"))
                {
                    content.classList.remove("truncated_entries");
                    btn.textContent = "See Less";
                }
                else
                {
                    content.classList.add("truncated_entries");
                    btn.textContent = "Show More";
                }
            }
            
        }
    }
}

function updateNotesCount(count) {
    document.getElementById("total_notes").textContent = `Notes: ${count}`;
}

function populateTags(tags)
{
    const tagContainer = document.getElementById("tag_buttons");
    tagContainer.innerHTML = ""; // clear existing
    tags.forEach(tag => {
        const btn = document.createElement("button");
        btn.className = "tag_button";
        btn.dataset.tag = tag;
        btn.textContent = `#${tag}`;
        btn.addEventListener("click", () => filterNotesByTag(tag));
        tagContainer.appendChild(btn);
    });

    // Update total tags
    document.getElementById("total_tags").textContent = `Tags: ${tags.size}`;
}

function toggleSidebar()
{
    sidebar.classList.toggle("collapsed");

    // Optional: change arrow direction
    if (sidebar.classList.contains("collapsed"))
    {
        toggleButton.textContent = ">";
    }
    else
    {
        toggleButton.textContent = "<";
    }
}

function addDraggingBehavior()
{
    //Draggable logic
    let draggedItem = null;

    document.addEventListener("dragstart", e => {
        if (e.target.classList.contains("jour_entry")) {
            draggedItem = e.target;
            e.target.style.opacity = "0.5";
        }
    });

    document.addEventListener("dragend", () => {
        if (draggedItem) draggedItem.style.opacity = "1";
        draggedItem = null;
    });

    document.addEventListener("dragover", e => {
        e.preventDefault(); // allow dropping
    });

    document.addEventListener("drop", e => {
        const target = e.target.closest(".jour_entry");
        if (!target || target === draggedItem) return;

        const container = document.getElementById("journalled_content");

        // Insert before the item you dropped on
        container.insertBefore(draggedItem, target);
    });
}

//Add toggleSidebar button handler
const sidebar = document.getElementById("jour_navigation");
const toggleButton = document.getElementById("toggle_sidebar_button");

toggleButton.addEventListener("click", () => {
    toggleSidebar();
});

addDraggingBehavior();