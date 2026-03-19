package com.fitness.aiservice.service;

import com.fitness.aiservice.model.Activity;
import com.fitness.aiservice.model.Recommendation;
import com.fitness.aiservice.respository.RecommendationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

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
        recommendationRepository.findByActivityId(activity.getId())
                .ifPresentOrElse(existing -> {
                    // 🔄 update existing recommendation
                    existing.setRecommendation(recommendation.getRecommendation());
                    existing.setImprovements(recommendation.getImprovements());
                    existing.setSuggestions(recommendation.getSuggestions());
                    existing.setSafety(recommendation.getSafety());
                    existing.setCreatedAt(recommendation.getCreatedAt());
                    recommendationRepository.save(existing);
                    log.info("Updated recommendation for activityId={}", activity.getId());
                }, () -> {
                    recommendationRepository.save(recommendation);
                    log.info("Created recommendation for activityId={}", activity.getId());
                });
    }
}
