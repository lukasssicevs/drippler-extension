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
  // createExtensionUI(); // Temporarily disabled

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
            <i class="ph ph-sparkle" style="font-size: 20px; color: currentColor;"></i>
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
            background: #BD5DEE;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
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

  // Add Phosphor icons CSS first
  const phosphorLink = document.createElement("link");
  phosphorLink.rel = "stylesheet";
  phosphorLink.href = chrome.runtime.getURL("phosphor-regular.css");
  document.head.appendChild(phosphorLink);

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
            background: #0E0D0D;
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            min-width: 200px;
            overflow: hidden;
            animation: drippler-fadeIn 0.2s ease;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        @keyframes drippler-fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .drippler-menu-header {
            background: #0E0D0D;
            color: #FFFFFF;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 500;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .drippler-close-btn {
            background: none;
            border: none;
            color: #FFFFFF;
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
            color: #FFFFFF;
        }
        
        .drippler-menu-item:hover {
            background-color: rgba(255, 255, 255, 0.1);
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

// Setup image hover functionality
function setupImageHoverFunctionality() {
  console.log("Setting up image hover functionality");

  let hoverButton = null;
  let currentImage = null;

  // Drip SVG icon
  function getDripSVG() {
    return `
      <svg width="16" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clip-path="url(#clip0_11_9967)">
          <path d="M11.9189 0.00012207C12.0991 -0.00676403 12.2133 0.189436 12.1367 0.352661C10.5385 3.74319 15.1484 5.11788 15.1484 10.3507C15.1484 13.2933 12.5624 16.0001 8.79199 16.0001C5.02152 16.0001 1.96484 12.9151 1.96484 9.1095C1.96512 5.39051 6.12473 0.23292 11.9189 0.00012207ZM10.3955 1.46594C5.9971 3.29908 4.1642 6.2316 4.16406 9.5304C4.16406 10.9965 6.50426 12.412 8.73926 12.4122C10.9744 12.4122 12.5947 10.6298 12.5947 9.89661C12.5946 7.69763 11.495 6.23159 9.2959 3.66614C9.07228 3.40527 9.6624 2.19958 10.3955 1.46594Z" fill="currentColor"/>
        </g>
        <defs>
          <clipPath id="clip0_11_9967">
            <rect width="16" height="16" fill="white" transform="translate(0.964844)"/>
          </clipPath>
        </defs>
      </svg>
    `;
  }

  // Create the hover button element
  function createHoverButton() {
    const button = document.createElement("div");
    button.id = "drippler-image-hover-btn";
    button.innerHTML = `
      <div class="drippler-hover-btn-content">
        <div class="drippler-hover-btn-icon">
          <img src="${chrome.runtime.getURL('assets/drip-static.webp')}" alt="Drip icon" style="height: 64px !important; width: auto !important; max-height: none !important; max-width: none !important; object-fit: contain; position: absolute; top: -9px; left: 50%; transform: translateX(-50%); z-index: 999999;">
        </div>
        <span class="drippler-hover-btn-text">Add to Drippler</span>
      </div>
    `;

    // Add styles
    const styles = `
      #drippler-image-hover-btn {
        position: absolute;
        background: #FFFFFF;
        color: #BD5DEE;
        border-radius: 8px;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        z-index: 999999;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        transition: all 0.15s ease;
        pointer-events: auto;
        display: none;
        border: 2px solid #BD5DEE;
        overflow: visible;
      }
      
      #drippler-image-hover-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3);
      }
      
      #drippler-image-hover-btn:active {
        transform: translateY(0px);
        transition: all 0.05s ease;
      }
      
      .drippler-hover-btn-content {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        position: relative;
        overflow: visible;
      }
      
      .drippler-hover-btn-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        overflow: visible;
        position: relative;
      }
      
      .drippler-hover-btn-icon svg {
        width: 16px;
        height: 16px;
      }
      
      .drippler-hover-btn-text {
        font-weight: 700;
        font-size: 12px;
        white-space: nowrap;
      }
      
      @keyframes drippler-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
      }
      
      @keyframes drippler-drip {
        0% { 
          transform: translateY(0px) scaleY(1);
          opacity: 1;
        }
        25% { 
          transform: translateY(12px) scaleY(1.4);
          opacity: 0.9;
        }
        50% { 
          transform: translateY(24px) scaleY(1.7);
          opacity: 0.7;
        }
        75% { 
          transform: translateY(32px) scaleY(2.0);
          opacity: 0.4;
        }
        100% { 
          transform: translateY(0px) scaleY(1);
          opacity: 1;
        }
      }
      
      @keyframes drippler-drip-subtle {
        0%, 100% { 
          transform: translateY(0px) scaleY(1);
        }
        50% { 
          transform: translateY(6px) scaleY(1.15);
        }
      }
      
      .drippler-dripping {
        animation: drippler-drip 0.9s ease-in-out infinite;
      }
      
      .drippler-dripping-subtle {
        animation: drippler-drip-subtle 2.5s ease-in-out infinite;
      }
      
      .drippler-pulsing {
        animation: drippler-pulse 1.5s ease-in-out infinite;
      }
    `;

    // Add styles to page if not already added
    if (!document.getElementById("drippler-hover-styles")) {
      const styleSheet = document.createElement("style");
      styleSheet.id = "drippler-hover-styles";
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }

    // Add click handler
    button.addEventListener("click", handleHoverButtonClick);

    document.body.appendChild(button);
    return button;
  }

  // Handle hover button click
  async function handleHoverButtonClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!currentImage) return;

    console.log("Adding image to wardrobe:", currentImage.src);

    // Show loading state
    const button = event.target.closest("#drippler-image-hover-btn");
    const originalContent = button.innerHTML;

    // Check authentication first with retry logic
    try {
      let authResponse = await chrome.runtime.sendMessage({
        action: "getCurrentUser",
      });

      // If auth check fails, try refreshing session once
      if (!authResponse.success || !authResponse.user) {
        console.log("Initial auth check failed, trying session refresh...");
        try {
          const refreshResponse = await chrome.runtime.sendMessage({
            action: "refreshUserSession",
          });

          if (refreshResponse.success && refreshResponse.user) {
            console.log("Session refresh successful, user authenticated");
            authResponse = refreshResponse;
          }
        } catch (refreshError) {
          console.warn("Session refresh failed:", refreshError);
        }
      }

      if (!authResponse.success || !authResponse.user) {
        // User not authenticated - show login prompt
        button.innerHTML = `
          <div class="drippler-hover-btn-content">
            <div class="drippler-hover-btn-icon">
              <img src="${chrome.runtime.getURL('assets/drip-static.webp')}" alt="Drip icon" style="height: 64px !important; width: auto !important; max-height: none !important; max-width: none !important; object-fit: contain; position: absolute; top: -9px; left: 50%; transform: translateX(-50%); z-index: 999999;">
            </div>
            <span class="drippler-hover-btn-text">Sign In First</span>
          </div>
        `;
        button.classList.add("drippler-pulsing");

        // Open extension popup for login
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: "openPopup" });
          hideHoverButton();
        }, 1000);
        return;
      }
    } catch (authError) {
      console.error("Error checking authentication:", authError);
      // Show error and open popup as fallback
      button.innerHTML = `
        <div class="drippler-hover-btn-content">
          <div class="drippler-hover-btn-icon">
            <img src="${chrome.runtime.getURL('assets/drip-static.webp')}" alt="Drip icon" style="height: 64px !important; width: auto !important; max-height: none !important; max-width: none !important; object-fit: contain; position: absolute; top: -9px; left: 50%; transform: translateX(-50%); z-index: 999999;">
          </div>
          <span class="drippler-hover-btn-text">Please Sign In</span>
        </div>
      `;

      setTimeout(() => {
        chrome.runtime.sendMessage({ action: "openPopup" });
        hideHoverButton();
      }, 1000);
      return;
    }

    // Show loading state
    button.innerHTML = `
      <div class="drippler-hover-btn-content">
        <div class="drippler-hover-btn-icon">
          <img src="${chrome.runtime.getURL('assets/drip-static.webp')}" alt="Drip icon" style="height: 64px !important; width: auto !important; max-height: none !important; max-width: none !important; object-fit: contain; position: absolute; top: -9px; left: 50%; transform: translateX(-50%); z-index: 999999;">
        </div>
        <span class="drippler-hover-btn-text">Adding Item...</span>
      </div>
    `;
    button.style.pointerEvents = "none";

    try {
      // Send message to background script to save image
      const response = await chrome.runtime.sendMessage({
        action: "saveImageAsClothing",
        data: {
          imageUrl: currentImage.src,
          pageUrl: window.location.href,
          pageTitle: document.title,
          source: "image_hover",
        },
      });

      if (response.success) {
        // Show success state with animated WebP
        button.innerHTML = `
          <div class="drippler-hover-btn-content" style="overflow: visible; position: relative;">
            <div class="drippler-hover-btn-icon" style="overflow: visible; width: 16px; height: 16px; position: relative;">
              <img src="${chrome.runtime.getURL(
                "assets/drip-animation.webp"
              )}" alt="Drip animation" style="height: 64px !important; width: auto !important; max-height: none !important; max-width: none !important; object-fit: contain; position: absolute; top: -9px; left: 50%; transform: translateX(-50%); z-index: 999999;">
            </div>
            <span class="drippler-hover-btn-text">Item Added!</span>
          </div>
        `;
        button.style.overflow = "visible";

        // Hide button after success with shorter delay
        setTimeout(() => {
          hideHoverButton();
        }, 1200);
      } else {
        throw new Error(response.error || "Failed to add image");
      }
    } catch (error) {
      console.error("Error adding image to wardrobe:", error);

      // Show error state
      button.innerHTML = `
        <div class="drippler-hover-btn-content">
          <div class="drippler-hover-btn-icon">
            <img src="${chrome.runtime.getURL('assets/drip-static.webp')}" alt="Drip icon" style="height: 64px !important; width: auto !important; max-height: none !important; max-width: none !important; object-fit: contain; position: absolute; top: -9px; left: 50%; transform: translateX(-50%); z-index: 999999;">
          </div>
          <span class="drippler-hover-btn-text">Failed to Add</span>
        </div>
      `;
      button.style.pointerEvents = "auto";

      // Reset after showing error
      setTimeout(() => {
        hideHoverButton();
      }, 1200);
    }
  }

  // Position the hover button
  function positionHoverButton(image, button) {
    const rect = image.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Position button in top-right corner of image
    button.style.left = rect.right - button.offsetWidth - 8 + scrollX + "px";
    button.style.top = rect.top + 8 + scrollY + "px";
  }

  // Show hover button
  function showHoverButton(image) {
    if (!hoverButton) {
      hoverButton = createHoverButton();
    }

    currentImage = image;
    hoverButton.style.display = "block";
    positionHoverButton(image, hoverButton);
  }

  // Hide hover button
  function hideHoverButton() {
    if (hoverButton) {
      hoverButton.style.display = "none";
      currentImage = null;
      // Reset button to original state
      resetHoverButton();
    }
  }

  // Reset hover button to original state
  function resetHoverButton() {
    if (hoverButton) {
      hoverButton.innerHTML = `
        <div class="drippler-hover-btn-content">
          <div class="drippler-hover-btn-icon">
            <img src="${chrome.runtime.getURL('assets/drip-static.webp')}" alt="Drip icon" style="height: 64px !important; width: auto !important; max-height: none !important; max-width: none !important; object-fit: contain; position: absolute; top: -9px; left: 50%; transform: translateX(-50%); z-index: 999999;">
          </div>
          <span class="drippler-hover-btn-text">Add to Drippler</span>
        </div>
      `;
      hoverButton.style.pointerEvents = "auto";
      hoverButton.classList.remove(
        "drippler-pulsing",
        "drippler-dripping",
        "drippler-dripping-subtle"
      );
    }
  }

  // Check if image is valid for adding to wardrobe
  function isValidImage(img) {
    // Skip very small images (likely icons)
    if (img.width < 100 || img.height < 100) return false;

    // Skip if image doesn't have a valid src
    if (!img.src || img.src.startsWith("data:")) return false;

    // Skip if image is part of Drippler extension UI
    if (
      img.closest("#drippler-extension-ui") ||
      img.closest("#drippler-quick-menu") ||
      img.id === "drippler-image-hover-btn"
    )
      return false;

    return true;
  }

  // Add event listeners to all images
  function addImageListeners() {
    const images = document.querySelectorAll("img");

    images.forEach((img) => {
      // Remove existing listeners to avoid duplicates
      img.removeEventListener("mouseenter", handleImageHover);
      img.removeEventListener("mouseleave", handleImageLeave);

      // Add new listeners
      img.addEventListener("mouseenter", handleImageHover);
      img.addEventListener("mouseleave", handleImageLeave);
    });
  }

  // Handle image hover
  function handleImageHover(event) {
    const img = event.target;

    if (!isValidImage(img)) return;

    // Delay showing button slightly to avoid flickering
    setTimeout(() => {
      if (img.matches(":hover")) {
        showHoverButton(img);
      }
    }, 200);
  }

  // Handle image leave
  function handleImageLeave(event) {
    // Delay hiding to allow moving to button
    setTimeout(() => {
      const button = document.getElementById("drippler-image-hover-btn");
      if (
        button &&
        !button.matches(":hover") &&
        !event.target.matches(":hover")
      ) {
        hideHoverButton();
      }
    }, 100);
  }

  // Initial setup
  addImageListeners();

  // Watch for new images added to the page
  const observer = new MutationObserver((mutations) => {
    let newImages = false;

    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === "IMG") {
              newImages = true;
            } else if (
              node.querySelectorAll &&
              node.querySelectorAll("img").length > 0
            ) {
              newImages = true;
            }
          }
        });
      }
    });

    if (newImages) {
      // Debounce to avoid excessive calls
      clearTimeout(addImageListeners.timeout);
      addImageListeners.timeout = setTimeout(addImageListeners, 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Handle scroll to reposition button
  let scrollTimeout;
  window.addEventListener("scroll", () => {
    if (hoverButton && currentImage && hoverButton.style.display === "block") {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (currentImage.matches(":hover")) {
          positionHoverButton(currentImage, hoverButton);
        } else {
          hideHoverButton();
        }
      }, 100);
    }
  });

  console.log("Image hover functionality setup complete");
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
  setupImageHoverFunctionality();
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
    button.style.background = "#BD5DEE";
    button.title = `Drippler Extension - Signed in as ${authData.user.email}`;
  } else {
    // User is not authenticated
    button.style.background = "#BD5DEE";
    button.title = "Drippler Extension - Sign in required";
  }
}

// Clean up when page unloads
window.addEventListener("beforeunload", () => {
  console.log("Drippler Extension content script unloading...");
  closeQuickMenu();
});
