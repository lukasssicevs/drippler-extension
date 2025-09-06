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
  await waitForSupabaseReady();
  await checkCurrentUser();
});

function initializeUI() {
  const statusIndicator = document.getElementById("statusIndicator");
  const statusText = document.getElementById("statusText");

  // Set initial state
  updateStatus("initializing", "Initializing...");
}

function loadExtensionInfo() {
  // Get extension ID
  const extensionId = chrome.runtime.id;
  document.getElementById("extensionId").textContent = extensionId;

  // Get manifest info
  const manifest = chrome.runtime.getManifest();
  console.log("Extension manifest:", manifest);
}

function setupEventListeners() {
  const testWebAppBtn = document.getElementById("testWebAppBtn");
  const settingsLink = document.getElementById("settingsLink");
  const helpLink = document.getElementById("helpLink");

  testWebAppBtn.addEventListener("click", handleTestWebApp);
  settingsLink.addEventListener("click", openSettings);
  helpLink.addEventListener("click", openHelp);
}

async function waitForSupabaseReady() {
  updateStatus("initializing", "Connecting to Supabase...");

  const maxRetries = 10;
  const retryDelay = 500; // 500ms

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
  const statusIndicator = document.getElementById("statusIndicator");
  const statusText = document.getElementById("statusText");
  const statusDot = statusIndicator.querySelector(".status-dot");

  // Remove existing status classes
  statusDot.className = "status-dot";

  // Add new status class
  statusDot.classList.add(`status-${status}`);
  statusText.textContent = text;
}

function showError(message) {
  showNotification(message, "error");
}

function showSuccess(message) {
  showNotification(message, "success");
}

function showNotification(message, type = "info") {
  // Remove existing notifications
  const existingNotification = document.querySelector(".notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  // Add notification styles
  const notificationStyles = `
        .notification {
            position: fixed;
            top: 10px;
            left: 10px;
            right: 10px;
            padding: 12px;
            border-radius: 6px;
            font-size: 13px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        }
        
        .notification-error {
            background: #fee;
            color: #c33;
            border: 1px solid #fcc;
        }
        
        .notification-success {
            background: #efe;
            color: #3c3;
            border: 1px solid #cfc;
        }
        
        .notification-info {
            background: #eef;
            color: #33c;
            border: 1px solid #ccf;
        }
        
        @keyframes slideIn {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;

  // Add styles if not already added
  if (!document.querySelector("#notification-styles")) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "notification-styles";
    styleSheet.textContent = notificationStyles;
    document.head.appendChild(styleSheet);
  }

  // Add to popup
  document.body.appendChild(notification);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
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
  document
    .getElementById("changePasswordBtn")
    .addEventListener("click", () => showAuthForm("updatePassword"));
  document
    .getElementById("signOutBtn")
    .addEventListener("click", handleSignOut);

  // Profile image upload listeners
  document
    .getElementById("avatarUpload")
    .addEventListener("click", handleAvatarUploadClick);
  document
    .getElementById("userAvatar")
    .addEventListener("click", handleAvatarUploadClick);
  document
    .getElementById("profileImageInput")
    .addEventListener("change", handleProfileImageUpload);

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

  // Account deletion listener
  document
    .getElementById("deleteAccountBtn")
    ?.addEventListener("click", handleDeleteAccount);
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

    // Show metadata test section
    if (actionsSection) {
      actionsSection.style.display = "block";
    }

    // Update user info
    const userEmail = document.getElementById("userEmail");
    const userInitials = document.getElementById("userInitials");
    const userStatus = document.getElementById("userStatus");

    userEmail.textContent = currentUser.email || "Unknown";
    userInitials.textContent = (currentUser.email || "U")
      .charAt(0)
      .toUpperCase();
    userStatus.textContent = currentUser.email_confirmed_at
      ? "Verified"
      : "Unverified";

    // Load wardrobe items
    loadClothingItems();

    // Load profile image if available
    loadProfileImage();
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

    showAuthForm("login");
  }
}

// Profile image upload functions
function handleAvatarUploadClick() {
  document.getElementById("profileImageInput").click();
}

async function handleProfileImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  console.log("Profile image file selected:", {
    name: file.name,
    type: file.type,
    size: file.size,
  });

  // Validate file type and size
  if (!file.type.startsWith("image/")) {
    showError("Please select a valid image file");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    // 5MB limit
    showError("Image size must be less than 5MB");
    return;
  }

  try {
    updateStatus("uploading", "Uploading profile image...");

    // Convert file to base64 for safer transmission
    console.log("Converting file to base64...");
    const base64Data = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.readAsDataURL(file);
    });

    // Log what we're sending to help debug
    console.log("Sending profile image data:", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      base64Length: base64Data.length,
    });

    const response = await chrome.runtime.sendMessage({
      action: "uploadProfileImage",
      data: {
        fileData: base64Data,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        encoding: "base64",
      },
    });

    if (response.success) {
      showSuccess("Profile image updated successfully!");

      // Update the profile image in UI
      const profileImg = document.getElementById("profileImage");
      const userInitials = document.getElementById("userInitials");

      profileImg.src = response.data.imageUrl;
      profileImg.style.display = "block";
      userInitials.style.display = "none";

      updateStatus("authenticated", "Authenticated");
    } else {
      showError(response.error || "Failed to upload profile image");
      updateStatus("authenticated", "Authenticated");
    }
  } catch (error) {
    console.error("Error uploading profile image:", error);
    showError("Error uploading profile image: " + error.message);
    updateStatus("authenticated", "Authenticated");
  }

  // Clear the input
  event.target.value = "";
}

async function loadProfileImage() {
  try {
    console.log("Loading profile image...");

    // First try to get profile from the profiles table
    const profileResponse = await chrome.runtime.sendMessage({
      action: "getUserProfile",
    });

    let imageUrl = null;

    if (profileResponse.success && profileResponse.profile?.profile_image_url) {
      imageUrl = profileResponse.profile.profile_image_url;
      console.log("Found profile image in profiles table:", imageUrl);
    } else {
      // Fallback to user metadata
      const userResponse = await chrome.runtime.sendMessage({
        action: "getCurrentUser",
      });

      if (
        userResponse.success &&
        userResponse.user &&
        userResponse.user.user_metadata &&
        userResponse.user.user_metadata.avatar_url
      ) {
        imageUrl = userResponse.user.user_metadata.avatar_url;
        console.log("Found profile image in user metadata:", imageUrl);
      }
    }

    if (imageUrl) {
      const profileImg = document.getElementById("profileImage");
      const userInitials = document.getElementById("userInitials");

      profileImg.src = imageUrl;
      profileImg.style.display = "block";
      userInitials.style.display = "none";

      console.log("Profile image loaded successfully");
    } else {
      console.log("No profile image found");
    }
  } catch (error) {
    console.error("Error loading profile image:", error);
  }
}

// Clothing management functions
function handleAddClothingClick() {
  document.getElementById("clothingImageInput").click();
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
          <label for="clothingName">Item Name</label>
          <input type="text" id="clothingName" placeholder="e.g., Blue Denim Jacket" />
        </div>
        <div class="clothing-form-group">
          <label for="clothingCategory">Category</label>
          <select id="clothingCategory">
            <option value="uncategorized">Uncategorized</option>
            <option value="tops">Tops</option>
            <option value="bottoms">Bottoms</option>
            <option value="outerwear">Outerwear</option>
            <option value="footwear">Footwear</option>
            <option value="accessories">Accessories</option>
            <option value="dresses">Dresses</option>
            <option value="suits">Suits</option>
          </select>
        </div>
        <div class="clothing-form-group">
          <label for="clothingTags">Tags (comma-separated)</label>
          <input type="text" id="clothingTags" placeholder="e.g., casual, blue, denim" />
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
      const category = document.getElementById("clothingCategory").value;
      const tagsInput = document.getElementById("clothingTags").value.trim();
      const tags = tagsInput
        ? tagsInput.split(",").map((tag) => tag.trim())
        : [];

      if (!name) {
        showError("Please enter an item name");
        return;
      }

      try {
        modal.querySelector("#confirmClothingUpload").disabled = true;
        modal.querySelector("#confirmClothingUpload").textContent = "Adding...";

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
            category,
            tags,
          },
        });

        if (response.success) {
          showSuccess("Clothing item added to wardrobe!");
          URL.revokeObjectURL(previewUrl);
          modal.remove();

          // Refresh the wardrobe display
          loadClothingItems();
        } else {
          showError(response.error || "Failed to add clothing item");
          modal.querySelector("#confirmClothingUpload").disabled = false;
          modal.querySelector("#confirmClothingUpload").textContent =
            "Add to Wardrobe";
        }
      } catch (error) {
        console.error("Error adding clothing item:", error);
        showError("Error adding clothing item: " + error.message);
        modal.querySelector("#confirmClothingUpload").disabled = false;
        modal.querySelector("#confirmClothingUpload").textContent =
          "Add to Wardrobe";
      }
    });

  // Add to page
  document.body.appendChild(modal);
}

async function loadClothingItems() {
  const clothingGrid = document.getElementById("clothingGrid");

  try {
    clothingGrid.innerHTML =
      '<div class="loading-message">Loading wardrobe...</div>';

    const response = await chrome.runtime.sendMessage({
      action: "getClothingItems",
    });

    if (response.success) {
      displayClothingItems(response.data);
    } else {
      clothingGrid.innerHTML =
        '<div class="loading-message">Failed to load wardrobe</div>';
      console.error("Failed to load clothing items:", response.error);
    }
  } catch (error) {
    console.error("Error loading clothing items:", error);
    clothingGrid.innerHTML =
      '<div class="loading-message">Error loading wardrobe</div>';
  }
}

function displayClothingItems(items) {
  const clothingGrid = document.getElementById("clothingGrid");

  if (!items || items.length === 0) {
    clothingGrid.innerHTML = `
      <div class="empty-wardrobe">
        <p>Your wardrobe is empty</p>
        <p class="tip">Add items by clicking the + button above, or right-click on images while browsing the web!</p>
      </div>
    `;
    return;
  }

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

    // Get user profile image
    const profileResponse = await chrome.runtime.sendMessage({
      action: "getUserProfile",
    });

    if (
      !profileResponse.success ||
      !profileResponse.profile?.profile_image_url
    ) {
      showError("Please upload a profile image first to use virtual try-on!");
      return;
    }

    // Show loading state
    updateStatus("generating", "Generating virtual try-on...");

    // Request virtual try-on generation from background script
    const tryOnResponse = await chrome.runtime.sendMessage({
      action: "generateVirtualTryOn",
      data: {
        userImageUrl: profileResponse.profile.profile_image_url,
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

// Make functions available globally for onclick handlers
window.deleteClothingItem = deleteClothingItem;
window.tryOnClothingItem = tryOnClothingItem;

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
  }
}

// Load virtual try-on generations
async function loadTryOnGenerations() {
  const tryonsGrid = document.getElementById("tryonsGrid");

  try {
    tryonsGrid.innerHTML =
      '<div class="loading-message">Loading try-ons...</div>';

    const response = await chrome.runtime.sendMessage({
      action: "getTryOnGenerations",
    });

    if (response.success) {
      displayTryOnGenerations(response.data);
    } else {
      tryonsGrid.innerHTML =
        '<div class="loading-message">Failed to load try-ons</div>';
      console.error("Failed to load try-on generations:", response.error);
    }
  } catch (error) {
    console.error("Error loading try-on generations:", error);
    tryonsGrid.innerHTML =
      '<div class="loading-message">Error loading try-ons</div>';
  }
}

function displayTryOnGenerations(generations) {
  const tryonsGrid = document.getElementById("tryonsGrid");

  if (!generations || generations.length === 0) {
    tryonsGrid.innerHTML = `
      <div class="empty-tryons">
        <p>No virtual try-ons yet</p>
        <p class="tip">Go to the Wardrobe tab and click the 👤 button on any clothing item to generate your first try-on!</p>
      </div>
    `;
    return;
  }

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
        <button class="tryon-action-btn download" onclick="downloadTryOn('${
          generation.generated_image_url
        }')" title="Download">
          ⬇️
        </button>
        <button class="tryon-action-btn delete" onclick="deleteTryOn('${
          generation.id
        }')" title="Delete">
          🗑️
        </button>
      </div>
    </div>
  `
    )
    .join("");

  // Add click listeners for viewing full size
  tryonsGrid.addEventListener("click", handleTryOnGridClick);
}

function handleTryOnGridClick(event) {
  const tryonItem = event.target.closest(".tryon-item");
  if (!tryonItem || event.target.closest(".tryon-action-btn")) return;

  const img = tryonItem.querySelector("img");
  if (img) {
    showFullSizeTryOn(img.src);
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

// Make functions globally accessible
window.downloadTryOn = downloadTryOn;
window.deleteTryOn = deleteTryOn;
window.downloadImage = downloadImage;

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
