// Shared Supabase utility functions for Drippler Extension

/**
 * Universal Supabase call wrapper with auto-retry
 * Handles background script disconnections and Supabase connection issues
 *
 * @param {string} action - The action to send to background script
 * @param {Object} data - Additional data to send with the action
 * @returns {Promise<Object>} Response from background script
 */
export async function supabaseCall(action, data = {}) {
  try {
    const response = await chrome.runtime.sendMessage({ action, ...data });

    // If Supabase connection lost, retry once
    if (response && !response.success && response.error?.includes('Supabase not connected')) {
      console.log("Supabase connection lost, attempting to reconnect...");

      // Try to reinitialize Supabase
      await chrome.runtime.sendMessage({ action: "initSupabase" });

      // Wait a bit for initialization
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Retry the original call
      return await chrome.runtime.sendMessage({ action, ...data });
    }

    return response;
  } catch (error) {
    console.error("Error in supabaseCall:", error);

    // If it's a connection error, it might be background script died
    if (error.message?.includes('Could not establish connection') ||
        error.message?.includes('Extension context invalidated')) {

      console.log("Background script connection lost, attempting recovery...");

      // Wait a moment and try to reconnect
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        // Try to wake up the background script and initialize Supabase
        await chrome.runtime.sendMessage({ action: "initSupabase" });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Retry the original call
        return await chrome.runtime.sendMessage({ action, ...data });
      } catch (retryError) {
        console.error("Failed to recover from background script disconnection:", retryError);
        return {
          success: false,
          error: "Extension connection lost. Please refresh the page and try again.",
        };
      }
    }

    return {
      success: false,
      error: error.message || "Unknown error occurred",
    };
  }
}

/**
 * Check if user is authenticated with retry logic
 * Specifically designed to handle Safari session timeout issues
 *
 * @returns {Promise<Object>} { authenticated: boolean, user: Object|null, error: string|null }
 */
export async function checkAuthenticationWithRetry() {
  try {
    console.log("Checking authentication...");

    // First attempt - check current user
    let authResponse = await supabaseCall("getCurrentUser");

    // If auth check fails, try refreshing session
    if (!authResponse.success || !authResponse.user) {
      console.log("Initial auth check failed, trying session refresh...");

      try {
        const refreshResponse = await supabaseCall("refreshUserSession");

        if (refreshResponse.success && refreshResponse.user) {
          console.log("Session refresh successful, user authenticated");
          authResponse = refreshResponse;
        }
      } catch (refreshError) {
        console.warn("Session refresh failed:", refreshError);
      }
    }

    if (authResponse.success && authResponse.user) {
      console.log("User is authenticated:", authResponse.user.email);
      return {
        authenticated: true,
        user: authResponse.user,
        error: null
      };
    } else {
      console.log("User is not authenticated");
      return {
        authenticated: false,
        user: null,
        error: authResponse.error || "Authentication required"
      };
    }
  } catch (error) {
    console.error("Error during authentication check:", error);
    return {
      authenticated: false,
      user: null,
      error: error.message || "Authentication check failed"
    };
  }
}