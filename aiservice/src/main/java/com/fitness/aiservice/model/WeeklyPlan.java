package com.fitness.aiservice.model;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Document(collection = "weekly_plans")
@Data
@Builder
public class WeeklyPlan {
    @Id
    private String id;
    private String userId;
    private String type;
    private String recommendation;
    private List<String> improvements;
    private List<String> suggestions;
    private List<String> safety;
    private LocalDate weekStartDate;
    private Map<String, Boolean> dayCompletion;

    @CreatedDate
    private LocalDateTime createdAt;
}
