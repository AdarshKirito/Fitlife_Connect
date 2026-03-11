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
    private final GeminiService geminiService;

    private final ObjectMapper objectMapper;

    public Recommendation generateRecommendation(Activity activity) {
        String prompt = createPromptForActivity(activity);
        String aiResponse = geminiService.getRecommendations(prompt);
        log.info("RESPONSE FROM AI {} ", aiResponse);
        return processAIResponse(activity, aiResponse);
    }

    private Recommendation processAIResponse(Activity activity, String aiResponse) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode rootNode = mapper.readTree(aiResponse);
            JsonNode textNode = rootNode.path("candidates")
                    .get(0)
                    .path("content")
                    .get("parts")
                    .get(0)
                    .path("text");

            String jsonContent = textNode.asText()
                    .replaceAll("```json\\n","")
                    .replaceAll("\\n```","")
                    .trim();

//            log.info("RESPONSE FROM CLEANED AI {} ", jsonContent);

            JsonNode analysisJson = mapper.readTree(jsonContent);
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
        Heart Rate (BPM): %s
        Distance (km): %s
        Additional Metrics: %s
        
        Provide detailed analysis focusing on performance, improvements, next workout suggestions, and safety guidelines.
        Include analysis on heart rate zones if heart rate is provided and distance covered if available.
        Ensure the response follows the EXACT JSON format shown above.
        """,
                activity.getType(),
                activity.getDuration(),
                activity.getStartTime(),
                activity.getCaloriesBurned(),
                activity.getAdditionalMetrics().get("heartRateBpm") != null ? activity.getAdditionalMetrics().get("heartRateBpm") : "Not recorded",
                activity.getAdditionalMetrics().get("distance") != null ? activity.getAdditionalMetrics().get("distance") : "Not recorded",
                activity.getAdditionalMetrics()
        );
    }

    public Recommendation generateUserCombinedRecommendation(String userId, List<Recommendation> recs) {
        try {
            String existingRecsJson = objectMapper.writeValueAsString(recs);

            String prompt = createPromptForUserFromRecommendations(userId, existingRecsJson);
            String aiResponse = geminiService.getRecommendations(prompt);
            log.info("USER-LEVEL RESPONSE FROM AI: {}", aiResponse);

            // Use dummy activity just to reuse processAIResponse()
            Activity dummy = new Activity();
            dummy.setId(null);
            dummy.setUserId(userId);
            dummy.setType(ActivityType.OTHER);
            dummy.setDuration(null);
            dummy.setCaloriesBurned(null);
            dummy.setAdditionalMetrics(Map.of("recommendationsCount", recs.size()));

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


}
