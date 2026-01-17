let activeTags = [];
let visibleNotes = [];
let areEntriesExpanded = false;

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
        await addNoteToUI(note.title, note.content, note.tags, note.id, note.editDate);
        if(visibleNotes.includes(note.id) == false)
        {
            visibleNotes.push(note.id)
        }
        if (note.tags)
        {
            const noteTagList = note.tags.split(" "); // array of tags
            noteTagList.forEach(tag => {
                if (tag.trim())
                { // avoid empty strings
                    activeTags.push(tag); //all tags are active by default
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
async function addNoteToUI(title, content, tags, id, editDate=undefined) 
{
    //CREATING A POST
    const entryDiv = document.createElement('div');
    entryDiv.className = 'jour_entry';
    entryDiv.dataset.id = id;
    
    const collapsableContent = document.createElement('div');
    collapsableContent.id = "collapseableDiv";
    //collapsableContent.classList.add("truncated_entries");
    
    //============================================================
    //ADDING BUTTONS AND FORM ELEMENTS
    const postHeader = document.createElement('div');
    postHeader.id = "postHeader";
    
    const postControls = document.createElement('div');
    postControls.id = "postControls"
    
    const closeButton = document.createElement('button');
    closeButton.id = 'close_button';
    closeButton.innerText = 'X';
    closeButton.title = 'Close';
    closeButton.onclick = function(e) {
        closeNote(e);
    };
    postControls.appendChild(closeButton);
    
    const dropdownDiv = document.createElement('div');
    dropdownDiv.className = 'dropdown';
    postControls.appendChild(dropdownDiv);
    
    const toggleDropdownButton = document.createElement('button');
    toggleDropdownButton.id = 'dropbtn';
    toggleDropdownButton.innerText = '...';
    toggleDropdownButton.title = 'Options';
    toggleDropdownButton.onclick = function() {
        toggleDropdown(this); 
    };
    dropdownDiv.appendChild(toggleDropdownButton);
    
    const copyClipboard = document.createElement('button');
    copyClipboard.id = 'copy_clipboard';
    copyClipboard.innerText = '⎘';
    copyClipboard.title = 'Copy to Clipboard';
    copyClipboard.onclick = function(e) {
        copyToClipboard(e);
    };
    postControls.appendChild(copyClipboard);
    
    const dragHandle = document.createElement('button');
    dragHandle.id = 'dragHandleButton';
    dragHandle.className = 'drag-handle';
    dragHandle.innerText = '✥';
    dragHandle.draggable = true;
    dragHandle.title = 'Drag & Drop Handler';
    postControls.appendChild(dragHandle);
    
    const postDetails = document.createElement('button');
    postDetails.id = 'postDetailsButton';
    postDetails.className = 'post_details_button';
    postDetails.innerText = 'ℹ️';
    postDetails.title = 'Post Details';
    postDetails.onclick = function(e) {
        showHidePostDetails(e);
    };
    postControls.appendChild(postDetails);
    
    const statusInfo = document.createElement('span');
    statusInfo.id = 'statusInfo';
    statusInfo.innerText = 'status';

    postControls.appendChild(statusInfo);
    
    postHeader.appendChild(postControls);
    
    const timestamp = document.createElement('span');
    timestamp.id = 'note_timestamp';
    let post_date = id.replace("note-", "");
    post_date = "Posted at: " + formatTimestamp(post_date);
    
    if(editDate)
    {
        post_date = post_date + "\nLast edited at: " + formatTimestamp(editDate);
    }
    
    timestamp.innerText = post_date;
    postHeader.appendChild(timestamp);
    
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
    
    const saveTxtFile = document.createElement('a');
    saveTxtFile.innerText = 'Save .txt';
    saveTxtFile.href = '#';
    saveTxtFile.id = 'saveAsText';

    saveTxtFile.onclick = function(e) {
        saveTextAsFile(e); 
    };
    dropdownContentDiv.appendChild(saveTxtFile);

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
    const jourEntryButtons = document.createElement('div');
    jourEntryButtons.id = 'jour_entry_buttons';
    jourEntryButtons.style.display = 'none';
    const saveButton = document.createElement('button');
    saveButton.id = 'save_button';
    saveButton.textContent = 'Save';
    saveButton.onclick = async (e) => {
      await saveEdit(e);
      // other code after async operation completes
    };
    
    // Create the button save button
    const discardButton = document.createElement('button');
    discardButton.id = 'discard_button';
    discardButton.textContent = 'Discard';
    discardButton.onclick = async (e) => {
      await discard(e);
      // other code after async operation completes
    };
    jourEntryButtons.appendChild(saveButton);
    jourEntryButtons.appendChild(discardButton);
    
    entryDiv.appendChild(postHeader);
    entryDiv.appendChild(collapsableContent);
    entryDiv.appendChild(jourEntryButtons);

    
    // Create the button showMoreButton
    const showMoreButton = document.createElement('button');
    showMoreButton.id = 'show_more_button';
    showMoreButton.textContent = 'Show More';
    showMoreButton.title = 'Expand/Collapse';
    showMoreButton.style.display = 'none';
    entryDiv.appendChild(showMoreButton);
    
    const journalled_content = document.getElementById('journalled_content');
    journalled_content.insertBefore(entryDiv, journalled_content.firstChild);
    
    // --- NOW the entryDiv element is in the DOM and we can measure the scrollHeight---
    
    checkAddTruncationToEntry(collapsableContent, showMoreButton);
    
    return entryDiv;
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
        return btn;
    };
    
    
    toolbar.appendChild(addButton('<b>Tx</b>', 'removeFormat', "Clear formatting"));
    toolbar.appendChild(addButton('<b>B</b>', 'bold', "Bold Font"));
    toolbar.appendChild(addButton('<i>I</i>', 'italic', "Italic Font"));
    toolbar.appendChild(addButton('<u>U</u>', 'underline', "Underline Font"));
    toolbar.appendChild(addButton('S', 'strikeThrough', "StrikeThrough Font"));
    
    // Lists
    toolbar.appendChild(addButton('• List', 'insertUnorderedList', "Unodered List"));
    toolbar.appendChild(addButton('1. List', 'insertOrderedList', "Ordered List"));
    
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
    highlightInput.title = 'Highlight Color';
    highlightInput.classList.add("colorPicker");
    highlightInput.addEventListener('input', (e) => 
                    document.execCommand('hiliteColor', false, e.target.value));
    toolbar.appendChild(highlightInput);
    
    // Font size (1-7 scale)
    const fontSizeSelect = document.createElement('select');
    fontSizeSelect.title = "Font Size";
    fontSizeSelect.classList.add("fontSizeSelect");
    for(let i=1; i<=7; i++)
    {
        const option = document.createElement('option');
        option.value = i;
        option.text = `Font Size ${i}`;
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
    const note_timestamp = entry_post.querySelector("#note_timestamp");
    const contentDiv = entry_post.querySelector("#jour_entry_content");
    const tagsDiv = entry_post.querySelector("#jour_entry_tags");
    const collapsableDiv = entry_post.querySelector("#collapseableDiv");
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
            NOTES_CACHE[idx].editDate = Date.now();
            note_timestamp.innerText += "\nLast edited at: " + formatTimestamp(NOTES_CACHE[idx].editDate) 
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
        
        entry_post.classList.remove("edit_mode");
        exitEditMode(entry_post);
        
        //Add truncation if needed
        checkAddTruncationToEntry(collapsableDiv, showMoreButton);
    }
    else
    {
        showStatusMessage(entry_post, "Error. Refresh and try again!", 3000, "failure");
    }
}

function discard(e)
{
    const entry_post = e.currentTarget.closest(".jour_entry");
    const noteId = entry_post.dataset.id;
    
    const titleDiv = entry_post.querySelector("#jour_entry_title");
    const contentDiv = entry_post.querySelector("#jour_entry_content");
    const tagsDiv = entry_post.querySelector("#jour_entry_tags");
    
    const idx = NOTES_CACHE.findIndex(n => n.id === noteId);

    if (idx !== -1)
    {
        /*If note already exists in the database*/
        titleDiv.innerHTML = NOTES_CACHE[idx].title;
        contentDiv.innerHTML = NOTES_CACHE[idx].content;
        tagsDiv.innerHTML = NOTES_CACHE[idx].tags;
        if(NOTES_CACHE[idx].tags)
        {
            let formatted_tags = "#" + NOTES_CACHE[idx].tags.replaceAll(" ", ", #");
        
            tagsDiv.innerHTML = formatted_tags;
        }
        else
        {
            tagsDiv.innerHTML = "#";
        }
        
    }
    exitEditMode(entry_post);
    if(idx < 0)
    {
        const index = visibleNotes.indexOf(entry_post.dataset.id);
        if (index !== -1)
        {
            // Remove it using slice or splice
            visibleNotes = [...visibleNotes.slice(0, index), ...visibleNotes.slice(index + 1)];
        }
        
        entry_post.remove();
    }
}

function enterEditMode(entry_post)
{
    /*If in edit mode... only close the edit mode*/
    if(document.querySelector(".edit_mode"))
    {
        alert("You're already in edit mode.")
        return;
    }
    
    //Continue only if not already in edit_more.
    const jourEntryButtons = entry_post.querySelector("#jour_entry_buttons");
    
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
    jourEntryButtons.style.display = 'inline-block';
    
    // Remove truncation **after the entry is in the DOM**
    const truncatedElement = entry_post.querySelector(".truncated_entries");
    if(truncatedElement)
    {
        truncatedElement.classList.remove("truncated_entries");
        const showMoreButton = entry_post.querySelector("#show_more_button");
        if(showMoreButton)
        {
            showMoreButton.style.display = "none";
        }
    }
    
    const overlay = document.createElement("div");
    overlay.className = "edit_mode";
    
    // Save original position
    entry_post._originalParent = entry_post.parentNode;
    entry_post._originalNext = entry_post.nextSibling;
    
    overlay.appendChild(entry_post);
    document.body.appendChild(overlay);

}

function exitEditMode(entry_post)
{
    const jourEntryButtons = entry_post.querySelector("#jour_entry_buttons");
    
    const titleDiv = entry_post.querySelector("#jour_entry_title");
    const contentDiv = entry_post.querySelector("#jour_entry_content");
    const tagsDiv = entry_post.querySelector("#jour_entry_tags");
    
    const toolbar = entry_post.querySelector("#text_editor_toolbar");
    if(toolbar)
    {
        toolbar.style.display = "none";
    }
    
    const parent = entry_post._originalParent;
    const next = entry_post._originalNext;

    if (next)
    {
        parent.insertBefore(entry_post, next);
    }
    else
    {
        parent.appendChild(entry_post);
    }
    document.querySelector(".edit_mode").remove();
    
    //Hide the button back after the content was saved
    jourEntryButtons.style.display = 'none';
    
    titleDiv.contentEditable = "false";
    contentDiv.contentEditable = "false";
    tagsDiv.contentEditable = "false";
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
    
    const entry = await addNoteToUI(newNote.title, newNote.content, newNote.tags, newNote.id);
    
    if(visibleNotes.includes(newNote.id) == false)
    {
        visibleNotes.push(newNote.id)
    }
    
    enterEditMode(entry);
}

// ---------------------------------------------------------
// Function to remove note/post
// ---------------------------------------------------------
async function remove_entry(e)
{
    const entryDiv = e.currentTarget.closest('.jour_entry');
    const noteId = entryDiv.dataset.id;
    
    if(document.querySelector(".edit_mode"))
    {
        /*If div is in edit mode*/
        exitEditMode(entryDiv);
    }
    
    const idx = NOTES_CACHE.findIndex(n => n.id === noteId);
    if (idx !== -1)
    {
        NOTES_CACHE.splice(idx, 1);
    }
    
    const index = visibleNotes.indexOf(entryDiv.dataset.id);
    if (index !== -1)
    {
        // Remove it using slice or splice
        visibleNotes = [...visibleNotes.slice(0, index), ...visibleNotes.slice(index + 1)];
    }
    
    entryDiv.remove();
    
    let result = await saveUserNotesToDatabase();
    
    if (result)
    {
        //alert("Saved successfully!");
    }
    else
    {
        //alert("Server failure - changes not saved!");
    }
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
        btn.tagEnabled = true;
        
        btn.classList.add("tagEnabled");
        btn.textContent = `#${tag}`;
        btn.addEventListener("click", async () => {
            if(btn.tagEnabled)
            {
                removeEntriesFromDOM(tag);
                btn.tagEnabled = false;
                btn.classList.remove("tagEnabled");
                btn.title = "Select tag";
                
                //Remove tag from the list of active tags
                const index = activeTags.indexOf(btn.dataset.tag);
                
                if (index !== -1)
                {
                  // Remove it using slice or splice
                  activeTags = [...activeTags.slice(0, index), ...activeTags.slice(index + 1)];
                }
            }
            else
            {
                await filterNotesByTag(tag);
                btn.tagEnabled = true;
                btn.classList.add("tagEnabled");
                btn.title = "Deselect tag";
                
                //Add the tag to the active tags list;
                activeTags.push(btn.dataset.tag);
            }
        });
        tagContainer.appendChild(btn);
    });

    // Update total tags
    document.getElementById("total_tags").textContent = `Tags: ${tags.size}`;
}

async function filterNotesByTag(tag)
{
    for (const note of NOTES_CACHE)
    {
        if(note.tags.includes(tag))
        {
            await addNoteToUI(note.title, note.content, note.tags, note.id, note.editDate);
            if(visibleNotes.includes(note.id) == false)
            {
                visibleNotes.push(note.id)
            }
        }
    }
    truncatedContentHandling(); // attach click handler
}

function removeEntriesFromDOM(tag)
{
    const content = document.getElementsByClassName("jour_entry");
    
    let index = 0;
    while(index < content.length)
    {
        const tagContentDiv = content[index].querySelector("#jour_entry_tags");
        
        const tagList = tagContentDiv.innerText.replaceAll("#", "").split(", ");
        if(tagList.includes(tag))
        {
            const match = visibleNotes.indexOf(content[index].dataset.id);
            if (match !== -1)
            {
                // Remove it using slice or splice
                visibleNotes = [...visibleNotes.slice(0, match), ...visibleNotes.slice(match + 1)];
            }
            content[index].remove();
        }
        else
        {
            index ++;
        }
    }
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

//Defining dragging behaviors
function addDraggingBehavior()
{
    let draggedItem = null;

    document.addEventListener("dragstart", e => {
        // Only start dragging if the drag handle is used
        if (e.target.classList.contains("drag-handle"))
        {
            draggedItem = e.target.closest(".jour_entry");
            draggedItem.style.opacity = "0.5";
        }
        else
        {
            e.preventDefault(); // prevent accidental drag
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
        if (!target || target === draggedItem)
        {
            return;
        }
        const container = document.getElementById("journalled_content");

        // Insert before the item you dropped on
        container.insertBefore(draggedItem, target);
    });
}

async function selectAllElements()
{
    const tagContainer = document.getElementById("tag_buttons");
    
    for(btn of tagContainer.children)
    {
        btn.tagEnabled = true;
        btn.classList.add("tagEnabled");
        activeTags.push(btn.dataset.tag);
    }
    
    for (const note of NOTES_CACHE)
    {
        await addNoteToUI(note.title, note.content, note.tags, note.id, note.editDate);
        if(visibleNotes.includes(note.id) == false)
        {
            visibleNotes.push(note.id)
        }
    }
}

async function deselectAllElements()
{
    const tagContainer = document.getElementById("tag_buttons");
    
    for(btn of tagContainer.children)
    {
        btn.tagEnabled = false;
        btn.classList.remove("tagEnabled");
        
        const index = activeTags.indexOf(btn.dataset.tag);
        if (index !== -1)
        {
          // Remove it using slice or splice
          activeTags = [...activeTags.slice(0, index), ...activeTags.slice(index + 1)];
        }
        
    }
    
    const content = document.getElementsByClassName("jour_entry");
    
    while(content.length > 0)
    {
        
        const index = visibleNotes.indexOf(content[0].dataset.id);
        if (index !== -1)
        {
            // Remove it using slice or splice
            visibleNotes = [...visibleNotes.slice(0, index), ...visibleNotes.slice(index + 1)];
        }
        
        content[0].remove();
    }
}

function closeNote(e)
{
    const entry_post = e.target.closest(".jour_entry");
    
    /*If in edit mode... only close the edit mode*/
    if(document.querySelector(".edit_mode"))
    {
        /*If div is in edit mode*/
        discard(e);
    }
    else
    {
        /*If NOT in edit mode... close the note*/
        const tagContainer = document.getElementById("tag_buttons");
        
        if(entry_post)
        {
            const tagsDiv = entry_post.querySelector("#jour_entry_tags");
            console.log("Org Tags: " + tagsDiv.innerHTML);
            let unformatted_tags = tagsDiv.innerHTML;
            unformatted_tags = unformatted_tags.replaceAll("#", "");
            unformatted_tags = unformatted_tags.split(", ");
            const tags = unformatted_tags;
            console.log("Tags: " + tags);
            for(item of tags)
            {
                const index = activeTags.indexOf(item);
                if (index !== -1)
                {
                    // Remove it using slice or splice
                    activeTags = [...activeTags.slice(0, index), ...activeTags.slice(index + 1)];
                    if(activeTags.includes(item) == false)
                    {
                        if(tagContainer)
                        {
                            /*Extracting button from container using dataset.tag*/
                            const btn = tagContainer.querySelector(`[data-tag="${item}"]`);
                            
                            if(btn)
                            {
                                /*update the tag button state*/
                                btn.classList.remove("tagEnabled");
                                btn.tagEnabled = false;
                            }
                        }
                    }
                }
            }
            
            const index = visibleNotes.indexOf(entry_post.dataset.id);
            if (index !== -1)
            {
                // Remove it using slice or splice
                visibleNotes = [...visibleNotes.slice(0, index), ...visibleNotes.slice(index + 1)];
            }
            entry_post.remove();
        }
    }
}

async function performSearch()
{
    const visibleNotes_Temp = visibleNotes;
    await deselectAllElements();
    visibleNotes = visibleNotes_Temp;
    searchValue = document.getElementById("search_input").value;
    
    if(searchValue.trim() != "")
    {
        for(note of NOTES_CACHE)
        {
            if(note.title.includes(searchValue) || note.content.includes(searchValue) || note.tags.includes(searchValue))
            {
                await addNoteToUI(note.title, note.content, note.tags, note.id, note.editDate);
            }
        }
    }
    else
    {
        console.log("visibleNotes: "+ visibleNotes);
        for(note of NOTES_CACHE)
        {
            const index = visibleNotes.indexOf(note.id);
            if (index !== -1)
            {
                /*if the item was selected/visible before the search*/
                await addNoteToUI(note.title, note.content, note.tags, note.id, note.editDate);
            }
        }
    }
}

function copyToClipboard(e)
{
    const entry_post = e.target.closest(".jour_entry");
    const titleDiv = entry_post.querySelector("#jour_entry_title");
    const contentDiv = entry_post.querySelector("#jour_entry_content");
    const tagsDiv = entry_post.querySelector("#jour_entry_tags");
    
    var text = titleDiv.innerText + "\n\n" + contentDiv.innerText;
    navigator.clipboard.writeText(text)
        .then(() => {
            console.log("Copied to clipboard");
        })
        .catch(err => {
            console.error("Copy failed:", err);
        });
}

function saveTextAsFile(e)
{
    const entry_post = e.target.closest(".jour_entry");
    const titleDiv = entry_post.querySelector("#jour_entry_title");
    const contentDiv = entry_post.querySelector("#jour_entry_content");
    const tagsDiv = entry_post.querySelector("#jour_entry_tags");
    
    var text = titleDiv.innerText + "\n\n" + contentDiv.innerText;
    
    const filename = titleDiv.innerText.replaceAll(" ", "_").slice(0, 30);
    // Create a Blob object with the text content
    const blob = new Blob([text], { type: 'text/plain' });
    
    // Generate a URL for the Blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element
    const a = document.createElement('a');
    a.href = url;
    a.download = filename; // Set the filename for the download
    
    // Append the link to the document and trigger click
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function expandCollapseAllEntries()
{
    const entries = Array.from(document.querySelectorAll(".jour_entry #collapseableDiv"));
    
    for (let entry of entries)
    {
        const showMoreButton = entry.closest(".jour_entry").querySelector("#show_more_button");
        if (areEntriesExpanded)
        {
            checkAddTruncationToEntry(entry, showMoreButton);
        }
        else
        {
            entry.classList.remove("truncated_entries"); // expand
            if(showMoreButton)
            {
                showMoreButton.style.display = "none";
            }
        }
    }

    areEntriesExpanded = !areEntriesExpanded; // toggle state
    
    if(areEntriesExpanded)
    {
        expandCollapseAllButton.innerText = "▼"
    }
    else
    {
        expandCollapseAllButton.innerText = "►"
    }
}

function formatTimestamp(timestamp)
{
    const date = new Date(Number(timestamp));

    if (isNaN(date.getTime())) {
        return "Invalid date";
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function showHidePostDetails(e)
{
    const entry_post = e.currentTarget.closest(".jour_entry");
    const postDetails = entry_post.querySelector("#note_timestamp");
    
    if(postDetails)
    {
        postDetailsStyle = window.getComputedStyle(postDetails);
        if(postDetailsStyle.display == "none")
        {
            postDetails.style.display = "block"
        }
        else
        {
            postDetails.style.display = "none"
        }
    }
}

//Add dropdown handler: If dropdown content is displayed hide the content when clicking outside of it
document.addEventListener("click", function (e) {
    const dropdowns = document.querySelectorAll(".dropdown-content");

    dropdowns.forEach(menu => {
        // If click is outside the dropdown
        if (!menu.parentElement.contains(e.target))
        {
            menu.classList.remove("show");
        }
    });
});

//Add listViewButton action handler
const listViewButton = document.getElementById("listViewToggle");

listViewButton.addEventListener("click", function() {
    const jour = document.getElementById("journalled_content");
    jour.style.display = "block";
    listViewButton.style.borderColor = "var(--blue-color)";
    gridViewButton.style.borderColor = "#aaa";
});

//Add gridViewButton action handler
const gridViewButton = document.getElementById("gridViewToggle");

gridViewButton.addEventListener("click", function() {
    const jour = document.getElementById("journalled_content");
    jour.style.display = "grid";
    gridViewButton.style.borderColor = "var(--blue-color)";
    listViewButton.style.borderColor = "#aaa";
});

if(getComputedStyle(document.getElementById("journalled_content")).display == "grid")
{
    gridViewButton.style.borderColor = "var(--blue-color)";
}
else
{
    listViewButton.style.borderColor = "var(--blue-color)";
}

//Add search_box
const searchInput = document.getElementById("search_input");

searchInput.addEventListener("keydown", async function (event)
{
    if (event.key === "Enter")
    {
        event.preventDefault();   // prevents form submission / page reload
        await performSearch();          // call your function
    }
});

//Clear Searching
const clearSearch = document.getElementById("clear_search_button");
clearSearch.addEventListener("click", async function (e)
{
    document.getElementById("search_input").value = "";
    await performSearch();          // call your function
});


//Add toggleSidebar button handler
const sidebar = document.getElementById("jour_navigation");
const toggleButton = document.getElementById("toggle_sidebar_button");

toggleButton.addEventListener("click", () => {
    toggleSidebar();
});

//Add selection control buttons

const selectAllButton = document.getElementById("select_all");
const deselectAllButton = document.getElementById("deselect_all");

selectAllButton.addEventListener("click", async () => {
    await selectAllElements();
});

deselectAllButton.addEventListener("click", async () => {
    await deselectAllElements();
});

//Add expandCollapseAll button behaviors

expandCollapseAllButton = document.getElementById("expandCollapseAll");

expandCollapseAllButton.addEventListener("click", () => {
    expandCollapseAllEntries();
});

//Add dragging handler
addDraggingBehavior();