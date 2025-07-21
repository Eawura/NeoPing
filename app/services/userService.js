import api from "../utils/api";

/**
 * Get current user's profile
 * @returns {Promise<Object>} Current user profile data
 */
export const getCurrentUserProfile = async () => {
  try {
    const response = await api.get("/auth/me");
    return response.data;
  } catch (error) {
    console.error("Error fetching current user profile:", error);
    throw error.response?.data || error.message;
  }
};

/**
 * Update current user's profile
 * @param {Object} profileData - Updated profile data (username, bio, avatar)
 * @returns {Promise<Object>} Updated user profile
 */
export const updateCurrentUserProfile = async (profileData) => {
  try {
    const response = await api.put("/auth/me", profileData);
    return response.data;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error.response?.data || error.message;
  }
};

/**
 * Get user profile by ID
 * @param {string} userId - ID of the user
 * @returns {Promise<Object>} User profile data
 */
export const getUserProfile = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    throw error.response?.data || error.message;
  }
};

/**
 * Update user profile
 * @param {string} userId - ID of the user to update
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} Updated user data
 */
export const updateUserProfile = async (userId, userData) => {
  try {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    throw error.response?.data || error.message;
  }
};

/**
 * Upload user profile picture
 * @param {string} userId - ID of the user
 * @param {Object} imageData - Image file data (usually from FormData)
 * @returns {Promise<Object>} Upload result with image URL
 */
export const uploadProfilePicture = async (userId, imageData) => {
  try {
    const response = await api.post(
      `/users/${userId}/profile-picture`,
      imageData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    throw error.response?.data || error.message;
  }
};

/**
 * Get user's posts
 * @param {string} userId - ID of the user
 * @param {Object} params - Query parameters (page, size, sort, etc.)
 * @returns {Promise<Array>} List of user's posts
 */
export const getUserPosts = async (userId, params = {}) => {
  try {
    const response = await api.get(`/users/${userId}/posts`, { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching posts for user ${userId}:`, error);
    throw error.response?.data || error.message;
  }
};

/**
 * Get user's comments
 * @param {string} userId - ID of the user
 * @param {Object} params - Query parameters (page, size, sort, etc.)
 * @returns {Promise<Array>} List of user's comments
 */
export const getUserComments = async (userId, params = {}) => {
  try {
    const response = await api.get(`/users/${userId}/comments`, { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching comments for user ${userId}:`, error);
    throw error.response?.data || error.message;
  }
};

/**
 * Follow a user
 * @param {string} userId - ID of the user to follow
 * @returns {Promise<Object>} Follow status
 */
export const followUser = async (userId) => {
  try {
    const response = await api.post(`/users/${userId}/follow`);
    return response.data;
  } catch (error) {
    console.error(`Error following user ${userId}:`, error);
    throw error.response?.data || error.message;
  }
};

/**
 * Unfollow a user
 * @param {string} userId - ID of the user to unfollow
 * @returns {Promise<Object>} Unfollow status
 */
export const unfollowUser = async (userId) => {
  try {
    const response = await api.delete(`/users/${userId}/follow`);
    return response.data;
  } catch (error) {
    console.error(`Error unfollowing user ${userId}:`, error);
    throw error.response?.data || error.message;
  }
};
