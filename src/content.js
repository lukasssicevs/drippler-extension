// Drippler Extension Content Script

console.log(
  "Drippler Extension content script loaded on:",
  window.location.href
);

// Global variables
let isExtensionActive = false;
let supabaseReady = false;

// Initialize content script
(function init() {
  console.log("Initializing Drippler Extension content script...");

  // Check if extension should be active on this page
  if (shouldActivateOnPage()) {
    activateExtension();
  }

  // Listen for messages from background script
  setupMessageListeners();

  // Setup DOM observers
  setupDOMObservers();

  // Check Supabase connection status
  checkSupabaseConnection();
})();

// Check if extension should be active on current page
function shouldActivateOnPage() {
  const url = window.location.href;
  const hostname = window.location.hostname;

  // Add your domain-specific logic here
  // For now, activate on all pages
  return true;
}

// Activate extension functionality
function activateExtension() {
  console.log("Activating Drippler Extension on page...");
  isExtensionActive = true;

  // Add extension UI elements
  createExtensionUI();

  // Setup page-specific functionality
  setupPageFunctionality();

  // Notify background script
  chrome.runtime.sendMessage({
    action: "contentScriptActivated",
    url: window.location.href,
    timestamp: new Date().toISOString(),
  });
}

// Create extension UI elements
function createExtensionUI() {
  // Check if UI already exists
  if (document.getElementById("drippler-extension-ui")) {
    return;
  }

  // Create floating button
  const floatingButton = document.createElement("div");
  floatingButton.id = "drippler-extension-ui";
  floatingButton.innerHTML = `
        <div class="drippler-floating-btn" title="Drippler Extension">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
        </div>
    `;

  // Add styles
  const styles = `
        #drippler-extension-ui {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .drippler-floating-btn {
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
        }
        
        .drippler-floating-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3);
        }
        
        .drippler-floating-btn svg {
            width: 20px;
            height: 20px;
        }
    `;

  // Add styles to page
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Add click handler
  floatingButton.addEventListener("click", handleFloatingButtonClick);

  // Add to page
  document.body.appendChild(floatingButton);

  console.log("Drippler Extension UI created");
}

// Handle floating button click
function handleFloatingButtonClick() {
  console.log("Drippler floating button clicked");

  // Send message to background script to open popup or perform action
  chrome.runtime.sendMessage({
    action: "floatingButtonClicked",
    url: window.location.href,
    timestamp: new Date().toISOString(),
  });

  // You can add custom functionality here
  // For example, show a modal, collect page data, etc.
  showQuickMenu();
}

// Show quick menu
function showQuickMenu() {
  // Check if menu already exists
  let existingMenu = document.getElementById("drippler-quick-menu");
  if (existingMenu) {
    existingMenu.remove();
    return;
  }

  // Create quick menu
  const quickMenu = document.createElement("div");
  quickMenu.id = "drippler-quick-menu";
  quickMenu.innerHTML = `
        <div class="drippler-menu-content">
            <div class="drippler-menu-header">
                <span>Drippler Extension</span>
                <button class="drippler-close-btn">×</button>
            </div>
            <div class="drippler-menu-body">
                <div class="drippler-menu-item" data-action="capture-page">
                    📄 Capture Page
                </div>
                <div class="drippler-menu-item" data-action="save-to-supabase">
                    💾 Save to Database
                </div>
                <div class="drippler-menu-item" data-action="open-popup">
                    ⚙️ Open Settings
                </div>
            </div>
        </div>
    `;

  // Add menu styles
  const menuStyles = `
        #drippler-quick-menu {
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 1000000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .drippler-menu-content {
            background: white;
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            min-width: 200px;
            overflow: hidden;
            animation: drippler-fadeIn 0.2s ease;
        }
        
        @keyframes drippler-fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .drippler-menu-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 500;
        }
        
        .drippler-close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .drippler-menu-body {
            padding: 8px 0;
        }
        
        .drippler-menu-item {
            padding: 12px 16px;
            cursor: pointer;
            transition: background-color 0.2s ease;
            font-size: 14px;
        }
        
        .drippler-menu-item:hover {
            background-color: #f8f9fa;
        }
    `;

  // Add menu styles to page
  const menuStyleSheet = document.createElement("style");
  menuStyleSheet.textContent = menuStyles;
  document.head.appendChild(menuStyleSheet);

  // Add event listeners
  quickMenu.addEventListener("click", handleMenuClick);

  // Add to page
  document.body.appendChild(quickMenu);

  // Close menu when clicking outside
  setTimeout(() => {
    document.addEventListener("click", closeMenuOnOutsideClick);
  }, 100);
}

// Handle menu click
function handleMenuClick(event) {
  const target = event.target;
  const action = target.getAttribute("data-action");

  if (target.classList.contains("drippler-close-btn")) {
    closeQuickMenu();
    return;
  }

  if (action) {
    handleMenuAction(action);
    closeQuickMenu();
  }
}

// Handle menu actions
function handleMenuAction(action) {
  console.log("Menu action:", action);

  switch (action) {
    case "capture-page":
      capturePage();
      break;
    case "save-to-supabase":
      saveToSupabase();
      break;
    case "open-popup":
      openExtensionPopup();
      break;
  }
}

// Capture page data
function capturePage() {
  const pageData = {
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
    content: {
      text: document.body.innerText.substring(0, 1000), // First 1000 chars
      links: Array.from(document.links).map((link) => link.href),
      images: Array.from(document.images).map((img) => img.src),
    },
  };

  // Send to background script
  chrome.runtime.sendMessage({
    action: "capturePageData",
    data: pageData,
  });

  console.log("Page captured:", pageData);
}

// Save to Supabase
function saveToSupabase() {
  if (!supabaseReady) {
    alert("Supabase connection not ready. Please check your connection.");
    return;
  }

  // Send message to background script to save data
  chrome.runtime.sendMessage({
    action: "saveToSupabase",
    data: {
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
    },
  });
}

// Open extension popup
function openExtensionPopup() {
  chrome.runtime.sendMessage({
    action: "openPopup",
  });
}

// Close quick menu
function closeQuickMenu() {
  const menu = document.getElementById("drippler-quick-menu");
  if (menu) {
    menu.remove();
    document.removeEventListener("click", closeMenuOnOutsideClick);
  }
}

// Close menu when clicking outside
function closeMenuOnOutsideClick(event) {
  const menu = document.getElementById("drippler-quick-menu");
  const button = document.getElementById("drippler-extension-ui");

  if (menu && !menu.contains(event.target) && !button.contains(event.target)) {
    closeQuickMenu();
  }
}

// Setup message listeners
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Content script received message:", request);

    switch (request.action) {
      case "ping":
        sendResponse({ pong: true });
        break;
      case "getPageData":
        sendResponse(getPageData());
        break;
      case "supabaseStatusUpdate":
        supabaseReady = request.connected;
        break;
      case "authStateChanged":
        handleAuthStateChange(request);
        break;
    }
  });
}

// Get current page data
function getPageData() {
  return {
    url: window.location.href,
    title: document.title,
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    timestamp: new Date().toISOString(),
  };
}

// Setup DOM observers
function setupDOMObservers() {
  // Observe DOM changes if needed
  const observer = new MutationObserver((mutations) => {
    // Handle DOM changes
    // console.log('DOM changed:', mutations.length, 'mutations');
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Setup page-specific functionality
function setupPageFunctionality() {
  // Add page-specific logic here based on the current site
  const hostname = window.location.hostname;

  // Example: specific functionality for different sites
  switch (hostname) {
    case "github.com":
      setupGithubFunctionality();
      break;
    case "stackoverflow.com":
      setupStackOverflowFunctionality();
      break;
    default:
      setupGeneralFunctionality();
  }
}

// Site-specific functionality
function setupGithubFunctionality() {
  console.log("Setting up GitHub-specific functionality");
  // Add GitHub-specific features here
}

function setupStackOverflowFunctionality() {
  console.log("Setting up StackOverflow-specific functionality");
  // Add StackOverflow-specific features here
}

function setupGeneralFunctionality() {
  console.log("Setting up general functionality");
  // Add general features here
}

// Check Supabase connection
async function checkSupabaseConnection() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: "checkSupabaseStatus",
    });

    supabaseReady = response.connected;
    console.log("Supabase connection status:", supabaseReady);
  } catch (error) {
    console.error("Error checking Supabase connection:", error);
    supabaseReady = false;
  }
}

// Handle authentication state changes
function handleAuthStateChange(authData) {
  console.log(
    "Auth state changed in content script:",
    authData.event,
    authData.user?.email
  );

  // Update UI based on auth state
  updateUIForAuthState(authData);

  // You can add more auth-specific functionality here
  // For example, enable/disable certain features based on auth status
}

function updateUIForAuthState(authData) {
  const floatingButton = document.getElementById("drippler-extension-ui");
  if (!floatingButton) return;

  const button = floatingButton.querySelector(".drippler-floating-btn");
  if (!button) return;

  // Update button appearance based on auth state
  if (authData.user) {
    // User is authenticated
    button.style.background =
      "linear-gradient(135deg, #28a745 0%, #20c997 100%)";
    button.title = `Drippler Extension - Signed in as ${authData.user.email}`;
  } else {
    // User is not authenticated
    button.style.background =
      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    button.title = "Drippler Extension - Sign in required";
  }
}

// Clean up when page unloads
window.addEventListener("beforeunload", () => {
  console.log("Drippler Extension content script unloading...");
  closeQuickMenu();
});
