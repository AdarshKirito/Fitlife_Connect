package com.fitness.activityservice;

import com.fitness.activityservice.model.Activity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ActivityRepository extends MongoRepository<Activity, String> {
    List<Activity> findByUserId(String userId);

    // Returns all activities for a user that START before the given time (overlap candidates)
    List<Activity> findByUserIdAndStartTimeBefore(String userId, LocalDateTime before);
}
