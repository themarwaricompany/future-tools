// Background Service Worker for Save to Sheets
// Handles keyboard shortcuts and background form submission

// Fixed field IDs from the template form
const FIELD_IDS = {
    title: 'entry.2062101966',
    url: 'entry.2017374153',
    tags: 'entry.238451584',  // ← CORRECTED from pre-filled URL
    notes: 'entry.1498665301'
};

// Listen for keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'save-current-page') {
        await quickSave();
    } else if (command === 'save-with-tags') {
        await openPopupWithTags();
    } else if (command === 'open-sheet') {
        await openGoogleSheet();
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'savePage') {
        savePageToForm(request.data)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'openFormWithData') {
        openFormInTab(request.data);
        sendResponse({ success: true });
        return true;
    }
});

// Quick save - saves current page directly without popup
async function quickSave() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            showBadge('!', '#EF4444');
            return;
        }

        const config = await chrome.storage.sync.get(['formUrl']);
        if (!config.formUrl) {
            chrome.runtime.openOptionsPage();
            return;
        }

        const result = await savePageToForm({
            title: tab.title || '',
            url: tab.url || '',
            notes: '',
            formUrl: config.formUrl
        });

        if (result.success) {
            showBadge('✓', '#22C55E');
        } else {
            // Fallback: open form in new tab
            openFormInTab({
                title: tab.title || '',
                url: tab.url || '',
                notes: '',
                formUrl: config.formUrl
            });
            showBadge('→', '#3B82F6');
        }
    } catch (error) {
        console.error('Save to Sheets error:', error);
        showBadge('!', '#EF4444');
    }
}

// Open popup with tags mode (Ctrl+Shift+S)
async function openPopupWithTags() {
    try {
        // Set flag BEFORE opening popup
        await chrome.storage.local.set({ openWithTags: true });

        // Small delay to ensure storage is set
        await new Promise(resolve => setTimeout(resolve, 50));

        // Open popup
        await chrome.action.openPopup();
    } catch (error) {
        console.error('Error opening popup:', error);
        // If popup fails to open programmatically, try fallback
        try {
            await chrome.storage.local.set({ openWithTags: true });
        } catch (e) {
            console.error('Storage error:', e);
        }
    }
}

// Open Google Sheet (Ctrl+Shift+O)
async function openGoogleSheet() {
    try {
        const config = await chrome.storage.sync.get(['sheetUrl']);
        if (config.sheetUrl) {
            await chrome.tabs.create({ url: config.sheetUrl });
        } else {
            // If no sheet URL, open settings
            chrome.runtime.openOptionsPage();
        }
    } catch (error) {
        console.error('Error opening sheet:', error);
    }
}

// Convert form URL to proper submission format
function getFormResponseUrl(formUrl) {
    let url = formUrl;

    // Remove query params
    url = url.split('?')[0];

    // Handle /d/FORM_ID/viewform or /d/FORM_ID/edit format
    // Convert to /d/FORM_ID/formResponse
    if (url.includes('/viewform')) {
        url = url.replace('/viewform', '/formResponse');
    } else if (url.includes('/edit')) {
        url = url.replace('/edit', '/formResponse');
    } else if (!url.includes('/formResponse')) {
        // Append /formResponse if not present
        url = url.replace(/\/$/, '') + '/formResponse';
    }

    return url;
}

// Get viewform URL for opening in tab
function getViewFormUrl(formUrl) {
    let url = formUrl;
    url = url.split('?')[0];

    if (url.includes('/formResponse')) {
        url = url.replace('/formResponse', '/viewform');
    } else if (url.includes('/edit')) {
        url = url.replace('/edit', '/viewform');
    } else if (!url.includes('/viewform')) {
        url = url.replace(/\/$/, '') + '/viewform';
    }

    return url;
}

// Submit data to Google Form in background
async function savePageToForm(data) {
    try {
        const formResponseUrl = getFormResponseUrl(data.formUrl);

        // Build form data
        const formData = new URLSearchParams();
        formData.append(FIELD_IDS.title, data.title);
        formData.append(FIELD_IDS.url, data.url);

        // Add tags if provided (for checkbox field, append each tag)
        if (data.tags && Array.isArray(data.tags)) {
            data.tags.forEach(tag => {
                formData.append(FIELD_IDS.tags, tag);
            });
        }

        if (data.notes) {
            formData.append(FIELD_IDS.notes, data.notes);
        }

        console.log('Submitting to:', formResponseUrl);
        console.log('Data:', formData.toString());

        // Submit form in background
        const response = await fetch(formResponseUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
        });

        // With no-cors mode, we assume success if no error thrown
        // Store last save for debugging
        await chrome.storage.local.set({
            lastSave: {
                timestamp: Date.now(),
                url: data.url,
                title: data.title,
                formUrl: formResponseUrl
            }
        });

        return { success: true };

    } catch (error) {
        console.error('Form submission error:', error);
        return { success: false, error: error.message };
    }
}

// Open form in new tab with pre-filled data (fallback)
function openFormInTab(data) {
    const viewFormUrl = getViewFormUrl(data.formUrl);

    const url = new URL(viewFormUrl);
    url.searchParams.set(FIELD_IDS.title, data.title);
    url.searchParams.set(FIELD_IDS.url, data.url);
    if (data.notes) {
        url.searchParams.set(FIELD_IDS.notes, data.notes);
    }

    chrome.tabs.create({ url: url.toString() });
}

// Show badge on extension icon
function showBadge(text, color) {
    chrome.action.setBadgeText({ text: text });
    chrome.action.setBadgeBackgroundColor({ color: color });

    setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
    }, 2500);
}

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Open the website setup page instead of local options
        chrome.tabs.create({ url: 'https://www.findmyicp.com/sheets/start' });
    }
});
