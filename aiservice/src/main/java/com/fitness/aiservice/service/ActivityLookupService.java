package com.fitness.aiservice.service;

import com.fitness.aiservice.model.Activity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

@Service
public class ActivityLookupService {
    private final WebClient webClient;

    public ActivityLookupService(
            WebClient.Builder webClientBuilder,
            @Value("${activity-service.base-url:http://localhost:8082}") String activityServiceBaseUrl
    ) {
        this.webClient = webClientBuilder.baseUrl(activityServiceBaseUrl).build();
    }

    public List<Activity> getUserActivities(String userId) {
        return webClient.get()
                .uri("/api/activities")
                .header("X-User-ID", userId)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<List<Activity>>() {})
                .blockOptional()
                .orElse(List.of());
    }

    public Activity getActivityById(String userId, String activityId) {
        return webClient.get()
                .uri("/api/activities/{id}", activityId)
                .header("X-User-ID", userId)
                .retrieve()
                .bodyToMono(Activity.class)
                .block();
    }
}