package com.fitness.aiservice.dto;

import lombok.Data;

@Data
public class DayCompletionRequest {
    private String day;
    private Boolean completed;
}
