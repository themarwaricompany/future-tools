# Future Tools - Save to Google Sheets

Never forget a tool again. Save any webpage to your personal Google Sheet with one click. Build your reading list, research collection, or bookmark library - all in a spreadsheet you control.

## Features

- 🚀 **Instant Save** - One click or Alt+S to save any page
- 📊 **Your Own Sheet** - Data goes directly to YOUR Google Sheet
- 📝 **Add Notes** - Include context with each saved page
- ⚡ **Background Submit** - Saves instantly without opening forms
- 🎨 **Beautiful UI** - Modern dark theme inspired by FindMyICP.com
- 🔒 **Privacy First** - No tracking, no data collection

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+S` | Quick save (instant, no popup) |
| `Alt+U` | Open Future Tools popup |
| `Ctrl/Cmd+Enter` | Save (when popup is open) |
| `Escape` | Close popup |

## Quick Start

### 1. Install the Extension
- Chrome Web Store: [Coming Soon]
- Or load unpacked from `chrome://extensions/`

### 2. Set Up Your Sheet
1. Click the Future Tools icon
2. Click "Set Up Now" → You'll be taken to Settings
3. Click "Copy the Form Template" to create your own form
4. Link the form to Google Sheets (Form → Responses → Link to Sheets)
5. Copy your new form's URL and paste it in Settings
6. Click "Save & Start Using"

### 3. Start Saving Pages!
- Browse to any webpage
- Press `Alt+S` for instant save
- Or click the icon to add notes before saving

## How It Works

1. You create a copy of our Google Form template
2. The form saves responses to YOUR Google Sheet
3. When you save a page, we submit the form in the background
4. Title, URL, and Notes appear in your sheet instantly

## File Structure

```
├── manifest.json      # Extension configuration
├── background.js      # Service worker (form submission)
├── popup.html/css/js  # Main popup UI
├── options.html/css/js # Settings page
├── icons/             # Extension icons
├── PRIVACY_POLICY.md  # Privacy policy
└── README.md          # This file
```

## Privacy

- ✅ Only accesses current tab when you click save
- ✅ Stores only your form URL locally
- ✅ Submits directly to YOUR Google Form
- ❌ No analytics or tracking
- ❌ No data sent to our servers
- ❌ No browsing history access

See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for full details.

## Publishing

```bash
# Create ZIP for Chrome Web Store
zip -r future-tools-v1.0.0.zip . -x "store-assets/*" -x "*.md" -x ".DS_Store" -x "*.zip"
```

## Credits

Built with ❤️ for people who save things for later.

Design inspired by [FindMyICP.com](https://findmyicp.com).

## License

MIT License
