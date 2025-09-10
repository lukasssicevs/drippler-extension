// Drippler Extension Background Script with Supabase Integration
import { createClient } from "@supabase/supabase-js";

// Global variables
let supabaseClient = null;
let isSupabaseConnected = false;

// Backend API configuration
const BACKEND_API_URL = "https://drippler-web.vercel.app";

// Supabase configuration - Replace with your actual values
const SUPABASE_CONFIG = {
  url: "https://jashmegsyjepwjcosrui.supabase.co", // Replace with your Supabase URL
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphc2htZWdzeWplcHdqY29zcnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMTQ5NDUsImV4cCI6MjA3MjU5MDk0NX0.gtQTlR4u_ZubQodDuWCwSxBOSIu4mkExfxWD8XquBvQ", // Replace with your Supabase anon key
};

// Extension installation handler
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("Drippler Extension installed/updated:", details);

  // Set up initial storage
  await chrome.storage.local.set({
    extensionVersion: chrome.runtime.getManifest().version,
    installDate: new Date().toISOString(),
    supabaseConnected: false,
  });

  // Initialize Supabase on installation with retry
  await initializeSupabaseWithRetry();

  // Setup context menus
  setupContextMenus();
});

// Extension startup handler
chrome.runtime.onStartup.addListener(async () => {
  console.log("Drippler Extension starting up");
  await initializeSupabaseWithRetry();
  setupContextMenus();
});

// Message handler for popup and content script communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request);

  switch (request.action) {
    case "initSupabase":
      handleInitSupabase(sendResponse);
      break;

    case "forceInitSupabase":
      handleForceInitSupabase(sendResponse);
      break;

    case "testSupabase":
      handleTestSupabase(sendResponse);
      break;

    case "checkSupabaseStatus":
      handleCheckSupabaseStatus(sendResponse);
      break;

    case "getExtensionInfo":
      handleGetExtensionInfo(sendResponse);
      break;

    case "saveToSupabase":
      handleSaveToSupabase(request.data, sendResponse);
      break;

    case "capturePageData":
      handleCapturePageData(request.data, sendResponse);
      break;

    case "floatingButtonClicked":
      console.log("Floating button clicked on:", request.url);
      sendResponse({ success: true });
      break;

    case "signUp":
      handleSignUp(request.data, sendResponse);
      break;

    case "signIn":
      handleSignIn(request.data, sendResponse);
      break;

    case "signOut":
      handleSignOut(sendResponse);
      break;

    case "resetPassword":
      handleResetPassword(request.data, sendResponse);
      break;

    case "updatePassword":
      handleUpdatePassword(request.data, sendResponse);
      break;

    case "getCurrentUser":
      handleGetCurrentUser(sendResponse);
      break;

    case "getUserProfile":
      handleGetUserProfile(sendResponse);
      break;

    case "refreshUserSession":
      handleRefreshUserSession(sendResponse);
      break;

    case "testWebAppAPI":
      handleTestWebAppAPI(request.customMessage, sendResponse);
      break;

    case "uploadProfileImage":
      handleUploadProfileImage(request.data, sendResponse);
      break;

    case "uploadClothingItem":
      handleUploadClothingItem(request.data, sendResponse);
      break;

    case "saveImageAsClothing":
      handleSaveImageAsClothing(request.data, sendResponse);
      break;

    case "getClothingItems":
      handleGetClothingItems(sendResponse);
      break;

    case "deleteClothingItem":
      handleDeleteClothingItem(request.data, sendResponse);
      break;

    case "generateVirtualTryOn":
      handleGenerateVirtualTryOn(request.data, sendResponse);
      break;

    case "getTryOnGenerations":
      handleGetTryOnGenerations(sendResponse);
      break;

    case "deleteTryOnGeneration":
      handleDeleteTryOnGeneration(request.data, sendResponse);
      break;

    case "deleteAccount":
      handleDeleteAccount(sendResponse);
      break;

    // Avatar management
    case "uploadAvatar":
      handleUploadAvatar(request.data, sendResponse);
      break;
    case "getAvatars":
      handleGetAvatars(sendResponse);
      break;
    case "getActiveAvatar":
      handleGetActiveAvatar(sendResponse);
      break;
    case "setActiveAvatar":
      handleSetActiveAvatar(request.avatarId, sendResponse);
      break;
    case "deleteAvatar":
      handleDeleteAvatar(request.avatarId, sendResponse);
      break;
    case "addAvatarFromUrl":
      handleAddAvatarFromUrl(request.data, sendResponse);
      break;

    case "openPopup":
      handleOpenPopup(sendResponse);
      break;

    default:
      console.warn("Unknown action:", request.action);
      sendResponse({ success: false, error: "Unknown action" });
  }

  // Return true to indicate async response
  return true;
});

// Initialize Supabase with retry logic
async function initializeSupabaseWithRetry() {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Supabase initialization attempt ${attempt}/${maxRetries}`);

    const success = await initializeSupabase();
    if (success) {
      console.log("Supabase initialized successfully");
      return true;
    }

    if (attempt < maxRetries) {
      console.log(`Retrying in ${retryDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  console.error("Failed to initialize Supabase after all retries");
  return false;
}

// Initialize Supabase client
async function initializeSupabase() {
  try {
    console.log("Initializing Supabase client...");

    // Check if configuration is set
    if (
      SUPABASE_CONFIG.url === "YOUR_SUPABASE_URL" ||
      SUPABASE_CONFIG.key === "YOUR_SUPABASE_ANON_KEY"
    ) {
      console.warn(
        "Supabase configuration not set. Please update SUPABASE_CONFIG in background.js"
      );
      isSupabaseConnected = false;
      return false;
    }

    // Initialize Supabase client with persistent session
    supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key, {
      auth: {
        storage: {
          getItem: async (key) => {
            const result = await chrome.storage.local.get([key]);
            return result[key] || null;
          },
          setItem: async (key, value) => {
            await chrome.storage.local.set({ [key]: value });
          },
          removeItem: async (key) => {
            await chrome.storage.local.remove([key]);
          },
        },
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    // Setup auth state listener first
    await setupAuthStateListener();

    // Try to restore existing session from storage
    await restoreExistingSession();

    // Test the connection
    const { data, error } = await supabaseClient.auth.getSession();
    if (error && error.message !== "Auth session missing!") {
      throw error;
    }

    isSupabaseConnected = true;

    // Update storage
    await chrome.storage.local.set({
      supabaseConnected: isSupabaseConnected,
      lastConnectionAttempt: new Date().toISOString(),
    });

    // Start periodic session check
    startPeriodicSessionCheck();

    console.log("Supabase client initialized successfully");
    return true;
  } catch (error) {
    console.error("Error initializing Supabase:", error);
    isSupabaseConnected = false;

    await chrome.storage.local.set({
      supabaseConnected: false,
      lastConnectionError: error.message,
      lastConnectionAttempt: new Date().toISOString(),
    });

    return false;
  }
}

// Handle Supabase initialization request
async function handleInitSupabase(sendResponse) {
  try {
    const success = await initializeSupabase();
    sendResponse({
      success,
      connected: isSupabaseConnected,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in handleInitSupabase:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Handle forced Supabase initialization with retry
async function handleForceInitSupabase(sendResponse) {
  try {
    console.log("Force initializing Supabase...");
    const success = await initializeSupabaseWithRetry();
    sendResponse({
      success,
      connected: isSupabaseConnected,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in handleForceInitSupabase:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Handle Supabase connection test
async function handleTestSupabase(sendResponse) {
  try {
    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected. Please connect first.");
    }

    // Test connection by getting current session
    const {
      data: { session },
      error,
    } = await supabaseClient.auth.getSession();

    if (error && error.message !== "Auth session missing!") {
      throw error;
    }

    sendResponse({
      success: true,
      message: "Supabase connection test successful",
      timestamp: new Date().toISOString(),
      hasSession: !!session,
    });
  } catch (error) {
    console.error("Error testing Supabase:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Handle Supabase status check
async function handleCheckSupabaseStatus(sendResponse) {
  try {
    const storage = await chrome.storage.local.get([
      "supabaseConnected",
      "lastConnectionAttempt",
      "lastConnectionError",
    ]);

    sendResponse({
      connected: isSupabaseConnected,
      lastAttempt: storage.lastConnectionAttempt,
      lastError: storage.lastConnectionError,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error checking Supabase status:", error);
    sendResponse({
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Handle extension info request
async function handleGetExtensionInfo(sendResponse) {
  try {
    const manifest = chrome.runtime.getManifest();
    const storage = await chrome.storage.local.get([
      "extensionVersion",
      "installDate",
    ]);

    sendResponse({
      success: true,
      info: {
        id: chrome.runtime.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        installDate: storage.installDate,
        permissions: manifest.permissions,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting extension info:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Handle save to Supabase
async function handleSaveToSupabase(data, sendResponse) {
  try {
    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected. Please connect first.");
    }

    // Save data to a 'page_captures' table (create this table in your Supabase dashboard)
    const { data: savedData, error } = await supabaseClient
      .from("page_captures")
      .insert([
        {
          url: data.url,
          title: data.title,
          timestamp: data.timestamp,
          extension_id: chrome.runtime.id,
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) throw error;

    sendResponse({
      success: true,
      message: "Data saved to Supabase successfully",
      data: savedData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error saving to Supabase:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Handle capture page data
async function handleCapturePageData(data, sendResponse) {
  try {
    // Store captured data locally first
    await chrome.storage.local.set({
      [`capture_${Date.now()}`]: data,
    });

    // If Supabase is connected, also save there
    if (isSupabaseConnected && supabaseClient) {
      await handleSaveToSupabase(data, (response) => {
        console.log("Auto-saved to Supabase:", response);
      });
    }

    if (sendResponse) {
      sendResponse({
        success: true,
        message: "Page data captured successfully",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error capturing page data:", error);
    if (sendResponse) {
      sendResponse({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// Tab update handler
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    console.log("Tab updated:", tab.url);

    // Send Supabase status to content script
    chrome.tabs
      .sendMessage(tabId, {
        action: "supabaseStatusUpdate",
        connected: isSupabaseConnected,
      })
      .catch(() => {
        // Ignore errors if content script not ready
      });
  }
});

// Error handler
self.addEventListener("error", (event) => {
  console.error("Background script error:", event.error);
});

// Authentication handlers
async function handleSignUp(data, sendResponse) {
  try {
    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected. Please connect first.");
    }

    const { email, password, phone, options = {} } = data;

    let signUpData;
    if (email) {
      signUpData = {
        email,
        password,
        options: {
          ...options,
          emailRedirectTo: `${BACKEND_API_URL}/auth/verify`,
        },
      };
    } else if (phone) {
      signUpData = { phone, password, options };
    } else {
      throw new Error("Email or phone number is required for signup");
    }

    const { data: authData, error } = await supabaseClient.auth.signUp(
      signUpData
    );

    if (error) throw error;

    // Store user data locally
    if (authData.user) {
      await chrome.storage.local.set({
        currentUser: authData.user,
        userSession: authData.session,
        lastAuthAction: new Date().toISOString(),
      });
    }

    sendResponse({
      success: true,
      message: email
        ? "Check your email for verification link"
        : "Check your phone for verification code",
      user: authData.user,
      session: authData.session,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error during signup:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

async function handleSignIn(data, sendResponse) {
  try {
    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected. Please connect first.");
    }

    const { email, password, phone } = data;

    let signInData;
    if (email) {
      signInData = { email, password };
    } else if (phone) {
      signInData = { phone, password };
    } else {
      throw new Error("Email or phone number is required for signin");
    }

    const { data: authData, error } =
      await supabaseClient.auth.signInWithPassword(signInData);

    if (error) throw error;

    // Store user data locally
    await chrome.storage.local.set({
      currentUser: authData.user,
      userSession: authData.session,
      lastAuthAction: new Date().toISOString(),
    });

    sendResponse({
      success: true,
      message: "Successfully signed in",
      user: authData.user,
      session: authData.session,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error during signin:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

async function handleSignOut(sendResponse) {
  try {
    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected. Please connect first.");
    }

    const { error } = await supabaseClient.auth.signOut();

    if (error) throw error;

    // Clear stored user data
    await chrome.storage.local.remove(["currentUser", "userSession"]);
    await chrome.storage.local.set({
      lastAuthAction: new Date().toISOString(),
    });

    sendResponse({
      success: true,
      message: "Successfully signed out",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error during signout:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

async function handleResetPassword(data, sendResponse) {
  try {
    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected. Please connect first.");
    }

    const { email, redirectTo } = data;

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || `${BACKEND_API_URL}/auth/reset-password`,
    });

    if (error) throw error;

    sendResponse({
      success: true,
      message: "Password reset email sent. Check your email for instructions.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error during password reset:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

async function handleUpdatePassword(data, sendResponse) {
  try {
    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected. Please connect first.");
    }

    const { password } = data;

    const { data: authData, error } = await supabaseClient.auth.updateUser({
      password: password,
    });

    if (error) throw error;

    // Update stored user data
    if (authData.user) {
      await chrome.storage.local.set({
        currentUser: authData.user,
        lastAuthAction: new Date().toISOString(),
      });
    }

    sendResponse({
      success: true,
      message: "Password updated successfully",
      user: authData.user,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating password:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

async function handleGetCurrentUser(sendResponse) {
  try {
    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected. Please connect first.");
    }

    // Get current session (this validates tokens)
    const {
      data: { session },
      error: sessionError,
    } = await supabaseClient.auth.getSession();

    if (sessionError && sessionError.message !== "Auth session missing!") {
      console.error("Session error:", sessionError);
      // Clear invalid session data
      await chrome.storage.local.remove([
        "currentUser",
        "userSession",
        "sessionExpiry",
      ]);
      throw sessionError;
    }

    // If we have a valid session, validate it by trying to get user
    if (session && session.access_token) {
      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser();

      if (userError) {
        console.error("User validation error:", userError);
        // Clear invalid session data
        await chrome.storage.local.remove([
          "currentUser",
          "userSession",
          "sessionExpiry",
        ]);
        throw userError;
      }

      if (user) {
        // Session is valid, update storage with current data
        await chrome.storage.local.set({
          currentUser: user,
          userSession: session,
          lastAuthAction: new Date().toISOString(),
          sessionExpiry: session.expires_at
            ? new Date(session.expires_at * 1000).toISOString()
            : null,
        });

        sendResponse({
          success: true,
          user: user,
          session: session,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    // No valid session found
    console.log("No valid session found, clearing storage");
    await chrome.storage.local.remove([
      "currentUser",
      "userSession",
      "sessionExpiry",
    ]);

    sendResponse({
      success: true,
      user: null,
      session: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting current user:", error);
    // Clear potentially corrupted data
    await chrome.storage.local.remove([
      "currentUser",
      "userSession",
      "sessionExpiry",
    ]);

    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Refresh user session - useful after email verification
async function handleRefreshUserSession(sendResponse) {
  try {
    console.log("Refreshing user session...");

    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected. Please connect first.");
    }

    // Force refresh the session
    const {
      data: { session },
      error: refreshError,
    } = await supabaseClient.auth.refreshSession();

    if (refreshError) {
      console.error("Error refreshing session:", refreshError);
      // Try to restore from what's currently available
      await restoreExistingSession();
      // Then check current user
      return handleGetCurrentUser(sendResponse);
    }

    if (session && session.user) {
      console.log(
        "Session refreshed successfully for user:",
        session.user.email
      );

      // Update storage
      await chrome.storage.local.set({
        currentUser: session.user,
        userSession: session,
        lastAuthAction: new Date().toISOString(),
        sessionExpiry: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
      });

      sendResponse({
        success: true,
        user: session.user,
        session: session,
        timestamp: new Date().toISOString(),
      });
    } else {
      // No session after refresh, check what's available
      return handleGetCurrentUser(sendResponse);
    }
  } catch (error) {
    console.error("Error refreshing user session:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Test web app API with token validation and metadata update
async function handleTestWebAppAPI(customMessage, sendResponse) {
  try {
    console.log("Testing web app API with token validation...");

    if (!isSupabaseConnected || !supabaseClient) {
      sendResponse({
        success: false,
        error: "Supabase not connected. Please try refreshing the extension.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Get current session and validate it properly
    const {
      data: { session },
      error: sessionError,
    } = await supabaseClient.auth.getSession();

    if (sessionError) {
      console.error("Error getting session:", sessionError);
      // Clear invalid session data
      await chrome.storage.local.remove([
        "currentUser",
        "userSession",
        "sessionExpiry",
      ]);
      sendResponse({
        success: false,
        error:
          "Session invalid: " + sessionError.message + " Please sign in again.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!session || !session.access_token || !session.refresh_token) {
      console.error("No valid session or tokens found");
      // Clear potentially stale session data
      await chrome.storage.local.remove([
        "currentUser",
        "userSession",
        "sessionExpiry",
      ]);
      sendResponse({
        success: false,
        error: "No valid session found. Please sign in first.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Validate that the session is actually usable by checking user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("Session validation failed:", userError);
      // Clear invalid session data
      await chrome.storage.local.remove([
        "currentUser",
        "userSession",
        "sessionExpiry",
      ]);
      sendResponse({
        success: false,
        error: "Session validation failed. Please sign in again.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Prepare test data with access token, refresh token, and custom message
    const testData = {
      extensionId: chrome.runtime.id,
      timestamp: new Date().toISOString(),
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      customMessage: customMessage || "",
      testMessage:
        "Token validation and metadata update request from Drippler Extension",
    };

    console.log(
      "Sending token validation and metadata update request to web app..."
    );
    console.log(
      "Access token (first 20 chars):",
      session.access_token.substring(0, 20) + "..."
    );
    console.log(
      "Refresh token (first 20 chars):",
      session.refresh_token.substring(0, 20) + "..."
    );
    console.log("Custom message:", customMessage || "(none provided)");

    // Make API call to web app
    const response = await fetch(`${BACKEND_API_URL}/api/test-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData),
    });

    const responseData = await response.json();
    console.log("Web app API response:", responseData);

    if (responseData.success) {
      console.log("✅ Token validation successful!");
      console.log("Validated user:", responseData.user);
    } else {
      console.log("❌ Token validation failed:", responseData.error);
    }

    sendResponse({
      success: true,
      message: "Token validation test completed",
      webAppResponse: responseData,
      tokenValid: responseData.success,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error testing web app API:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Start periodic session check to refresh tokens before they expire
function startPeriodicSessionCheck() {
  // Check every 5 minutes
  const checkInterval = 5 * 60 * 1000; // 5 minutes

  setInterval(async () => {
    try {
      if (!supabaseClient || !isSupabaseConnected) return;

      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession();

      if (error) {
        console.error("Error during periodic session check:", error);
        return;
      }

      if (session) {
        const now = Date.now();
        const expiresAt = session.expires_at * 1000; // Convert to milliseconds
        const timeUntilExpiry = expiresAt - now;
        const refreshThreshold = 10 * 60 * 1000; // Refresh if less than 10 minutes remaining

        console.log(
          `Session check: ${Math.round(
            timeUntilExpiry / 1000 / 60
          )} minutes until expiry`
        );

        if (timeUntilExpiry < refreshThreshold) {
          console.log("Session expires soon, attempting refresh...");

          const { data, error: refreshError } =
            await supabaseClient.auth.refreshSession();

          if (refreshError) {
            console.error("Failed to refresh session:", refreshError);
          } else {
            console.log("Session refreshed successfully");
          }
        }
      }
    } catch (error) {
      console.error("Error in periodic session check:", error);
    }
  }, checkInterval);

  console.log("Started periodic session check (every 5 minutes)");
}

// Restore existing session from storage
async function restoreExistingSession() {
  try {
    console.log("Attempting to restore existing session...");

    // First check if Supabase already has an active session (e.g., from verification)
    const {
      data: { session: existingSession },
      error: existingError,
    } = await supabaseClient.auth.getSession();

    if (existingSession && existingSession.access_token) {
      console.log("Found active Supabase session, validating...");

      // Validate the session by checking user
      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser();

      if (!userError && user) {
        console.log("Active session is valid for user:", user.email);
        // Update storage with the valid session
        await chrome.storage.local.set({
          currentUser: user,
          userSession: existingSession,
          lastAuthAction: new Date().toISOString(),
          sessionExpiry: existingSession.expires_at
            ? new Date(existingSession.expires_at * 1000).toISOString()
            : null,
        });
        return;
      } else {
        console.log("Active session is invalid, clearing...");
        await supabaseClient.auth.signOut();
      }
    }

    // Get stored session data
    const storage = await chrome.storage.local.get([
      "currentUser",
      "userSession",
      "sessionExpiry",
      "sb-" + SUPABASE_CONFIG.url.split("//")[1] + "-auth-token",
    ]);

    if (storage.userSession && storage.userSession.access_token) {
      console.log("Found stored session, attempting to restore...");

      // Check if stored session is expired
      if (storage.sessionExpiry) {
        const expiry = new Date(storage.sessionExpiry);
        if (expiry <= new Date()) {
          console.log("Stored session is expired, clearing...");
          await chrome.storage.local.remove([
            "currentUser",
            "userSession",
            "sessionExpiry",
          ]);
          return;
        }
      }

      // Try to restore the session
      const { data, error } = await supabaseClient.auth.setSession({
        access_token: storage.userSession.access_token,
        refresh_token: storage.userSession.refresh_token,
      });

      if (error) {
        console.error("Error restoring session:", error);
        // Clear invalid session data
        await chrome.storage.local.remove([
          "currentUser",
          "userSession",
          "sessionExpiry",
        ]);
      } else if (data.session && data.user) {
        console.log(
          "Session restored successfully for user:",
          data.user?.email
        );
        // Update stored session with any refreshed tokens
        await chrome.storage.local.set({
          currentUser: data.user,
          userSession: data.session,
          lastAuthAction: new Date().toISOString(),
          sessionExpiry: data.session.expires_at
            ? new Date(data.session.expires_at * 1000).toISOString()
            : null,
        });
      }
    } else {
      console.log("No stored session found");
    }
  } catch (error) {
    console.error("Error during session restoration:", error);
    // Clear potentially corrupted session data
    await chrome.storage.local.remove([
      "currentUser",
      "userSession",
      "sessionExpiry",
    ]);
  }
}

// Listen for auth state changes
async function setupAuthStateListener() {
  if (!supabaseClient) return;

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log("Auth state changed:", event, session?.user?.email);

    // Handle different auth events
    switch (event) {
      case "SIGNED_IN":
        console.log("User signed in successfully");
        break;
      case "SIGNED_OUT":
        console.log("User signed out");
        break;
      case "TOKEN_REFRESHED":
        console.log("Token refreshed successfully");
        break;
      case "USER_UPDATED":
        console.log("User updated");
        break;
      case "PASSWORD_RECOVERY":
        console.log("Password recovery initiated");
        break;
    }

    // Update local storage
    if (session && session.user) {
      console.log("Updating session in storage");
      await chrome.storage.local.set({
        currentUser: session.user,
        userSession: session,
        lastAuthAction: new Date().toISOString(),
        sessionExpiry: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
      });
    } else if (event === "SIGNED_OUT") {
      console.log("Clearing session from storage");
      await chrome.storage.local.remove([
        "currentUser",
        "userSession",
        "sessionExpiry",
      ]);
    }

    // Notify all tabs about auth state change
    try {
      const tabs = await chrome.tabs.query({});
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs
            .sendMessage(tab.id, {
              action: "authStateChanged",
              event: event,
              user: session?.user || null,
              session: session,
            })
            .catch(() => {
              // Ignore errors if content script not ready
            });
        }
      });
    } catch (error) {
      console.error("Error notifying tabs of auth change:", error);
    }
  });
}

// Setup context menus
function setupContextMenus() {
  try {
    // Remove any existing context menus
    chrome.contextMenus.removeAll(() => {
      // Create context menu for images
      chrome.contextMenus.create({
        id: "save-image-as-clothing",
        title: "Add to Drippler Wardrobe",
        contexts: ["image"],
        documentUrlPatterns: ["http://*/*", "https://*/*"],
      });

      console.log("Context menus setup successfully");
    });
  } catch (error) {
    console.error("Error setting up context menus:", error);
  }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    console.log("Context menu clicked:", info.menuItemId);

    if (info.menuItemId === "save-image-as-clothing") {
      // Check if user is authenticated
      const {
        data: { session },
        error: sessionError,
      } = await supabaseClient.auth.getSession();

      if (sessionError || !session) {
        // Show popup to sign in
        chrome.action.openPopup();
        return;
      }

      // Save the image URL as clothing item
      const imageUrl = info.srcUrl;
      const pageUrl = info.pageUrl;
      const pageTitle = tab.title;

      await handleSaveImageAsClothing(
        {
          imageUrl,
          pageUrl,
          pageTitle,
          source: "context_menu",
        },
        (response) => {
          if (response.success) {
            // Show notification
            chrome.notifications.create({
              type: "basic",
              iconUrl: "icons/icon48.png",
              title: "Drippler",
              message: "Clothing item added to your wardrobe!",
            });
          } else {
            console.error("Failed to save clothing item:", response.error);
          }
        }
      );
    }
  } catch (error) {
    console.error("Error handling context menu click:", error);
  }
});

// Helper function to convert image URL to blob
async function urlToBlob(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    return await response.blob();
  } catch (error) {
    console.error("Error converting URL to blob:", error);
    throw error;
  }
}

// Helper function to upload file to Supabase Storage
async function uploadToSupabaseStorage(file, bucket, path) {
  try {
    console.log(`Uploading file to ${bucket}/${path}`, {
      fileSize: file.size,
      fileType: file.type,
      bucketName: bucket,
      filePath: path,
    });

    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("Storage upload error:", error);
      console.error("Storage error details:", JSON.stringify(error, null, 2));
      throw error;
    }

    console.log("Storage upload data:", data);

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(path);

    console.log("Generated public URL:", urlData);

    return {
      path: data.path,
      publicUrl: urlData.publicUrl,
    };
  } catch (error) {
    console.error("Error uploading to Supabase Storage:", error);
    console.error("Full storage error:", JSON.stringify(error, null, 2));
    throw error;
  }
}

// Handle profile image upload
async function handleUploadProfileImage(data, sendResponse) {
  try {
    console.log("Uploading profile image...");
    console.log("Received file data:", {
      hasFileData: !!data.fileData,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      encoding: data.encoding,
      dataLength: data.fileData?.length || data.fileData?.byteLength,
    });

    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected");
    }

    // Validate session
    const {
      data: { session },
      error: sessionError,
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Authentication required");
    }

    const { fileData, fileName, fileType, fileSize } = data;
    const userId = session.user.id;

    console.log("Profile upload - User info:", {
      userId: userId,
      userEmail: session.user.email,
      sessionValid: !!session,
      userRole: session.user.role,
    });

    if (!fileData) {
      throw new Error("No file data received");
    }

    // Get file extension safely
    let fileExtension = "jpg"; // default extension
    if (fileName && typeof fileName === "string") {
      const nameParts = fileName.split(".");
      if (nameParts.length > 1) {
        fileExtension = nameParts.pop();
      }
    } else if (fileType) {
      // Try to get extension from MIME type
      const mimeToExt = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "image/svg+xml": "svg",
      };
      fileExtension = mimeToExt[fileType] || "jpg";
    }

    const uploadFileName = `profile-${userId}-${Date.now()}.${fileExtension}`;

    // Create blob from base64 data
    console.log("Creating blob from base64 data:", {
      base64Length: fileData.length,
      originalFileType: fileType,
      originalFileName: fileName,
      encoding: data.encoding,
    });

    let fileBlob;
    if (data.encoding === "base64") {
      // Convert base64 to binary
      const binaryString = atob(fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileBlob = new Blob([bytes], { type: fileType || "image/jpeg" });
    } else {
      // Fallback for ArrayBuffer (if still used)
      fileBlob = new Blob([fileData], { type: fileType || "image/jpeg" });
    }

    console.log("Created blob:", {
      blobSize: fileBlob.size,
      blobType: fileBlob.type,
      originalFileSize: fileSize,
    });

    // Upload to Supabase Storage
    console.log("About to upload to storage:", {
      bucket: "profile-images",
      fileName: uploadFileName,
      blobSize: fileBlob.size,
      blobType: fileBlob.type,
    });

    const uploadResult = await uploadToSupabaseStorage(
      fileBlob,
      "profile-images",
      uploadFileName
    );

    console.log("Storage upload successful:", uploadResult);

    // First, get the current profile to check for existing image
    const { data: existingProfile } = await supabaseClient
      .from("profiles")
      .select("profile_image_url")
      .eq("id", userId)
      .single();

    // Delete old profile image if it exists and is an uploaded file (not a URL)
    if (existingProfile?.profile_image_url) {
      const oldImageUrl = existingProfile.profile_image_url;
      console.log("Found existing profile image:", oldImageUrl);

      // Check if it's an uploaded file (contains our bucket URL pattern)
      if (oldImageUrl.includes("profile-images/profile-")) {
        try {
          // Extract the file path from the URL
          const urlParts = oldImageUrl.split("/");
          const fileName = urlParts[urlParts.length - 1];

          console.log("Deleting old profile image:", fileName);
          const { error: deleteError } = await supabaseClient.storage
            .from("profile-images")
            .remove([fileName]);

          if (deleteError) {
            console.warn("Could not delete old profile image:", deleteError);
            // Don't throw - we still want to continue with the upload
          } else {
            console.log("Old profile image deleted successfully");
          }
        } catch (deleteErr) {
          console.warn("Error during old image deletion:", deleteErr);
        }
      }
    }

    // Update user profile with new image URL
    console.log("Attempting to upsert profile with data:", {
      id: userId,
      profile_image_url: uploadResult.publicUrl,
      updated_at: new Date().toISOString(),
    });

    const { error: updateError } = await supabaseClient
      .from("profiles")
      .upsert({
        id: userId,
        profile_image_url: uploadResult.publicUrl,
        updated_at: new Date().toISOString(),
      });

    if (updateError) {
      console.error("Error updating profile:", updateError);
      console.error(
        "Full error details:",
        JSON.stringify(updateError, null, 2)
      );
      throw updateError;
    }

    // Also update user metadata for immediate access
    console.log("Updating user metadata with avatar_url");
    const { error: metadataError } = await supabaseClient.auth.updateUser({
      data: { avatar_url: uploadResult.publicUrl },
    });

    if (metadataError) {
      console.warn("Could not update user metadata:", metadataError);
      // Don't throw - profile table update is more important
    }

    console.log("Profile image uploaded successfully:", uploadResult.publicUrl);

    sendResponse({
      success: true,
      data: {
        imageUrl: uploadResult.publicUrl,
        path: uploadResult.path,
      },
      message: "Profile image uploaded successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error uploading profile image:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Handle clothing item upload
async function handleUploadClothingItem(data, sendResponse) {
  try {
    console.log("Uploading clothing item...");

    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected");
    }

    // Validate session
    const {
      data: { session },
      error: sessionError,
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Authentication required");
    }

    const {
      fileData,
      fileName,
      fileType,
      fileSize,
      name,
      category,
      tags = [],
    } = data;
    const userId = session.user.id;

    if (!fileData) {
      throw new Error("No file data received");
    }

    // Get file extension safely
    let fileExtension = "jpg"; // default extension
    if (fileName && typeof fileName === "string") {
      const nameParts = fileName.split(".");
      if (nameParts.length > 1) {
        fileExtension = nameParts.pop();
      }
    } else if (fileType) {
      // Try to get extension from MIME type
      const mimeToExt = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "image/svg+xml": "svg",
      };
      fileExtension = mimeToExt[fileType] || "jpg";
    }

    const uploadFileName = `clothing-${userId}-${Date.now()}.${fileExtension}`;

    // Create blob from base64 data or ArrayBuffer
    let fileBlob;
    if (data.encoding === "base64") {
      // Convert base64 to binary
      const binaryString = atob(fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileBlob = new Blob([bytes], { type: fileType || "image/jpeg" });
    } else {
      // Fallback for ArrayBuffer (if still used)
      fileBlob = new Blob([fileData], { type: fileType || "image/jpeg" });
    }

    // Upload to Supabase Storage
    const uploadResult = await uploadToSupabaseStorage(
      fileBlob,
      "clothing-items",
      uploadFileName
    );

    // Save clothing item to database
    const { data: clothingData, error: insertError } = await supabaseClient
      .from("clothing_items")
      .insert({
        user_id: userId,
        name: name || "Unnamed Item",
        category: category || "uncategorized",
        image_url: uploadResult.publicUrl,
        image_path: uploadResult.path,
        tags: tags,
        source: "upload",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error saving clothing item:", insertError);
      throw insertError;
    }

    console.log("Clothing item uploaded successfully:", clothingData);

    sendResponse({
      success: true,
      data: clothingData,
      message: "Clothing item uploaded successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error uploading clothing item:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Handle saving image from web as clothing item
async function handleSaveImageAsClothing(data, sendResponse) {
  try {
    console.log("Saving image as clothing item...");

    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected");
    }

    // Validate session
    const {
      data: { session },
      error: sessionError,
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Authentication required");
    }

    const { imageUrl, pageUrl, pageTitle, source = "web" } = data;
    const userId = session.user.id;

    // For web images, we'll store the URL directly instead of downloading
    // This is more efficient and avoids copyright issues

    // Save clothing item to database
    const { data: clothingData, error: insertError } = await supabaseClient
      .from("clothing_items")
      .insert({
        user_id: userId,
        name: `Item from ${new URL(pageUrl).hostname}`,
        category: "uncategorized",
        image_url: imageUrl,
        source_url: pageUrl,
        source_title: pageTitle,
        source: source,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error saving clothing item:", insertError);
      throw insertError;
    }

    console.log("Web image saved as clothing item:", clothingData);

    sendResponse({
      success: true,
      data: clothingData,
      message: "Image added to wardrobe successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error saving image as clothing item:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Handle getting clothing items
async function handleGetClothingItems(sendResponse) {
  try {
    console.log("Getting clothing items...");

    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected");
    }

    // Validate session
    const {
      data: { session },
      error: sessionError,
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Authentication required");
    }

    const userId = session.user.id;

    // Get clothing items for user
    const { data: clothingItems, error: fetchError } = await supabaseClient
      .from("clothing_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching clothing items:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${clothingItems.length} clothing items`);

    sendResponse({
      success: true,
      data: clothingItems,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting clothing items:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Handle deleting clothing item
async function handleDeleteClothingItem(data, sendResponse) {
  try {
    console.log("Deleting clothing item...");

    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected");
    }

    // Validate session
    const {
      data: { session },
      error: sessionError,
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Authentication required");
    }

    const { itemId } = data;
    const userId = session.user.id;

    // Get item details first to check ownership and get file path
    const { data: item, error: fetchError } = await supabaseClient
      .from("clothing_items")
      .select("*")
      .eq("id", itemId)
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      console.error("Error fetching item for deletion:", fetchError);
      throw fetchError;
    }

    if (!item) {
      throw new Error("Item not found or access denied");
    }

    // Delete from database
    const { error: deleteError } = await supabaseClient
      .from("clothing_items")
      .delete()
      .eq("id", itemId)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Error deleting clothing item:", deleteError);
      throw deleteError;
    }

    // Delete file from storage if it's an uploaded file (has image_path)
    if (item.image_path) {
      try {
        await supabaseClient.storage
          .from("clothing-items")
          .remove([item.image_path]);
        console.log("File deleted from storage:", item.image_path);
      } catch (storageError) {
        console.warn("Could not delete file from storage:", storageError);
        // Don't fail the whole operation if storage deletion fails
      }
    }

    console.log("Clothing item deleted successfully");

    sendResponse({
      success: true,
      message: "Clothing item deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting clothing item:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Handle get user profile
async function handleGetUserProfile(sendResponse) {
  try {
    console.log("Getting user profile...");

    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected");
    }

    // Validate session
    const {
      data: { session },
      error: sessionError,
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Authentication required");
    }

    const userId = session.user.id;

    // Get user profile from profiles table
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      // PGRST116 is "no rows returned" - that's ok, means no profile exists yet
      console.error("Error fetching profile:", profileError);
      throw profileError;
    }

    console.log("User profile retrieved:", profile ? "found" : "not found");

    sendResponse({
      success: true,
      profile: profile || null,
      message: profile ? "Profile found" : "No profile found",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting user profile:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Handle virtual try-on generation
async function handleGenerateVirtualTryOn(data, sendResponse) {
  try {
    console.log("Generating virtual try-on...");

    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected");
    }

    // Validate session
    const {
      data: { session },
      error: sessionError,
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Authentication required");
    }

    const { userImageUrl, clothingImageUrl, clothingName } = data;

    if (!userImageUrl || !clothingImageUrl) {
      throw new Error("Both user image and clothing image URLs are required");
    }

    // Get the webapp URL from stored settings or environment
    const webappUrl = await getWebappUrl();

    // Make request to NextJS API with image URLs (let backend fetch them)
    console.log("Calling NextJS API for virtual try-on...");
    const response = await fetch(`${webappUrl}/api/virtual-try-on`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Pass session token as custom header for verification
        "X-Supabase-Auth": session.access_token,
      },
      body: JSON.stringify({
        userImageUrl,
        clothingImageUrl,
        clothingName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 402) {
        // Payment required - generation limit exceeded
        sendResponse({
          success: false,
          error: "Generation limit exceeded",
          message: errorData.message || "You have reached the generation limit",
          generationCount: errorData.generationCount,
          maxGenerations: errorData.maxGenerations,
          remainingGenerations: errorData.remainingGenerations || 0,
        });
        return;
      }

      throw new Error(
        errorData.error || `API request failed: ${response.status}`
      );
    }

    const responseData = await response.json();

    console.log("Virtual try-on generated successfully");

    sendResponse({
      success: true,
      data: responseData.data,
      message: "Virtual try-on generated successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating virtual try-on:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Helper function to get webapp URL
async function getWebappUrl() {
  try {
    const result = await chrome.storage.local.get("webappUrl");
    return result.webappUrl || BACKEND_API_URL; // Default to production URL
  } catch (error) {
    console.warn("Failed to get webapp URL from storage, using default");
    return BACKEND_API_URL;
  }
}

// Handle get try-on generations
async function handleGetTryOnGenerations(sendResponse) {
  try {
    console.log("Getting try-on generations...");

    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected");
    }

    // Validate session
    const {
      data: { session },
      error: sessionError,
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Authentication required");
    }

    const webappUrl = await getWebappUrl();

    // Make request to NextJS API to get generations
    const response = await fetch(`${webappUrl}/api/virtual-try-on`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Supabase-Auth": session.access_token,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `API request failed: ${response.status}`
      );
    }

    const responseData = await response.json();

    console.log("Try-on generations retrieved successfully");

    sendResponse({
      success: true,
      data: responseData.data, // Pass the complete data object including counts
      message: "Try-on generations retrieved successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting try-on generations:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Handle delete try-on generation
async function handleDeleteTryOnGeneration(data, sendResponse) {
  try {
    console.log("Deleting try-on generation...");

    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected");
    }

    // Validate session
    const {
      data: { session },
      error: sessionError,
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Authentication required");
    }

    const { generationId } = data;
    const userId = session.user.id;

    if (!generationId) {
      throw new Error("Generation ID is required");
    }

    // Get the generation record to find the image file
    const { data: generation, error: fetchError } = await supabaseClient
      .from("virtual_try_on_generations")
      .select("*")
      .eq("id", generationId)
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      console.error("Error fetching generation:", fetchError);
      throw new Error("Generation not found");
    }

    // Delete the image file from storage if it exists
    if (
      generation.generated_image_url &&
      generation.generated_image_url.includes("virtual-try-on-generations/")
    ) {
      try {
        const urlParts = generation.generated_image_url.split("/");
        const fileName = urlParts[urlParts.length - 1];

        const { error: deleteError } = await supabaseClient.storage
          .from("virtual-try-on-generations")
          .remove([fileName]);

        if (deleteError) {
          console.warn("Could not delete generation image file:", deleteError);
        }
      } catch (deleteErr) {
        console.warn("Error during generation image deletion:", deleteErr);
      }
    }

    // Delete the database record
    const { error: deleteError } = await supabaseClient
      .from("virtual_try_on_generations")
      .delete()
      .eq("id", generationId)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Error deleting generation record:", deleteError);
      throw deleteError;
    }

    console.log("Try-on generation deleted successfully");

    sendResponse({
      success: true,
      message: "Try-on generation deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting try-on generation:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Handle delete account
async function handleDeleteAccount(sendResponse) {
  try {
    console.log("Deleting user account...");

    if (!isSupabaseConnected || !supabaseClient) {
      throw new Error("Supabase not connected");
    }

    // Validate session
    const {
      data: { session },
      error: sessionError,
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Authentication required");
    }

    const userId = session.user.id;

    // Delete user data from all tables
    // Note: This should be done in order due to foreign key constraints

    // 1. Delete try-on generations and their files
    const { data: generations } = await supabaseClient
      .from("virtual_try_on_generations")
      .select("generated_image_url")
      .eq("user_id", userId);

    if (generations) {
      for (const generation of generations) {
        if (
          generation.generated_image_url &&
          generation.generated_image_url.includes("virtual-try-on-generations/")
        ) {
          try {
            const urlParts = generation.generated_image_url.split("/");
            const fileName = urlParts[urlParts.length - 1];
            await supabaseClient.storage
              .from("virtual-try-on-generations")
              .remove([fileName]);
          } catch (err) {
            console.warn("Error deleting generation file:", err);
          }
        }
      }
    }

    await supabaseClient
      .from("virtual_try_on_generations")
      .delete()
      .eq("user_id", userId);

    // 2. Delete clothing items and their files
    const { data: clothingItems } = await supabaseClient
      .from("clothing_items")
      .select("image_url")
      .eq("user_id", userId);

    if (clothingItems) {
      for (const item of clothingItems) {
        if (
          item.image_url &&
          item.image_url.includes("clothing-items/clothing-")
        ) {
          try {
            const urlParts = item.image_url.split("/");
            const fileName = urlParts[urlParts.length - 1];
            await supabaseClient.storage
              .from("clothing-items")
              .remove([fileName]);
          } catch (err) {
            console.warn("Error deleting clothing file:", err);
          }
        }
      }
    }

    await supabaseClient.from("clothing_items").delete().eq("user_id", userId);

    // 3. Delete profile and profile image
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("profile_image_url")
      .eq("id", userId)
      .single();

    if (
      profile?.profile_image_url &&
      profile.profile_image_url.includes("profile-images/profile-")
    ) {
      try {
        const urlParts = profile.profile_image_url.split("/");
        const fileName = urlParts[urlParts.length - 1];
        await supabaseClient.storage.from("profile-images").remove([fileName]);
      } catch (err) {
        console.warn("Error deleting profile image:", err);
      }
    }

    await supabaseClient.from("profiles").delete().eq("id", userId);

    // 4. Finally, delete the user account
    const { error: deleteUserError } =
      await supabaseClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error("Error deleting user account:", deleteUserError);
      // Try alternative method if admin method fails
      await supabaseClient.auth.signOut();
    }

    console.log("User account deleted successfully");

    sendResponse({
      success: true,
      message: "Account deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    sendResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Utility function for file extensions
function getFileExtension(fileName, fileType) {
  // Try to get extension from file name first
  if (fileName && fileName.includes(".")) {
    const parts = fileName.split(".");
    return parts[parts.length - 1].toLowerCase();
  }

  // Fallback to MIME type mapping
  const mimeTypeMap = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
  };

  return mimeTypeMap[fileType] || "jpg"; // Default to jpg
}

// Avatar management functions
async function handleUploadAvatar(data, sendResponse) {
  try {
    if (!supabaseClient) {
      sendResponse({ success: false, error: "Supabase not initialized" });
      return;
    }

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      sendResponse({ success: false, error: "User not authenticated" });
      return;
    }

    console.log("Uploading avatar for user:", user.id);
    console.log("File data received, size:", data.fileSize);

    // Extract base64 data (remove data:image/jpeg;base64, prefix)
    const base64String = data.fileData.split(",")[1];
    const fileExtension = getFileExtension(data.fileName, data.fileType);

    // Create unique filename with user folder for RLS
    const fileName = `${user.id}/avatar-${Date.now()}.${fileExtension}`;

    // Convert base64 to Uint8Array
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to storage
    const { data: uploadData, error: uploadError } =
      await supabaseClient.storage.from("avatars").upload(fileName, bytes, {
        contentType: data.fileType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      sendResponse({
        success: false,
        error: `Upload failed: ${uploadError.message}`,
      });
      return;
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from("avatars")
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      sendResponse({ success: false, error: "Failed to get public URL" });
      return;
    }

    // Check if user has any avatars already
    const { data: existingAvatars } = await supabaseClient
      .from("user_avatars")
      .select("id")
      .eq("user_id", user.id);

    const isFirstAvatar = !existingAvatars || existingAvatars.length === 0;

    // Save avatar record to database
    const { data: avatarData, error: avatarError } = await supabaseClient
      .from("user_avatars")
      .insert([
        {
          user_id: user.id,
          image_url: urlData.publicUrl,
          file_name: fileName,
          is_active: isFirstAvatar, // First avatar becomes active automatically
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (avatarError) {
      console.error("Database error:", avatarError);
      // Clean up uploaded file
      await supabaseClient.storage.from("avatars").remove([fileName]);
      sendResponse({
        success: false,
        error: `Database error: ${avatarError.message}`,
      });
      return;
    }

    console.log("Avatar uploaded successfully:", avatarData);
    sendResponse({
      success: true,
      avatar: avatarData,
      message: isFirstAvatar
        ? "Avatar uploaded and set as active!"
        : "Avatar uploaded successfully!",
    });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetAvatars(sendResponse) {
  try {
    if (!supabaseClient) {
      sendResponse({ success: false, error: "Supabase not initialized" });
      return;
    }

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      sendResponse({ success: false, error: "User not authenticated" });
      return;
    }

    const { data: avatars, error } = await supabaseClient
      .from("user_avatars")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error getting avatars:", error);
      sendResponse({ success: false, error: error.message });
      return;
    }

    sendResponse({ success: true, avatars: avatars || [] });
  } catch (error) {
    console.error("Error getting avatars:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetActiveAvatar(sendResponse) {
  try {
    if (!supabaseClient) {
      sendResponse({ success: false, error: "Supabase not initialized" });
      return;
    }

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      sendResponse({ success: false, error: "User not authenticated" });
      return;
    }

    const { data: avatar, error } = await supabaseClient
      .from("user_avatars")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found
      console.error("Error getting active avatar:", error);
      sendResponse({ success: false, error: error.message });
      return;
    }

    sendResponse({ success: true, avatar: avatar || null });
  } catch (error) {
    console.error("Error getting active avatar:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSetActiveAvatar(avatarId, sendResponse) {
  try {
    if (!supabaseClient) {
      sendResponse({ success: false, error: "Supabase not initialized" });
      return;
    }

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      sendResponse({ success: false, error: "User not authenticated" });
      return;
    }

    // First, deactivate all avatars for this user
    const { error: deactivateError } = await supabaseClient
      .from("user_avatars")
      .update({ is_active: false })
      .eq("user_id", user.id);

    if (deactivateError) {
      console.error("Error deactivating avatars:", deactivateError);
      sendResponse({ success: false, error: deactivateError.message });
      return;
    }

    // Then, activate the selected avatar
    const { data: avatar, error: activateError } = await supabaseClient
      .from("user_avatars")
      .update({ is_active: true })
      .eq("id", avatarId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (activateError) {
      console.error("Error activating avatar:", activateError);
      sendResponse({ success: false, error: activateError.message });
      return;
    }

    sendResponse({ success: true, avatar });
  } catch (error) {
    console.error("Error setting active avatar:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleDeleteAvatar(avatarId, sendResponse) {
  try {
    if (!supabaseClient) {
      sendResponse({ success: false, error: "Supabase not initialized" });
      return;
    }

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      sendResponse({ success: false, error: "User not authenticated" });
      return;
    }

    // Get avatar info before deleting
    const { data: avatar, error: getError } = await supabaseClient
      .from("user_avatars")
      .select("*")
      .eq("id", avatarId)
      .eq("user_id", user.id)
      .single();

    if (getError) {
      console.error("Error getting avatar:", getError);
      sendResponse({ success: false, error: getError.message });
      return;
    }

    // Delete from storage
    const fileName = avatar.file_name;
    const { error: storageError } = await supabaseClient.storage
      .from("avatars")
      .remove([fileName]);

    if (storageError) {
      console.error("Error deleting from storage:", storageError);
    }

    // Delete from database
    const { error: deleteError } = await supabaseClient
      .from("user_avatars")
      .delete()
      .eq("id", avatarId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting avatar:", deleteError);
      sendResponse({ success: false, error: deleteError.message });
      return;
    }

    // If deleted avatar was active, make the first remaining avatar active
    if (avatar.is_active) {
      const { data: remainingAvatars } = await supabaseClient
        .from("user_avatars")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (remainingAvatars && remainingAvatars.length > 0) {
        await supabaseClient
          .from("user_avatars")
          .update({ is_active: true })
          .eq("id", remainingAvatars[0].id);
      }
    }

    sendResponse({ success: true });
  } catch (error) {
    console.error("Error deleting avatar:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// Add avatar from URL (for try-on results already in Supabase)
async function handleAddAvatarFromUrl(data, sendResponse) {
  try {
    if (!supabaseClient) {
      sendResponse({ success: false, error: "Supabase not initialized" });
      return;
    }

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      sendResponse({ success: false, error: "User not authenticated" });
      return;
    }

    console.log("Adding avatar from URL for user:", user.id);

    // Create avatar record in database with the URL
    const { data: avatar, error: insertError } = await supabaseClient
      .from("user_avatars")
      .insert({
        user_id: user.id,
        image_url: data.imageUrl,
        file_name: `avatar-from-tryon-${Date.now()}.jpg`, // Virtual filename for consistency
        is_active: false, // New avatars are not active by default
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating avatar record:", insertError);
      sendResponse({ success: false, error: insertError.message });
      return;
    }

    console.log("Avatar created successfully:", avatar.id);
    sendResponse({ success: true, avatar });
  } catch (error) {
    console.error("Error adding avatar from URL:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle opening popup
async function handleOpenPopup(sendResponse) {
  try {
    await chrome.action.openPopup();
    sendResponse({ success: true });
  } catch (error) {
    console.error("Error opening popup:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// Unhandled promise rejection handler
self.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection in background:", event.reason);
});
