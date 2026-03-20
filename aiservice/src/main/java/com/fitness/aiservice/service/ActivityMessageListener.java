package com.fitness.aiservice.service;

import com.fitness.aiservice.model.Activity;
import com.fitness.aiservice.model.Recommendation;
import com.fitness.aiservice.respository.RecommendationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class ActivityMessageListener {

    private final ActivityAIService activityAIService;
    private final RecommendationRepository recommendationRepository;

    @KafkaListener(topics = "${kafka.topic.name}", groupId = "activity-processor-group")
    public void processActivity(Activity activity) {
        log.info("Received Activity for processing. activityId={}, userId={}", activity.getId(), activity.getUserId());
        Recommendation recommendation = activityAIService.generateRecommendation(activity);
        List<Recommendation> existingRecommendations = recommendationRepository.findByActivityIdOrderByCreatedAtDesc(activity.getId());

        if (existingRecommendations == null || existingRecommendations.isEmpty()) {
            recommendationRepository.save(recommendation);
            log.info("Created recommendation for activityId={}", activity.getId());
            return;
        }

        // Keep the newest row updated when duplicate historical records exist.
        Recommendation existing = existingRecommendations.get(0);
        applyRecommendationDetails(existing, recommendation);
        recommendationRepository.save(existing);
        log.info("Updated recommendation for activityId={}", activity.getId());
    }

    private void applyRecommendationDetails(Recommendation target, Recommendation source) {
        target.setRecommendation(source.getRecommendation());
        target.setImprovements(source.getImprovements());
        target.setSuggestions(source.getSuggestions());
        target.setSafety(source.getSafety());
        target.setCreatedAt(source.getCreatedAt());
    }
}
