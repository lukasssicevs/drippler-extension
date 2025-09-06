// Drippler Extension Popup with Supabase Integration
import { createClient } from "@supabase/supabase-js";

// Global state
let currentUser = null;
let isAuthenticated = false;

// Popup functionality
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Drippler Extension Popup loaded");

  // Initialize UI elements
  initializeUI();

  // Load extension info
  loadExtensionInfo();

  // Setup event listeners
  setupEventListeners();

  // Setup authentication event listeners
  setupAuthEventListeners();

  // Wait for Supabase to be ready, then check authentication
  try {
    console.log("Starting Supabase initialization...");
    const isReady = await waitForSupabaseReady();
    console.log("Supabase ready:", isReady);

    if (isReady) {
      console.log("Checking current user...");
      await checkCurrentUser();
    } else {
      console.error("Supabase failed to initialize");
      updateStatus("error", "Connection failed");
      showError(
        "Failed to connect to Supabase. Please try refreshing the extension."
      );

      // Show auth forms anyway to allow manual retry
      setTimeout(() => {
        showAuthForms();
      }, 2000);
    }
  } catch (error) {
    console.error("Initialization error:", error);
    updateStatus("error", "Initialization failed");
    showError("Extension initialization failed: " + error.message);

    // Show auth forms as fallback
    setTimeout(() => {
      showAuthForms();
    }, 2000);
  }

  // Fallback timeout to ensure UI shows after 10 seconds
  setTimeout(() => {
    const authForms = document.getElementById("authForms");
    const userDashboard = document.getElementById("userDashboard");

    if (
      authForms.style.display === "none" &&
      userDashboard.style.display === "none"
    ) {
      console.log("Fallback: Showing auth forms after timeout");
      updateStatus("ready", "Ready");
      showAuthForms();
    }
  }, 10000);
});

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

function showAuthForms() {
  const authForms = document.getElementById("authForms");
  const userDashboard = document.getElementById("userDashboard");

  if (authForms && userDashboard) {
    authForms.style.display = "block";
    userDashboard.style.display = "none";
    showAuthForm("login");
  }
}

async function waitForSupabaseReady() {
  updateStatus("initializing", "Connecting to Supabase...");

  const maxRetries = 8; // Reduced retries
  const retryDelay = 1000; // Increased delay to 1s

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "checkSupabaseStatus",
      });

      if (response.connected) {
        updateStatus("ready", "Ready for authentication");
        return true;
      }

      // If not connected yet, wait before retrying
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    } catch (error) {
      console.error(`Initialization check attempt ${attempt} failed:`, error);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  // If we get here, try force initialization
  console.log("Initial checks failed, attempting force initialization...");
  updateStatus("initializing", "Retrying connection...");

  try {
    const response = await chrome.runtime.sendMessage({
      action: "forceInitSupabase",
    });

    if (response.success && response.connected) {
      updateStatus("ready", "Ready for authentication");
      return true;
    }
  } catch (error) {
    console.error("Force initialization failed:", error);
  }

  // If everything fails
  updateStatus("error", "Failed to connect to Supabase");
  showError("Failed to initialize. Please try refreshing the extension.");
  return false;
}

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
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #6c757d;
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
  chrome.tabs.create({
    url: "https://github.com/your-repo/drippler-extension",
  });
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
      const tabName = e.target.dataset.tab;
      switchTab(tabName);
    });
  });

  // Try-ons management listeners
  document
    .getElementById("refreshTryOnsBtn")
    ?.addEventListener("click", loadTryOnGenerations);

  // Header avatar click to open profile modal
  document
    .getElementById("headerAvatar")
    ?.addEventListener("click", openProfileModal);

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
    const response = await chrome.runtime.sendMessage({
      action: "signIn",
      data: { email, password },
    });

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
    const response = await chrome.runtime.sendMessage({
      action: "signUp",
      data: { email, password },
    });

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
    const response = await chrome.runtime.sendMessage({
      action: "resetPassword",
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
    const response = await chrome.runtime.sendMessage({
      action: "updatePassword",
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
    const response = await chrome.runtime.sendMessage({
      action: "signOut",
    });

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
    const refreshResponse = await chrome.runtime.sendMessage({
      action: "refreshUserSession",
    });

    // Use the refresh response if successful, otherwise fallback to getCurrentUser
    let response = refreshResponse;
    if (!refreshResponse.success || !refreshResponse.user) {
      response = await chrome.runtime.sendMessage({
        action: "getCurrentUser",
      });
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
  const actionsSection = document.querySelector(".actions-section");

  if (isAuthenticated && currentUser) {
    // Show user dashboard and hide auth forms
    container.classList.add("authenticated");
    container.classList.remove("unauthenticated");
    authForms.style.display = "none";
    userDashboard.style.display = "block";

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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="spinning">
          <path d="M12,4a8,8 0 0,1 7.89,6.7 1.53,1.53 0 0,0 1.49,1.3 1.5,1.5 0 0,0 1.48-1.75 11,11 0 0,0-21.72,0A1.5,1.5 0 0,0 2.62,11.25 1.53,1.53 0 0,0 4.11,10.7 8,8 0 0,1 12,4Z"/>
        </svg>
        Uploading...
      `;
      addClothingBtn.disabled = true;
      addClothingBtn.classList.add("loading");
      break;
    case "success":
      addClothingBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
        </svg>
        Success!
      `;
      addClothingBtn.disabled = true;
      addClothingBtn.classList.add("success");
      break;
    case "default":
    default:
      addClothingBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
        </svg>
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
  if (!file.type.startsWith("image/")) {
    showError("Please select a valid image file");
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
        <h3>Add Clothing Item</h3>
        <button class="close-btn" id="closeClothingModal">×</button>
      </div>
      <div class="clothing-upload-body">
        <img src="${previewUrl}" class="image-preview" alt="Preview" />
        <div class="clothing-form-group">
          <label for="clothingName">Item Name / Comments</label>
          <input type="text" id="clothingName" placeholder="e.g., Blue Denim Jacket or any notes about this item" />
        </div>
        <div class="clothing-form-actions">
          <button class="btn secondary" id="cancelClothingUpload">Cancel</button>
          <button class="btn primary" id="confirmClothingUpload">Add to Wardrobe</button>
        </div>
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

  modal.querySelector("#cancelClothingUpload").addEventListener("click", () => {
    URL.revokeObjectURL(previewUrl);
    modal.remove();
  });

  modal
    .querySelector("#confirmClothingUpload")
    .addEventListener("click", async () => {
      const name = document.getElementById("clothingName").value.trim();

      if (!name) {
        showError("Please enter an item name");
        return;
      }

      try {
        // Update main button state to loading
        updateClothingButtonState("loading");

        // Update modal button state
        const confirmBtn = modal.querySelector("#confirmClothingUpload");
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="spinning">
            <path d="M12,4a8,8 0 0,1 7.89,6.7 1.53,1.53 0 0,0 1.49,1.3 1.5,1.5 0 0,0 1.48-1.75 11,11 0 0,0-21.72,0A1.5,1.5 0 0,0 2.62,11.25 1.53,1.53 0 0,0 4.11,10.7 8,8 0 0,1 12,4Z"/>
          </svg>
          Adding...
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

        const response = await chrome.runtime.sendMessage({
          action: "uploadClothingItem",
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
            </svg>
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
          </svg>
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
    clothingGrid.innerHTML =
      '<div class="loading-state">Loading wardrobe...</div>';

    const response = await chrome.runtime.sendMessage({
      action: "getClothingItems",
    });

    if (response.success) {
      displayClothingItems(response.data);
    } else {
      clothingGrid.innerHTML =
        '<div class="loading-state">Failed to load wardrobe</div>';
      console.error("Failed to load clothing items:", response.error);
    }
  } catch (error) {
    console.error("Error loading clothing items:", error);
    clothingGrid.innerHTML =
      '<div class="loading-state">Error loading wardrobe</div>';
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
      <img src="${item.image_url}" alt="${item.name}" loading="lazy" />
      <div class="clothing-item-overlay">
        <div class="clothing-item-name">${item.name}</div>
      </div>
      <div class="clothing-item-actions">
        <button class="clothing-action-btn try-on" data-action="try-on" data-item-id="${item.id}" title="Try On">
          👤
        </button>
        <button class="clothing-action-btn delete" data-action="delete" data-item-id="${item.id}" title="Delete">
          🗑️
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
  const button = event.target.closest(".clothing-action-btn");
  if (!button) return;

  const action = button.dataset.action;
  const itemId = button.dataset.itemId;

  console.log("Button clicked:", { action, itemId, button });

  if (action === "try-on") {
    tryOnClothingItem(itemId);
  } else if (action === "delete") {
    deleteClothingItem(itemId);
  }
}

async function deleteClothingItem(itemId) {
  if (!confirm("Are you sure you want to delete this clothing item?")) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: "deleteClothingItem",
      data: { itemId },
    });

    if (response.success) {
      showSuccess("Clothing item deleted successfully!");
      loadClothingItems(); // Refresh the display
    } else {
      showError(response.error || "Failed to delete clothing item");
    }
  } catch (error) {
    console.error("Error deleting clothing item:", error);
    showError("Error deleting clothing item: " + error.message);
  }
}

async function tryOnClothingItem(itemId) {
  try {
    console.log("Trying on clothing item:", itemId);

    // Get the clothing item details
    const clothingResponse = await chrome.runtime.sendMessage({
      action: "getClothingItems",
    });

    if (!clothingResponse.success) {
      showError("Failed to load clothing item");
      return;
    }

    const clothingItem = clothingResponse.data.find(
      (item) => item.id === itemId
    );
    if (!clothingItem) {
      showError("Clothing item not found");
      return;
    }

    // Get active avatar
    const avatarResponse = await chrome.runtime.sendMessage({
      action: "getActiveAvatar",
    });

    if (!avatarResponse.success || !avatarResponse.avatar?.image_url) {
      showError(
        "Please upload and select an avatar first to use virtual try-on!"
      );
      return;
    }

    // Show loading state
    updateStatus("generating", "Generating virtual try-on...");

    // Request virtual try-on generation from background script
    const tryOnResponse = await chrome.runtime.sendMessage({
      action: "generateVirtualTryOn",
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
  }
}

function showTryOnResult(resultData) {
  // Create modal for showing try-on result
  const modal = document.createElement("div");
  modal.className = "try-on-result-modal";

  modal.innerHTML = `
    <div class="try-on-result-content">
      <div class="try-on-result-header">
        <h3>Virtual Try-On Result</h3>
        <button class="close-btn" id="closeTryOnResult">×</button>
      </div>
      <div class="try-on-result-body">
        <img src="${
          resultData.generatedImageUrl
        }" alt="Virtual Try-On Result" class="try-on-result-image" />
        <div class="try-on-result-info">
          <p><strong>Generations used:</strong> ${
            resultData.generationCount || 0
          } / ${resultData.maxGenerations || 15}</p>
          <p><strong>Remaining:</strong> ${
            resultData.remainingGenerations || 0
          }</p>
          ${
            resultData.remainingGenerations === 0
              ? '<p class="warning">⚠️ You have reached the free generation limit!</p>'
              : ""
          }
        </div>
      </div>
      <div class="try-on-result-actions">
        <button class="btn secondary" id="downloadTryOnResult">Download</button>
        <button class="btn primary" id="closeTryOnResultBtn">Close</button>
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

  modal.querySelector("#closeTryOnResultBtn").addEventListener("click", () => {
    modal.remove();
  });

  modal.querySelector("#downloadTryOnResult").addEventListener("click", () => {
    // Create download link
    const link = document.createElement("a");
    link.href = resultData.generatedImageUrl;
    link.download = `virtual-try-on-${Date.now()}.jpg`;
    link.click();
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="spinning">
          <path d="M12,4a8,8 0 0,1 7.89,6.7 1.53,1.53 0 0,0 1.49,1.3 1.5,1.5 0 0,0 1.48-1.75 11,11 0 0,0-21.72,0A1.5,1.5 0 0,0 2.62,11.25 1.53,1.53 0 0,0 4.11,10.7 8,8 0 0,1 12,4Z"/>
        </svg>
        Uploading...
      `;
      addAvatarBtn.disabled = true;
      addAvatarBtn.classList.add("loading");
      break;
    case "success":
      addAvatarBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
        </svg>
        Success!
      `;
      addAvatarBtn.disabled = true;
      addAvatarBtn.classList.add("success");
      break;
    case "default":
    default:
      addAvatarBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
        </svg>
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

  try {
    updateAvatarButtonState("loading");
    updateStatus("uploading", "Uploading avatar...");

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async function (e) {
      const base64Data = e.target.result;

      const response = await chrome.runtime.sendMessage({
        action: "uploadAvatar",
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

async function loadAvatars() {
  const avatarsGrid = document.getElementById("avatarsGrid");
  const activeAvatarSection = document.getElementById("activeAvatarSection");
  const selectionTitle = document.getElementById("selectionTitle");

  try {
    const response = await chrome.runtime.sendMessage({
      action: "getAvatars",
    });

    if (response.success && response.avatars && response.avatars.length > 0) {
      const activeAvatar = response.avatars.find((avatar) => avatar.is_active);

      // Show active avatar section if there's an active avatar
      if (activeAvatar) {
        displayActiveAvatar(activeAvatar);
        activeAvatarSection.style.display = "block";
        selectionTitle.textContent = "Change Avatar";
      } else {
        activeAvatarSection.style.display = "none";
        selectionTitle.textContent = "Choose Your Avatar";
      }

      displayAvatars(response.avatars);
    } else {
      activeAvatarSection.style.display = "none";
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
              </svg>
              Upload Photo
            </button>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading avatars:", error);
    activeAvatarSection.style.display = "none";
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

function displayActiveAvatar(avatar) {
  const activeAvatarImage = document.getElementById("activeAvatarImage");
  activeAvatarImage.src = avatar.image_url;
}

function displayAvatars(avatars) {
  const avatarsGrid = document.getElementById("avatarsGrid");
  const contentArea = avatarsGrid.closest(".content-area");
  const avatarSelectionSection = document.querySelector(
    ".avatar-selection-section"
  );

  // Filter out the active avatar from the grid since it's shown at the top
  const inactiveAvatars = avatars.filter((avatar) => !avatar.is_active);

  if (inactiveAvatars.length === 0) {
    // Add classes for empty state styling
    avatarsGrid.classList.add("empty-grid");
    contentArea.classList.add("empty-content");
    contentArea.classList.add("add-more-mode"); // Special class for "add more" scenario
    avatarSelectionSection.classList.add("empty-section");

    // If only one avatar (the active one), show a message
    avatarsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
          </svg>
        </div>
        <h3>Add More Avatars</h3>
        <p>Upload additional photos to have multiple avatar options for your try-ons.</p>
        <div class="empty-action">
          <button class="btn primary" data-action="add-avatar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
            </svg>
            Add Another Photo
          </button>
        </div>
      </div>
    `;
    return;
  }

  // Remove empty state classes when showing items
  avatarsGrid.classList.remove("empty-grid");
  contentArea.classList.remove("empty-content");
  contentArea.classList.remove("add-more-mode"); // Remove add-more mode
  avatarSelectionSection.classList.remove("empty-section");

  avatarsGrid.innerHTML = inactiveAvatars
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
          ✓
        </button>
        <button class="avatar-action-btn delete" title="Delete Avatar" data-action="delete" data-avatar-id="${
          avatar.id
        }">
          🗑️
        </button>
      </div>
    </div>
  `
    )
    .join("");

  // Add event listeners for avatar actions
  avatarsGrid.addEventListener("click", handleAvatarGridClick);
}

async function handleAvatarGridClick(event) {
  const action = event.target.dataset.action;
  const avatarId = event.target.dataset.avatarId;

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
    const response = await chrome.runtime.sendMessage({
      action: "setActiveAvatar",
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
  if (!confirm("Are you sure you want to delete this avatar?")) return;

  try {
    const response = await chrome.runtime.sendMessage({
      action: "deleteAvatar",
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
    const response = await chrome.runtime.sendMessage({
      action: "getActiveAvatar",
    });

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
  const modalUserStatus = document.getElementById("modalUserStatus");

  if (currentUser) {
    modalUserEmail.textContent = currentUser.email || "Unknown";
    modalUserStatus.textContent = currentUser.email_confirmed_at
      ? "Verified"
      : "Unverified";

    // Load generation stats
    loadGenerationStats();
  }
}

async function loadGenerationStats() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: "getTryOnGenerations",
    });

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
function openProfileModal() {
  const profileModal = document.getElementById("profileModal");
  if (profileModal) {
    updateModalUserInfo(); // Refresh modal data
    profileModal.style.display = "flex";
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
    tryonsGrid.innerHTML =
      '<div class="loading-state">Loading try-ons...</div>';

    const response = await chrome.runtime.sendMessage({
      action: "getTryOnGenerations",
    });

    if (response.success) {
      displayTryOnGenerations(response.data.generations);
    } else {
      tryonsGrid.innerHTML =
        '<div class="loading-state">Failed to load try-ons</div>';
      console.error("Failed to load try-on generations:", response.error);
    }
  } catch (error) {
    console.error("Error loading try-on generations:", error);
    tryonsGrid.innerHTML =
      '<div class="loading-state">Error loading try-ons</div>';
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
      <img src="${
        generation.generated_image_url
      }" alt="Virtual Try-On" loading="lazy" />
      <div class="tryon-item-overlay">
        <div class="tryon-item-date">${formatDate(generation.created_at)}</div>
      </div>
      <div class="tryon-item-actions">
        <button class="tryon-action-btn download" data-action="download" data-image-url="${
          generation.generated_image_url
        }" title="Download">
          ⬇️
        </button>
        <button class="tryon-action-btn delete" data-action="delete" data-item-id="${
          generation.id
        }" title="Delete">
          🗑️
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
        <h3>Virtual Try-On</h3>
        <button class="close-btn" id="closeTryOnView">×</button>
      </div>
      <div class="try-on-view-body">
        <img src="${imageUrl}" alt="Virtual Try-On" class="try-on-view-image" />
      </div>
      <div class="try-on-view-actions">
        <button class="btn primary" onclick="downloadImage('${imageUrl}')">Download</button>
        <button class="btn secondary" id="closeTryOnViewBtn">Close</button>
      </div>
    </div>
  `;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  modal.querySelector("#closeTryOnView").addEventListener("click", () => {
    modal.remove();
  });

  modal.querySelector("#closeTryOnViewBtn").addEventListener("click", () => {
    modal.remove();
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
  if (!confirm("Are you sure you want to delete this try-on?")) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: "deleteTryOnGeneration",
      data: { generationId },
    });

    if (response.success) {
      showSuccess("Try-on deleted successfully!");
      loadTryOnGenerations(); // Refresh the list
    } else {
      showError(response.error || "Failed to delete try-on");
    }
  } catch (error) {
    console.error("Error deleting try-on:", error);
    showError("Error deleting try-on: " + error.message);
  }
}

async function handleDeleteAccount() {
  if (
    !confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    )
  ) {
    return;
  }

  if (
    !confirm(
      "This will permanently delete all your data, including profile, wardrobe, and try-ons. Are you absolutely sure?"
    )
  ) {
    return;
  }

  try {
    updateStatus("deleting", "Deleting account...");

    const response = await chrome.runtime.sendMessage({
      action: "deleteAccount",
    });

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
  } else {
    button.classList.remove("loading");
    button.disabled = false;
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
