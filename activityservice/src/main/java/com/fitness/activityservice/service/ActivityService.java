package com.fitness.activityservice.service;

import com.fitness.activityservice.ActivityRepository;
import com.fitness.activityservice.dto.ActivityRequest;
import com.fitness.activityservice.dto.ActivityResponse;
import com.fitness.activityservice.model.Activity;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ActivityService {
    private static final String INVALID_USER_MESSAGE = "Invalid User: ";
    private static final String ACTIVITY_NOT_FOUND_MESSAGE = "Activity not found: ";

    private final ActivityRepository activityRepository;
    private final UserValidationService userValidationService;
    private final KafkaTemplate<String, Activity> kafkaTemplate;

    @Value("${kafka.topic.name}")
    private String topicName;

    @Value("${kafka.topic.delete-name}")
    private String deleteTopicName;

    public ActivityResponse trackActivity(ActivityRequest request) {
        validateUserOrThrow(request.getUserId());

        Activity activity = buildActivity(request);

        Activity savedActivity = activityRepository.save(activity);

        publishActivityEvent(topicName, savedActivity.getUserId(), savedActivity);

        return mapToResponse(savedActivity);
    }

    private void validateUserOrThrow(String userId) {
        boolean isValidUser = userValidationService.validateUser(userId);

        if (!isValidUser) {
            throw new RuntimeException(INVALID_USER_MESSAGE + userId);
        }
    }

    private Activity buildActivity(ActivityRequest request) {
        return Activity.builder()
                .userId(request.getUserId())
                .type(request.getType())
                .duration(request.getDuration())
                .caloriesBurned(request.getCaloriesBurned())
                .startTime(request.getStartTime())
                .additionalMetrics(request.getAdditionalMetrics())
                .build();
    }

    private void publishActivityEvent(String topic, String key, Activity activity) {
        try {
            kafkaTemplate.send(topic, key, activity);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private ActivityResponse mapToResponse(Activity activity) {
        ActivityResponse response = new ActivityResponse();
        response.setId(activity.getId());
        response.setUserId(activity.getUserId());
        response.setType(activity.getType());
        response.setDuration(activity.getDuration());
        response.setCaloriesBurned(activity.getCaloriesBurned());
        response.setStartTime(activity.getStartTime());
        response.setAdditionalMetrics(activity.getAdditionalMetrics());
        response.setCreatedAt(activity.getCreatedAt());
        response.setUpdatedAt(activity.getUpdatedAt());
        return response;

    }

    private Activity getActivityOrThrow(String activityId) {
        return activityRepository.findById(activityId)
                .orElseThrow(() -> new RuntimeException(ACTIVITY_NOT_FOUND_MESSAGE + activityId));
    }

    private void verifyOwnership(String ownerUserId, String userId, String message) {
        if (!ownerUserId.equals(userId)) {
            throw new RuntimeException(message);
        }
    }


    public List<ActivityResponse> getUserActivities(String userId) {
        List<Activity> activityList = activityRepository.findByUserId(userId);
        return activityList.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void deleteActivity(String activityId, String userId) {
        Activity activity = getActivityOrThrow(activityId);

        // simple ownership check
        verifyOwnership(activity.getUserId(), userId, "You are not allowed to delete this activity");

        // 1) delete from activity DB
        activityRepository.delete(activity);

        // 2) send delete-event to Kafka (AI service will clean up recommendation)
        publishActivityEvent(deleteTopicName, activity.getId(), activity);
    }


    public ActivityResponse updateActivity(String activityId, ActivityRequest request) {
        Activity existing = getActivityOrThrow(activityId);

        verifyOwnership(existing.getUserId(), request.getUserId(), "You cannot modify this activity");

        // Update mutable fields
        existing.setType(request.getType());
        existing.setDuration(request.getDuration());
        existing.setCaloriesBurned(request.getCaloriesBurned());
        existing.setStartTime(request.getStartTime());
        existing.setAdditionalMetrics(request.getAdditionalMetrics());

        Activity updated = activityRepository.save(existing);

        publishActivityEvent(topicName, updated.getUserId(), updated);

        return mapToResponse(updated);
    }

    public ActivityResponse getActivityById(String activityId, String userId) {
        Activity activity = getActivityOrThrow(activityId);

        // Optional but recommended: ensure this activity belongs to the logged-in user
        verifyOwnership(activity.getUserId(), userId, "You are not allowed to view this activity");

        return mapToResponse(activity);
    }


}
