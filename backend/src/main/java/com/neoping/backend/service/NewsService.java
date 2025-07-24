package com.neoping.backend.service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.neoping.backend.dto.NewsDto;
import com.neoping.backend.model.Bookmark;
import com.neoping.backend.model.News;
import com.neoping.backend.repository.BookmarkRepository;
import com.neoping.backend.repository.NewsRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NewsService {
    private final NewsRepository newsRepository;

    @Autowired
    private BookmarkRepository bookmarkRepository;

    public List<NewsDto> getNews(String category, String search, int page, int limit) {
        Pageable pageable = PageRequest.of(page, limit, Sort.by(Sort.Direction.DESC, "timestamp"));
        Page<News> newsPage;
        if (category != null && !category.equalsIgnoreCase("All")) {
            newsPage = newsRepository.findByCategoryIgnoreCase(category, pageable);
        } else if (search != null && !search.isEmpty()) {
            newsPage = newsRepository.findByTitleContainingIgnoreCaseOrExcerptContainingIgnoreCase(search, search,
                    pageable);
        } else {
            newsPage = newsRepository.findAll(pageable);
        }
        return newsPage.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    public void upvoteNews(Long newsId, String username) {
        News news = newsRepository.findById(newsId)
                .orElseThrow(() -> new RuntimeException("News not found"));
        news.setUpvotes(news.getUpvotes() + 1);
        newsRepository.save(news);
        // Optionally: track which users have upvoted to prevent multiple upvotes
    }

    public void downvoteNews(Long newsId, String username) {
        News news = newsRepository.findById(newsId)
                .orElseThrow(() -> new RuntimeException("News not found"));
        news.setUpvotes(news.getUpvotes() - 1);
        newsRepository.save(news);
        // Optionally: track which users have downvoted
    }

    public void addComment(Long newsId, String username, String commentText) {
        News news = newsRepository.findById(newsId)
                .orElseThrow(() -> new RuntimeException("News not found"));
        // Example: create and save a Comment entity (implement CommentRepository and
        // Comment entity)
        // Comment comment = new Comment(news, username, commentText, Instant.now());
        // commentRepository.save(comment);
        news.setComments(news.getComments() + 1);
        newsRepository.save(news);
    }

    public void bookmarkNews(Long newsId, String username) {
        News news = newsRepository.findById(newsId)
                .orElseThrow(() -> new RuntimeException("News not found"));
        if (!bookmarkRepository.existsByUsernameAndNewsId(username, newsId)) {
            Bookmark bookmark = Bookmark.builder()
                    .username(username)
                    .news(news)
                    .bookmarkedAt(Instant.now())
                    .build();
            bookmarkRepository.save(bookmark);
        }
    }

    private NewsDto toDto(News n) {
        return NewsDto.builder()
                .id(n.getId())
                .user(n.getUser())
                .avatar(n.getAvatar())
                .title(n.getTitle())
                .excerpt(n.getExcerpt())
                .image(n.getImage())
                .category(n.getCategory())
                .timestamp(n.getTimestamp())
                .upvotes(n.getUpvotes())
                .comments(n.getComments())
                // TODO: set upvoted, downvoted, saved based on user
                .upvoted(false)
                .downvoted(false)
                .saved(false)
                .build();
    }
}
