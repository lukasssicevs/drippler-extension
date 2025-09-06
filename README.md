# Drippler Chrome Extension

A Chrome extension with Supabase integration for data collection and management.

## Features

- 🚀 Modern Chrome Extension (Manifest V3)
- 🗄️ Supabase database integration
- 🔐 **Password-based authentication** (Sign up, Sign in, Password reset)
- 👤 **User management** with session handling
- 🎨 Clean, modern popup UI with authentication forms
- 📝 Content script for page interaction
- 🔧 Webpack build system with Babel
- 💾 Local storage for offline functionality
- 🔄 Real-time auth state synchronization across extension

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a new project at [Supabase](https://supabase.com)
2. Get your project URL and anon key from the API settings
3. Update the configuration in `src/background.js`:

```javascript
const SUPABASE_CONFIG = {
  url: "YOUR_SUPABASE_URL", // Replace with your Supabase URL
  key: "YOUR_SUPABASE_ANON_KEY", // Replace with your Supabase anon key
};
```

### 3. Create Database Tables (Optional)

If you want to use the "Save to Supabase" feature, create a table in your Supabase database:

```sql
CREATE TABLE page_captures (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT,
    timestamp TIMESTAMPTZ,
    extension_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Build the Extension

```bash
npm run build
```

This creates a `dist` folder with the built extension files.

### 5. Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `dist` folder
4. The extension should now appear in your extensions list

## Development

### Build Commands

- `npm run build` - Build for production
- `npm run dev` - Build for development with watch mode

### Project Structure

```
EXTENSION/
├── src/                    # Source files
│   ├── background.js       # Service worker with Supabase integration
│   ├── popup.js           # Popup interface logic
│   └── content.js         # Content script for page interaction
├── dist/                  # Built extension (generated)
├── icons/                 # Extension icons
├── manifest.json          # Extension manifest
├── popup.html            # Popup interface
├── styles.css            # Popup styles
├── package.json          # Dependencies and scripts
└── webpack.config.js     # Build configuration
```

## Usage

### Authentication & User Management

1. **First-time setup**: Connect to Supabase using your credentials
2. **Sign up**: Create a new account with email and password
3. **Sign in**: Access your account with existing credentials
4. **Password reset**: Reset forgotten passwords via email
5. **User dashboard**: View profile and manage account settings

### Popup Interface

1. Click the extension icon in the toolbar
2. **If not connected**: Click "Connect to Supabase" to initialize
3. **If not authenticated**: Use the Login/Sign Up forms
4. **If authenticated**: Access user dashboard and extension features
5. Use "Test Connection" to verify Supabase connectivity

### Content Script Features

1. Look for the floating button on any webpage (color indicates auth status)
   - **Green**: User is authenticated
   - **Blue**: User needs to sign in
2. Click it to access quick actions:
   - **Capture Page**: Collect page metadata
   - **Save to Database**: Store data in Supabase (requires authentication)
   - **Open Settings**: Access extension settings

### Background Features

- Automatic Supabase connection on startup
- **Complete authentication system** with session management
- **Real-time auth state synchronization** across all extension components
- Message handling between popup and content scripts
- Data storage and retrieval with user context
- Extension lifecycle management

## Customization

### Adding New Features

1. **Background Script** (`src/background.js`): Add new message handlers and Supabase operations
2. **Content Script** (`src/content.js`): Add new page interaction features
3. **Popup** (`src/popup.js`): Add new UI controls and settings

### Styling

Modify `styles.css` to customize the popup appearance. The design uses:

- CSS Grid and Flexbox for layout
- CSS custom properties for theming
- Smooth animations and transitions
- Responsive design principles

## Troubleshooting

### Common Issues

1. **Supabase not connecting**: Check your URL and key in `src/background.js`
2. **Extension not loading**: Make sure you're loading the `dist` folder, not the root
3. **Build errors**: Run `npm install` and check for Node.js compatibility

### Debug Mode

1. Open Chrome DevTools
2. Go to Extensions tab → Your extension → "service worker"
3. Check console logs for background script issues
4. Use "Inspect views: popup" for popup debugging

## Security Notes

- Never commit your actual Supabase credentials to version control
- Use environment variables or a separate config file for production
- The anon key is visible in the bundled code - use appropriate RLS policies
- Consider implementing proper authentication for production use

## License

MIT License - feel free to modify and distribute as needed.
