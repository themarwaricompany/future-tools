// DOM Elements
const setupView = document.getElementById('setupView');
const mainView = document.getElementById('mainView');
const successView = document.getElementById('successView');
const errorView = document.getElementById('errorView');
const footerSection = document.getElementById('footerSection');

const setupBtn = document.getElementById('setupBtn');
const saveBtn = document.getElementById('saveBtn');
const saveAnotherBtn = document.getElementById('saveAnotherBtn');
const viewSheetBtn = document.getElementById('viewSheetBtn');
const retryBtn = document.getElementById('retryBtn');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const viewSheetLink = document.getElementById('viewSheetLink');
const settingsLink = document.getElementById('settingsLink');

const pageTitle = document.getElementById('pageTitle');
const pageUrl = document.getElementById('pageUrl');
const pageFavicon = document.getElementById('pageFavicon');
const notesInput = document.getElementById('notesInput');
const errorMessage = document.getElementById('errorMessage');

// State
let currentTab = null;
let config = null;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  config = await loadConfig();
  currentTab = await getCurrentTab();

  if (!config || !config.formUrl) {
    showView('setup');
    footerSection.style.display = 'none';
  } else {
    showView('main');
    populatePageInfo();
    setupFooterLinks();
  }
}

// Load configuration
async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['formUrl', 'sheetName', 'sheetUrl'], (result) => {
      resolve(result.formUrl ? result : null);
    });
  });
}

// Get current tab
async function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs.length > 0 ? tabs[0] : null);
    });
  });
}

// View management
function showView(viewName) {
  setupView.classList.add('hidden');
  mainView.classList.add('hidden');
  successView.classList.add('hidden');
  errorView.classList.add('hidden');

  switch (viewName) {
    case 'setup': setupView.classList.remove('hidden'); break;
    case 'main': mainView.classList.remove('hidden'); break;
    case 'success': successView.classList.remove('hidden'); break;
    case 'error': errorView.classList.remove('hidden'); break;
  }
}

// Populate page info
function populatePageInfo() {
  if (!currentTab) return;

  pageTitle.textContent = currentTab.title || 'Untitled';
  pageTitle.title = currentTab.title || '';
  pageUrl.textContent = currentTab.url || '';
  pageUrl.title = currentTab.url || '';

  if (currentTab.favIconUrl) {
    const img = document.createElement('img');
    img.src = currentTab.favIconUrl;
    img.alt = '';
    img.onerror = () => { pageFavicon.textContent = '🌐'; };
    img.onload = () => {
      pageFavicon.textContent = '';
      pageFavicon.appendChild(img);
    };
  }
}

// Setup footer links
function setupFooterLinks() {
  // View Sheet link - only works if user provided their sheet URL
  if (config?.sheetUrl) {
    viewSheetLink.href = config.sheetUrl;
    viewSheetLink.target = '_blank';
  } else {
    // Hide the link if no sheet URL provided
    viewSheetLink.style.display = 'none';
    document.querySelector('.footer .divider').style.display = 'none';
  }
}

// Open Google Sheet
function openSheet() {
  if (config?.sheetUrl) {
    chrome.tabs.create({ url: config.sheetUrl });
  } else {
    // Show message that sheet URL is not configured
    alert('Add your Google Sheet URL in Settings to enable this feature.');
    chrome.runtime.openOptionsPage();
  }
}

// Save to Google Form
async function saveToGoogleForm() {
  if (!config || !config.formUrl || !currentTab) {
    showError('Please configure the extension first.');
    return;
  }

  saveBtn.classList.add('loading');
  saveBtn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'savePage',
      data: {
        title: currentTab.title || '',
        url: currentTab.url || '',
        notes: notesInput.value.trim(),
        formUrl: config.formUrl
      }
    });

    if (response && response.success) {
      showView('success');
      notesInput.value = '';
    } else {
      showError('Save may have failed. Check that your form is published.');
    }

  } catch (error) {
    showError('Failed to save. Please check your settings.');
  } finally {
    saveBtn.classList.remove('loading');
    saveBtn.disabled = false;
  }
}

// Show error
function showError(message) {
  errorMessage.textContent = message;
  showView('error');
}

// Event Listeners
setupBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
settingsLink.addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
openSettingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

saveBtn.addEventListener('click', saveToGoogleForm);

saveAnotherBtn.addEventListener('click', async () => {
  currentTab = await getCurrentTab();
  populatePageInfo();
  showView('main');
});

viewSheetBtn.addEventListener('click', openSheet);
viewSheetLink.addEventListener('click', (e) => {
  if (!config?.sheetUrl) {
    e.preventDefault();
    openSheet();
  }
});

retryBtn.addEventListener('click', async () => {
  currentTab = await getCurrentTab();
  config = await loadConfig();
  if (!config || !config.formUrl) {
    showView('setup');
  } else {
    populatePageInfo();
    showView('main');
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (!mainView.classList.contains('hidden') && !saveBtn.disabled) {
      saveToGoogleForm();
    }
  }
  if (e.key === 'Escape') {
    window.close();
  }
});
