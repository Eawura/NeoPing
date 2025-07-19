import axios from "axios";
import storage from "./storage";
import { Platform } from "react-native";

// For local development
const API_URL = "http://localhost:8082/api";
console.log("Using API URL:", API_URL);

// For Android emulator
// const API_URL = "http://10.0.2.2:8082/api";

// For physical device testing (use your computer's local IP)
// const API_URL = "http://YOUR_COMPUTER_IP:8082/api";

// If you're on a physical device, use your computer's local IP address
// const API_URL = "http://YOUR_COMPUTER_IP:8082/api";

// Helper function to test the connection
export const testConnection = async () => {
  try {
    console.log(`Testing connection to: ${API_URL}/health`);
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    // Even if we get a 401, the backend is reachable
    if (response.status === 401) {
      console.log('Backend is reachable but requires authentication');
      return { 
        success: true,
        data: { status: 'protected', message: 'Health endpoint requires authentication' }
      };
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };

  } catch (error) {
    console.error('Connection test failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
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
    if (!config.url.endsWith('/health')) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
        headers: config.headers,
      });
    }

    // Don't add auth header for login/signup/refresh-token endpoints
    const publicEndpoints = ['/auth/login', '/auth/signup', '/auth/refresh-token'];
    const isPublicEndpoint = publicEndpoints.some(endpoint => 
      config.url.endsWith(endpoint)
    );

    if (!isPublicEndpoint) {
      try {
        // List all keys in storage for debugging
        await storage.listKeys();
        
        // Get the token with more detailed logging
        console.log('[API] Attempting to retrieve auth token from storage...');
        const token = await storage.getItem("auth_token");
        
        console.log('[API] Retrieved auth token from storage:', 
          token ? `Token exists (${token.length} chars)` : 'No token found');
        
        if (token) {
          // Ensure headers object exists
          config.headers = config.headers || {};
          
          // Set the Authorization header
          config.headers.Authorization = `Bearer ${token}`;
          console.log('[API] Added Authorization header to request');
          
          // Verify the header was set correctly
          console.log('[API] Request headers after update:', {
            ...config.headers,
            // Don't log the full token for security
            Authorization: config.headers.Authorization 
              ? 'Bearer [TOKEN]' 
              : 'NOT SET'
          });
        } else {
          console.warn('[API] No auth token found in storage for authenticated endpoint:', config.url);
          
          // If we're on the web, try to get the token from localStorage directly as a fallback
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const webToken = localStorage.getItem('auth_token');
            console.log('[API] Web fallback - localStorage token:', 
              webToken ? `Found (${webToken.length} chars)` : 'Not found');
              
            if (webToken) {
              console.log('[API] Using web fallback token for request');
              config.headers.Authorization = `Bearer ${webToken}`;
            }
          }
        }
      } catch (error) {
        console.error("[API] Error in request interceptor:", error);
        
        // If we're on the web, log localStorage contents for debugging
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          console.log('[API] localStorage contents:', { ...localStorage });
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
    if (!response.config.url.endsWith('/health')) {
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
        `[API] ${error.response.status} ${error.config?.method?.toUpperCase() || 'UNKNOWN_METHOD'} ${
          error.config?.url || 'UNKNOWN_URL'
        }`,
        {
          data: error.response.data,
          status: error.response.status,
          headers: error.response.headers,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
            data: error.config?.data
          }
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
      const isAuthEndpoint = originalRequest.url && 
        (originalRequest.url.endsWith('/auth/login') || 
         originalRequest.url.endsWith('/auth/signup'));
      
      if (isAuthEndpoint) {
        console.log('[API] Auth endpoint failed with 401, not attempting refresh');
        return Promise.reject(error);
      }

      try {
        console.log('[API] Attempting to refresh token due to 401...');
        const refreshToken = await storage.getItem("refresh_token");
        
        if (!refreshToken) {
          console.error('[API] No refresh token available');
          throw new Error('No refresh token available');
        }

        console.log('[API] Found refresh token, attempting to refresh...');
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken,
        }, {
          skipAuthRefresh: true // Prevent infinite loop if refresh fails
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        console.log('[API] Token refresh successful');

        if (!accessToken) {
          throw new Error('No access token in refresh response');
        }

        // Store the new tokens
        console.log('[API] Storing new tokens...');
        await storage.setItem("auth_token", accessToken);
        if (newRefreshToken) {
          await storage.setItem("refresh_token", newRefreshToken);
        }

        // Update the authorization header for the original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        console.log('[API] Retrying original request with new token');
        
        return api(originalRequest);
      } catch (refreshError) {
        console.error("[API] Error refreshing token:", refreshError);
        // Clear tokens on refresh failure
        console.log('[API] Clearing auth tokens due to refresh failure');
        await storage.deleteItem("auth_token");
        await storage.deleteItem("refresh_token");
        
        // You might want to add navigation to login screen here
        // navigation.navigate('Login');
        
        // Reject with a more descriptive error
        const authError = new Error('Your session has expired. Please log in again.');
        authError.status = 401;
        authError.isAuthError = true;
        return Promise.reject(authError);
      }
    }

    // For other errors, reject with more detailed error information
    const errorMessage = error.response?.data?.message ||
                       error.message ||
                       'An unknown error occurred';
    const statusCode = error.response?.status || 'NO_STATUS';
    
    console.error(`[API] Request failed with status ${statusCode}: ${errorMessage}`);

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

export default api;
