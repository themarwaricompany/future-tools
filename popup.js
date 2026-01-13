// Save Later Extension - Popup Script
// Handles the popup UI and page saving functionality

// ==============================================
// DOM Elements
// ==============================================
const setupView = document.getElementById('setupView');
const mainView = document.getElementById('mainView');
const successView = document.getElementById('successView');
const errorView = document.getElementById('errorView');
const loadingView = document.getElementById('loadingView');
const loginView = document.getElementById('loginView');
const footerSection = document.getElementById('footerSection');

// Buttons
const loginBtn = document.getElementById('loginBtn');
const setupBtn = document.getElementById('setupBtn');
const saveBtn = document.getElementById('saveBtn');
const saveAnotherBtn = document.getElementById('saveAnotherBtn');
const viewSheetBtn = document.getElementById('viewSheetBtn');
const retryBtn = document.getElementById('retryBtn');
const helpBtn = document.getElementById('helpBtn');
const viewSheetLink = document.getElementById('viewSheetLink');

// Content elements
const titleInput = document.getElementById('titleInput');
const pageUrl = document.getElementById('pageUrl');
const pageFavicon = document.getElementById('pageFavicon');
const notesInput = document.getElementById('notesInput');
const errorMessage = document.getElementById('errorMessage');

// ==============================================
// State
// ==============================================
let currentTab = null;
let settings = {
  formUrl: null,
  sheetUrl: null
};
let availableTags = [];
let selectedTags = [];
let showTagsMode = false; // true when opened with Ctrl+Shift+S
let currentTagIndex = -1; // for keyboard navigation

// FindMyICP URLs
const FINDMYICP_URL = 'https://www.findmyicp.com';
const SAVE_LATER_URL = 'https://www.findmyicp.com/sheets';

// ==============================================
// Initialization
// ==============================================
document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Hide loading view, show appropriate view
  if (loadingView) loadingView.classList.add('hidden');

  // Check if opened with tags mode (from Ctrl+Shift+S command)
  const localData = await chrome.storage.local.get(['openWithTags']);
  showTagsMode = localData.openWithTags || false;

  // Clear the flag
  if (showTagsMode) {
    await chrome.storage.local.remove(['openWithTags']);
  }

  try {
    // Get current tab
    currentTab = await getCurrentTab();

    // Load settings from storage
    const stored = await chrome.storage.sync.get(['formUrl', 'sheetUrl', 'enabledTags', 'customTags']);
    settings = {
      formUrl: stored.formUrl || null,
      sheetUrl: stored.sheetUrl || null
    };

    // Load available tags
    const defaultTags = ['Read Later', 'Tool', 'Video', 'Article', 'Important'];
    const enabledTags = stored.enabledTags || defaultTags;
    const customTags = stored.customTags || [];
    availableTags = [...enabledTags, ...customTags];

    // Determine which view to show
    if (!settings.formUrl) {
      // No form URL configured - show setup
      showView('setup');
      footerSection.style.display = 'none';
    } else {
      // Ready to save pages
      showView('main');
      populatePageInfo();
      setupFooterLinks();

      // Always show tags section
      showTagsSection();
    }

  } catch (error) {
    console.error('Init error:', error);
    showError('Failed to initialize. Please try again.');
  }
}

// ==============================================
// View Management
// ==============================================
function showView(viewName) {
  // Hide all views
  if (loadingView) loadingView.classList.add('hidden');
  if (loginView) loginView.classList.add('hidden');
  if (setupView) setupView.classList.add('hidden');
  if (mainView) mainView.classList.add('hidden');
  if (successView) successView.classList.add('hidden');
  if (errorView) errorView.classList.add('hidden');

  // Show requested view
  switch (viewName) {
    case 'loading':
      if (loadingView) loadingView.classList.remove('hidden');
      break;
    case 'login':
      if (loginView) loginView.classList.remove('hidden');
      break;
    case 'setup':
      if (setupView) setupView.classList.remove('hidden');
      break;
    case 'main':
      if (mainView) mainView.classList.remove('hidden');
      break;
    case 'success':
      if (successView) successView.classList.remove('hidden');
      break;
    case 'error':
      if (errorView) errorView.classList.remove('hidden');
      break;
  }
}

function showError(message) {
  if (errorMessage) errorMessage.textContent = message;
  showView('error');
}

// ==============================================
// Tab & Page Info
// ==============================================
async function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs.length > 0 ? tabs[0] : null);
    });
  });
}

function populatePageInfo() {
  if (!currentTab) return;

  // Set title in editable input
  if (titleInput) {
    titleInput.value = currentTab.title || 'Untitled';
  }

  // Set URL display
  if (pageUrl) {
    pageUrl.textContent = truncateUrl(currentTab.url || '');
    pageUrl.title = currentTab.url || '';
  }

  // Set favicon
  if (pageFavicon && currentTab.favIconUrl) {
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

function truncateUrl(url, maxLength = 40) {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
}

// ==============================================
// Tags Functions
// ==============================================
function showTagsSection() {
  const tagsContainer = document.getElementById('tagsContainer');
  const tagsGrid = document.getElementById('tagsGrid');

  if (!tagsContainer || !tagsGrid) return;

  // Clear existing tags
  tagsGrid.innerHTML = '';
  selectedTags = [];

  // Create tag checkboxes
  availableTags.forEach((tagName, index) => {
    const tagEl = document.createElement('label');
    tagEl.className = 'tag-checkbox';
    tagEl.dataset.index = index;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = tagName;
    checkbox.id = `tag-${index}`;

    const label = document.createElement('span');
    label.className = 'tag-label';
    label.textContent = tagName;

    tagEl.appendChild(checkbox);
    tagEl.appendChild(label);
    tagsGrid.appendChild(tagEl);

    // Handle selection
    checkbox.addEventListener('change', () => {
      handleTagSelection(tagName, checkbox.checked);
      updateTagCheckboxStyle(tagEl, checkbox.checked);
    });

    // Handle click on label
    tagEl.addEventListener('click', (e) => {
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      }
    });
  });

  // Show container
  tagsContainer.classList.remove('hidden');
}

function handleTagSelection(tagName, isSelected) {
  if (isSelected) {
    // Check if already at max (4 tags)
    if (selectedTags.length >= 4) {
      // Uncheck this checkbox
      const checkbox = document.querySelector(`input[value="${tagName}"]`);
      if (checkbox) {
        checkbox.checked = false;
        return;
      }
    }
    selectedTags.push(tagName);
  } else {
    selectedTags = selectedTags.filter(t => t !== tagName);
  }
}

function updateTagCheckboxStyle(tagEl, isSelected) {
  if (isSelected) {
    tagEl.classList.add('selected');
  } else {
    tagEl.classList.remove('selected');
  }
}

function focusTag(index) {
  const tags = document.querySelectorAll('.tag-checkbox');
  tags.forEach((tag, i) => {
    if (i === index) {
      tag.classList.add('focused');
      currentTagIndex = index;
    } else {
      tag.classList.remove('focused');
    }
  });
}

function toggleCurrentTag() {
  if (currentTagIndex >= 0) {
    const tags = document.querySelectorAll('.tag-checkbox');
    const currentTag = tags[currentTagIndex];
    if (currentTag) {
      const checkbox = currentTag.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      }
    }
  }
}

// ==============================================
// Footer Links
// ==============================================
function setupFooterLinks() {
  if (footerSection) {
    footerSection.style.display = 'flex';
  }

  if (viewSheetLink) {
    if (settings.sheetUrl) {
      viewSheetLink.href = settings.sheetUrl;
      viewSheetLink.target = '_blank';
      viewSheetLink.style.display = 'inline';
    } else {
      viewSheetLink.style.display = 'none';
      const divider = document.querySelector('.footer .divider');
      if (divider) divider.style.display = 'none';
    }
  }
}

// ==============================================
// Save to Google Form
// ==============================================
async function saveToGoogleForm() {
  if (!settings.formUrl || !currentTab) {
    showError('Please set up your form URL in Settings.');
    return;
  }

  if (saveBtn) {
    saveBtn.classList.add('loading');
    saveBtn.disabled = true;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'savePage',
      data: {
        title: titleInput ? titleInput.value.trim() : (currentTab.title || ''),
        url: currentTab.url || '',
        notes: notesInput ? notesInput.value.trim() : '',
        tags: selectedTags, // Include selected tags
        formUrl: settings.formUrl
      }
    });

    if (response && response.success) {
      showView('success');
      if (notesInput) notesInput.value = '';
      selectedTags = [];
    } else {
      showError('Save may have failed. Please check your form URL in Settings.');
    }

  } catch (error) {
    console.error('Save error:', error);
    showError('Failed to save. Please try again.');
  } finally {
    if (saveBtn) {
      saveBtn.classList.remove('loading');
      saveBtn.disabled = false;
    }
  }
}

// ==============================================
// Event Listeners
// ==============================================

// Login button - open FindMyICP Save Later page
if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: SAVE_LATER_URL });
    window.close();
  });
}

// Setup button - open settings page
if (setupBtn) {
  setupBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

// Save button
if (saveBtn) {
  saveBtn.addEventListener('click', saveToGoogleForm);
}

// Save another button
if (saveAnotherBtn) {
  saveAnotherBtn.addEventListener('click', async () => {
    currentTab = await getCurrentTab();
    populatePageInfo();
    showView('main');
  });
}

// View sheet button
if (viewSheetBtn) {
  viewSheetBtn.addEventListener('click', () => {
    if (settings.sheetUrl) {
      chrome.tabs.create({ url: settings.sheetUrl });
    } else {
      chrome.runtime.openOptionsPage();
    }
  });
}

// Retry button
if (retryBtn) {
  retryBtn.addEventListener('click', async () => {
    await init();
  });
}

// Help button
if (helpBtn) {
  helpBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: SAVE_LATER_URL });
    window.close();
  });
}

// View sheet link click
if (viewSheetLink) {
  viewSheetLink.addEventListener('click', (e) => {
    if (!settings.sheetUrl) {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    }
  });
}

// Settings link click
const settingsLink = document.getElementById('settingsLink');
if (settingsLink) {
  settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

// ==============================================
// Keyboard Shortcuts
// ==============================================
document.addEventListener('keydown', (e) => {
  // Tags keyboard navigation (when tags are shown)
  if (showTagsMode && !document.getElementById('tagsContainer').classList.contains('hidden')) {
    const tags = document.querySelectorAll('.tag-checkbox');
    const notesInput = document.getElementById('notesInput');

    // Tab - move to notes (don't prevent default, let it work naturally)
    if (e.key === 'Tab') {
      // If we're focused on a tag and pressing Tab, move to notes
      if (currentTagIndex >= 0) {
        e.preventDefault();
        if (notesInput) {
          notesInput.focus();
          // Clear tag focus
          tags.forEach(tag => tag.classList.remove('focused'));
          currentTagIndex = -1;
        }
      }
      return;
    }

    // Arrow Down or Arrow Right - next tag
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (currentTagIndex === -1) {
        // Start from first tag
        focusTag(0);
      } else {
        const nextIndex = currentTagIndex < tags.length - 1 ? currentTagIndex + 1 : 0;
        focusTag(nextIndex);
      }
      return;
    }

    // Arrow Up or Arrow Left - previous tag
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      if (currentTagIndex === -1) {
        // Start from last tag
        focusTag(tags.length - 1);
      } else {
        const prevIndex = currentTagIndex > 0 ? currentTagIndex - 1 : tags.length - 1;
        focusTag(prevIndex);
      }
      return;
    }

    // Space or Enter - toggle current tag
    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
      // Only prevent default if we have a focused tag
      if (currentTagIndex >= 0) {
        e.preventDefault();
        toggleCurrentTag();
      }
      return;
    }
  }

  // Ctrl/Cmd + Enter to save (when not focused on tags)
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (mainView && !mainView.classList.contains('hidden') && saveBtn && !saveBtn.disabled) {
      saveToGoogleForm();
    }
  }

  // Escape to close
  if (e.key === 'Escape') {
    window.close();
  }
});
