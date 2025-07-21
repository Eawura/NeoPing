import axios from "axios";
import { Platform } from "react-native";
import storage from "./storage";

// Update your getApiUrl function with better debugging:
const getApiUrl = () => {
  const LOCAL_IP = "192.168.100.6"; // Your IP from ipconfig
  const PORT = "8082";

  let apiUrl;

  if (Platform.OS === "web") {
    apiUrl = `http://localhost:${PORT}/api`;
  } else {
    apiUrl = `http://${LOCAL_IP}:${PORT}/api`;
  }

  console.log(`[API] Platform: ${Platform.OS}`);
  console.log(`[API] Selected API URL: ${apiUrl}`);

  return apiUrl;
};

const API_URL = getApiUrl();
console.log(`[API] Final API_URL: ${API_URL}`);

// Helper function to test the connection
export const testConnection = async () => {
  try {
    console.log(`Testing connection to: ${API_URL}/health`);
    const response = await fetch(`${API_URL}/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
    });

    // Even if we get a 401, the backend is reachable
    if (response.status === 401) {
      console.log("Backend is reachable but requires authentication");
      return {
        success: true,
        data: {
          status: "protected",
          message: "Health endpoint requires authentication",
        },
      };
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Connection test failed:", error);
    return {
      success: false,
      error: error.message || "Unknown error",
      suggestion: `
        Make sure:
        1. Backend is running on ${API_URL}
        2. CORS is properly configured on the backend
        3. Network connection is stable
        4. No firewall is blocking the connection
      `,
    };
  }
};

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 150000, // 15 seconds
  withCredentials: true, // Important for cookies if using them
});

// Request interceptor for adding auth token and logging
api.interceptors.request.use(
  async (config) => {
    // Skip logging for health check to reduce noise
    if (!config.url.endsWith("/health")) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
        headers: config.headers,
      });
    }

    // Don't add auth header for login/signup/refresh-token endpoints
    const publicEndpoints = [
      "/auth/login",
      "/auth/signup",
      "/auth/refresh-token",
    ];
    const isPublicEndpoint = publicEndpoints.some((endpoint) =>
      config.url.endsWith(endpoint)
    );

    if (!isPublicEndpoint) {
      try {
        // List all keys in storage for debugging
        await storage.listKeys();

        // Get the token with more detailed logging
        console.log("[API] Attempting to retrieve auth token from storage...");
        const token = await storage.getItem("auth_token");

        console.log(
          "[API] Retrieved auth token from storage:",
          token ? `Token exists (${token.length} chars)` : "No token found"
        );

        if (token) {
          // Ensure headers object exists
          config.headers = config.headers || {};

          // Set the Authorization header
          config.headers.Authorization = `Bearer ${token}`;
          console.log("[API] Added Authorization header to request");

          // Verify the header was set correctly
          console.log("[API] Request headers after update:", {
            ...config.headers,
            // Don't log the full token for security
            Authorization: config.headers.Authorization
              ? "Bearer [TOKEN]"
              : "NOT SET",
          });
        } else {
          console.warn(
            "[API] No auth token found in storage for authenticated endpoint:",
            config.url
          );

          // If we're on the web, try to get the token from localStorage directly as a fallback
          if (Platform.OS === "web" && typeof window !== "undefined") {
            const webToken = localStorage.getItem("auth_token");
            console.log(
              "[API] Web fallback - localStorage token:",
              webToken ? `Found (${webToken.length} chars)` : "Not found"
            );

            if (webToken) {
              console.log("[API] Using web fallback token for request");
              config.headers.Authorization = `Bearer ${webToken}`;
            }
          }
        }
      } catch (error) {
        console.error("[API] Error in request interceptor:", error);

        // If we're on the web, log localStorage contents for debugging
        if (Platform.OS === "web" && typeof window !== "undefined") {
          console.log("[API] localStorage contents:", { ...localStorage });
        }
      }
    }

    return config;
  },
  (error) => {
    console.error("[API] Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors and logging
api.interceptors.response.use(
  (response) => {
    // Skip logging for health check to reduce noise
    if (!response.config.url.endsWith("/health")) {
      console.log(
        `[API] ${response.status} ${response.config.method?.toUpperCase()} ${
          response.config.url
        }`,
        {
          data: response.data,
          headers: response.headers,
        }
      );
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log the error with more details
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(
        `[API] ${error.response.status} ${
          error.config?.method?.toUpperCase() || "UNKNOWN_METHOD"
        } ${error.config?.url || "UNKNOWN_URL"}`,
        {
          data: error.response.data,
          status: error.response.status,
          headers: error.response.headers,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
            data: error.config?.data,
          },
        }
      );
    } else if (error.request) {
      // The request was made but no response was received
      console.error("[API] No response received:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("[API] Request error:", error.message);
    }

    // Handle 401 Unauthorized errors
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // Skip refresh token attempt for login/signup endpoints
      const isAuthEndpoint =
        originalRequest.url &&
        (originalRequest.url.endsWith("/auth/login") ||
          originalRequest.url.endsWith("/auth/signup"));

      if (isAuthEndpoint) {
        console.log(
          "[API] Auth endpoint failed with 401, not attempting refresh"
        );
        return Promise.reject(error);
      }

      try {
        console.log("[API] Attempting to refresh token due to 401...");
        const refreshToken = await storage.getItem("refresh_token");

        if (!refreshToken) {
          console.error("[API] No refresh token available");
          throw new Error("No refresh token available");
        }

        console.log("[API] Found refresh token, attempting to refresh...");
        const response = await axios.post(
          `${API_URL}/auth/refresh-token`,
          {
            refreshToken,
          },
          {
            skipAuthRefresh: true, // Prevent infinite loop if refresh fails
          }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        console.log("[API] Token refresh successful");

        if (!accessToken) {
          throw new Error("No access token in refresh response");
        }

        // Store the new tokens
        console.log("[API] Storing new tokens...");
        await storage.setItem("auth_token", accessToken);
        if (newRefreshToken) {
          await storage.setItem("refresh_token", newRefreshToken);
        }

        // Update the authorization header for the original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        console.log("[API] Retrying original request with new token");

        return api(originalRequest);
      } catch (refreshError) {
        console.error("[API] Error refreshing token:", refreshError);
        // Clear tokens on refresh failure
        console.log("[API] Clearing auth tokens due to refresh failure");
        await storage.deleteItem("auth_token");
        await storage.deleteItem("refresh_token");

        // You might want to add navigation to login screen here
        // navigation.navigate('Login');

        // Reject with a more descriptive error
        const authError = new Error(
          "Your session has expired. Please log in again."
        );
        authError.status = 401;
        authError.isAuthError = true;
        return Promise.reject(authError);
      }
    }

    // For other errors, reject with more detailed error information
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "An unknown error occurred";
    const statusCode = error.response?.status || "NO_STATUS";

    console.error(
      `[API] Request failed with status ${statusCode}: ${errorMessage}`
    );

    const apiError = new Error(errorMessage);
    apiError.status = statusCode;
    apiError.response = error.response;

    // Add more context to the error
    if (error.response) {
      apiError.url = error.config?.url;
      apiError.method = error.config?.method;
      apiError.statusText = error.response.statusText;
      apiError.data = error.response.data;
    }

    return Promise.reject(apiError);
  }
);

// Add a simple health check function
export const checkApiHealth = async () => {
  try {
    const response = await api.get("/health");
    return {
      status: response.status,
      data: response.data,
      isHealthy: response.status === 200,
    };
  } catch (error) {
    return {
      status: error.response?.status || 0,
      error: error.message,
      isHealthy: false,
    };
  }
};

// =============================================
// AUTH API FUNCTIONS
// =============================================

export const authAPI = {
  async login(username, password) {
    try {
      console.log(`[AUTH] Attempting login for username: ${username}`);

      const response = await api.post("/auth/login", {
        username,
        password,
      });

      console.log(`[AUTH] Login response:`, response.data);

      // Your backend returns data directly, not wrapped in success object
      if (response.data && response.data.token) {
        return {
          success: true,
          data: response.data, // This contains { token, refreshToken, username }
        };
      } else {
        return {
          success: false,
          error: "Invalid response format from server",
        };
      }
    } catch (error) {
      console.error(`[AUTH] Login failed:`, error);

      if (error.response?.data?.message) {
        return {
          success: false,
          error: error.response.data.message,
        };
      }

      return {
        success: false,
        error: error.message || "Login failed",
      };
    }
  },

  async signup(userData) {
    try {
      console.log(`[AUTH] Attempting signup for user:`, userData.username);

      const response = await api.post("/auth/signup", userData);

      console.log(`[AUTH] Signup response:`, response.data);

      // Check for successful signup (200 or 201 status)
      if (response.status === 200 || response.status === 201) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
          error: response.data?.message || "Registration failed",
        };
      }
    } catch (error) {
      console.error(`[AUTH] Signup failed:`, error);

      if (error.response?.data?.message) {
        return {
          success: false,
          error: error.response.data.message,
        };
      }

      return {
        success: false,
        error: error.message || "Registration failed",
      };
    }
  },
};

// =============================================
// USER API FUNCTIONS
// =============================================

export const userAPI = {
  // Update user profile
  updateProfile: async (userData) => {
    try {
      console.log("[USER] Updating user profile...");
      const response = await api.put("/users/profile", userData);

      // Update stored user data
      await storage.setItem("user_data", JSON.stringify(response.data.user));

      return {
        success: true,
        user: response.data.user,
        message: "Profile updated successfully",
      };
    } catch (error) {
      console.error("[USER] Profile update failed:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Profile update failed",
      };
    }
  },

  // Get user by ID
  getUserById: async (userId) => {
    try {
      console.log("[USER] Fetching user by ID:", userId);
      const response = await api.get(`/users/${userId}`);

      return {
        success: true,
        user: response.data.user,
      };
    } catch (error) {
      console.error("[USER] Get user by ID failed:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to get user",
      };
    }
  },

  // Search users
  searchUsers: async (query) => {
    try {
      console.log("[USER] Searching users with query:", query);
      const response = await api.get("/users/search", {
        params: { q: query },
      });

      return {
        success: true,
        users: response.data.users || [],
      };
    } catch (error) {
      console.error("[USER] User search failed:", error);
      return {
        success: false,
        error:
          error.response?.data?.message || error.message || "Search failed",
      };
    }
  },
};

// =============================================
// PING/MESSAGING API FUNCTIONS
// =============================================

export const pingAPI = {
  // Send a ping
  sendPing: async (recipientIds, message = null, location = null) => {
    try {
      console.log("[PING] Sending ping to:", recipientIds);
      const response = await api.post("/pings/send", {
        recipientIds,
        message,
        location,
      });

      return {
        success: true,
        ping: response.data.ping,
        message: "Ping sent successfully",
      };
    } catch (error) {
      console.error("[PING] Send ping failed:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to send ping",
      };
    }
  },

  // Get received pings
  getReceivedPings: async (limit = 20, offset = 0) => {
    try {
      console.log("[PING] Fetching received pings...");
      const response = await api.get("/pings/received", {
        params: { limit, offset },
      });

      return {
        success: true,
        pings: response.data.pings || [],
        total: response.data.total || 0,
      };
    } catch (error) {
      console.error("[PING] Get received pings failed:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to get pings",
      };
    }
  },

  // Get sent pings
  getSentPings: async (limit = 20, offset = 0) => {
    try {
      console.log("[PING] Fetching sent pings...");
      const response = await api.get("/pings/sent", {
        params: { limit, offset },
      });

      return {
        success: true,
        pings: response.data.pings || [],
        total: response.data.total || 0,
      };
    } catch (error) {
      console.error("[PING] Get sent pings failed:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to get sent pings",
      };
    }
  },

  // Mark ping as read
  markPingAsRead: async (pingId) => {
    try {
      console.log("[PING] Marking ping as read:", pingId);
      const response = await api.put(`/pings/${pingId}/read`);

      return {
        success: true,
        ping: response.data.ping,
      };
    } catch (error) {
      console.error("[PING] Mark ping as read failed:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to mark as read",
      };
    }
  },
};

// =============================================
// POSTS/CONTENT API FUNCTIONS (for your news/posts)
// =============================================

export const postsAPI = {
  // Get all posts
  getPosts: async (limit = 20, offset = 0, category = null) => {
    try {
      console.log("[POSTS] Fetching posts...");
      const response = await api.get("/posts", {
        params: { limit, offset, category },
      });

      return {
        success: true,
        posts: response.data.posts || [],
        total: response.data.total || 0,
      };
    } catch (error) {
      console.error("[POSTS] Get posts failed:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to get posts",
      };
    }
  },

  // Get popular posts
  getPopularPosts: async (limit = 20, timeframe = "week") => {
    try {
      console.log("[POSTS] Fetching popular posts...");
      const response = await api.get("/posts/popular", {
        params: { limit, timeframe },
      });

      return {
        success: true,
        posts: response.data.posts || [],
      };
    } catch (error) {
      console.error("[POSTS] Get popular posts failed:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to get popular posts",
      };
    }
  },

  // Create new post
  createPost: async (postData) => {
    try {
      console.log("[POSTS] Creating new post...");
      const response = await api.post("/posts", postData);

      return {
        success: true,
        post: response.data.post,
        message: "Post created successfully",
      };
    } catch (error) {
      console.error("[POSTS] Create post failed:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to create post",
      };
    }
  },

  // Like/unlike post
  toggleLike: async (postId) => {
    try {
      console.log("[POSTS] Toggling like for post:", postId);
      const response = await api.post(`/posts/${postId}/like`);

      return {
        success: true,
        liked: response.data.liked,
        likesCount: response.data.likesCount,
      };
    } catch (error) {
      console.error("[POSTS] Toggle like failed:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to toggle like",
      };
    }
  },
};

// =============================================
// COMMENTS API FUNCTIONS
// =============================================

export const commentsAPI = {
  // Get comments for a post
  getComments: async (postId, limit = 20, offset = 0) => {
    try {
      console.log("[COMMENTS] Fetching comments for post:", postId);
      const response = await api.get(`/posts/${postId}/comments`, {
        params: { limit, offset },
      });

      return {
        success: true,
        comments: response.data.comments || [],
        total: response.data.total || 0,
      };
    } catch (error) {
      console.error("[COMMENTS] Get comments failed:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to get comments",
      };
    }
  },

  // Add comment to post
  addComment: async (postId, content) => {
    try {
      console.log("[COMMENTS] Adding comment to post:", postId);
      const response = await api.post(`/posts/${postId}/comments`, {
        content,
      });

      return {
        success: true,
        comment: response.data.comment,
        message: "Comment added successfully",
      };
    } catch (error) {
      console.error("[COMMENTS] Add comment failed:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to add comment",
      };
    }
  },
};
