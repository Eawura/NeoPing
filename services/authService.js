import api from "../utils/api";
import storage from "../utils/storage";
import { Platform } from "react-native";

/**
 * Login user with username and password
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @returns {Promise<Object>} User data and tokens
 */
export const login = async (username, password) => {
  try {
    console.log("[Auth] Attempting login with username:", username);

    // Clear any existing tokens first
    console.log("[Auth] Clearing existing tokens...");
    await Promise.all([
      storage
        .deleteItem("auth_token")
        .catch((e) => console.warn("Error clearing auth_token:", e)),
      storage
        .deleteItem("refresh_token")
        .catch((e) => console.warn("Error clearing refresh_token:", e)),
    ]);

    // List all keys before login (for debugging)
    console.log("[Auth] Storage state before login:");
    await storage
      .listKeys()
      .catch((e) => console.warn("Error listing keys:", e));

    if (Platform.OS === "web" && typeof window !== "undefined") {
      console.log("[Auth] localStorage before login:", { ...localStorage });
    }

    const response = await api.post("/auth/login", {
      username,
      password,
    });

    const { token: accessToken, refreshToken, ...userData } = response.data;

    if (!accessToken) {
      throw new Error("No access token received from server");
    }

    console.log("[Auth] Login successful, storing tokens...");
    console.log(
      "[Auth] Access token length:",
      accessToken?.length || "undefined"
    );
    console.log(
      "[Auth] Refresh token length:",
      refreshToken?.length || "undefined"
    );

    await storage.setItem("auth_token", accessToken);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      localStorage.setItem("auth_token", accessToken);
    }

    if (refreshToken) {
      await storage.setItem("refresh_token", refreshToken);
      if (Platform.OS === "web" && typeof window !== "undefined") {
        localStorage.setItem("refresh_token", refreshToken);
      }
    }

    const storedAuthToken = await storage.getItem("auth_token");
    const storedRefreshToken = await storage.getItem("refresh_token");

    console.log("[Auth] Verifying token storage...");
    console.log(
      "- auth_token in storage:",
      storedAuthToken ? `Found (${storedAuthToken.length} chars)` : "MISSING"
    );
    console.log(
      "- refresh_token in storage:",
      storedRefreshToken
        ? `Found (${storedRefreshToken.length} chars)`
        : "Not provided"
    );

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const webAuthToken = localStorage.getItem("auth_token");
      const webRefreshToken = localStorage.getItem("refresh_token");
      console.log("[Auth] localStorage verification results:");
      console.log(
        "- auth_token in localStorage:",
        webAuthToken ? `Found (${webAuthToken.length} chars)` : "MISSING"
      );
      console.log(
        "- refresh_token in localStorage:",
        webRefreshToken
          ? `Found (${webRefreshToken.length} chars)`
          : "Not provided"
      );
    }

    if (!storedAuthToken) {
      throw new Error("Failed to store authentication token in storage");
    }

    await storage
      .listKeys()
      .catch((e) => console.warn("Error listing keys:", e));

    if (typeof window !== "undefined") {
      window.__isAuthenticated = true;
    }

    return userData;
  } catch (error) {
    console.error("Login error details:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
      },
    });

    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to login. Please check your credentials and try again.";

    throw new Error(errorMessage);
  }
};

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Response data
 */
export const register = async (userData) => {
  try {
    const response = await api.post("/auth/signup", userData);
    return response.data;
  } catch (error) {
    console.error("Registration error:", error);
    throw error.response?.data || error.message;
  }
};

/**
 * Logout the current user
 */
export const logout = async () => {
  try {
    await storage.deleteItem("auth_token");
    await storage.deleteItem("refresh_token");
    return true;
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} True if authenticated
 */
export const isAuthenticated = async () => {
  try {
    const token = await storage.getItem("auth_token");
    return !!token;
  } catch (error) {
    console.error("Auth check error:", error);
    return false;
  }
};

/**
 * Get the current user's profile
 * @returns {Promise<Object>} User profile data
 */
export const getCurrentUser = async () => {
  try {
    const response = await api.get("/auth/me");
    return response.data;
  } catch (error) {
    console.error("Get current user error:", error);
    throw error.response?.data || error.message;
  }
};

/**
 * Refresh JWT using the refresh token
 * @param {string} refreshToken
 * @param {string} username
 * @returns {Promise<Object>} New authentication response
 */
export const refreshToken = async (refreshToken, username) => {
  try {
    const response = await api.post("/auth/refresh/token", {
      refreshToken,
      username,
    });
    return response.data;
  } catch (error) {
    console.error("Refresh token error:", error);
    throw error.response?.data || error.message;
  }
};
