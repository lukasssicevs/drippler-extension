// Drippler Extension Popup with Supabase Integration
import { createClient } from "@supabase/supabase-js";
import { createIconHTML, IconNames, IconWeights } from "./icons.js";

// Global state
let currentUser = null;
let isAuthenticated = false;

// Universal Supabase call wrapper with auto-retry
async function supabaseCall(action, data = {}) {
  const response = await chrome.runtime.sendMessage({ action, ...data });

  // If Supabase connection lost, retry once
  if (response && !response.success && response.error?.includes('Supabase not connected')) {
    await chrome.runtime.sendMessage({ action: "initSupabase" });
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await chrome.runtime.sendMessage({ action, ...data });
  }

  return response;
}

// Popup functionality
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Drippler Extension Popup loaded");

  // Initialize UI elements immediately
  initializeUI();

  // Load extension info
  loadExtensionInfo();

  // Setup event listeners
  setupEventListeners();

  // Setup authentication event listeners
  setupAuthEventListeners();

  // Show loading state first
  showLoadingState();
  updateStatus("connecting", "Connecting...");

  // Initialize Supabase in background (non-blocking)
  initializeSupabaseAsync();
});

// Async Supabase initialization that doesn't block UI
async function initializeSupabaseAsync() {
  try {
    console.log("Starting background Supabase initialization...");

    // Add a small delay to let UI render first
    await new Promise(resolve => setTimeout(resolve, 100));

    const isReady = await waitForSupabaseReadyWithTimeout();

    if (isReady) {
      console.log("Supabase ready, checking authentication...");
      await checkCurrentUser();
    } else {
      console.log("Supabase connection failed, using offline mode");
      updateStatus("offline", "Offline mode");
      showError("Connection failed. Some features may be limited.");
      // Show auth forms as fallback when connection fails
      showAuthForms();
    }
  } catch (error) {
    console.error("Background initialization error:", error);
    updateStatus("offline", "Offline mode");
    // Show auth forms as fallback when initialization fails
    showAuthForms();
    // Don't show error here as it might be temporary
  }
}

// iOS Safari-optimized connection checking with better fallback
async function waitForSupabaseReadyWithTimeout() {
  updateStatus("connecting", "Connecting...");

  const maxRetries = 5; // Increased retries for iOS Safari
  const retryDelay = 800; // Slightly longer delay for mobile

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Connection attempt ${attempt}/${maxRetries}`);

      // Longer timeout for iOS Safari - service worker may be slower
      const response = await Promise.race([
        chrome.runtime.sendMessage({ action: "checkSupabaseStatus" }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Service worker timeout")), 3500)
        )
      ]);

      console.log("Connection response:", response);

      if (response && response.connected) {
        updateStatus("ready", "Connected");
        return true;
      }

      // iOS Safari specific: try immediate re-check if first response was negative
      if (attempt === 1 && response && !response.connected) {
        console.log("iOS Safari: Immediate re-check after negative response");
        await new Promise((resolve) => setTimeout(resolve, 100));

        const quickResponse = await Promise.race([
          chrome.runtime.sendMessage({ action: "checkSupabaseStatus" }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Quick timeout")), 2000)
          )
        ]);

        if (quickResponse && quickResponse.connected) {
          updateStatus("ready", "Connected");
          return true;
        }
      }

      if (attempt < maxRetries) {
        updateStatus("connecting", `Connecting... (${attempt}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    } catch (error) {
      console.error(`Connection attempt ${attempt} failed:`, error);

      // iOS Safari specific handling
      if (error.message === "Service worker timeout" || error.message?.includes("Could not establish connection")) {
        console.log("iOS Safari: Service worker issue detected, attempting wake-up...");
        updateStatus("connecting", "Waking up connection...");

        // Try a simple ping first
        try {
          await chrome.runtime.sendMessage({ action: "initSupabase" });
        } catch (pingError) {
          console.log("Ping failed, continuing with retry...");
        }
      }

      if (attempt < maxRetries) {
        updateStatus("connecting", `Retrying... (${attempt}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  // Final attempt with force initialization - iOS Safari may need this
  try {
    updateStatus("connecting", "Final connection attempt...");

    const response = await Promise.race([
      chrome.runtime.sendMessage({ action: "forceInitSupabase" }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Force init timeout")), 5000) // Longer timeout for iOS
      )
    ]);

    console.log("Force init response:", response);

    if (response && response.success && response.connected) {
      updateStatus("ready", "Connected");
      return true;
    }
  } catch (error) {
    console.error("Force initialization failed:", error);
  }

  // iOS Safari: One more check in case background script initialized during our attempts
  try {
    console.log("iOS Safari: Final status check...");
    const finalCheck = await chrome.runtime.sendMessage({ action: "checkSupabaseStatus" });
    if (finalCheck && finalCheck.connected) {
      updateStatus("ready", "Connected");
      return true;
    }
  } catch (error) {
    console.log("Final check failed:", error);
  }

  return false;
}

function initializeUI() {
  const statusIndicator = document.getElementById("statusIndicator");
  const statusText = document.getElementById("statusText");

  // Set initial state
  updateStatus("initializing", "Initializing...");
}

function loadExtensionInfo() {
  // Get manifest info for logging
  const manifest = chrome.runtime.getManifest();
  console.log("Extension manifest:", manifest);
  console.log("Extension ID:", chrome.runtime.id);
}

function setupEventListeners() {
  // No additional event listeners needed here
  // Auth event listeners are set up in setupAuthEventListeners()
  console.log("Basic event listeners initialized");
}

function showLoadingState() {
  const authForms = document.getElementById("authForms");
  const userDashboard = document.getElementById("userDashboard");
  const container = document.querySelector(".container");

  if (authForms && userDashboard && container) {
    // Hide both main content areas
    authForms.style.display = "none";
    userDashboard.style.display = "none";

    // Remove any existing loading overlay
    const existingLoader = document.querySelector(".loading-overlay");
    if (existingLoader) {
      existingLoader.remove();
    }

    // Create loading overlay
    const loadingOverlay = document.createElement("div");
    loadingOverlay.className = "loading-overlay";
    loadingOverlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z" fill="currentColor">
              <animateTransform attributeName="transform" dur="0.75s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/>
            </path>
          </svg>
        </div>
        <div class="loading-text">Loading Drippler...</div>
        <div class="loading-subtext">Connecting to your wardrobe</div>
      </div>
    `;

    // Add styles for loading overlay
    if (!document.getElementById("loading-overlay-styles")) {
      const styles = document.createElement("style");
      styles.id = "loading-overlay-styles";
      styles.textContent = `
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary, #ffffff);
          z-index: 1000;
        }

        .loading-content {
          text-align: center;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .loading-spinner {
          margin-bottom: 16px;
          display: flex;
          justify-content: center;
        }

        .loading-spinner svg {
          color: var(--accent-primary, #bd5dee);
          width: 32px;
          height: 32px;
        }

        .loading-text {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #1a1a1a);
          margin-bottom: 4px;
        }

        .loading-subtext {
          font-size: 13px;
          color: var(--text-secondary, #6b7280);
        }
      `;
      document.head.appendChild(styles);
    }

    // Add to container
    container.appendChild(loadingOverlay);
  }
}

function hideLoadingState() {
  const loadingOverlay = document.querySelector(".loading-overlay");
  if (loadingOverlay) {
    loadingOverlay.remove();
  }
}

function showAuthForms() {
  const authForms = document.getElementById("authForms");
  const userDashboard = document.getElementById("userDashboard");

  // Hide loading state first
  hideLoadingState();

  if (authForms && userDashboard) {
    authForms.style.display = "block";
    userDashboard.style.display = "none";
    showAuthForm("login");
  }
}

// Old waitForSupabaseReady function removed - replaced with waitForSupabaseReadyWithTimeout

function updateStatus(status, text) {
  // Status bar removed - just log for debugging
  console.log(`Status: ${status} - ${text}`);
}

function showError(message) {
  showNotification(message, "error");
}

function showSuccess(message) {
  showNotification(message, "success");
}

function showNotification(message, type = "info") {
  // Remove existing notifications
  const existingNotification = document.querySelector(".message");
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.className = `message ${type}`;
  notification.textContent = message;

  // Add to popup
  document.body.appendChild(notification);

  // Auto remove after delay
  const delay = type === "error" ? 5000 : 3000;
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, delay);
}

// Create internal confirmation dialog
function showConfirmDialog(
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger"
) {
  return new Promise((resolve) => {
    // Remove any existing confirmation dialogs
    const existingDialog = document.querySelector(".confirmation-dialog");
    if (existingDialog) {
      existingDialog.remove();
    }

    // Create dialog
    const dialog = document.createElement("div");
    dialog.className = "confirmation-dialog";
    dialog.innerHTML = `
      <div class="confirmation-backdrop"></div>
      <div class="confirmation-content">
        <div class="confirmation-header">
          <h3 class="confirmation-title">${title}</h3>
        </div>
        <div class="confirmation-body">
          <p class="confirmation-message">${message}</p>
        </div>
        <div class="confirmation-actions">
          <button class="btn secondary confirmation-cancel">${cancelText}</button>
          <button class="btn ${type} confirmation-confirm">${confirmText}</button>
        </div>
      </div>
    `;

    // Add styles if not already present
    if (!document.getElementById("confirmation-dialog-styles")) {
      const styles = document.createElement("style");
      styles.id = "confirmation-dialog-styles";
      styles.textContent = `
        .confirmation-dialog {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .confirmation-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
        }

        .confirmation-content {
          position: relative;
          background: var(--bg-primary, #ffffff);
          border-radius: 12px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: confirmationSlideIn 0.2s ease-out;
        }

        @keyframes confirmationSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .confirmation-header {
          padding: 24px 24px 16px 24px;
        }

        .confirmation-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary, #1a1a1a);
        }

        .confirmation-body {
          padding: 0 24px 24px 24px;
        }

        .confirmation-message {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: var(--text-secondary, #6b7280);
        }

        .confirmation-actions {
          padding: 16px 24px 24px 24px;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .confirmation-actions .btn {
          min-width: 80px;
        }

        .btn.danger {
          background: #dc2626;
          color: white;
          border: 1px solid #dc2626;
        }

        .btn.danger:hover {
          background: #b91c1c;
          border-color: #b91c1c;
        }
      `;
      document.head.appendChild(styles);
    }

    // Add event listeners
    const confirmBtn = dialog.querySelector(".confirmation-confirm");
    const cancelBtn = dialog.querySelector(".confirmation-cancel");
    const backdrop = dialog.querySelector(".confirmation-backdrop");

    const handleConfirm = () => {
      dialog.remove();
      resolve(true);
    };

    const handleCancel = () => {
      dialog.remove();
      resolve(false);
    };

    confirmBtn.addEventListener("click", handleConfirm);
    cancelBtn.addEventListener("click", handleCancel);
    backdrop.addEventListener("click", handleCancel);

    // Handle Escape key
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", handleEscape);
        handleCancel();
      }
    };
    document.addEventListener("keydown", handleEscape);

    // Add to DOM
    document.body.appendChild(dialog);

    // Focus the confirm button for accessibility
    setTimeout(() => confirmBtn.focus(), 100);
  });
}

function openSettings() {
  console.log("Opening settings...");

  // Create settings modal or redirect to options page
  showSettingsModal();
}

function showSettingsModal() {
  // Create settings modal
  const modal = document.createElement("div");
  modal.className = "settings-modal";
  modal.innerHTML = `
        <div class="settings-content">
            <div class="settings-header">
                <h3>Extension Settings</h3>
                <button class="close-btn" id="closeSettings">×</button>
            </div>
            <div class="settings-body">
                <div class="setting-item">
                    <label for="supabaseUrl">Supabase URL:</label>
                    <input type="text" id="supabaseUrl" placeholder="https://your-project.supabase.co">
                </div>
                <div class="setting-item">
                    <label for="supabaseKey">Supabase Anon Key:</label>
                    <input type="password" id="supabaseKey" placeholder="Your anon key">
                </div>
                <div class="setting-item">
                    <button id="saveSettings" class="btn primary">Save Settings</button>
                </div>
            </div>
        </div>
    `;

  // Add modal styles
  const modalStyles = `
        .settings-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .settings-content {
            background: white;
            border-radius: 8px;
            width: 90%;
            max-width: 400px;
            max-height: 80%;
            overflow-y: auto;
        }
        
        .settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .settings-header h3 {
            margin: 0;
            font-size: 18px;
        }
        
        .close-btn {
            background: transparent;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: white;
            position: absolute;
            top: 8px;
            right: 8px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }

        .close-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
        }
        
        .settings-body {
            padding: 16px;
        }
        
        .setting-item {
            margin-bottom: 16px;
        }
        
        .setting-item label {
            display: block;
            margin-bottom: 4px;
            font-weight: 500;
            font-size: 13px;
        }
        
        .setting-item input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            font-size: 13px;
        }
    `;

  // Add styles
  const styleSheet = document.createElement("style");
  styleSheet.textContent = modalStyles;
  document.head.appendChild(styleSheet);

  // Add event listeners
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  modal.querySelector("#closeSettings").addEventListener("click", () => {
    modal.remove();
  });

  modal.querySelector("#saveSettings").addEventListener("click", () => {
    // TODO: Implement settings save functionality
    showNotification("Settings saved! (Feature coming soon)", "info");
    modal.remove();
  });

  // Add to page
  document.body.appendChild(modal);
}

async function handleTestWebApp() {
  console.log("Testing token validation and metadata update...");

  const customMessageInput = document.getElementById("customMessage");
  const customMessage = customMessageInput
    ? customMessageInput.value.trim()
    : "";

  console.log("Custom message:", customMessage || "(none provided)");

  try {
    const response = await chrome.runtime.sendMessage({
      action: "testWebAppAPI",
      customMessage: customMessage,
    });

    if (response.success) {
      if (response.tokenValid) {
        const messageInfo = customMessage
          ? ` Custom message: "${customMessage}"`
          : " (no custom message)";
        showSuccess(
          "✅ Token validation & metadata update successful!" + messageInfo
        );
        console.log("Token validation response:", response.webAppResponse);

        // Clear the input after successful update
        if (customMessageInput) {
          customMessageInput.value = "";
        }
      } else {
        showError(
          "❌ Token validation failed: " +
            (response.webAppResponse?.error || "Unknown error")
        );
        console.log("Token validation failure:", response.webAppResponse);
      }
    } else {
      showError("Test request failed: " + response.error);
      console.error("Test request error:", response);
    }
  } catch (error) {
    showError("Error testing token validation: " + error.message);
    console.error("Token validation test error:", error);
  }
}

function openHelp() {
  console.log("Opening help...");
  window.open("https://github.com/your-repo/drippler-extension", "_blank");
}

// Authentication event listeners
function setupAuthEventListeners() {
  // Tab switching
  document
    .getElementById("loginTab")
    .addEventListener("click", () => showAuthForm("login"));
  document
    .getElementById("signupTab")
    .addEventListener("click", () => showAuthForm("signup"));

  // Form submissions
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document
    .getElementById("signupForm")
    .addEventListener("submit", handleSignup);
  document
    .getElementById("resetForm")
    .addEventListener("submit", handlePasswordReset);
  document
    .getElementById("updatePasswordForm")
    .addEventListener("submit", handleUpdatePassword);

  // Navigation buttons
  document
    .getElementById("forgotPasswordBtn")
    .addEventListener("click", () => showAuthForm("reset"));
  document
    .getElementById("backToLoginBtn")
    .addEventListener("click", () => showAuthForm("login"));
  // Profile image input removed - using avatar system now

  // Avatar management listeners
  document
    .getElementById("addAvatarBtn")
    ?.addEventListener("click", handleAddAvatarClick);
  document
    .getElementById("avatarFileInput")
    ?.addEventListener("change", handleAvatarFileUpload);

  // Clothing management listeners
  document
    .getElementById("addClothingBtn")
    .addEventListener("click", handleAddClothingClick);
  document
    .getElementById("clothingImageInput")
    .addEventListener("change", handleClothingImageUpload);

  // Tab navigation listeners
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // Handle clicks on both button and icon elements
      const target = e.target.closest(".tab-btn");
      const tabName = target.dataset.tab;
      switchTab(tabName);
    });
  });

  // Try-ons management listeners
  document
    .getElementById("refreshTryOnsBtn")
    ?.addEventListener("click", loadTryOnGenerations);

  // Profile modal event listener is now set up in updateAuthState() when dashboard is shown

  // Profile modal listeners
  document
    .getElementById("closeProfileModal")
    ?.addEventListener("click", closeProfileModal);
  document
    .getElementById("modalDeleteAccountBtn")
    ?.addEventListener("click", handleDeleteAccount);
  document
    .getElementById("modalSignOutBtn")
    ?.addEventListener("click", handleSignOut);
  document
    .getElementById("upgradeBtn")
    ?.addEventListener("click", handleUpgradeToPro);
  document
    .getElementById("cancelSubscriptionBtn")
    ?.addEventListener("click", handleCancelSubscription);

  // Settings listeners
  document
    .getElementById("addToDripplerToggle")
    ?.addEventListener("change", handleAddToDripplerToggle);

  // Profile modal backdrop click to close
  document.getElementById("profileModal")?.addEventListener("click", (e) => {
    if (e.target.id === "profileModal") {
      closeProfileModal();
    }
  });

  // Event delegation for empty state action buttons
  document.addEventListener("click", (e) => {
    const button = e.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    if (action === "add-avatar") {
      document.getElementById("avatarFileInput").click();
    } else if (action === "add-clothing") {
      document.getElementById("clothingImageInput").click();
    }
  });
}

function showAuthForm(formType) {
  // Hide all forms
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("signupForm").style.display = "none";
  document.getElementById("resetForm").style.display = "none";
  document.getElementById("updatePasswordForm").style.display = "none";

  // Remove active class from tabs
  document.getElementById("loginTab").classList.remove("active");
  document.getElementById("signupTab").classList.remove("active");

  // Show selected form and update tabs
  switch (formType) {
    case "login":
      document.getElementById("loginForm").style.display = "block";
      document.getElementById("loginTab").classList.add("active");
      break;
    case "signup":
      document.getElementById("signupForm").style.display = "block";
      document.getElementById("signupTab").classList.add("active");
      break;
    case "reset":
      document.getElementById("resetForm").style.display = "block";
      break;
    case "updatePassword":
      document.getElementById("updatePasswordForm").style.display = "block";
      break;
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const submitBtn = event.target.querySelector('button[type="submit"]');

  if (!email || !password) {
    showError("Please fill in all fields");
    return;
  }

  setButtonLoading(submitBtn, true);

  try {
    const response = await supabaseCall("signIn", { data: { email, password } });

    if (response.success) {
      showSuccess("Successfully signed in!");
      currentUser = response.user;
      isAuthenticated = true;
      updateAuthState();
      clearForms();
    } else {
      showError(response.error || "Sign in failed");
    }
  } catch (error) {
    showError("Error signing in: " + error.message);
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

async function handleSignup(event) {
  event.preventDefault();

  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const submitBtn = event.target.querySelector('button[type="submit"]');

  if (!email || !password || !confirmPassword) {
    showError("Please fill in all fields");
    return;
  }

  if (password !== confirmPassword) {
    showError("Passwords do not match");
    return;
  }

  if (password.length < 6) {
    showError("Password must be at least 6 characters long");
    return;
  }

  setButtonLoading(submitBtn, true);

  try {
    const response = await supabaseCall("signUp", { data: { email, password } });

    if (response.success) {
      showSuccess(
        response.message ||
          "Account created! Check your email for verification."
      );
      clearForms();
      showAuthForm("login");
    } else {
      showError(response.error || "Sign up failed");
    }
  } catch (error) {
    showError("Error creating account: " + error.message);
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

async function handlePasswordReset(event) {
  event.preventDefault();

  const email = document.getElementById("resetEmail").value;
  const submitBtn = event.target.querySelector('button[type="submit"]');

  if (!email) {
    showError("Please enter your email address");
    return;
  }

  setButtonLoading(submitBtn, true);

  try {
    const response = await supabaseCall("resetPassword", {
      data: { email },
    });

    if (response.success) {
      showSuccess(response.message || "Password reset email sent!");
      document.getElementById("resetEmail").value = "";
      showAuthForm("login");
    } else {
      showError(response.error || "Failed to send reset email");
    }
  } catch (error) {
    showError("Error sending reset email: " + error.message);
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

async function handleUpdatePassword(event) {
  event.preventDefault();

  const newPassword = document.getElementById("newPassword").value;
  const confirmNewPassword =
    document.getElementById("confirmNewPassword").value;
  const submitBtn = event.target.querySelector('button[type="submit"]');

  if (!newPassword || !confirmNewPassword) {
    showError("Please fill in all fields");
    return;
  }

  if (newPassword !== confirmNewPassword) {
    showError("Passwords do not match");
    return;
  }

  if (newPassword.length < 6) {
    showError("Password must be at least 6 characters long");
    return;
  }

  setButtonLoading(submitBtn, true);

  try {
    const response = await supabaseCall("updatePassword", {
      data: { password: newPassword },
    });

    if (response.success) {
      showSuccess("Password updated successfully!");
      clearForms();
      updateAuthState();
    } else {
      showError(response.error || "Failed to update password");
    }
  } catch (error) {
    showError("Error updating password: " + error.message);
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

async function handleSignOut() {
  try {
    const response = await supabaseCall("signOut");

    if (response.success) {
      showSuccess("Successfully signed out!");
      currentUser = null;
      isAuthenticated = false;

      // Close profile modal before updating auth state
      closeProfileModal();

      updateAuthState();
      clearForms();
    } else {
      showError(response.error || "Sign out failed");
    }
  } catch (error) {
    showError("Error signing out: " + error.message);
  }
}

async function checkCurrentUser() {
  try {
    updateStatus("checking", "Checking authentication...");

    // First try to refresh the session (this handles post-verification scenarios)
    const refreshResponse = await Promise.race([
      chrome.runtime.sendMessage({ action: "refreshUserSession" }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Refresh timeout")), 3000)
      )
    ]);

    // Use the refresh response if successful, otherwise fallback to getCurrentUser
    let response = refreshResponse;
    if (!refreshResponse || !refreshResponse.success || !refreshResponse.user) {
      response = await Promise.race([
        chrome.runtime.sendMessage({ action: "getCurrentUser" }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Get user timeout")), 3000)
        )
      ]);
    }

    if (response.success && response.user) {
      currentUser = response.user;
      isAuthenticated = true;

      console.log("User authenticated:", response.user.email);

      // Show session info if available
      if (response.session && response.session.expires_at) {
        const expiryDate = new Date(response.session.expires_at * 1000);
        const timeUntilExpiry = expiryDate.getTime() - Date.now();
        const hoursUntilExpiry = Math.round(timeUntilExpiry / (1000 * 60 * 60));

        console.log(`Session expires in ${hoursUntilExpiry} hours`);

        if (hoursUntilExpiry > 24) {
          updateStatus("authenticated", "Authenticated (session valid)");
        } else if (hoursUntilExpiry > 1) {
          updateStatus(
            "authenticated",
            `Authenticated (${hoursUntilExpiry}h remaining)`
          );
        } else {
          updateStatus("authenticated", "Authenticated (auto-refreshing)");
        }
      } else {
        updateStatus("authenticated", "Authenticated");
      }

      updateAuthState();
    } else {
      console.log("No valid user session found");
      currentUser = null;
      isAuthenticated = false;
      updateStatus("ready", "Ready for authentication");
      updateAuthState();
    }
  } catch (error) {
    console.error("Error checking current user:", error);
    currentUser = null;
    isAuthenticated = false;
    updateStatus("error", "Authentication check failed");
    updateAuthState();
  }
}

function updateAuthState() {
  const container = document.querySelector(".container");
  const authForms = document.getElementById("authForms");
  const userDashboard = document.getElementById("userDashboard");
  const dashboardHeader = document.getElementById("dashboardHeader");
  const actionsSection = document.querySelector(".actions-section");

  // Hide loading state when showing final UI
  hideLoadingState();

  if (isAuthenticated && currentUser) {
    // Show user dashboard and hide auth forms
    container.classList.add("authenticated");
    container.classList.remove("unauthenticated");
    authForms.style.display = "none";
    userDashboard.style.display = "block";
    dashboardHeader.style.display = "flex";

    // Setup profile modal event listener when dashboard is shown
    setupProfileModalListener();

    // Hide metadata test section (removed from new design)
    if (actionsSection) {
      actionsSection.style.display = "none";
    }

    // Show header user avatar
    const headerUser = document.getElementById("headerUser");
    if (headerUser) {
      headerUser.style.display = "flex";
    }

    // Update header and modal user info
    updateHeaderUserInfo();
    updateModalUserInfo();

    // Load wardrobe items
    loadClothingItems();

    // Load avatars
    loadAvatars();
  } else {
    // Show auth forms and hide user dashboard
    container.classList.add("unauthenticated");
    container.classList.remove("authenticated");
    authForms.style.display = "block";
    userDashboard.style.display = "none";
    dashboardHeader.style.display = "none";

    // Hide metadata test section
    if (actionsSection) {
      actionsSection.style.display = "none";
    }

    // Hide header user avatar
    const headerUser = document.getElementById("headerUser");
    if (headerUser) {
      headerUser.style.display = "none";
    }

    showAuthForm("login");
  }
}

// Profile image functions removed - using avatar system now

// Clothing management functions
function handleAddClothingClick() {
  document.getElementById("clothingImageInput").click();
}

function updateClothingButtonState(state) {
  const addClothingBtn = document.getElementById("addClothingBtn");
  if (!addClothingBtn) return;

  switch (state) {
    case "loading":
      addClothingBtn.innerHTML = `
        ${createIconHTML(
          IconNames.SPINNER,
          16,
          IconWeights.REGULAR,
          "currentColor",
          "spinning"
        )}
        Uploading...
      `;
      addClothingBtn.disabled = true;
      addClothingBtn.classList.add("loading");
      break;
    case "success":
      addClothingBtn.innerHTML = `
        ${createIconHTML(
          IconNames.CHECK,
          16,
          IconWeights.REGULAR,
          "currentColor"
        )}
        Success!
      `;
      addClothingBtn.disabled = true;
      addClothingBtn.classList.add("success");
      break;
    case "default":
    default:
      addClothingBtn.innerHTML = `
        ${createIconHTML(
          IconNames.PLUS,
          16,
          IconWeights.REGULAR,
          "currentColor"
        )}
        Add Item
      `;
      addClothingBtn.disabled = false;
      addClothingBtn.classList.remove("loading", "success");
      break;
  }
}

async function handleClothingImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  console.log("Clothing image file selected:", {
    name: file.name,
    type: file.type,
    size: file.size,
  });

  // Validate file type and size
  if (!isValidImageFile(file)) {
    showUnsupportedFileModal();
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    // 10MB limit for clothing items
    showError("Image size must be less than 10MB");
    return;
  }

  showClothingUploadModal(file);
}

function showClothingUploadModal(file) {
  // Create modal
  const modal = document.createElement("div");
  modal.className = "clothing-upload-modal";

  // Create preview URL
  const previewUrl = URL.createObjectURL(file);

  modal.innerHTML = `
    <div class="clothing-upload-content">
      <div class="clothing-upload-header">
        <button class="close-btn" id="closeClothingModal">×</button>
      </div>
      <div class="clothing-upload-body">
        <img src="${previewUrl}" class="image-preview" alt="Preview" />
      </div>
        <div class="clothing-form-actions">
          <button class="btn primary" id="confirmClothingUpload">
            <i class="ph ph-plus" style="font-size: 16px; margin-right: 8px;"></i>
            Add to Wardrobe
          </button>
        </div>
    </div>
  `;

  // Add event listeners
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      URL.revokeObjectURL(previewUrl);
      modal.remove();
    }
  });

  modal.querySelector("#closeClothingModal").addEventListener("click", () => {
    URL.revokeObjectURL(previewUrl);
    modal.remove();
  });

  modal
    .querySelector("#confirmClothingUpload")
    .addEventListener("click", async () => {
      // Generate a default name based on file name or timestamp
      const name =
        file.name.replace(/\.[^/.]+$/, "") || `Clothing Item ${Date.now()}`;

      try {
        // Update main button state to loading
        updateClothingButtonState("loading");

        // Update modal button state
        const confirmBtn = modal.querySelector("#confirmClothingUpload");
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = `
          <i class="ph ph-spinner" style="font-size: 16px; margin-right: 8px; animation: spin 1s linear infinite"></i>
          Adding to Wardrobe...
        `;

        // Convert file to base64 for safer transmission
        console.log("Converting clothing file to base64...");
        const base64Data = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64 = reader.result.split(",")[1];
            resolve(base64);
          };
          reader.readAsDataURL(file);
        });

        const response = await supabaseCall("uploadClothingItem", {
          data: {
            fileData: base64Data,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            encoding: "base64",
            name,
            category: "uncategorized", // Default category
            tags: [], // Empty tags array
          },
        });

        if (response.success) {
          // Update modal button to success
          confirmBtn.innerHTML = `
            <i class="ph ph-check" style="font-size: 16px; margin-right: 8px;"></i>
            Added!
          `;

          // Update main button to success
          updateClothingButtonState("success");

          showSuccess("Clothing item added to wardrobe!");

          // Close modal after a short delay
          setTimeout(() => {
            URL.revokeObjectURL(previewUrl);
            modal.remove();

            // Reset main button after modal closes
            setTimeout(() => {
              updateClothingButtonState("default");
            }, 1000);
          }, 1500);

          // Refresh the wardrobe display
          loadClothingItems();
        } else {
          throw new Error(response.error || "Failed to add clothing item");
        }
      } catch (error) {
        console.error("Error adding clothing item:", error);
        showError("Error adding clothing item: " + error.message);

        // Reset both buttons to default state on error
        updateClothingButtonState("default");
        const confirmBtn = modal.querySelector("#confirmClothingUpload");
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `
          <i class="ph ph-plus" style="font-size: 16px; margin-right: 8px;"></i>
          Add to Wardrobe
        `;
      }
    });

  // Add to page
  document.body.appendChild(modal);
}

async function loadClothingItems() {
  const clothingGrid = document.getElementById("clothingGrid");

  try {
    clothingGrid.innerHTML = `
      <div class="loading-state">
        ${createIconHTML(
          IconNames.SPINNER,
          20,
          IconWeights.REGULAR,
          "var(--accent-primary)",
          "spinning"
        )}
        <span>Loading wardrobe...</span>
      </div>
    `;

    const response = await supabaseCall("getClothingItems");

    if (response.success) {
      displayClothingItems(response.data);
    } else {
      clothingGrid.innerHTML = `
        <div class="loading-state error-message">
          ${createIconHTML(IconNames.ERROR, 20, IconWeights.REGULAR, "#ef4444")}
          <span>Failed to load wardrobe</span>
        </div>
      `;
      console.error("Failed to load clothing items:", response.error);
    }
  } catch (error) {
    console.error("Error loading clothing items:", error);
    clothingGrid.innerHTML = `
      <div class="loading-state error-message">
        ${createIconHTML(IconNames.ERROR, 20, IconWeights.REGULAR, "#ef4444")}
        <span>Error loading wardrobe</span>
      </div>
    `;
  }
}

function displayClothingItems(items) {
  const clothingGrid = document.getElementById("clothingGrid");
  const contentArea = clothingGrid.closest(".content-area");

  if (!items || items.length === 0) {
    // Add classes for empty state styling
    clothingGrid.classList.add("empty-grid");
    contentArea.classList.add("empty-content");

    clothingGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,2L13.5,6H19L15.5,9L17,13L12,10L7,13L8.5,9L5,6H10.5L12,2M12,7.5L11,10L12,9L13,10L12,7.5Z"/>
          </svg>
        </div>
        <h3>Build Your Wardrobe</h3>
        <p>Add clothing items to your collection. Save items from the web or upload photos of your own clothes to try them on virtually.</p>
        <div class="empty-action">
          <button class="btn primary" data-action="add-clothing">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
            </svg>
            Add First Item
          </button>
        </div>
        <div class="empty-tip">
          <p><strong>Tip:</strong> Right-click on clothing images while browsing the web to add them instantly!</p>
        </div>
      </div>
    `;
    return;
  }

  // Remove empty state classes when showing items
  clothingGrid.classList.remove("empty-grid");
  contentArea.classList.remove("empty-content");

  clothingGrid.innerHTML = items
    .map(
      (item) => `
    <div class="clothing-item" data-item-id="${item.id}">
      <img src="${item.image_url}" alt="${
        item.name
      }" loading="lazy" class="clothing-image" />
      ${
        item.source_url
          ? `
        <button class="clothing-source-link" data-action="source-link" data-source-url="${item.source_url}" title="View Original Source">
          <i class="ph ph-link" style="font-size: 14px"></i>
        </button>
      `
          : ""
      }
      <div class="clothing-item-overlay">
        <button class="clothing-action-btn try-on" data-action="try-on" data-item-id="${
          item.id
        }" title="Try On">
          <i class="ph ph-magic-wand" style="font-size: 14px; margin-right: 6px"></i>
          Try On
        </button>
        <button class="clothing-action-btn delete" data-action="delete" data-item-id="${
          item.id
        }" title="Delete">
          <i class="ph ph-minus" style="font-size: 14px"></i>
        </button>
      </div>
    </div>
  `
    )
    .join("");

  // Remove any existing event listeners and add new one
  clothingGrid.removeEventListener("click", handleClothingGridClick);
  clothingGrid.addEventListener("click", handleClothingGridClick);
}

function handleClothingGridClick(event) {
  const button = event.target.closest(
    ".clothing-action-btn, .clothing-source-link"
  );
  if (!button) return;

  const action = button.dataset.action;
  const itemId = button.dataset.itemId;
  const sourceUrl = button.dataset.sourceUrl;

  console.log("Button clicked:", { action, itemId, sourceUrl, button });

  if (action === "try-on") {
    tryOnClothingItem(itemId);
  } else if (action === "delete") {
    deleteClothingItem(itemId);
  } else if (action === "source-link" && sourceUrl) {
    openSourceLink(sourceUrl);
  }
}

function openSourceLink(sourceUrl) {
  try {
    // Open the source URL in a new tab
    window.open(sourceUrl, "_blank");
  } catch (error) {
    console.error("Error opening source link:", error);
    showError("Failed to open source link");
  }
}

async function deleteClothingItem(itemId) {
  // Get the delete button and show loading state
  const deleteButton = document.querySelector(
    `[data-item-id="${itemId}"][data-action="delete"]`
  );
  if (deleteButton) {
    deleteButton.disabled = true;
    deleteButton.innerHTML = `
      <i class="ph ph-spinner spinning" style="font-size: 14px;"></i>
    `;
  }

  try {
    const response = await supabaseCall("deleteClothingItem", {
      data: { itemId },
    });

    if (response.success) {
      showSuccess("Clothing item deleted successfully!");
      loadClothingItems(); // Refresh the display
    } else {
      showError(response.error || "Failed to delete clothing item");
      // Reset button on error
      if (deleteButton) {
        deleteButton.disabled = false;
        deleteButton.innerHTML = `
          <i class="ph ph-minus" style="font-size: 14px;"></i>
        `;
      }
    }
  } catch (error) {
    console.error("Error deleting clothing item:", error);
    showError("Error deleting clothing item: " + error.message);
    // Reset button on error
    if (deleteButton) {
      deleteButton.disabled = false;
      deleteButton.innerHTML = `
        <i class="ph ph-minus" style="font-size: 14px;"></i>
      `;
    }
  }
}

async function tryOnClothingItem(itemId) {
  try {
    console.log("Trying on clothing item:", itemId);

    // Get the specific generate button and show loading state
    const generateButton = document.querySelector(
      `[data-item-id="${itemId}"][data-action="try-on"]`
    );
    if (generateButton) {
      generateButton.disabled = true;
      generateButton.innerHTML = `
        <i class="ph ph-spinner" style="font-size: 14px; margin-right: 6px; animation: spin 1s linear infinite"></i>
        Generating...
      `;
    }

    // Get the clothing item details
    const clothingResponse = await supabaseCall("getClothingItems");

    if (!clothingResponse.success) {
      showError("Failed to load clothing item");
      resetGenerateButton(itemId);
      return;
    }

    const clothingItem = clothingResponse.data.find(
      (item) => item.id === itemId
    );
    if (!clothingItem) {
      showError("Clothing item not found");
      resetGenerateButton(itemId);
      return;
    }

    // Get active avatar
    const avatarResponse = await supabaseCall("getActiveAvatar");

    if (!avatarResponse.success || !avatarResponse.avatar?.image_url) {
      showError(
        "Please upload and select an avatar first to use virtual try-on!"
      );
      resetGenerateButton(itemId);
      return;
    }

    // Show loading state
    updateStatus("generating", "Generating virtual try-on...");
    showGlobalGenerationOverlay();

    // Request virtual try-on generation from background script
    const tryOnResponse = await supabaseCall("generateVirtualTryOn", {
      data: {
        userImageUrl: avatarResponse.avatar.image_url,
        clothingImageUrl: clothingItem.image_url,
        clothingName: clothingItem.name,
      },
    });

    if (tryOnResponse.success) {
      showSuccess("Virtual try-on generated successfully!");

      // Show the result in a modal
      showTryOnResult(tryOnResponse.data);

      updateStatus("authenticated", "Authenticated");
    } else {
      if (tryOnResponse.error === "Generation limit exceeded") {
        showError(
          `${tryOnResponse.message}\nRemaining: ${
            tryOnResponse.remainingGenerations || 0
          }/${tryOnResponse.maxGenerations || 15}`
        );
      } else {
        showError(tryOnResponse.error || "Failed to generate virtual try-on");
      }
      updateStatus("authenticated", "Authenticated");
    }
  } catch (error) {
    console.error("Error with virtual try-on:", error);
    showError("Error generating virtual try-on: " + error.message);
    updateStatus("authenticated", "Authenticated");
  } finally {
    // Always reset the button state and hide global overlay
    resetGenerateButton(itemId);
    hideGlobalGenerationOverlay();
  }
}

function resetGenerateButton(itemId) {
  const generateButton = document.querySelector(
    `[data-item-id="${itemId}"][data-action="try-on"]`
  );
  if (generateButton) {
    generateButton.disabled = false;
    generateButton.innerHTML = `
      <i class="ph ph-magic-wand" style="font-size: 14px; margin-right: 6px"></i>
      Try On
    `;
  }
}

function showTryOnResult(resultData) {
  // Create modal for showing try-on result
  const modal = document.createElement("div");
  modal.className = "try-on-result-modal";

  modal.innerHTML = `
    <div class="try-on-view-content">
      <div class="try-on-view-header">
        <button class="close-btn" id="closeTryOnResult">×</button>
      </div>
      <div class="try-on-view-body">
        <img src="${resultData.generatedImageUrl}" alt="Virtual Try-On Result" class="try-on-view-image" />
      </div>
      <div class="try-on-view-actions">
        <button class="btn secondary" id="downloadTryOnResult">
          <i class="ph ph-download" style="font-size: 16px; margin-right: 8px"></i>
          Download
        </button>
        <button class="btn primary" id="addAsAvatarBtn">
          <i class="ph ph-user-check" style="font-size: 16px; margin-right: 8px"></i>
          Add to Avatars
        </button>
      </div>
    </div>
  `;

  // Add event listeners
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  modal.querySelector("#closeTryOnResult").addEventListener("click", () => {
    modal.remove();
  });

  modal.querySelector("#addAsAvatarBtn").addEventListener("click", async () => {
    const button = modal.querySelector("#addAsAvatarBtn");
    await addImageAsAvatar(resultData.generatedImageUrl, button);
    // Close modal after successful addition (timeout allows user to see success state)
    setTimeout(() => {
      modal.remove();
    }, 2500);
  });

  modal.querySelector("#downloadTryOnResult").addEventListener("click", () => {
    // Create download link
    const link = document.createElement("a");
    link.href = resultData.generatedImageUrl;
    link.download = `virtual-try-on-${Date.now()}.jpg`;
    link.click();
  });

  // Add click listener to image to open in new tab
  modal.querySelector(".try-on-view-image").addEventListener("click", () => {
    window.open(resultData.generatedImageUrl, "_blank");
  });

  document.body.appendChild(modal);
}

// Avatar management functions
function handleAddAvatarClick() {
  document.getElementById("avatarFileInput").click();
}

function updateAvatarButtonState(state) {
  const addAvatarBtn = document.getElementById("addAvatarBtn");
  if (!addAvatarBtn) return;

  switch (state) {
    case "loading":
      addAvatarBtn.innerHTML = `
        ${createIconHTML(
          IconNames.SPINNER,
          16,
          IconWeights.REGULAR,
          "currentColor",
          "spinning"
        )}
        Uploading...
      `;
      addAvatarBtn.disabled = true;
      addAvatarBtn.classList.add("loading");
      break;
    case "success":
      addAvatarBtn.innerHTML = `
        ${createIconHTML(
          IconNames.CHECK,
          16,
          IconWeights.REGULAR,
          "currentColor"
        )}
        Success!
      `;
      addAvatarBtn.disabled = true;
      addAvatarBtn.classList.add("success");
      break;
    case "default":
    default:
      addAvatarBtn.innerHTML = `
        ${createIconHTML(
          IconNames.PLUS,
          16,
          IconWeights.REGULAR,
          "currentColor"
        )}
        Add Avatar
      `;
      addAvatarBtn.disabled = false;
      addAvatarBtn.classList.remove("loading", "success");
      break;
  }
}

async function handleAvatarFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!isValidImageFile(file)) {
    showUnsupportedFileModal();
    return;
  }

  if (file.size > 10 * 1024 * 1024) { // 10MB limit for avatars
    showError("Image size must be less than 10MB");
    return;
  }

  try {
    updateAvatarButtonState("loading");
    updateStatus("uploading", "Uploading avatar...");

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async function (e) {
      const base64Data = e.target.result;

      const response = await supabaseCall("uploadAvatar", {
        data: {
          fileData: base64Data,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          encoding: "base64",
        },
      });

      if (response.success) {
        updateAvatarButtonState("success");
        showSuccess("Avatar uploaded successfully!");
        loadAvatars();
        // Update header if this is the first avatar
        updateHeaderUserInfo();

        // Reset button after 2 seconds
        setTimeout(() => {
          updateAvatarButtonState("default");
        }, 2000);
      } else {
        throw new Error(response.error || "Upload failed");
      }
      updateStatus("authenticated", "Authenticated");
    };

    reader.readAsDataURL(file);
  } catch (error) {
    console.error("Error uploading avatar:", error);
    showError("Error uploading avatar: " + error.message);
    updateAvatarButtonState("default");
    updateStatus("authenticated", "Authenticated");
  }

  // Reset input
  event.target.value = "";
}

async function addImageAsAvatar(imageUrl, buttonElement = null) {
  try {
    // Update button state if provided
    if (buttonElement) {
      buttonElement.disabled = true;
      buttonElement.innerHTML = `
        <i class="ph ph-spinner spinning" style="font-size: 16px; margin-right: 8px;"></i>
        Adding...
      `;
    }

    // Use efficient addAvatarFromUrl action (no download/upload needed)
    const response = await supabaseCall("addAvatarFromUrl", {
      data: {
        imageUrl: imageUrl,
      },
    });

    if (response.success) {
      // Update button to success state
      if (buttonElement) {
        buttonElement.innerHTML = `
          <i class="ph ph-check" style="font-size: 16px; margin-right: 8px;"></i>
        Added!
        `;
      }

      showSuccess("Image added as avatar successfully!");
      loadAvatars();
      updateHeaderUserInfo();

      // Reset button after 2 seconds
      if (buttonElement) {
        setTimeout(() => {
          buttonElement.innerHTML = `
            <i class="ph ph-user-check" style="font-size: 16px; margin-right: 8px;"></i>
            Add to Avatars
          `;
          buttonElement.disabled = false;
        }, 2000);
      }
    } else {
      throw new Error(response.error || "Failed to add to avatars");
    }
  } catch (error) {
    console.error("Error adding image as avatar:", error);
    showError("Error adding as avatar: " + error.message);

    // Reset button to original state
    if (buttonElement) {
      buttonElement.innerHTML = `
        <i class="ph ph-user-check" style="font-size: 16px; margin-right: 8px;"></i>
        Add to Avatars
      `;
      buttonElement.disabled = false;
    }
  }
}

async function loadAvatars() {
  const avatarsGrid = document.getElementById("avatarsGrid");

  try {
    // Show loading state first
    avatarsGrid.innerHTML = `
      <div class="loading-state">
        ${createIconHTML(
          IconNames.SPINNER,
          20,
          IconWeights.REGULAR,
          "var(--accent-primary)",
          "spinning"
        )}
        <span>Loading avatars...</span>
      </div>
    `;

    const response = await supabaseCall("getAvatars");

    if (response.success) {
      displayAvatars(response.avatars);
    } else {
      const contentArea = avatarsGrid.closest(".content-area");
      const avatarSelectionSection = document.querySelector(
        ".avatar-selection-section"
      );

      // Add classes for empty state styling
      avatarsGrid.classList.add("empty-grid");
      contentArea.classList.add("empty-content");
      avatarSelectionSection.classList.add("empty-section");

      avatarsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M7.07,18.28C7.5,17.38 10.12,16.5 12,16.5C13.88,16.5 16.5,17.38 16.93,18.28C15.57,19.36 13.86,20 12,20C10.14,20 8.43,19.36 7.07,18.28M18.36,16.83C16.93,15.09 13.46,14.5 12,14.5C10.54,14.5 7.07,15.09 5.64,16.83C4.62,15.5 4,13.82 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,13.82 19.38,15.5 18.36,16.83M12,6C10.06,6 8.5,7.56 8.5,9.5C8.5,11.44 10.06,13 12,13C13.94,13 15.5,11.44 15.5,9.5C15.5,7.56 13.94,6 12,6M12,11A1.5,1.5 0 0,1 10.5,9.5A1.5,1.5 0 0,1 12,8A1.5,1.5 0 0,1 13.5,9.5A1.5,1.5 0 0,1 12,11Z"/>
            </svg>
          </div>
          <h3>Add Your First Avatar</h3>
          <p>Upload photos of yourself to use for virtual try-ons. Your active avatar will be used to generate realistic clothing previews.</p>
          <div class="empty-action">
            <button class="btn primary" data-action="add-avatar">
              <i class="ph ph-plus" style="font-size: 16px; margin-right: 6px"></i>
              Add Avatar
            </button>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading avatars:", error);
    const contentArea = avatarsGrid.closest(".content-area");
    const avatarSelectionSection = document.querySelector(
      ".avatar-selection-section"
    );

    // Add classes for empty state styling (error state)
    avatarsGrid.classList.add("empty-grid");
    contentArea.classList.add("empty-content");
    avatarSelectionSection.classList.add("empty-section");

    avatarsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/>
          </svg>
        </div>
        <h3>Error loading avatars</h3>
        <p>Please try refreshing the extension or check your connection.</p>
      </div>
    `;
  }
}

function displayAvatars(avatars) {
  const avatarsGrid = document.getElementById("avatarsGrid");
  const contentArea = avatarsGrid.closest(".content-area");
  const avatarSelectionSection = document.querySelector(
    ".avatar-selection-section"
  );

  if (avatars.length === 0) {
    // Add classes for empty state styling
    avatarsGrid.classList.add("empty-grid");
    contentArea.classList.add("empty-content");
    avatarSelectionSection.classList.add("empty-section");

    avatarsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M7.07,18.28C7.5,17.38 10.12,16.5 12,16.5C13.88,16.5 16.5,17.38 16.93,18.28C15.57,19.36 13.86,20 12,20C10.14,20 8.43,19.36 7.07,18.28M18.36,16.83C16.93,15.09 13.46,14.5 12,14.5C10.54,14.5 7.07,15.09 5.64,16.83C4.62,15.5 4,13.82 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,13.82 19.38,15.5 18.36,16.83M12,6C10.06,6 8.5,7.56 8.5,9.5C8.5,11.44 10.06,13 12,13C13.94,13 15.5,11.44 15.5,9.5C15.5,7.56 13.94,6 12,6M12,11A1.5,1.5 0 0,1 10.5,9.5A1.5,1.5 0 0,1 12,8A1.5,1.5 0 0,1 13.5,9.5A1.5,1.5 0 0,1 12,11Z"/>
          </svg>
        </div>
        <h3>Add Your First Avatar</h3>
        <p>Upload photos of yourself to use for virtual try-ons. Your active avatar will be used to generate realistic clothing previews.</p>
        <div class="empty-action">
          <button class="btn primary" data-action="add-avatar">
            <i class="ph ph-plus" style="font-size: 16px; margin-right: 6px"></i>
            Add Avatar
          </button>
        </div>
      </div>
    `;
    return;
  }

  // Remove empty state classes
  avatarsGrid.classList.remove("empty-grid");
  contentArea.classList.remove("empty-content");
  avatarSelectionSection.classList.remove("empty-section");

  // Find active avatar
  const activeAvatar = avatars.find((avatar) => avatar.is_active);
  const inactiveAvatars = avatars.filter((avatar) => !avatar.is_active);

  let gridHTML = "";

  // Add active avatar first (spans both columns)
  if (activeAvatar) {
    gridHTML += `
      <div class="avatar-item active-avatar" data-avatar-id="${activeAvatar.id}">
        <img src="${activeAvatar.image_url}" alt="Active Avatar" class="avatar-image" />
        <div class="avatar-badge">
          <i class="ph ph-user" style="font-size: 12px"></i>
          Active Avatar
        </div>
        <div class="avatar-overlay">
          <button class="avatar-action-btn delete" title="Delete Avatar" data-action="delete" data-avatar-id="${activeAvatar.id}">
            <i class="ph ph-minus" style="font-size: 14px"></i>
          </button>
        </div>
      </div>
    `;
  }

  // Add inactive avatars
  gridHTML += inactiveAvatars
    .map(
      (avatar, index) => `
    <div class="avatar-item" data-avatar-id="${avatar.id}">
      <img src="${avatar.image_url}" alt="Avatar ${
        index + 1
      }" class="avatar-image" />
      <div class="avatar-overlay">
        <button class="avatar-action-btn select" title="Set as Active" data-action="select" data-avatar-id="${
          avatar.id
        }">
          <i class="ph ph-user-check" style="font-size: 14px; margin-right: 6px"></i>
          Set Active
        </button>
        <button class="avatar-action-btn delete" title="Delete Avatar" data-action="delete" data-avatar-id="${
          avatar.id
        }">
          <i class="ph ph-minus" style="font-size: 14px"></i>
        </button>
      </div>
    </div>
  `
    )
    .join("");

  avatarsGrid.innerHTML = gridHTML;

  // Remove any existing event listeners and add new one
  avatarsGrid.removeEventListener("click", handleAvatarGridClick);
  avatarsGrid.addEventListener("click", handleAvatarGridClick);
}

async function handleAvatarGridClick(event) {
  // Find the closest button element (could be clicked on icon inside button)
  const button = event.target.closest(".avatar-action-btn");
  if (!button) return;

  const action = button.dataset.action;
  const avatarId = button.dataset.avatarId;

  if (!action || !avatarId) return;

  try {
    if (action === "select") {
      await setActiveAvatar(avatarId);
    } else if (action === "delete") {
      await deleteAvatar(avatarId);
    }
  } catch (error) {
    console.error("Error handling avatar action:", error);
    showError("Error: " + error.message);
  }
}

async function setActiveAvatar(avatarId) {
  try {
    const response = await supabaseCall("setActiveAvatar", {
      avatarId: avatarId,
    });

    if (response.success) {
      showSuccess("Avatar set as active!");
      loadAvatars();
      updateHeaderUserInfo();
    } else {
      throw new Error(response.error || "Failed to set active avatar");
    }
  } catch (error) {
    console.error("Error setting active avatar:", error);
    showError("Error setting active avatar: " + error.message);
  }
}

async function deleteAvatar(avatarId) {
  // Get the delete button and show loading state
  const deleteButton = document.querySelector(
    `[data-avatar-id="${avatarId}"][data-action="delete"]`
  );
  if (deleteButton) {
    deleteButton.disabled = true;
    deleteButton.innerHTML = `
      <i class="ph ph-spinner spinning" style="font-size: 14px;"></i>
    `;
  }

  try {
    const response = await supabaseCall("deleteAvatar", {
      avatarId: avatarId,
    });

    if (response.success) {
      showSuccess("Avatar deleted successfully!");
      loadAvatars();
      updateHeaderUserInfo();
    } else {
      throw new Error(response.error || "Failed to delete avatar");
    }
  } catch (error) {
    console.error("Error deleting avatar:", error);
    showError("Error deleting avatar: " + error.message);
    // Reset button on error
    if (deleteButton) {
      deleteButton.disabled = false;
      deleteButton.innerHTML = `
        <i class="ph ph-minus" style="font-size: 14px;"></i>
      `;
    }
  }
}

// Make functions available globally for onclick handlers
// Header and modal user info functions
function updateHeaderUserInfo() {
  const headerUserInitials = document.getElementById("headerUserInitials");
  const headerProfileImage = document.getElementById("headerProfileImage");

  if (currentUser) {
    const initials = (currentUser.email || "U").charAt(0).toUpperCase();
    headerUserInitials.textContent = initials;

    // Load active avatar in header
    loadActiveAvatarToElement(headerProfileImage, headerUserInitials);
  }
}

async function loadActiveAvatarToElement(imgElement, initialsElement) {
  try {
    const response = await supabaseCall("getActiveAvatar");

    if (
      response &&
      response.success &&
      response.avatar &&
      response.avatar.image_url
    ) {
      imgElement.src = response.avatar.image_url;
      imgElement.style.display = "block";
      initialsElement.style.display = "none";
    } else {
      // Show initials if no active avatar
      imgElement.style.display = "none";
      initialsElement.style.display = "flex";
    }
  } catch (error) {
    console.error("Error loading active avatar:", error);
    // Show initials on error
    imgElement.style.display = "none";
    initialsElement.style.display = "flex";
  }
}

function updateModalUserInfo() {
  const modalUserEmail = document.getElementById("modalUserEmail");

  if (currentUser) {
    modalUserEmail.textContent = currentUser.email || "Unknown";

    // Load generation stats and subscription status
    loadGenerationStats();
    updateSubscriptionUI();
    loadAddToDripplerSetting();
  }
}

async function loadGenerationStats() {
  try {
    const response = await supabaseCall("getTryOnGenerations");

    if (response && response.success) {
      const generationCount = response.data?.generationCount || 0;
      const generationLimit = response.data?.maxGenerations || 15;

      // Update display
      document.getElementById("generationCount").textContent = generationCount;
      document.getElementById("generationLimit").textContent = generationLimit;

      // Update progress bar
      const progressBar = document.getElementById("statsProgress");
      const percentage = (generationCount / generationLimit) * 100;
      progressBar.style.width = `${percentage}%`;

      // Update progress bar color based on usage
      progressBar.classList.remove("warning", "danger");
      if (percentage >= 90) {
        progressBar.classList.add("danger");
      } else if (percentage >= 70) {
        progressBar.classList.add("warning");
      }
    }
  } catch (error) {
    console.error("Error loading generation stats:", error);
    // Set defaults on error
    document.getElementById("generationCount").textContent = "0";
    document.getElementById("generationLimit").textContent = "15";
  }
}

// Old profile image function removed - using avatar system now

// Profile modal functions
function setupProfileModalListener() {
  const headerAvatar = document.getElementById("headerAvatar");
  console.log(
    "Setting up profile modal listener, header avatar element:",
    headerAvatar
  );
  if (headerAvatar) {
    // Remove any existing event listeners
    headerAvatar.replaceWith(headerAvatar.cloneNode(true));
    const newHeaderAvatar = document.getElementById("headerAvatar");

    newHeaderAvatar.addEventListener("click", () => {
      console.log("Profile avatar clicked!");
      openProfileModal();
    });
    console.log("Profile modal listener attached successfully");
  } else {
    console.error(
      "Header avatar element not found when setting up profile modal listener!"
    );
  }
}

function openProfileModal() {
  console.log("openProfileModal called");
  const profileModal = document.getElementById("profileModal");
  console.log("Profile modal element:", profileModal);
  if (profileModal) {
    updateModalUserInfo(); // Refresh modal data
    profileModal.style.display = "flex";
    console.log("Profile modal opened");
  } else {
    console.error("Profile modal element not found!");
  }
}

function closeProfileModal() {
  const profileModal = document.getElementById("profileModal");
  if (profileModal) {
    profileModal.style.display = "none";
  }
}

window.deleteClothingItem = deleteClothingItem;
window.tryOnClothingItem = tryOnClothingItem;
window.downloadTryOn = downloadTryOn;
window.deleteTryOn = deleteTryOn;
window.downloadImage = downloadImage;

// Tab management functions
function switchTab(tabName) {
  // Remove active class from all tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });

  // Add active class to selected tab
  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");
  document.getElementById(`${tabName}Tab`).classList.add("active");

  // Load content based on tab
  if (tabName === "tryons") {
    loadTryOnGenerations();
  } else if (tabName === "wardrobe") {
    loadClothingItems();
  } else if (tabName === "avatars") {
    loadAvatars();
  }
}

// Load virtual try-on generations
async function loadTryOnGenerations() {
  const tryonsGrid = document.getElementById("tryonsGrid");

  try {
    tryonsGrid.innerHTML = `
      <div class="loading-state">
        ${createIconHTML(
          IconNames.SPINNER,
          20,
          IconWeights.REGULAR,
          "var(--accent-primary)",
          "spinning"
        )}
        <span>Loading try-ons...</span>
      </div>
    `;

    const response = await supabaseCall("getTryOnGenerations");

    if (response.success) {
      displayTryOnGenerations(response.data.generations);
    } else {
      tryonsGrid.innerHTML = `
        <div class="loading-state error-message">
          ${createIconHTML(IconNames.ERROR, 20, IconWeights.REGULAR, "#ef4444")}
          <span>Failed to load try-ons</span>
        </div>
      `;
      console.error("Failed to load try-on generations:", response.error);
    }
  } catch (error) {
    console.error("Error loading try-on generations:", error);
    tryonsGrid.innerHTML = `
      <div class="loading-state error-message">
        ${createIconHTML(IconNames.ERROR, 20, IconWeights.REGULAR, "#ef4444")}
        <span>Error loading try-ons</span>
      </div>
    `;
  }
}

function displayTryOnGenerations(generations) {
  const tryonsGrid = document.getElementById("tryonsGrid");
  const contentArea = tryonsGrid.closest(".content-area");

  if (!generations || generations.length === 0) {
    // Add classes for empty state styling
    tryonsGrid.classList.add("empty-grid");
    contentArea.classList.add("empty-content");

    tryonsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M21,9V7L15,13.5C14.8,13.8 14.3,14 13.9,14H10.1C9.7,14 9.2,13.8 9,13.5L3,7V9C3,9.6 3.4,10 4,10H5L6.2,21.2C6.3,21.7 6.7,22 7.2,22H16.8C17.3,22 17.7,21.7 17.8,21.2L19,10H20C20.6,10 21,9.6 21,9Z"/>
          </svg>
        </div>
        <h3>Your Try-On Gallery</h3>
        <p>This is where your virtual try-on results will appear. Start by adding an avatar and some clothing items, then see how they look together!</p>
        <div class="empty-steps">
          <div class="step">
            <span class="step-number">1</span>
            <span>Add an avatar photo</span>
          </div>
          <div class="step">
            <span class="step-number">2</span>
            <span>Build your wardrobe</span>
          </div>
          <div class="step">
            <span class="step-number">3</span>
            <span>Try on clothes virtually</span>
          </div>
        </div>
      </div>
    `;
    return;
  }

  // Remove empty state classes when showing items
  tryonsGrid.classList.remove("empty-grid");
  contentArea.classList.remove("empty-content");

  tryonsGrid.innerHTML = generations
    .map(
      (generation) => `
    <div class="tryon-item" data-generation-id="${generation.id}">
      <img src="${generation.generated_image_url}" alt="Virtual Try-On" loading="lazy" class="tryon-image" />
      <div class="tryon-item-overlay">
        <button class="tryon-action-btn download" data-action="download" data-image-url="${generation.generated_image_url}" title="Download">
          <i class="ph ph-download" style="font-size: 14px; margin-right: 6px"></i>
          Download
        </button>
        <button class="tryon-action-btn delete" data-action="delete" data-item-id="${generation.id}" title="Delete">
          <i class="ph ph-minus" style="font-size: 14px"></i>
        </button>
      </div>
    </div>
  `
    )
    .join("");

  // Remove any existing event listeners to prevent duplicates
  tryonsGrid.removeEventListener("click", handleTryOnGridClick);
  // Add click listeners for viewing full size and button actions
  tryonsGrid.addEventListener("click", handleTryOnGridClick);
}

function handleTryOnGridClick(event) {
  const button = event.target.closest(".tryon-action-btn");

  if (button) {
    // Handle button clicks
    const action = button.dataset.action;
    const imageUrl = button.dataset.imageUrl;
    const itemId = button.dataset.itemId;

    console.log("Try-on button clicked:", { action, imageUrl, itemId, button });

    if (action === "download" && imageUrl) {
      downloadTryOn(imageUrl);
    } else if (action === "delete" && itemId) {
      deleteTryOn(itemId);
    }
    return;
  }

  // Handle image clicks for full-size view
  const tryonItem = event.target.closest(".tryon-item");
  if (tryonItem && !event.target.closest(".tryon-action-btn")) {
    const img = tryonItem.querySelector("img");
    if (img) {
      showFullSizeTryOn(img.src);
    }
  }
}

function showFullSizeTryOn(imageUrl) {
  const modal = document.createElement("div");
  modal.className = "try-on-view-modal";

  modal.innerHTML = `
    <div class="try-on-view-content">
      <div class="try-on-view-header">
        <button class="close-btn" id="closeTryOnView">×</button>
      </div>
      <div class="try-on-view-body">
        <img src="${imageUrl}" alt="Virtual Try-On" class="try-on-view-image" />
      </div>
        <div class="try-on-view-actions">
          <button class="btn secondary" id="downloadFromViewBtn">
            <i class="ph ph-download" style="font-size: 16px; margin-right: 8px"></i>
            Download
          </button>
          <button class="btn primary" id="addAsAvatarFromViewBtn">
            <i class="ph ph-user-check" style="font-size: 16px; margin-right: 8px"></i>
            Add to Avatars
          </button>
        </div>
    </div>
  `;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  modal.querySelector("#closeTryOnView").addEventListener("click", () => {
    modal.remove();
  });

  modal.querySelector("#downloadFromViewBtn").addEventListener("click", () => {
    downloadImage(imageUrl);
  });

  modal
    .querySelector("#addAsAvatarFromViewBtn")
    .addEventListener("click", async () => {
      const button = modal.querySelector("#addAsAvatarFromViewBtn");
      await addImageAsAvatar(imageUrl, button);
      // Close modal after successful addition (timeout allows user to see success state)
      setTimeout(() => {
        modal.remove();
      }, 2500);
    });

  // Add click listener to image to open in new tab
  modal.querySelector(".try-on-view-image").addEventListener("click", () => {
    window.open(imageUrl, "_blank");
  });

  document.body.appendChild(modal);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function downloadTryOn(imageUrl) {
  downloadImage(imageUrl);
}

function downloadImage(imageUrl) {
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = `virtual-try-on-${Date.now()}.jpg`;
  link.click();
}

async function deleteTryOn(generationId) {
  // Get the delete button and show loading state
  const deleteButton = document.querySelector(
    `[data-item-id="${generationId}"][data-action="delete"]`
  );
  if (deleteButton) {
    deleteButton.disabled = true;
    deleteButton.innerHTML = `
      <i class="ph ph-spinner spinning" style="font-size: 14px;"></i>
    `;
  }

  try {
    const response = await supabaseCall("deleteTryOnGeneration", {
      data: { generationId },
    });

    if (response.success) {
      showSuccess("Try-on deleted successfully!");
      loadTryOnGenerations(); // Refresh the list
    } else {
      showError(response.error || "Failed to delete try-on");
      // Reset button on error
      if (deleteButton) {
        deleteButton.disabled = false;
        deleteButton.innerHTML = `
          <i class="ph ph-minus" style="font-size: 14px;"></i>
        `;
      }
    }
  } catch (error) {
    console.error("Error deleting try-on:", error);
    showError("Error deleting try-on: " + error.message);
    // Reset button on error
    if (deleteButton) {
      deleteButton.disabled = false;
      deleteButton.innerHTML = `
        <i class="ph ph-minus" style="font-size: 14px;"></i>
      `;
    }
  }
}

async function handleDeleteAccount() {
  // First confirmation
  const firstConfirm = await showConfirmDialog(
    "Delete Account",
    "Are you sure you want to delete your account? This action cannot be undone.",
    "Delete Account",
    "Cancel",
    "danger"
  );

  if (!firstConfirm) {
    return;
  }

  // Second confirmation (extra safety)
  const secondConfirm = await showConfirmDialog(
    "Final Confirmation",
    "This will permanently delete all your data, including profile, wardrobe, and try-ons. Are you absolutely sure?",
    "Yes, Delete Everything",
    "Cancel",
    "danger"
  );

  if (!secondConfirm) {
    return;
  }

  try {
    updateStatus("deleting", "Deleting account...");

    const response = await supabaseCall("deleteAccount");

    if (response.success) {
      showSuccess("Account deleted successfully");

      // Clear local state
      isAuthenticated = false;
      currentUser = null;
      updateAuthState();
      updateStatus("ready", "Ready for authentication");
    } else {
      showError(response.error || "Failed to delete account");
      updateStatus("authenticated", "Authenticated");
    }
  } catch (error) {
    console.error("Error deleting account:", error);
    showError("Error deleting account: " + error.message);
    updateStatus("authenticated", "Authenticated");
  }
}

function setButtonLoading(button, loading) {
  if (loading) {
    button.classList.add("loading");
    button.disabled = true;

    // Store original content
    if (!button.dataset.originalContent) {
      button.dataset.originalContent = button.innerHTML;
    }

    // Set loading content based on button type
    const buttonText = button.textContent.trim();
    let loadingText = "Loading...";

    if (buttonText.includes("Sign In")) {
      loadingText = "Signing In...";
    } else if (buttonText.includes("Create Account")) {
      loadingText = "Creating Account...";
    } else if (buttonText.includes("Send Reset Link")) {
      loadingText = "Sending...";
    } else if (buttonText.includes("Update Password")) {
      loadingText = "Updating...";
    }

    button.innerHTML = `
      <i class="ph ph-spinner spinning" style="font-size: 16px; margin-right: 8px;"></i>
      ${loadingText}
    `;
  } else {
    button.classList.remove("loading");
    button.disabled = false;

    // Restore original content
    if (button.dataset.originalContent) {
      button.innerHTML = button.dataset.originalContent;
    }
  }
}

function clearForms() {
  // Clear all form inputs
  const forms = document.querySelectorAll(".auth-form");
  forms.forEach((form) => {
    const inputs = form.querySelectorAll("input");
    inputs.forEach((input) => {
      input.value = "";
      input.classList.remove("error", "success");
    });
  });

  // Clear any error/success messages
  const messages = document.querySelectorAll(
    ".error-message, .success-message"
  );
  messages.forEach((message) => message.remove());
}

// Subscription management functions
async function updateSubscriptionUI() {
  try {
    const response = await supabaseCall("getSubscriptionStatus");

    const subscriptionBadge = document.getElementById("subscriptionBadge");
    const subscriptionText = document.getElementById("subscriptionText");
    const upgradeBtn = document.getElementById("upgradeBtn");
    const cancelSubscriptionBtn = document.getElementById(
      "cancelSubscriptionBtn"
    );
    const subscriptionEndingNotice = document.getElementById(
      "subscriptionEndingNotice"
    );

    if (response && response.success) {
      const isPro = response.isPro || false;
      const cancelAtPeriodEnd = response.cancelAtPeriodEnd || false;

      // Update badge
      subscriptionText.textContent = isPro ? "Pro" : "Free";
      subscriptionBadge.className = `subscription-badge ${
        isPro ? "pro" : "free"
      }`;

      // Hide all buttons/notices first using CSS classes
      upgradeBtn.classList.add("hidden");
      cancelSubscriptionBtn.classList.add("hidden");
      subscriptionEndingNotice.classList.add("hidden");

      // Now show the appropriate button/notice
      if (isPro === true) {
        if (cancelAtPeriodEnd === true) {
          // Pro user with canceled subscription - show ending notice
          subscriptionEndingNotice.classList.remove("hidden");
        } else {
          // Active Pro user - show cancel button only
          cancelSubscriptionBtn.classList.remove("hidden");
        }
      } else {
        // Free user - show upgrade button only
        upgradeBtn.classList.remove("hidden");
      }

      // Update generation stats display if available
      if (response.monthlyLimit && response.currentCount !== undefined) {
        updateGenerationStatsDisplay(
          response.currentCount,
          response.monthlyLimit,
          response.remainingGenerations,
          isPro
        );
      }
    } else {
      // Default to free if no subscription info
      subscriptionText.textContent = "Free";
      subscriptionBadge.className = "subscription-badge free";
      upgradeBtn.classList.remove("hidden");
      cancelSubscriptionBtn.classList.add("hidden");

      // Update generation text for free users
      updateGenerationStatsDisplay(0, 15, 15, false);
    }
  } catch (error) {
    console.error("Error loading subscription status:", error);
    // Default to free on error
    const subscriptionBadge = document.getElementById("subscriptionBadge");
    const subscriptionText = document.getElementById("subscriptionText");
    const upgradeBtn = document.getElementById("upgradeBtn");
    const cancelSubscriptionBtn = document.getElementById(
      "cancelSubscriptionBtn"
    );

    subscriptionText.textContent = "Free";
    subscriptionBadge.className = "subscription-badge free";
    upgradeBtn.classList.remove("hidden");
    cancelSubscriptionBtn.classList.add("hidden");

    // Update generation text for free users (error case)
    updateGenerationStatsDisplay(0, 15, 15, false);
  }
}

function updateGenerationStatsDisplay(
  currentCount,
  monthlyLimit,
  remainingGenerations,
  isPro = false
) {
  const generationCountElement = document.getElementById("generationCount");
  const generationLimitElement = document.getElementById("generationLimit");
  const generationPlanTextElement =
    document.getElementById("generationPlanText");

  if (generationCountElement && generationLimitElement) {
    generationCountElement.textContent = currentCount || 0;
    generationLimitElement.textContent = monthlyLimit || 15;

    // Update plan-specific text with more descriptive language
    if (generationPlanTextElement) {
      const remaining = remainingGenerations || 0;

      if (isPro) {
        if (remaining > 50) {
          generationPlanTextElement.textContent = "Pro generations this month";
        } else if (remaining > 10) {
          generationPlanTextElement.textContent = `Pro generations (${remaining} remaining)`;
        } else if (remaining > 0) {
          generationPlanTextElement.textContent = `Pro generations (${remaining} left)`;
        } else {
          generationPlanTextElement.textContent = "Pro monthly limit reached";
        }
      } else {
        if (remaining > 10) {
          generationPlanTextElement.textContent = "free generations this month";
        } else if (remaining > 5) {
          generationPlanTextElement.textContent = `free generations (${remaining} remaining)`;
        } else if (remaining > 0) {
          generationPlanTextElement.textContent = `free generations (${remaining} left)`;
        } else {
          generationPlanTextElement.textContent = "free monthly limit reached";
        }
      }
    }

    // Update progress bar if it exists
    const progressBar = document.querySelector(".stats-progress");
    if (progressBar) {
      const percentage = Math.min(100, (currentCount / monthlyLimit) * 100);
      progressBar.style.width = `${percentage}%`;

      // Change color based on usage
      if (percentage >= 100) {
        progressBar.style.background = "#dc2626"; // Dark red for limit reached
      } else if (percentage >= 90) {
        progressBar.style.background = "#ef4444"; // Red for critical
      } else if (percentage >= 70) {
        progressBar.style.background = "#f59e0b"; // Orange for warning
      } else {
        progressBar.style.background = "var(--accent-primary)"; // Purple for normal
      }
    }
  }
}

async function handleUpgradeToPro() {
  const upgradeBtn = document.getElementById("upgradeBtn");

  try {
    // Show loading state
    upgradeBtn.disabled = true;
    upgradeBtn.innerHTML = `
      <i class="ph ph-spinner spinning" style="font-size: 18px; margin-right: 8px;"></i>
      Processing...
    `;

    // Request checkout URL from background script or web app
    const response = await chrome.runtime.sendMessage({
      action: "createStripeCheckout",
    });

    if (response && response.success && response.checkoutUrl) {
      // Redirect to Stripe checkout
      window.open(response.checkoutUrl, "_blank");

      // Close the modal after redirect
      closeProfileModal();

      showSuccess("Redirecting to payment...");
    } else {
      throw new Error(response.error || "Failed to create checkout session");
    }
  } catch (error) {
    console.error("Error creating checkout session:", error);
    showError("Error starting upgrade process: " + error.message);
  } finally {
    // Reset button
    upgradeBtn.disabled = false;
    upgradeBtn.innerHTML = `
      <i class="ph ph-crown" style="font-size: 18px; margin-right: 8px;"></i>
      Upgrade to Pro
    `;
  }
}

async function handleCancelSubscription() {
  const cancelBtn = document.getElementById("cancelSubscriptionBtn");

  // Show confirmation dialog
  const confirmed = await showConfirmDialog(
    "Cancel Subscription",
    "Are you sure you want to cancel your subscription? You'll continue to have Pro access until the end of your current billing period, then you'll be downgraded to the Free plan.",
    "Cancel Subscription",
    "Keep",
    "danger"
  );

  if (!confirmed) {
    return;
  }

  try {
    // Show loading state
    cancelBtn.disabled = true;
    cancelBtn.innerHTML = `
      <i class="ph ph-spinner spinning" style="font-size: 18px; margin-right: 8px;"></i>
      Canceling...
    `;

    // Request cancellation from background script
    const response = await chrome.runtime.sendMessage({
      action: "cancelSubscription",
    });

    if (response && response.success) {
      showSuccess(
        "Subscription canceled successfully. You'll keep Pro access until the end of your billing period."
      );

      // Close the modal
      closeProfileModal();

      // Refresh the subscription status immediately and after a brief delay
      updateSubscriptionUI();
      setTimeout(() => {
        updateSubscriptionUI();
      }, 1000);
    } else {
      throw new Error(response.error || "Failed to cancel subscription");
    }
  } catch (error) {
    console.error("Error canceling subscription:", error);
    showError("Error canceling subscription: " + error.message);
  } finally {
    // Reset button
    cancelBtn.disabled = false;
    cancelBtn.innerHTML = `
      <i class="ph ph-x-circle" style="font-size: 18px; margin-right: 8px;"></i>
      Cancel Subscription
    `;
  }
}

// Settings management functions
async function loadAddToDripplerSetting() {
  try {
    const result = await chrome.storage.sync.get(['addToDripplerEnabled']);
    const enabled = result.addToDripplerEnabled !== false; // Default to true

    const toggle = document.getElementById('addToDripplerToggle');
    if (toggle) {
      toggle.checked = enabled;
    }
  } catch (error) {
    console.error('Error loading Add to Drippler setting:', error);
    // Default to enabled if error
    const toggle = document.getElementById('addToDripplerToggle');
    if (toggle) {
      toggle.checked = true;
    }
  }
}

async function handleAddToDripplerToggle(event) {
  const enabled = event.target.checked;

  try {
    // Save to storage
    await chrome.storage.sync.set({ addToDripplerEnabled: enabled });

    // Notify background script to update all content scripts
    chrome.runtime.sendMessage({
      action: 'updateAddToDripplerSetting',
      enabled: enabled
    });

    showSuccess(enabled ? 'Add to Drippler button enabled' : 'Add to Drippler button disabled');
  } catch (error) {
    console.error('Error saving Add to Drippler setting:', error);
    showError('Failed to save setting');
    // Revert toggle on error
    event.target.checked = !enabled;
  }
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Popup received message:", request);

  switch (request.action) {
    case "authStateChanged":
      // Handle auth state changes from background
      if (request.user) {
        currentUser = request.user;
        isAuthenticated = true;
        updateStatus("authenticated", "Authenticated");
      } else {
        currentUser = null;
        isAuthenticated = false;
        updateStatus("ready", "Ready for authentication");
      }
      updateAuthState();
      break;
  }
});

// File validation helper function
function isValidImageFile(file) {
  // Check MIME type first (most reliable when available)
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff"
  ];

  if (file.type && validTypes.includes(file.type.toLowerCase())) {
    return true;
  }

  // Fallback to file extension (handles browser MIME type issues)
  const validExtensions = [
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".bmp", ".tiff"
  ];
  const fileName = file.name.toLowerCase();

  return validExtensions.some(ext => fileName.endsWith(ext));
}

// Show modal for unsupported file types
function showUnsupportedFileModal() {
  const modal = document.createElement("div");
  modal.className = "unsupported-file-modal";
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>Unsupported File Format</h3>
      </div>
      <div class="modal-body">
        <p>Please select a supported image format:</p>
        <div class="supported-formats">
          <span class="format-tag">JPG</span>
          <span class="format-tag">PNG</span>
          <span class="format-tag">GIF</span>
          <span class="format-tag">WebP</span>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn primary" id="okUnsupportedFile">Got it</button>
      </div>
    </div>
  `;

  // Add styles
  if (!document.getElementById("unsupported-file-styles")) {
    const styles = document.createElement("style");
    styles.id = "unsupported-file-styles";
    styles.textContent = `
      .unsupported-file-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
      }

      .modal-content {
        position: relative;
        background: var(--bg-primary, #ffffff);
        border-radius: 0;
        max-width: 360px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: modalSlideIn 0.2s ease-out;
        box-sizing: border-box;
        overflow: hidden;
      }

      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: scale(0.9) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      .modal-header {
        padding: 24px 24px 16px 24px;
      }

      .modal-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary, #1a1a1a);
      }

      .modal-body {
        padding: 0 24px 24px 24px;
      }

      .modal-body p {
        margin: 0 0 16px 0;
        font-size: 14px;
        line-height: 1.5;
        color: var(--text-secondary, #6b7280);
      }

      .supported-formats {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .format-tag {
        background: var(--accent-primary, #bd5dee);
        color: white;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
      }

      .modal-actions {
        padding: 16px 24px 24px 24px;
        display: flex;
        justify-content: flex-end;
        box-sizing: border-box;
        width: 100%;
      }

      .modal-actions .btn {
        min-width: 80px;
        max-width: 100%;
        box-sizing: border-box;
        flex-shrink: 1;
      }
    `;
    document.head.appendChild(styles);
  }

  // Add event listeners
  const okBtn = modal.querySelector("#okUnsupportedFile");
  const backdrop = modal.querySelector(".modal-backdrop");

  const handleClose = () => modal.remove();

  okBtn.addEventListener("click", handleClose);
  backdrop.addEventListener("click", handleClose);

  // Handle Escape key
  const handleEscape = (e) => {
    if (e.key === "Escape") {
      document.removeEventListener("keydown", handleEscape);
      handleClose();
    }
  };
  document.addEventListener("keydown", handleEscape);

  document.body.appendChild(modal);
}

// Global generation overlay functions
function showGlobalGenerationOverlay() {
  // Remove existing overlay if present
  hideGlobalGenerationOverlay();

  const overlay = document.createElement("div");
  overlay.id = "globalGenerationOverlay";
  overlay.className = "global-generation-overlay";
  overlay.innerHTML = `
    <div class="generation-overlay-content">
      <div class="generation-spinner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z" fill="currentColor">
            <animateTransform attributeName="transform" dur="0.75s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/>
          </path>
        </svg>
      </div>
      <div class="generation-text-content">
        <div class="generation-text">Generating Virtual Try-On</div>
        <div class="generation-subtext">This may take a few moments...</div>
      </div>
    </div>
  `;

  // Add styles
  if (!document.getElementById("global-generation-styles")) {
    const styles = document.createElement("style");
    styles.id = "global-generation-styles";
    styles.textContent = `
      .global-generation-overlay {
        position: fixed;
        bottom: 16px;
        right: 16px;
        background: var(--bg-primary, #ffffff);
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 280px;
        pointer-events: auto;
      }

      .generation-overlay-content {
        display: flex;
        align-items: center;
        animation: slideInRight 0.3s ease-out;
      }

      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .generation-spinner {
        margin-right: 12px;
        display: flex;
        align-items: center;
        flex-shrink: 0;
      }

      .generation-spinner svg {
        color: var(--accent-primary, #bd5dee);
        width: 20px;
        height: 20px;
      }

      .generation-text-content {
        flex: 1;
      }

      .generation-text {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary, #1a1a1a);
        margin-bottom: 2px;
      }

      .generation-subtext {
        font-size: 12px;
        color: var(--text-secondary, #6b7280);
      }
    `;
    document.head.appendChild(styles);
  }

  document.body.appendChild(overlay);
}

function hideGlobalGenerationOverlay() {
  const overlay = document.getElementById("globalGenerationOverlay");
  if (overlay) {
    overlay.remove();
  }
}
