package com.bookish.bookish.repository;

import com.bookish.bookish.entity.ChatbotLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatbotLogRepository extends JpaRepository<ChatbotLog, Integer> {
}