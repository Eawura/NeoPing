// context/AuthContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { authAPI } from "../app/utils/api";

const AuthContext = createContext();

// Export useAuth hook at the top for better organization
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Login function - flexible for username OR email
  const login = async (emailOrUsername, password) => {
    setLoading(true);
    try {
      const result = await authAPI.login(emailOrUsername, password);

      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
      }

      setLoading(false);
      return result;
    } catch (error) {
      setLoading(false);
      return {
        success: false,
        error: error.message || "Login failed",
      };
    }
  };

  // Register function (keeping your existing name)
  const register = async (userData) => {
    setLoading(true);
    try {
      const result = await authAPI.signup(userData);

      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
      }

      setLoading(false);
      return result;
    } catch (error) {
      setLoading(false);
      return {
        success: false,
        error: error.message || "Registration failed",
      };
    }
  };

  // Logout function
  const logout = async () => {
    setLoading(true);
    try {
      const result = await authAPI.logout();

      if (result.success) {
        setUser(null);
        setIsAuthenticated(false);
      }

      setLoading(false);
      return result;
    } catch (error) {
      setLoading(false);
      return {
        success: false,
        error: error.message || "Logout failed",
      };
    }
  };

  // Get current user data
  const getCurrentUser = async () => {
    try {
      const result = await authAPI.getCurrentUser();
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
      }
      return result;
    } catch (error) {
      console.error("Get current user failed:", error);
      return {
        success: false,
        error: error.message || "Failed to get user data",
      };
    }
  };

  // Check authentication on app start
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await authAPI.isAuthenticated();
        if (isAuth) {
          const result = await authAPI.getCurrentUser();
          if (result.success) {
            setUser(result.user);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    getCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Default export for convenience
export default AuthContext;
