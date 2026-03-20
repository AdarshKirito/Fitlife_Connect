package com.fitness.aiservice.controller;

import com.fitness.aiservice.dto.DayCompletionRequest;
import com.fitness.aiservice.model.Recommendation;
import com.fitness.aiservice.model.WeeklyPlan;
import com.fitness.aiservice.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/recommendations")
public class RecommendationController {
    private final RecommendationService recommendationService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<Recommendation> getUserCombinedRecommendation(@PathVariable String userId) {
        return ResponseEntity.ok(recommendationService.getUserRecommendation(userId));
    }

    @GetMapping("/activity/{activityId}")
    public ResponseEntity<Recommendation> getActivityRecommendation(
            @PathVariable String activityId,
            @RequestHeader("X-User-ID") String userId,
            @RequestParam(name = "refresh", defaultValue = "false") boolean refresh
    ) {
        return ResponseEntity.ok(recommendationService.getActivityRecommendation(activityId, userId, refresh));
    }

    @GetMapping("/weekly/{userId}")
    public ResponseEntity<WeeklyPlan> getWeeklyPlanRecommendation(@PathVariable String userId) {
        return ResponseEntity.ok(recommendationService.getWeeklyPlanRecommendation(userId));
    }

    @PostMapping("/weekly/{userId}/regenerate")
    public ResponseEntity<WeeklyPlan> regenerateWeeklyPlanRecommendation(@PathVariable String userId) {
        return ResponseEntity.ok(recommendationService.regenerateWeeklyPlanRecommendation(userId));
    }

    @GetMapping("/weekly/{userId}/history")
    public ResponseEntity<List<WeeklyPlan>> getWeeklyPlanHistory(@PathVariable String userId) {
        return ResponseEntity.ok(recommendationService.getWeeklyPlanHistory(userId));
    }

    @PatchMapping("/weekly/{weeklyPlanId}/days")
    public ResponseEntity<WeeklyPlan> updateWeeklyPlanDayCompletion(
            @PathVariable String weeklyPlanId,
            @RequestBody DayCompletionRequest request
    ) {
        return ResponseEntity.ok(
                recommendationService.updateWeeklyPlanDayCompletion(
                        weeklyPlanId,
                        request.getDay(),
                        request.getCompleted()
                )
        );
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleStatusException(ResponseStatusException ex) {
        String message = ex.getReason() != null ? ex.getReason() : "Request failed";
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", message));
    }
}
