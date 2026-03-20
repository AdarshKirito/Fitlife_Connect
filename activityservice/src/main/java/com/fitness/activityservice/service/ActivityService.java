package com.fitness.activityservice.service;

import com.fitness.activityservice.ActivityRepository;
import com.fitness.activityservice.dto.ActivityRequest;
import com.fitness.activityservice.dto.ActivityResponse;
import com.fitness.activityservice.model.Activity;
import com.fitness.activityservice.model.ActivityType;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
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
        checkForTimeOverlap(request.getUserId(), request.getStartTime(), request.getDuration(), null);

        Activity activity = buildActivity(request);

        Activity savedActivity = activityRepository.save(activity);

        publishActivityEvent(topicName, savedActivity.getUserId(), savedActivity);

        return mapToResponse(savedActivity);
    }

    private void validateUserOrThrow(String userId) {
        boolean isValidUser = userValidationService.validateUser(userId);

        if (!isValidUser) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "User account was not found for this session. Please log out and log in again."
            );
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

    private void checkForTimeOverlap(String userId, LocalDateTime newStart, Integer newDuration, String excludeActivityId) {
        if (newStart == null || newDuration == null || newDuration <= 0) {
            return;
        }

        LocalDateTime newEnd = newStart.plusMinutes(newDuration);
        List<Activity> candidates = activityRepository.findByUserIdAndStartTimeBefore(userId, newEnd);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM d 'at' h:mm a");

        for (Activity existing : candidates) {
            if (excludeActivityId != null && excludeActivityId.equals(existing.getId())) {
                continue;
            }
            if (existing.getStartTime() == null || existing.getDuration() == null) {
                continue;
            }
            LocalDateTime existingEnd = existing.getStartTime().plusMinutes(existing.getDuration());
            if (existingEnd.isAfter(newStart)) {
                String typeName = formatActivityType(existing.getType());
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        String.format(
                                "You already have a %s session from %s to %s. " +
                                "Please choose a different time or adjust the conflicting activity.",
                                typeName,
                                existing.getStartTime().format(fmt),
                                existingEnd.format(fmt)
                        )
                );
            }
        }
    }

    private String formatActivityType(ActivityType type) {
        if (type == null) {
            return "activity";
        }

        String value = type.name().toLowerCase().replace('_', ' ');
        if (value.isBlank()) {
            return "activity";
        }

        return Character.toUpperCase(value.charAt(0)) + value.substring(1);
    }


    public List<ActivityResponse> getUserActivities(String userId) {
        List<Activity> activityList = activityRepository.findByUserId(userId);
        activityList.sort(Comparator
                .comparing(ActivityService::resolveActivitySortTime, Comparator.nullsLast(Comparator.naturalOrder()))
                .reversed());

        return activityList.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private static LocalDateTime resolveActivitySortTime(Activity activity) {
        if (activity == null) {
            return null;
        }
        if (activity.getStartTime() != null) {
            return activity.getStartTime();
        }
        if (activity.getCreatedAt() != null) {
            return activity.getCreatedAt();
        }
        return activity.getUpdatedAt();
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

        checkForTimeOverlap(existing.getUserId(), existing.getStartTime(), existing.getDuration(), activityId);

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
