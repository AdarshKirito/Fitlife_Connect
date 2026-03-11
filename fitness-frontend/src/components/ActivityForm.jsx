import React, { useState } from 'react'
import { addActivity } from '../services/api';

const ActivityForm = ({ onActivityAdded }) => {

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
      distance: ''
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
        additionalMetrics: {
          ...activity.additionalMetrics,
          waterIntakeMl: activity.additionalMetrics.waterIntakeMl
            ? Number(activity.additionalMetrics.waterIntakeMl)
            : null,
          heartRateBpm: activity.additionalMetrics.heartRateBpm
            ? Number(activity.additionalMetrics.heartRateBpm)
            : null,
          distance: activity.additionalMetrics.distance
            ? Number(activity.additionalMetrics.distance)
            : null
        }
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
          distance: ''
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

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      {/* Activity Type */}
      <div className="mb-4">
        <label className="block text-white text-sm font-medium mb-2">
          Activity Type <span className="text-red-400">*</span>
        </label>
        <select 
          value={activity.type}
          onChange={(e) => setActivity({...activity, type: e.target.value})}
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

        {/* Meal Timing */}
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

        {/* Water Intake */}
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

        {/* Heart Rate */}
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

        {/* Distance */}
        <div>
          <label className="block text-gray-300 text-sm mb-1">
            Distance (km)
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={activity.additionalMetrics.distance}
            onChange={(e) => handleAdditionalMetricChange('distance', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
            placeholder="e.g., 5, 10.5"
          />
        </div>
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
