package com.neoping.backend.controller;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.neoping.backend.dto.LikeResponse;
import com.neoping.backend.dto.PostListResponse;
import com.neoping.backend.dto.PostRequest;
import com.neoping.backend.dto.PostResponse;
import com.neoping.backend.model.Comment;
import com.neoping.backend.service.AuthService;
import com.neoping.backend.service.CommentService;
import com.neoping.backend.service.PostService;
import com.neoping.backend.service.PostService.LikeResult;

import jakarta.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/posts")
@AllArgsConstructor
@CrossOrigin(origins = {
        "http://localhost:8081",
        "http://192.168.100.6:8081",
        "http://192.168.100.6:19000",
        "exp://192.168.100.6:8081"
})
@Slf4j
public class PostController {

    private final PostService postService;
    private final AuthService authService;
    private final CommentService commentService;

    @GetMapping("/popular")
    public ResponseEntity<List<PostResponse>> getPopularPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String category) {
        List<PostResponse> posts = postService.getPopularPosts(page, limit, category);
        return ResponseEntity.ok(posts);
    }

    // Fetch latest posts with optional pagination and search
    @GetMapping("/latest")
    public ResponseEntity<List<PostResponse>> getLatestPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String search) {
        List<PostResponse> posts = postService.getLatestPosts(page, limit, search);
        return ResponseEntity.ok(posts);
    }

    // GET /api/posts - Get all posts with pagination
    @GetMapping
    public ResponseEntity<PostListResponse> getAllPosts(
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(required = false) String category,
            HttpServletRequest request) {

        try {
            log.info("📡 Getting all posts - limit: {}, offset: {}, category: {}", limit, offset, category);

            // Get current user if authenticated (optional for public posts)
            String currentUsername = null;
            try {
                currentUsername = authService.getCurrentUser().getUsername();
            } catch (Exception e) {
                log.debug("User not authenticated, showing public posts");
            }

            // ✅ Use the enhanced service method with all parameters
            List<PostResponse> posts = postService.getAllPosts(limit, offset, category, currentUsername);
            int total = postService.getTotalPostsCount(category);

            PostListResponse response = PostListResponse.builder()
                    .posts(posts)
                    .total(total)
                    .limit(limit)
                    .offset(offset)
                    .hasMore(offset + limit < total)
                    .success(true)
                    .build();

            log.info("✅ Found {} posts", posts.size());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ Error getting posts: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(PostListResponse.builder()
                            .posts(Collections.emptyList())
                            .total(0)
                            .limit(limit)
                            .offset(offset)
                            .success(false)
                            .error("Failed to fetch posts: " + e.getMessage())
                            .build());
        }
    }

    // GET /api/posts/popular - Get popular posts

    // GET /api/posts/category/{category} - Get posts by category
    @GetMapping("/category/{category}")
    public ResponseEntity<PostListResponse> getPostsByCategory(
            @PathVariable String category,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset,
            HttpServletRequest request) {

        try {
            log.info("📂 Getting posts by category: {} - limit: {}, offset: {}", category, limit, offset);

            String currentUsername = null;
            try {
                currentUsername = authService.getCurrentUser().getUsername();
            } catch (Exception e) {
                log.debug("User not authenticated, showing public posts");
            }

            // ✅ Use the enhanced service method
            List<PostResponse> posts = postService.getPostsByCategory(category, limit, offset, currentUsername);
            int total = postService.getTotalPostsByCategoryCount(category);

            PostListResponse response = PostListResponse.builder()
                    .posts(posts)
                    .total(total)
                    .limit(limit)
                    .offset(offset)
                    .hasMore(offset + limit < total)
                    .success(true)
                    .build();

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ Error getting posts by category: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(PostListResponse.builder()
                            .posts(Collections.emptyList())
                            .total(0)
                            .limit(limit)
                            .offset(offset)
                            .success(false)
                            .error("Failed to fetch posts by category: " + e.getMessage())
                            .build());
        }
    }

    // GET /api/posts/{id} - Get single post
    @GetMapping("/{id}")
    public ResponseEntity<?> getPostById(@PathVariable Long id, HttpServletRequest request) {
        try {
            log.info("🎯 Getting post by ID: {}", id);

            String currentUsername = null;
            try {
                currentUsername = authService.getCurrentUser().getUsername();
            } catch (Exception e) {
                log.debug("User not authenticated");
            }

            // ✅ Use the enhanced service method with current user context
            PostResponse post = postService.getPostById(id, currentUsername);
            return ResponseEntity.ok(post);

        } catch (Exception e) {
            log.error("❌ Error getting post: {}", e.getMessage(), e);

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Post not found");
            errorResponse.put("success", false);
            errorResponse.put("id", id);

            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
        }
    }

    // POST /api/posts/{id}/like - Toggle like
    @PostMapping("/{id}/like")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<LikeResponse> toggleLike(@PathVariable Long id, HttpServletRequest request) {
        try {
            log.info("👍 Toggling like for post: {}", id);

            String currentUsername = authService.getCurrentUser().getUsername();

            // ✅ Use the enhanced service method
            LikeResult result = postService.toggleLike(id, currentUsername);

            LikeResponse response = LikeResponse.builder()
                    .liked(result.isLiked())
                    .likesCount(result.getLikesCount())
                    .success(true)
                    .message(result.isLiked() ? "Post liked" : "Like removed")
                    .build();

            log.info("✅ Like toggled for post: {} by user: {}", id, currentUsername);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ Error toggling like: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(LikeResponse.builder()
                            .success(false)
                            .error("Failed to toggle like")
                            .build());
        }
    }

    // POST /api/posts - Create post
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> createPost(@RequestBody PostRequest postRequest) {
        postService.save(postRequest);
        return new ResponseEntity<>(HttpStatus.CREATED);
    }

    // GET /api/posts/by-user/{name} - Get user posts
    @GetMapping("/by-user/{name}")
    public ResponseEntity<List<PostResponse>> getPostsByUser(@PathVariable("name") String username) {
        return ResponseEntity.ok(postService.getPostsByUsername(username));
    }

    // GET /api/posts/{id}/comments - Get comments for a post
    @GetMapping("/{id}/comments")
    public ResponseEntity<?> getComments(@PathVariable Long id) {
        try {
            log.info("💬 Getting comments for post: {}", id);

            List<Comment> comments = commentService.getCommentsByPostId(id);

            List<Map<String, Object>> commentData = comments.stream()
                    .map(comment -> {
                        Map<String, Object> commentMap = new HashMap<>();
                        commentMap.put("id", comment.getId());
                        commentMap.put("content", comment.getContent());
                        commentMap.put("username", comment.getUser().getUsername());
                        // Use createdAt since that's what your Comment entity has
                        commentMap.put("createdDate", comment.getCreatedAt());
                        commentMap.put("likes", 0);
                        return commentMap;
                    })
                    .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("comments", commentData);

            log.info("✅ Retrieved {} comments for post: {}", commentData.size(), id);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ Error getting comments for post {}: {}", id, e.getMessage(), e);

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to get comments: " + e.getMessage());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    // POST /api/posts/{id}/comments - Add comment to a post
    @PostMapping("/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> addComment(@PathVariable Long id,
            @RequestBody Map<String, String> request) {
        try {
            String currentUsername = authService.getCurrentUser().getUsername();
            String content = request.get("content");

            log.info("💬 Adding comment to post {} by user: {} with content: {}", id, currentUsername, content);

            Comment comment = commentService.addComment(id, content, currentUsername);

            Map<String, Object> commentData = new HashMap<>();
            commentData.put("id", comment.getId());
            commentData.put("content", comment.getContent());
            commentData.put("username", comment.getUser().getUsername());
            commentData.put("createdDate", comment.getCreatedAt());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("comment", commentData);

            log.info("✅ Comment added successfully: {}", commentData);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ Error adding comment to post {}: {}", id, e.getMessage(), e);

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to add comment: " + e.getMessage());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    // GET /api/posts/user/me - Get current user's posts
    @GetMapping("/user/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PostResponse>> getCurrentUserPosts() {
        try {
            String currentUsername = authService.getCurrentUser().getUsername();
            log.info("📊 Getting posts for current user: {}", currentUsername);

            List<PostResponse> userPosts = postService.getPostsByUsername(currentUsername);

            log.info("✅ Retrieved {} posts for user: {}", userPosts.size(), currentUsername);
            return ResponseEntity.ok(userPosts);

        } catch (Exception e) {
            log.error("❌ Error getting current user posts: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ArrayList<>());
        }
    }
}
