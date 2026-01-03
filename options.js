// DOM Elements
const formUrlInput = document.getElementById('formUrl');
const sheetUrlInput = document.getElementById('sheetUrl');
const sheetNameInput = document.getElementById('sheetName');
const pasteBtn = document.getElementById('pasteBtn');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const statusMessage = document.getElementById('statusMessage');
const statusText = document.getElementById('statusText');

// Initialize
document.addEventListener('DOMContentLoaded', loadSettings);

// Load saved settings
function loadSettings() {
    chrome.storage.sync.get(['formUrl', 'sheetUrl', 'sheetName'], (result) => {
        if (result.formUrl) formUrlInput.value = result.formUrl;
        if (result.sheetUrl) sheetUrlInput.value = result.sheetUrl;
        if (result.sheetName) sheetNameInput.value = result.sheetName;
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
    const sheetName = sheetNameInput.value.trim();

    // Validate form URL (required)
    if (!formUrl) {
        showStatus('Please enter your Google Form URL.', 'error');
        return;
    }

    if (!isValidGoogleUrl(formUrl, 'form')) {
        showStatus('Please enter a valid Google Forms URL.', 'error');
        return;
    }

    // Validate sheet URL (optional)
    if (sheetUrl && !isValidGoogleUrl(sheetUrl, 'sheet')) {
        showStatus('Please enter a valid Google Sheets URL.', 'error');
        return;
    }

    // Save
    chrome.storage.sync.set({
        formUrl: normalizeFormUrl(formUrl),
        sheetUrl: sheetUrl || '',
        sheetName: sheetName || 'My Saved Pages'
    }, () => {
        showStatus('Saved! You can now close this tab.', 'success');
    });
});

// Reset settings
resetBtn.addEventListener('click', () => {
    if (confirm('Reset all settings?')) {
        chrome.storage.sync.clear(() => {
            formUrlInput.value = '';
            sheetUrlInput.value = '';
            sheetNameInput.value = '';
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
