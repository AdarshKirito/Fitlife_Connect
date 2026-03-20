package com.fitness.aiservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitness.aiservice.model.Activity;
import com.fitness.aiservice.model.ActivityType;
import com.fitness.aiservice.model.Recommendation;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
@Slf4j
@AllArgsConstructor
public class ActivityAIService {
  private final OpenAIService openAIService;

    private final ObjectMapper objectMapper;

    public Recommendation generateRecommendation(Activity activity) {
        String prompt = createPromptForActivity(activity);
      String aiResponse = openAIService.getRecommendations(prompt);
        log.info("RESPONSE FROM AI {} ", aiResponse);
        return processAIResponse(activity, aiResponse);
    }

    private Recommendation processAIResponse(Activity activity, String aiResponse) {
        try {
            JsonNode rootNode = objectMapper.readTree(aiResponse);
            JsonNode textNode = rootNode.path("choices")
              .get(0)
              .path("message")
              .path("content");

            if (textNode.isMissingNode() || textNode.isNull()) {
          throw new IllegalStateException("OpenAI response missing choices[0].message.content");
            }

            String jsonContent = textNode.asText()
              .replace("```json", "")
              .replace("```", "")
              .trim();

//            log.info("RESPONSE FROM CLEANED AI {} ", jsonContent);

            JsonNode analysisJson = objectMapper.readTree(jsonContent);
            JsonNode analysisNode = analysisJson.path("analysis");
            StringBuilder fullAnalysis = new StringBuilder();
            addAnalysisSection(fullAnalysis, analysisNode, "overall", "Overall:");
            addAnalysisSection(fullAnalysis, analysisNode, "pace", "Pace:");
            addAnalysisSection(fullAnalysis, analysisNode, "heartRate", "Heart Rate:");
            addAnalysisSection(fullAnalysis, analysisNode, "distance", "Distance:");
            addAnalysisSection(fullAnalysis, analysisNode, "caloriesBurned", "Calories:");

            List<String> improvements = extractImprovements(analysisJson.path("improvements"));
            List<String> suggestions = extractSuggestions(analysisJson.path("suggestions"));
            List<String> safety = extractSafetyGuidelines(analysisJson.path("safety"));

            return Recommendation.builder()
                    .activityId(activity.getId())
                    .userId(activity.getUserId())
                    .type(activity.getType().toString())
                    .recommendation(fullAnalysis.toString().trim())
                    .improvements(improvements)
                    .suggestions(suggestions)
                    .safety(safety)
                    .createdAt(LocalDateTime.now())
                    .build();

        } catch (Exception e) {
            e.printStackTrace();
            return createDefaultRecommendation(activity);
        }
    }

    private Recommendation createDefaultRecommendation(Activity activity) {
        return Recommendation.builder()
                .activityId(activity.getId())
                .userId(activity.getUserId())
                .type(activity.getType().toString())
                .recommendation("Unable to generate detailed analysis")
                .improvements(Collections.singletonList("Continue with your current routine"))
                .suggestions(Collections.singletonList("Consider consulting a fitness consultant"))
                .safety(Arrays.asList(
                        "Always warm up before exercise",
                        "Stay hydrated",
                        "Listen to your body"
                ))
                .createdAt(LocalDateTime.now())
                .build();
    }

    private List<String> extractSafetyGuidelines(JsonNode safetyNode) {
        List<String> safety = new ArrayList<>();
        if (safetyNode.isArray()) {
            safetyNode.forEach(item -> safety.add(item.asText()));
        }
        return safety.isEmpty() ?
                Collections.singletonList("Follow general safety guidelines") :
                safety;
    }

    private List<String> extractSuggestions(JsonNode suggestionsNode) {
        List<String> suggestions = new ArrayList<>();
        if (suggestionsNode.isArray()) {
            suggestionsNode.forEach(suggestion -> {
                String workout = suggestion.path("workout").asText();
                String description = suggestion.path("description").asText();
                suggestions.add(String.format("%s: %s", workout, description));
            });
        }
        return suggestions.isEmpty() ?
                Collections.singletonList("No specific suggestions provided") :
                suggestions;
    }

    private List<String> extractImprovements(JsonNode improvementsNode) {
        List<String> improvements = new ArrayList<>();
        if (improvementsNode.isArray()) {
            improvementsNode.forEach(improvement -> {
                String area = improvement.path("area").asText();
                String detail = improvement.path("recommendation").asText();
                improvements.add(String.format("%s: %s", area, detail));
            });
        }
        return improvements.isEmpty() ?
                Collections.singletonList("No specific improvements provided") :
                improvements;

    }

    //    "overall": "This was an excellent"
    // Overall: This was an excellent
    private void addAnalysisSection(StringBuilder fullAnalysis, JsonNode analysisNode, String key, String prefix) {
    if (!analysisNode.path(key).isMissingNode()){
     fullAnalysis.append(prefix)
             .append(analysisNode.path(key).asText())
             .append("\n\n");
    }
    }

    private String createPromptForActivity(Activity activity) {
      Map<String, Object> metrics = activity.getAdditionalMetrics() != null
        ? activity.getAdditionalMetrics()
        : Collections.emptyMap();
      String metricsSummary = buildMetricsSummary(activity.getType(), metrics);

        return String.format("""
        Analyze this fitness activity and provide detailed recommendations in the following EXACT JSON format:
        {
          "analysis": {
            "overall": "Overall analysis here",
            "pace": "Pace analysis here",
            "heartRate": "Heart rate analysis here",
            "distance": "Distance analysis here",
            "caloriesBurned": "Calories analysis here"
          },
          "improvements": [
            {
              "area": "Area name",
              "recommendation": "Detailed recommendation"
            }
          ],
          "suggestions": [
            {
              "workout": "Workout name",
              "description": "Detailed workout description"
            }
          ],
          "safety": [
            "Safety point 1",
            "Safety point 2"
          ]
        }

        Analyze this activity:
        Activity Type: %s
        Duration: %d minutes
        Start Time: %s
        Calories Burned: %d
        Activity-Specific Metrics:
        %s
        Raw Additional Metrics (JSON-like map): %s
        
        Provide detailed analysis focusing on performance, improvements, next workout suggestions, and safety guidelines.
        IMPORTANT METRIC RULES:
        - SWIMMING `distance` is LAP COUNT, not kilometers.
        - RUNNING/WALKING/CYCLING `distance` is in kilometers.
        - WEIGHT_TRAINING uses sets/reps/weightKg and should not be treated as distance-based cardio.
        - YOGA/STRETCHING should focus on sessionIntensity and focusArea, not pace/distance.
        Include heart-rate zone comments only when heartRateBpm is present.
        Ensure the response follows the EXACT JSON format shown above.
        """,
                activity.getType(),
                activity.getDuration(),
                activity.getStartTime(),
                activity.getCaloriesBurned(),
            metricsSummary,
            metrics
        );
    }

      private String buildMetricsSummary(ActivityType type, Map<String, Object> metrics) {
        StringBuilder sb = new StringBuilder();

        addMetricLine(sb, "Time of day", metrics.get("timeOfDay"));
        addMetricLine(sb, "Meal timing", metrics.get("mealTiming"));
        addMetricLine(sb, "Water intake (ml)", metrics.get("waterIntakeMl"));

        if (type == ActivityType.SWIMMING) {
          addMetricLine(sb, "Heart rate (BPM)", metrics.get("heartRateBpm"));
          addMetricLine(sb, "Laps", metrics.get("distance"));
          addMetricLine(sb, "Stroke type", metrics.get("strokeType"));
        } else if (type == ActivityType.RUNNING || type == ActivityType.WALKING) {
          addMetricLine(sb, "Heart rate (BPM)", metrics.get("heartRateBpm"));
          addMetricLine(sb, "Distance (km)", metrics.get("distance"));
        } else if (type == ActivityType.CYCLING) {
          addMetricLine(sb, "Heart rate (BPM)", metrics.get("heartRateBpm"));
          addMetricLine(sb, "Distance (km)", metrics.get("distance"));
          addMetricLine(sb, "Average speed (km/h)", metrics.get("avgSpeedKmh"));
          addMetricLine(sb, "Elevation gain (m)", metrics.get("elevationGainM"));
        } else if (type == ActivityType.WEIGHT_TRAINING) {
          addMetricLine(sb, "Sets", metrics.get("sets"));
          addMetricLine(sb, "Reps", metrics.get("reps"));
          addMetricLine(sb, "Weight (kg)", metrics.get("weightKg"));
          addMetricLine(sb, "Session intensity", metrics.get("sessionIntensity"));
        } else if (type == ActivityType.HIIT || type == ActivityType.CARDIO) {
          addMetricLine(sb, "Heart rate (BPM)", metrics.get("heartRateBpm"));
          addMetricLine(sb, "Session intensity", metrics.get("sessionIntensity"));
        } else if (type == ActivityType.YOGA || type == ActivityType.STRETCHING) {
          addMetricLine(sb, "Session intensity", metrics.get("sessionIntensity"));
          addMetricLine(sb, "Focus area", metrics.get("focusArea"));
        } else {
          addMetricLine(sb, "Heart rate (BPM)", metrics.get("heartRateBpm"));
          addMetricLine(sb, "Distance", metrics.get("distance"));
          addMetricLine(sb, "Session intensity", metrics.get("sessionIntensity"));
        }

        if (sb.length() == 0) {
          return "- No additional metrics recorded";
        }
        return sb.toString();
      }

      private void addMetricLine(StringBuilder sb, String label, Object value) {
        if (value == null) {
          return;
        }
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) {
          return;
        }
        sb.append("- ").append(label).append(": ").append(text).append("\n");
      }

    public Recommendation generateUserCombinedRecommendation(String userId, List<Recommendation> recs) {
        try {
            String existingRecsJson = objectMapper.writeValueAsString(recs);

            String prompt = createPromptForUserFromRecommendations(userId, existingRecsJson);
            String aiResponse = openAIService.getRecommendations(prompt);
            log.info("USER-LEVEL RESPONSE FROM AI: {}", aiResponse);

            Activity dummy = createSyntheticActivity(userId, recs.size());

            Recommendation combined = processAIResponse(dummy, aiResponse);
            combined.setType("USER_SUMMARY");   // mark it as a combined one
            return combined;
        } catch (Exception e) {
            e.printStackTrace();
            // Fallback if AI fails
            return Recommendation.builder()
                    .userId(userId)
                    .type("USER_SUMMARY")
                    .recommendation("Unable to generate combined recommendation from existing records.")
                    .improvements(Collections.singletonList("Review individual activity recommendations."))
                    .suggestions(Collections.singletonList("Continue tracking workouts and recommendations."))
                    .safety(Arrays.asList(
                            "Warm up properly",
                            "Stay hydrated",
                            "Listen to your body"
                    ))
                    .createdAt(LocalDateTime.now())
                    .build();
        }
    }

            public Recommendation generateWeeklyPlanRecommendation(String userId, List<Recommendation> recs) {
              try {
                String existingRecsJson = objectMapper.writeValueAsString(recs);

                String prompt = createPromptForWeeklyPlanFromRecommendations(userId, existingRecsJson);
                String aiResponse = openAIService.getRecommendations(prompt);
                log.info("WEEKLY-PLAN RESPONSE FROM AI: {}", aiResponse);

                Activity dummy = createSyntheticActivity(userId, recs.size());

                Recommendation weeklyPlan = processAIResponse(dummy, aiResponse);
                weeklyPlan.setType("WEEKLY_PLAN");
                return weeklyPlan;
              } catch (Exception e) {
                e.printStackTrace();
                return Recommendation.builder()
                    .userId(userId)
                    .type("WEEKLY_PLAN")
                    .recommendation("Unable to generate your weekly plan right now.")
                    .improvements(Collections.singletonList("Keep activity logging consistent to improve plan quality."))
                    .suggestions(Arrays.asList(
                        "Monday - 30 min moderate cardio",
                        "Tuesday - 20 min strength training",
                        "Wednesday - 30 min walk and mobility",
                        "Thursday - 25 min interval workout",
                        "Friday - 20 min core + stretching",
                        "Saturday - 40 min endurance session",
                        "Sunday - Recovery day with light stretching"
                    ))
                    .safety(Arrays.asList(
                        "Warm up for 5-10 minutes before every session",
                        "Stay hydrated before and after workouts",
                        "Reduce intensity if you feel unusual discomfort"
                    ))
                    .createdAt(LocalDateTime.now())
                    .build();
              }
            }

          private Activity createSyntheticActivity(String userId, int recommendationsCount) {
            Activity activity = new Activity();
            activity.setId(null);
            activity.setUserId(userId);
            activity.setType(ActivityType.OTHER);
            activity.setDuration(null);
            activity.setCaloriesBurned(null);
            activity.setAdditionalMetrics(Map.of("recommendationsCount", recommendationsCount));
            return activity;
          }

    private String createPromptForUserFromRecommendations(String userId, String recsJsonArray) {
        return String.format("""
        You are an expert fitness coach.

        Below is the FULL list of activity-level recommendations for a user.
        Each item already contains:
        - activity type
        - detailed recommendation text
        - improvements
        - suggestions
        - safety tips

        USER ID: %s

        ACTIVITY-LEVEL RECOMMENDATIONS (JSON ARRAY):
        %s

        Using ALL of the information above, create ONE combined recommendation for this user.

        Return the result in the EXACT JSON format below (NO extra text, NO markdown):

        {
          "analysis": {
            "overall": "Overall analysis for the user",
            "pace": "Overall comments on user's pace across activities",
            "heartRate": "Overall comments on heart rate / intensity consistency",
            "caloriesBurned": "Overall comments on calorie burn patterns"
          },
          "improvements": [
            {
              "area": "Key area to improve (e.g., Intensity, Consistency, Data Tracking)",
              "recommendation": "Detailed combined recommendation for this area"
            }
          ],
          "suggestions": [
            {
              "workout": "Suggested workout type",
              "description": "Detailed description of what the user should do"
            }
          ],
          "safety": [
            "Important global safety guideline for this user",
            "Another key safety point"
          ]
        }

        Focus on patterns across ALL activities (e.g., low intensity, poor tracking, consistency).
        """, userId, recsJsonArray);
    }

    private String createPromptForWeeklyPlanFromRecommendations(String userId, String recsJsonArray) {
        return String.format("""
        You are an expert fitness coach.

        Build a personalized 7-day weekly plan based on this user's existing activity recommendations.

        USER ID: %s

        INPUT RECOMMENDATIONS (JSON ARRAY):
        %s

        Return ONLY valid JSON using this exact structure (no markdown, no extra text):
        {
          "analysis": {
            "overall": "High-level summary of current fitness level and weekly strategy",
            "pace": "How the user should pace effort through the week",
            "heartRate": "Heart-rate/intensity guidance for the week",
            "caloriesBurned": "Expected calorie-burn pattern across the week"
          },
          "improvements": [
            {
              "area": "Key focus area",
              "recommendation": "What to improve this week"
            }
          ],
          "suggestions": [
            {
              "workout": "Day label like Monday/Tuesday",
              "description": "Concrete workout plan for that day, duration, and intensity"
            }
          ],
          "safety": [
            "Safety guidance 1",
            "Safety guidance 2"
          ]
        }

        Requirements:
        - Generate suggestions for all 7 days (Monday to Sunday).
        - Include at least one light/recovery day.
        - Keep plan realistic and progressive.
        - Use concise and actionable wording.
        """, userId, recsJsonArray);
    }


}
