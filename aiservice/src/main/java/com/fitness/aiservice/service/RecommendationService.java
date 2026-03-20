package com.fitness.aiservice.service;

import com.fitness.aiservice.model.Activity;
import com.fitness.aiservice.model.Recommendation;
import com.fitness.aiservice.model.WeeklyPlan;
import com.fitness.aiservice.respository.RecommendationRepository;
import com.fitness.aiservice.respository.WeeklyPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class RecommendationService {
    private static final long WEEKLY_PLAN_REGENERATE_COOLDOWN_SECONDS = 300;

    private final RecommendationRepository recommendationRepository;
    private final WeeklyPlanRepository weeklyPlanRepository;
    private final ActivityAIService activityAIService;
    private final ActivityLookupService activityLookupService;

    public Recommendation getUserRecommendation(String userId) {
        List<Recommendation> recs = ensureRecommendationsForUser(userId);

        if (recs == null || recs.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No recommendations found yet for user: " + userId
            );
        }

        return activityAIService.generateUserCombinedRecommendation(userId, recs);
    }

    public Recommendation getActivityRecommendation(String activityId) {
        return recommendationRepository.findByActivityId(activityId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No recommendation found yet for this activity: " + activityId
                ));
    }

    public WeeklyPlan getWeeklyPlanRecommendation(String userId) {
        List<Recommendation> recs = ensureRecommendationsForUser(userId);

        if (recs == null || recs.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No recommendations found yet for user: " + userId
            );
        }

        LocalDate weekStartDate = currentWeekStartDate();

        return weeklyPlanRepository
                .findFirstByUserIdAndWeekStartDateOrderByCreatedAtDesc(userId, weekStartDate)
                .orElseGet(() -> {
                    Recommendation generated = activityAIService.generateWeeklyPlanRecommendation(userId, recs);
                    WeeklyPlan newPlan = buildWeeklyPlan(userId, generated, weekStartDate, null);
                    return weeklyPlanRepository.save(newPlan);
                });
    }

    public WeeklyPlan regenerateWeeklyPlanRecommendation(String userId) {
        List<Recommendation> recs = ensureRecommendationsForUser(userId);

        if (recs == null || recs.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No recommendations found yet for user: " + userId
            );
        }

        weeklyPlanRepository.findTopByUserIdOrderByCreatedAtDesc(userId).ifPresent(latest -> {
            LocalDateTime createdAt = latest.getCreatedAt();
            if (createdAt != null) {
                long elapsedSeconds = Duration.between(createdAt, LocalDateTime.now()).getSeconds();
                if (elapsedSeconds < WEEKLY_PLAN_REGENERATE_COOLDOWN_SECONDS) {
                    long remaining = WEEKLY_PLAN_REGENERATE_COOLDOWN_SECONDS - elapsedSeconds;
                    throw new ResponseStatusException(
                            HttpStatus.TOO_MANY_REQUESTS,
                            "Weekly plan cooldown active. Try again in " + remaining + " seconds."
                    );
                }
            }
        });

        LocalDate weekStartDate = currentWeekStartDate();
        Map<String, Boolean> currentWeekCompletion = weeklyPlanRepository
            .findFirstByUserIdAndWeekStartDateOrderByCreatedAtDesc(userId, weekStartDate)
            .map(WeeklyPlan::getDayCompletion)
            .orElse(null);

        Recommendation regenerated = activityAIService.generateWeeklyPlanRecommendation(userId, recs);
        WeeklyPlan newPlan = buildWeeklyPlan(userId, regenerated, weekStartDate, currentWeekCompletion);
        return weeklyPlanRepository.save(newPlan);
    }

    public List<WeeklyPlan> getWeeklyPlanHistory(String userId) {
        List<WeeklyPlan> rawHistory = weeklyPlanRepository.findByUserIdOrderByWeekStartDateDescCreatedAtDesc(userId);
        Map<LocalDate, WeeklyPlan> latestByWeek = new LinkedHashMap<>();

        for (WeeklyPlan item : rawHistory) {
            LocalDate weekStart = item.getWeekStartDate();
            if (weekStart != null && !latestByWeek.containsKey(weekStart)) {
                latestByWeek.put(weekStart, item);
            }
        }

        return List.copyOf(latestByWeek.values());
    }

    public WeeklyPlan updateWeeklyPlanDayCompletion(String weeklyPlanId, String day, Boolean completed) {
        if (day == null || day.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Day is required");
        }

        if (completed == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Completed is required");
        }

        WeeklyPlan weeklyPlan = weeklyPlanRepository.findById(weeklyPlanId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Weekly plan not found: " + weeklyPlanId
                ));

        Map<String, Boolean> dayCompletion = weeklyPlan.getDayCompletion();
        if (dayCompletion == null || dayCompletion.isEmpty()) {
            dayCompletion = defaultDayCompletionMap();
        }

        String normalizedDay = day.trim().toUpperCase(Locale.ROOT);
        if (!dayCompletion.containsKey(normalizedDay)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported day: " + day);
        }

        dayCompletion.put(normalizedDay, completed);
        weeklyPlan.setDayCompletion(dayCompletion);
        return weeklyPlanRepository.save(weeklyPlan);
    }

    private List<Recommendation> ensureRecommendationsForUser(String userId) {
        List<Recommendation> existingRecommendations = recommendationRepository.findByUserId(userId);
        List<Activity> activities = activityLookupService.getUserActivities(userId);

        if (activities == null || activities.isEmpty()) {
            return existingRecommendations;
        }

        Set<String> existingActivityIds = new HashSet<>();
        for (Recommendation recommendation : existingRecommendations) {
            if (recommendation.getActivityId() != null && !recommendation.getActivityId().isBlank()) {
                existingActivityIds.add(recommendation.getActivityId());
            }
        }

        for (Activity activity : activities) {
            if (activity.getId() == null || existingActivityIds.contains(activity.getId())) {
                continue;
            }

            Recommendation generatedRecommendation = activityAIService.generateRecommendation(activity);
            recommendationRepository.save(generatedRecommendation);
            existingRecommendations.add(generatedRecommendation);
            existingActivityIds.add(activity.getId());
        }

        return existingRecommendations;
    }

    private WeeklyPlan buildWeeklyPlan(
            String userId,
            Recommendation generated,
            LocalDate weekStartDate,
            Map<String, Boolean> existingDayCompletion
    ) {
        Map<String, Boolean> dayCompletion = defaultDayCompletionMap();
        if (existingDayCompletion != null && !existingDayCompletion.isEmpty()) {
            for (Map.Entry<String, Boolean> entry : existingDayCompletion.entrySet()) {
                if (dayCompletion.containsKey(entry.getKey())) {
                    dayCompletion.put(entry.getKey(), Boolean.TRUE.equals(entry.getValue()));
                }
            }
        }

        return WeeklyPlan.builder()
                .userId(userId)
                .type(generated.getType())
                .recommendation(generated.getRecommendation())
                .improvements(generated.getImprovements())
                .suggestions(generated.getSuggestions())
                .safety(generated.getSafety())
                .weekStartDate(weekStartDate)
                .dayCompletion(dayCompletion)
                .createdAt(LocalDateTime.now())
                .build();
    }

    private LocalDate currentWeekStartDate() {
        LocalDate today = LocalDate.now();
        int diff = today.getDayOfWeek().getValue() - 1;
        return today.minusDays(diff);
    }

    private Map<String, Boolean> defaultDayCompletionMap() {
        Map<String, Boolean> map = new LinkedHashMap<>();
        map.put("MONDAY", false);
        map.put("TUESDAY", false);
        map.put("WEDNESDAY", false);
        map.put("THURSDAY", false);
        map.put("FRIDAY", false);
        map.put("SATURDAY", false);
        map.put("SUNDAY", false);
        return map;
    }
}
