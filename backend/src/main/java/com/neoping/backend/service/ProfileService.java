package com.neoping.backend.service;

import org.springframework.stereotype.Service;

import com.neoping.backend.dto.ProfileDto;
import com.neoping.backend.model.Profile;
import com.neoping.backend.repository.ProfileRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProfileService {
    private final ProfileRepository profileRepository;

    public ProfileDto getUserProfile(String username) {
        Profile profile = profileRepository.findByUserUsername(username)
                .orElseThrow(() -> new RuntimeException("Profile not found"));
        return toDto(profile);
    }

    public ProfileDto updateUserProfile(String username, ProfileDto profileDto) {
        Profile profile = profileRepository.findByUserUsername(username)
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        profile.setAvatar(profileDto.getAvatar());
        profile.setBio(profileDto.getBio());

        // Update email
        if (profileDto.getEmail() != null && !profileDto.getEmail().isEmpty()) {
            profile.getUser().setEmail(profileDto.getEmail());
        }

        // Update password (make sure to hash it in a real app!)
        if (profileDto.getPassword() != null && !profileDto.getPassword().isEmpty()) {
            profile.getUser().setPassword(profileDto.getPassword());
        }

        profileRepository.save(profile);
        return toDto(profile);
    }

    private ProfileDto toDto(Profile profile) {
        return ProfileDto.builder()
                .username(profile.getUser().getUsername())
                .email(profile.getUser().getEmail())
                .avatar(profile.getAvatar())
                .bio(profile.getBio())
                .created(profile.getCreated())
                .build();
    }
}
