import { createContext, useContext, useEffect, useState } from "react";
import { userAPI } from "../app/utils/api"; // ✅ Use our API instead

const defaultProfile = {
  username: "u/User",
  email: "",
  bio: "This is my bio.",
  avatar: "commenter1.jpg",
  location: "",
  website: "",
};

const ProfileContext = createContext({
  profile: defaultProfile,
  setProfile: () => {},
  loading: true,
  error: null,
  refreshProfile: () => {},
  updateProfile: () => {}, // ✅ Add update function
});

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = async () => {
    try {
      console.log("[ProfileContext] 🔍 Fetching profile from API...");
      setLoading(true);
      setError(null);

      // ✅ Use our userAPI instead of authService
      const result = await userAPI.getCurrentUserProfile();

      if (result.success) {
        const userData = result.data;
        console.log("[ProfileContext] ✅ Profile loaded:", userData);

        const updatedProfile = {
          username: userData.displayName || userData.username || "User",
          email: userData.email || "",
          bio: userData.bio || "No bio yet.",
          avatar: userData.avatar || "commenter1.jpg",
          location: userData.location || "",
          website: userData.website || "",
        };

        console.log(
          "[ProfileContext] 🔄 Setting profile state:",
          updatedProfile
        );
        setProfile(updatedProfile);
      } else {
        console.error(
          "[ProfileContext] ❌ Failed to fetch profile:",
          result.error
        );
        setError(result.error);
      }
    } catch (err) {
      console.error("[ProfileContext] ❌ Error fetching profile:", err);
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Add update profile function
  const updateProfile = async (profileData) => {
    try {
      console.log("[ProfileContext] 🔄 Updating profile...", profileData);
      setLoading(true);

      const result = await userAPI.updateCurrentUserProfile(profileData);

      if (result.success) {
        console.log(
          "[ProfileContext] ✅ Profile updated successfully:",
          result.data
        );

        // Update local state with backend response
        const updatedProfile = {
          username: result.data.displayName || result.data.username,
          email: result.data.email || "",
          bio: result.data.bio || "No bio yet.",
          avatar: result.data.avatar || "commenter1.jpg",
          location: result.data.location || "",
          website: result.data.website || "",
        };

        setProfile(updatedProfile);
        return { success: true, data: updatedProfile };
      } else {
        console.error(
          "[ProfileContext] ❌ Failed to update profile:",
          result.error
        );
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error("[ProfileContext] ❌ Error updating profile:", err);
      setError(err.message || "Failed to update profile");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        setProfile,
        loading,
        error,
        refreshProfile: fetchProfile,
        updateProfile, // ✅ Expose update function
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
