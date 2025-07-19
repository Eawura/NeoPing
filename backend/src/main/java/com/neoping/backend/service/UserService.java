package com.neoping.backend.service;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.neoping.backend.dto.UpdateProfileRequest;
import com.neoping.backend.dto.UserProfile;
import com.neoping.backend.model.User;
import com.neoping.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    private final UserRepository userRepository;
    
    public User getCurrentUser() {
        try {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            if (principal instanceof UserDetails userDetails) {
                return userRepository.findByUsername(userDetails.getUsername())
                    .orElse(null);
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    @Transactional
    public User updateUserProfile(UpdateProfileRequest profileUpdate) {
        User user = getCurrentUser();
        if (user == null) {
            log.error("No authenticated user found for profile update");
            throw new UsernameNotFoundException("No authenticated user found");
        }

        log.info("Updating profile for user: {}", user.getUsername());
        
        if (profileUpdate.getUsername() != null && !profileUpdate.getUsername().isBlank()) {
            user.setUsername(profileUpdate.getUsername());
            log.debug("Updated username to: {}", profileUpdate.getUsername());
        }
        
        if (profileUpdate.getBio() != null) {
            user.setBio(profileUpdate.getBio());
            log.debug("Updated bio");
        }
        
        if (profileUpdate.getAvatar() != null) {
            user.setAvatar(profileUpdate.getAvatar());
            log.debug("Updated avatar");
        }
        
        User updatedUser = userRepository.save(user);
        log.info("Successfully updated profile for user: {}", user.getUsername());
        return updatedUser;
    }
    
    @Transactional
    public void updateUserProfile(UserProfile profile) {
        User user = getCurrentUser();
        if (profile.getEmail() != null && !profile.getEmail().equals(user.getEmail())) {
            user.setEmail(profile.getEmail());
        }
        userRepository.save(user);
    }
}
