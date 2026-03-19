package com.fitness.aiservice.respository;

import com.fitness.aiservice.model.WeeklyPlan;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface WeeklyPlanRepository extends MongoRepository<WeeklyPlan, String> {
    Optional<WeeklyPlan> findFirstByUserIdAndWeekStartDateOrderByCreatedAtDesc(String userId, LocalDate weekStartDate);

    Optional<WeeklyPlan> findTopByUserIdOrderByCreatedAtDesc(String userId);

    List<WeeklyPlan> findByUserIdOrderByWeekStartDateDescCreatedAtDesc(String userId);
}
