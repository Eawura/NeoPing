import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../services/authService';
import { isAuthenticated } from '../services/authService';

const defaultProfile = {
  username: 'u/User',
  email: '',
  bio: 'This is my bio.',
  avatar: 'commenter1.jpg', // default avatar key matching imageMap
};

const ProfileContext = createContext({
  profile: defaultProfile,
  setProfile: () => {},
  loading: true,
  error: null,
  refreshProfile: () => {},
});

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = async () => {
    try {
      console.log('[ProfileContext] Fetching profile...');
      setLoading(true);
      setError(null);
      
      // Check authentication status
      const authenticated = await isAuthenticated();
      console.log('[ProfileContext] Authentication status:', authenticated);
      
      if (!authenticated) {
        console.log('[ProfileContext] User not authenticated, skipping profile fetch');
        setLoading(false);
        return;
      }
      
      // Verify token is available
      const token = await storage.getItem('auth_token');
      console.log('[ProfileContext] Auth token available:', token ? 'Yes' : 'No');
      
      console.log('[ProfileContext] Fetching current user data...');
      const userData = await getCurrentUser();
      console.log('[ProfileContext] Received user data:', userData);
      
      const updatedProfile = {
        ...defaultProfile,
        ...userData,
        // Map backend fields to frontend fields if needed
        username: userData.username || defaultProfile.username,
        email: userData.email || '',
      };
      
      console.log('[ProfileContext] Updating profile with:', updatedProfile);
      setProfile(updatedProfile);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Fetch profile on mount and when authentication state changes
  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <ProfileContext.Provider value={{ 
      profile, 
      setProfile, 
      loading, 
      error,
      refreshProfile: fetchProfile,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}