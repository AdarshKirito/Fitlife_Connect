import React, { useState } from 'react'
import { addActivity } from '../services/api';

const ActivityForm = ({ onActivityAdded }) => {
  const metricKeys = [
    'timeOfDay',
    'mealTiming',
    'waterIntakeMl',
    'heartRateBpm',
    'distance',
    'sets',
    'reps',
    'weightKg',
    'avgSpeedKmh',
    'elevationGainM',
    'sessionIntensity',
    'focusArea',
    'strokeType'
  ];
  const metricVisibilityByType = {
    RUNNING: { timeOfDay: true, mealTiming: true, waterIntakeMl: true, heartRateBpm: true, distance: true, sets: false, reps: false, weightKg: false, avgSpeedKmh: false, elevationGainM: false, sessionIntensity: false, focusArea: false, strokeType: false },
    WALKING: { timeOfDay: true, mealTiming: true, waterIntakeMl: true, heartRateBpm: true, distance: true, sets: false, reps: false, weightKg: false, avgSpeedKmh: false, elevationGainM: false, sessionIntensity: false, focusArea: false, strokeType: false },
    CYCLING: { timeOfDay: true, mealTiming: true, waterIntakeMl: true, heartRateBpm: true, distance: true, sets: false, reps: false, weightKg: false, avgSpeedKmh: true, elevationGainM: true, sessionIntensity: false, focusArea: false, strokeType: false },
    SWIMMING: { timeOfDay: true, mealTiming: true, waterIntakeMl: true, heartRateBpm: true, distance: true, sets: false, reps: false, weightKg: false, avgSpeedKmh: false, elevationGainM: false, sessionIntensity: false, focusArea: false, strokeType: true },
    CARDIO: { timeOfDay: true, mealTiming: true, waterIntakeMl: true, heartRateBpm: true, distance: false, sets: false, reps: false, weightKg: false, avgSpeedKmh: false, elevationGainM: false, sessionIntensity: false, focusArea: false, strokeType: false },
    HIIT: { timeOfDay: true, mealTiming: true, waterIntakeMl: true, heartRateBpm: true, distance: false, sets: false, reps: false, weightKg: false, avgSpeedKmh: false, elevationGainM: false, sessionIntensity: true, focusArea: false, strokeType: false },
    WEIGHT_TRAINING: { timeOfDay: true, mealTiming: true, waterIntakeMl: true, heartRateBpm: false, distance: false, sets: true, reps: true, weightKg: true, avgSpeedKmh: false, elevationGainM: false, sessionIntensity: true, focusArea: false, strokeType: false },
    YOGA: { timeOfDay: true, mealTiming: true, waterIntakeMl: true, heartRateBpm: false, distance: false, sets: false, reps: false, weightKg: false, avgSpeedKmh: false, elevationGainM: false, sessionIntensity: true, focusArea: true, strokeType: false },
    STRETCHING: { timeOfDay: true, mealTiming: true, waterIntakeMl: true, heartRateBpm: false, distance: false, sets: false, reps: false, weightKg: false, avgSpeedKmh: false, elevationGainM: false, sessionIntensity: true, focusArea: true, strokeType: false },
    OTHER: { timeOfDay: true, mealTiming: true, waterIntakeMl: true, heartRateBpm: false, distance: false, sets: false, reps: false, weightKg: false, avgSpeedKmh: false, elevationGainM: false, sessionIntensity: false, focusArea: false, strokeType: false }
  };

  const getVisibleMetrics = (type) => metricVisibilityByType[type] || metricVisibilityByType.OTHER;

  const pruneHiddenMetrics = (metrics, type) => {
    const visible = getVisibleMetrics(type);
    return metricKeys.reduce((acc, key) => {
      acc[key] = visible[key] ? (metrics[key] ?? '') : '';
      return acc;
    }, {});
  };

  const buildPayloadMetrics = (metrics, type) => {
    const visible = getVisibleMetrics(type);
    const payload = {};

    if (visible.timeOfDay && metrics.timeOfDay) payload.timeOfDay = metrics.timeOfDay;
    if (visible.mealTiming && metrics.mealTiming) payload.mealTiming = metrics.mealTiming;
    if (visible.waterIntakeMl && metrics.waterIntakeMl !== '') payload.waterIntakeMl = Number(metrics.waterIntakeMl);
    if (visible.heartRateBpm && metrics.heartRateBpm !== '') payload.heartRateBpm = Number(metrics.heartRateBpm);
    if (visible.distance && metrics.distance !== '') payload.distance = Number(metrics.distance);
    if (visible.sets && metrics.sets !== '') payload.sets = Number(metrics.sets);
    if (visible.reps && metrics.reps !== '') payload.reps = Number(metrics.reps);
    if (visible.weightKg && metrics.weightKg !== '') payload.weightKg = Number(metrics.weightKg);
    if (visible.avgSpeedKmh && metrics.avgSpeedKmh !== '') payload.avgSpeedKmh = Number(metrics.avgSpeedKmh);
    if (visible.elevationGainM && metrics.elevationGainM !== '') payload.elevationGainM = Number(metrics.elevationGainM);
    if (visible.sessionIntensity && metrics.sessionIntensity) payload.sessionIntensity = metrics.sessionIntensity;
    if (visible.focusArea && metrics.focusArea) payload.focusArea = metrics.focusArea;
    if (visible.strokeType && metrics.strokeType) payload.strokeType = metrics.strokeType;

    return payload;
  };

  const getDistanceLabel = (type) => (type === 'SWIMMING' ? 'Laps' : 'Distance (km)');
  const getDistancePlaceholder = (type) => (type === 'SWIMMING' ? 'e.g., 20, 40' : 'e.g., 5, 10.5');

  const [activity, setActivity] = useState({
    type: "RUNNING",
    duration: '',
    caloriesBurned: '',
    // startTime stored as a string matching input[type=datetime-local] value
    startTime: null,
    additionalMetrics: {
      timeOfDay: '',
      mealTiming: '',
      waterIntakeMl: '',
      heartRateBpm: '',
      distance: '',
      sets: '',
      reps: '',
      weightKg: '',
      avgSpeedKmh: '',
      elevationGainM: '',
      sessionIntensity: '',
      focusArea: '',
      strokeType: ''
    }
  });

  const [errors, setErrors] = useState({
    duration: '',
    caloriesBurned: ''
  });

  const handleAdditionalMetricChange = (field, value) => {
    setActivity(prev => ({
      ...prev,
      additionalMetrics: {
        ...prev.additionalMetrics,
        [field]: value
      }
    }));
  };

  const handleTypeChange = (type) => {
    setActivity(prev => ({
      ...prev,
      type,
      additionalMetrics: pruneHiddenMetrics(prev.additionalMetrics, type)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate before submitting
    if (!isFormValid()) {
      return;
    }

    try {
      const payload = {
        ...activity,
        // convert numbers and pass startTime as-is (datetime-local string -> ISO-ish local string)
        duration: Number(activity.duration),
        caloriesBurned: Number(activity.caloriesBurned),
        startTime: activity.startTime || null,
        additionalMetrics: buildPayloadMetrics(activity.additionalMetrics, activity.type)
      };

      await addActivity(payload);
      onActivityAdded();
      setActivity({
        type: "RUNNING",
        duration: '',
        caloriesBurned: '',
        startTime: getLocalDatetimeForInput(),
        additionalMetrics: {
          timeOfDay: '',
          mealTiming: '',
          waterIntakeMl: '',
          heartRateBpm: '',
          distance: '',
          sets: '',
          reps: '',
          weightKg: '',
          avgSpeedKmh: '',
          elevationGainM: '',
          sessionIntensity: '',
          focusArea: '',
          strokeType: ''
        }
      });
      setErrors({
        duration: '',
        caloriesBurned: ''
      });
    } catch (error) {
      console.error(error);
    }
  }

  const isFormValid = () => {
    return (
      activity.type &&
      activity.duration &&
      activity.duration > 0 &&
      activity.caloriesBurned &&
      activity.caloriesBurned > 0
    );
  }

  const handleDurationChange = (e) => {
    const value = e.target.value;
    setActivity({...activity, duration: value});
    
    if (value && value <= 0) {
      setErrors({...errors, duration: 'Duration must be greater than 0'});
    } else if (value && value > 1440) {
      setErrors({...errors, duration: 'Duration cannot exceed 24 hours (1440 minutes)'});
    } else {
      setErrors({...errors, duration: ''});
    }
  }

  // helper to produce a value suitable for input[type=datetime-local] representing local now
  const getLocalDatetimeForInput = () => {
    const now = new Date();
    // offset to account for local timezone so the displayed value matches local time
    const tzOffset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - tzOffset * 60000);
    return local.toISOString().slice(0,16); // YYYY-MM-DDTHH:mm
  }

  // set initial startTime to now on first render if not set
  React.useEffect(() => {
    if (!activity.startTime) {
      setActivity(prev => ({...prev, startTime: getLocalDatetimeForInput()}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartTimeChange = (e) => {
    const value = e.target.value;
    // prevent selecting future times by clamping to now
    const max = getLocalDatetimeForInput();
    if (value > max) {
      setActivity(prev => ({...prev, startTime: max}));
    } else {
      setActivity(prev => ({...prev, startTime: value}));
    }
  }

  const handleCaloriesChange = (e) => {
    const value = e.target.value;
    setActivity({...activity, caloriesBurned: value});
    
    if (value && value <= 0) {
      setErrors({...errors, caloriesBurned: 'Calories must be greater than 0'});
    } else if (value && value > 10000) {
      setErrors({...errors, caloriesBurned: 'Calories seem too high. Please check.'});
    } else {
      setErrors({...errors, caloriesBurned: ''});
    }
  }

  const visibleMetrics = getVisibleMetrics(activity.type);

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      {/* Activity Type */}
      <div className="mb-4">
        <label className="block text-white text-sm font-medium mb-2">
          Activity Type <span className="text-red-400">*</span>
        </label>
        <select 
          value={activity.type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
          required
        >
          <option value="RUNNING">Running</option>
          <option value="WALKING">Walking</option>
          <option value="CYCLING">Cycling</option>
          <option value="SWIMMING">SWIMMING</option>
          <option value="WEIGHT_TRAINING">WEIGHT_TRAINING</option>
          <option value="YOGA">YOGA</option>
          <option value="HIIT">HIIT</option>
          <option value="CARDIO">CARDIO</option>
          <option value="STRETCHING">STRETCHING</option>
          <option value="OTHER">OTHER</option>
        </select>
      </div>

      {/* Duration */}
      <div className="mb-4">
        <label className="block text-white text-sm font-medium mb-2">
          Duration (Minutes) <span className="text-red-400">*</span>
        </label>
        <input 
          type="number"
          value={activity.duration}
          onChange={handleDurationChange}
          className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 transition ${
            errors.duration 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
              : 'border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
          }`}
          placeholder="Enter duration in minutes"
          min="1"
          max="1440"
          required
        />
        {errors.duration && (
          <p className="text-red-400 text-sm mt-1">{errors.duration}</p>
        )}
      </div>

      {/* Calories */}
      <div className="mb-4">
        <label className="block text-white text-sm font-medium mb-2">
          Calories Burned <span className="text-red-400">*</span>
        </label>
        <input 
          type="number"
          value={activity.caloriesBurned}
          onChange={handleCaloriesChange}
          className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 transition ${
            errors.caloriesBurned 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
              : 'border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
          }`}
          placeholder="Enter calories burned"
          min="1"
          max="10000"
          required
        />
        {errors.caloriesBurned && (
          <p className="text-red-400 text-sm mt-1">{errors.caloriesBurned}</p>
        )}
      </div>

      {/* Date & Time */}
      <div className="mb-4">
        <label className="block text-white text-sm font-medium mb-2">
          Date & Time (when activity started) <span className="text-red-400">*</span>
        </label>
        <input
          type="datetime-local"
          value={activity.startTime || ''}
          onChange={handleStartTimeChange}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
          max={getLocalDatetimeForInput()}
          required
        />
        <p className="text-gray-400 text-sm mt-1">
          You can select past date/time; future times are not allowed.
        </p>
      </div>

      {/* Additional Metrics Section */}
      <div className="mb-6 border border-gray-700 rounded-lg p-4 bg-gray-900/40">
        <p className="text-white font-medium mb-3">
          Additional Details (for better AI recommendations)
        </p>

        {/* Time of Day */}
        {visibleMetrics.timeOfDay && (
        <div className="mb-3">
          <label className="block text-gray-300 text-sm mb-1">
            When did you do this activity?
          </label>
          <select
            value={activity.additionalMetrics.timeOfDay}
            onChange={(e) => handleAdditionalMetricChange('timeOfDay', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
          >
            <option value="">Select time of day</option>
            <option value="MORNING">Morning</option>
            <option value="AFTERNOON">Afternoon</option>
            <option value="EVENING">Evening</option>
            <option value="NIGHT">Night</option>
          </select>
        </div>
        )}

        {/* Meal Timing */}
        {visibleMetrics.mealTiming && (
        <div className="mb-3">
          <label className="block text-gray-300 text-sm mb-1">
            Was this before or after eating?
          </label>
          <select
            value={activity.additionalMetrics.mealTiming}
            onChange={(e) => handleAdditionalMetricChange('mealTiming', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
          >
            <option value="">Select option</option>
            <option value="BEFORE_EATING">Before eating</option>
            <option value="AFTER_EATING">After eating</option>
          </select>
        </div>
        )}

        {/* Water Intake */}
        {visibleMetrics.waterIntakeMl && (
        <div>
          <label className="block text-gray-300 text-sm mb-1">
            Water drank before/during activity (ml)
          </label>
          <input
            type="number"
            min="0"
            value={activity.additionalMetrics.waterIntakeMl}
            onChange={(e) => handleAdditionalMetricChange('waterIntakeMl', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
            placeholder="e.g., 250, 500"
          />
        </div>
        )}

        {/* Heart Rate */}
        {visibleMetrics.heartRateBpm && (
        <div>
          <label className="block text-gray-300 text-sm mb-1">
            Heart Rate (BPM)
          </label>
          <input
            type="number"
            min="0"
            max="220"
            value={activity.additionalMetrics.heartRateBpm}
            onChange={(e) => handleAdditionalMetricChange('heartRateBpm', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
            placeholder="e.g., 120, 150"
          />
        </div>
        )}

        {/* Distance / Laps */}
        {visibleMetrics.distance && (
        <div>
          <label className="block text-gray-300 text-sm mb-1">
            {getDistanceLabel(activity.type)}
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={activity.additionalMetrics.distance}
            onChange={(e) => handleAdditionalMetricChange('distance', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
            placeholder={getDistancePlaceholder(activity.type)}
          />
        </div>
        )}

        {visibleMetrics.strokeType && (
        <div>
          <label className="block text-gray-300 text-sm mb-1">
            Stroke Type
          </label>
          <input
            type="text"
            value={activity.additionalMetrics.strokeType}
            onChange={(e) => handleAdditionalMetricChange('strokeType', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
            placeholder="e.g., freestyle, breaststroke"
          />
        </div>
        )}

        {visibleMetrics.avgSpeedKmh && (
        <div>
          <label className="block text-gray-300 text-sm mb-1">
            Avg Speed (km/h)
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={activity.additionalMetrics.avgSpeedKmh}
            onChange={(e) => handleAdditionalMetricChange('avgSpeedKmh', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
            placeholder="e.g., 24.5"
          />
        </div>
        )}

        {visibleMetrics.elevationGainM && (
        <div>
          <label className="block text-gray-300 text-sm mb-1">
            Elevation Gain (m)
          </label>
          <input
            type="number"
            min="0"
            value={activity.additionalMetrics.elevationGainM}
            onChange={(e) => handleAdditionalMetricChange('elevationGainM', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
            placeholder="e.g., 300"
          />
        </div>
        )}

        {visibleMetrics.sets && (
        <div>
          <label className="block text-gray-300 text-sm mb-1">
            Total Sets
          </label>
          <input
            type="number"
            min="0"
            value={activity.additionalMetrics.sets}
            onChange={(e) => handleAdditionalMetricChange('sets', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
            placeholder="e.g., 12"
          />
        </div>
        )}

        {visibleMetrics.reps && (
        <div>
          <label className="block text-gray-300 text-sm mb-1">
            Total Reps
          </label>
          <input
            type="number"
            min="0"
            value={activity.additionalMetrics.reps}
            onChange={(e) => handleAdditionalMetricChange('reps', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
            placeholder="e.g., 80"
          />
        </div>
        )}

        {visibleMetrics.weightKg && (
        <div>
          <label className="block text-gray-300 text-sm mb-1">
            Max/Working Weight (kg)
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={activity.additionalMetrics.weightKg}
            onChange={(e) => handleAdditionalMetricChange('weightKg', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
            placeholder="e.g., 60"
          />
        </div>
        )}

        {visibleMetrics.sessionIntensity && (
        <div>
          <label className="block text-gray-300 text-sm mb-1">
            Session Intensity
          </label>
          <select
            value={activity.additionalMetrics.sessionIntensity}
            onChange={(e) => handleAdditionalMetricChange('sessionIntensity', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
          >
            <option value="">Select intensity</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        )}

        {visibleMetrics.focusArea && (
        <div>
          <label className="block text-gray-300 text-sm mb-1">
            Focus Area
          </label>
          <input
            type="text"
            value={activity.additionalMetrics.focusArea}
            onChange={(e) => handleAdditionalMetricChange('focusArea', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
            placeholder="e.g., flexibility, breathwork, lower back"
          />
        </div>
        )}
      </div>

      <button 
        type="submit"
        disabled={!isFormValid() || errors.duration || errors.caloriesBurned}
        className={`px-8 py-3 font-medium rounded-lg transition transform ${
          isFormValid() && !errors.duration && !errors.caloriesBurned
            ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95 cursor-pointer'
            : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-60'
        }`}
      >
        Add Activity
      </button>

      {!isFormValid() && (
        <p className="text-gray-400 text-sm mt-3">
          * Please fill in all required fields to add an activity
        </p>
      )}
    </form>
  )
}

export default ActivityForm
