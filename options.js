// DOM Elements
const formUrlInput = document.getElementById('formUrl');
const sheetUrlInput = document.getElementById('sheetUrl');
const pasteBtn = document.getElementById('pasteBtn');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const statusMessage = document.getElementById('statusMessage');
const statusText = document.getElementById('statusText');

// Tag elements
const tagsList = document.getElementById('tagsList');
const customTagsList = document.getElementById('customTagsList');
const newTagInput = document.getElementById('newTagInput');
const addTagBtn = document.getElementById('addTagBtn');

// Default tags
const DEFAULT_TAGS = [
    { value: 'Read Later', icon: '⏰' },
    { value: 'Tool', icon: '🛠️' },
    { value: 'Video', icon: '📺' },
    { value: 'Article', icon: '📄' },
    { value: 'Important', icon: '⭐' }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    detectAndSetOS();
    setupOSToggle();
});

// Detect user's OS and show appropriate shortcuts
function detectAndSetOS() {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const osToShow = isMac ? 'mac' : 'windows';
    showShortcutsForOS(osToShow);

    // Set active button
    document.querySelectorAll('.os-btn').forEach(btn => {
        if (btn.dataset.os === osToShow) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Setup OS toggle buttons
function setupOSToggle() {
    document.querySelectorAll('.os-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const os = btn.dataset.os;

            // Update active state
            document.querySelectorAll('.os-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show shortcuts for selected OS
            showShortcutsForOS(os);
        });
    });
}

// Show shortcuts for specific OS
function showShortcutsForOS(os) {
    const macShortcuts = document.querySelectorAll('.mac-shortcut');
    const windowsShortcuts = document.querySelectorAll('.windows-shortcut');

    if (os === 'mac') {
        macShortcuts.forEach(el => el.style.display = 'flex');
        windowsShortcuts.forEach(el => el.style.display = 'none');
    } else {
        macShortcuts.forEach(el => el.style.display = 'none');
        windowsShortcuts.forEach(el => el.style.display = 'flex');
    }
}

// Load saved settings
function loadSettings() {
    chrome.storage.sync.get(['formUrl', 'sheetUrl', 'enabledTags', 'customTags'], (result) => {
        if (result.formUrl) formUrlInput.value = result.formUrl;
        if (result.sheetUrl) sheetUrlInput.value = result.sheetUrl;

        // Load tags
        const enabledTags = result.enabledTags || DEFAULT_TAGS.map(t => t.value);
        const customTags = result.customTags || [];

        loadTagCheckboxes(enabledTags);
        loadCustomTags(customTags);
    });
}

// Load tag checkboxes states
function loadTagCheckboxes(enabledTags) {
    const checkboxes = tagsList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = enabledTags.includes(checkbox.value);
    });
}

// Load custom tags
function loadCustomTags(customTags) {
    customTagsList.innerHTML = '';
    customTags.forEach(tag => {
        addCustomTagToUI(tag);
    });
}

// Add custom tag to UI
function addCustomTagToUI(tagName) {
    const tagEl = document.createElement('div');
    tagEl.className = 'custom-tag';
    tagEl.innerHTML = `
        <span>${tagName}</span>
        <span class="remove-tag" data-tag="${tagName}">×</span>
    `;
    customTagsList.appendChild(tagEl);

    // Add remove handler
    tagEl.querySelector('.remove-tag').addEventListener('click', function () {
        removeCustomTag(this.dataset.tag);
    });
}

// Add tag button
addTagBtn.addEventListener('click', () => {
    const tagName = newTagInput.value.trim();

    if (!tagName) {
        showStatus('Please enter a tag name.', 'error');
        return;
    }

    if (tagName.length > 20) {
        showStatus('Tag name must be 20 characters or less.', 'error');
        return;
    }

    // Get current custom tags
    chrome.storage.sync.get(['customTags'], (result) => {
        const customTags = result.customTags || [];

        // Check if tag already exists
        if (customTags.includes(tagName)) {
            showStatus('This tag already exists.', 'error');
            return;
        }

        // Check max tags (let's say 10 custom tags max)
        if (customTags.length >= 10) {
            showStatus('Maximum 10 custom tags allowed.', 'error');
            return;
        }

        // Add tag
        customTags.push(tagName);
        chrome.storage.sync.set({ customTags }, () => {
            addCustomTagToUI(tagName);
            newTagInput.value = '';
            showStatus('Tag added!', 'success');
        });
    });
});

// Remove custom tag
function removeCustomTag(tagName) {
    chrome.storage.sync.get(['customTags'], (result) => {
        const customTags = result.customTags || [];
        const updated = customTags.filter(t => t !== tagName);

        chrome.storage.sync.set({ customTags: updated }, () => {
            loadCustomTags(updated);
            showStatus('Tag removed.', 'success');
        });
    });
}

// Validate URL
function isValidGoogleUrl(url, type) {
    try {
        const urlObj = new URL(url);
        if (type === 'form') {
            return urlObj.hostname === 'docs.google.com' && urlObj.pathname.includes('/forms/');
        }
        if (type === 'sheet') {
            return urlObj.hostname === 'docs.google.com' && urlObj.pathname.includes('/spreadsheets/');
        }
        return false;
    } catch {
        return false;
    }
}

// Normalize form URL
function normalizeFormUrl(url) {
    try {
        let clean = url.split('?')[0];
        if (clean.includes('/edit')) {
            clean = clean.replace('/edit', '/viewform');
        }
        if (!clean.includes('/viewform') && !clean.includes('/formResponse')) {
            clean = clean.replace(/\/$/, '') + '/viewform';
        }
        return clean;
    } catch {
        return url;
    }
}

// Paste button
pasteBtn.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        formUrlInput.value = text;
        formUrlInput.focus();
    } catch {
        showStatus('Could not paste. Try Ctrl+V instead.', 'error');
    }
});

// Save settings
saveBtn.addEventListener('click', () => {
    const formUrl = formUrlInput.value.trim();
    const sheetUrl = sheetUrlInput.value.trim();

    // Validate form URL (required)
    if (!formUrl) {
        showStatus('Please enter your Google Form URL.', 'error');
        return;
    }

    if (!isValidGoogleUrl(formUrl, 'form')) {
        showStatus('Please enter a valid Google Forms URL.', 'error');
        return;
    }

    // Validate sheet URL (required now)
    if (!sheetUrl) {
        showStatus('Please enter your Google Sheet URL.', 'error');
        return;
    }

    if (!isValidGoogleUrl(sheetUrl, 'sheet')) {
        showStatus('Please enter a valid Google Sheets URL.', 'error');
        return;
    }

    // Get enabled tags
    const checkboxes = tagsList.querySelectorAll('input[type="checkbox"]');
    const enabledTags = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    // Save
    chrome.storage.sync.set({
        formUrl: normalizeFormUrl(formUrl),
        sheetUrl: sheetUrl || '',
        enabledTags: enabledTags
    }, () => {
        showStatus('Saved! You can now close this tab.', 'success');

        // Show post-save instructions after a brief delay
        setTimeout(() => {
            showPostSaveInstructions();
        }, 1500);
    });
});

// Reset settings
resetBtn.addEventListener('click', () => {
    if (confirm('Reset all settings?')) {
        chrome.storage.sync.clear(() => {
            formUrlInput.value = '';
            sheetUrlInput.value = '';
            newTagInput.value = '';
            loadTagCheckboxes(DEFAULT_TAGS.map(t => t.value));
            customTagsList.innerHTML = '';
            showStatus('Settings reset.', 'success');
        });
    }
});

// Show status message
function showStatus(message, type) {
    statusText.textContent = message;
    statusMessage.className = 'status ' + type;

    setTimeout(() => {
        statusMessage.className = 'status hidden';
    }, 4000);
}

// Show post-save instructions based on OS
function showPostSaveInstructions() {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    // Create the instruction modal
    const modal = document.createElement('div');
    modal.className = 'post-save-modal';
    modal.innerHTML = `
        <div class="post-save-content">
            <h3>🎉 Setup Complete!</h3>
            <p>Now let's try it out:</p>
            
            <div class="instruction-step">
                <div class="step-badge">1</div>
                <div class="step-text">
                    <strong>Open your saved pages:</strong><br>
                    Press <kbd>${isMac ? 'Ctrl+O' : 'Alt+O'}</kbd> to open your Google Sheet
                </div>
            </div>
            
            <div class="instruction-step">
                <div class="step-badge">2</div>
                <div class="step-text">
                    <strong>Save a page:</strong><br>
                    Go to any webpage and press <kbd>${isMac ? 'Ctrl+S' : 'Alt+S'}</kbd> to save it
                </div>
            </div>
            
            <button class="btn btn-primary dismiss-btn">Got it!</button>
        </div>
    `;

    document.body.appendChild(modal);

    // Add the dismiss handler
    modal.querySelector('.dismiss-btn').addEventListener('click', () => {
        modal.remove();
    });

    // Also dismiss on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}
