import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router';
import { getActivityDetail, deleteActivity, getActivityRecommendation, updateActivity } from '../services/api';
import { ArrowLeft, Calendar, Clock, Flame, TrendingUp, AlertCircle, Lightbulb, ShieldCheck, Droplet } from 'lucide-react';

const ActivityDetail = () => {
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

  const pruneHiddenMetrics = (values, type) => {
    const visible = getVisibleMetrics(type);
    return metricKeys.reduce((acc, key) => {
      acc[key] = visible[key] ? (values[key] ?? '') : '';
      return acc;
    }, {});
  };

  const buildPayloadMetrics = (values, type) => {
    const visible = getVisibleMetrics(type);
    const payload = {};

    if (visible.timeOfDay && values.timeOfDay) payload.timeOfDay = values.timeOfDay;
    if (visible.mealTiming && values.mealTiming) payload.mealTiming = values.mealTiming;
    if (visible.waterIntakeMl && values.waterIntakeMl !== '') payload.waterIntakeMl = Number(values.waterIntakeMl);
    if (visible.heartRateBpm && values.heartRateBpm !== '') payload.heartRateBpm = Number(values.heartRateBpm);
    if (visible.distance && values.distance !== '') payload.distance = Number(values.distance);
    if (visible.sets && values.sets !== '') payload.sets = Number(values.sets);
    if (visible.reps && values.reps !== '') payload.reps = Number(values.reps);
    if (visible.weightKg && values.weightKg !== '') payload.weightKg = Number(values.weightKg);
    if (visible.avgSpeedKmh && values.avgSpeedKmh !== '') payload.avgSpeedKmh = Number(values.avgSpeedKmh);
    if (visible.elevationGainM && values.elevationGainM !== '') payload.elevationGainM = Number(values.elevationGainM);
    if (visible.sessionIntensity && values.sessionIntensity) payload.sessionIntensity = values.sessionIntensity;
    if (visible.focusArea && values.focusArea) payload.focusArea = values.focusArea;
    if (visible.strokeType && values.strokeType) payload.strokeType = values.strokeType;

    return payload;
  };

  const getDistanceLabel = (type) => (type === 'SWIMMING' ? 'Laps' : 'Distance');
  const getDistanceUnit = (type) => (type === 'SWIMMING' ? '' : ' km');
  const getDistanceInputLabel = (type) => (type === 'SWIMMING' ? 'Laps' : 'Distance (km)');
  const getDistancePlaceholder = (type) => (type === 'SWIMMING' ? 'e.g., 20, 40' : 'e.g., 5, 10.5');
  const getFieldCardLabel = (type, key) => {
    if (key === 'strokeType') return 'Stroke Type';
    if (key === 'avgSpeedKmh') return 'Avg Speed';
    if (key === 'elevationGainM') return 'Elevation Gain';
    if (key === 'sets') return 'Total Sets';
    if (key === 'reps') return 'Total Reps';
    if (key === 'weightKg') return 'Weight';
    if (key === 'sessionIntensity') return 'Session Intensity';
    if (key === 'focusArea') return type === 'YOGA' || type === 'STRETCHING' ? 'Focus Area' : 'Primary Focus';
    return key;
  };

  const { id } = useParams();
  const navigate = useNavigate();

  const createEmptyEditData = () => ({
    type: '',
    duration: '',
    caloriesBurned: '',
    startTime: '',
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
  });

  const buildEditDataFromActivity = useCallback((currentActivity) => {
    const metrics = currentActivity.additionalMetrics || {};

    return {
      type: currentActivity.type || '',
      duration: currentActivity.duration ?? '',
      caloriesBurned: currentActivity.caloriesBurned ?? '',
      startTime: currentActivity.startTime ? formatForDatetimeLocal(currentActivity.startTime) : '',
      timeOfDay: metrics.timeOfDay || '',
      mealTiming: metrics.mealTiming || '',
      waterIntakeMl: metrics.waterIntakeMl ?? '',
      heartRateBpm: metrics.heartRateBpm ?? '',
      distance: metrics.distance ?? '',
      sets: metrics.sets ?? '',
      reps: metrics.reps ?? '',
      weightKg: metrics.weightKg ?? '',
      avgSpeedKmh: metrics.avgSpeedKmh ?? '',
      elevationGainM: metrics.elevationGainM ?? '',
      sessionIntensity: metrics.sessionIntensity || '',
      focusArea: metrics.focusArea || '',
      strokeType: metrics.strokeType || ''
    };
  }, []);

  const [activity, setActivity] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [loadingRecommendation, setLoadingRecommendation] = useState(true);
  const [recError, setRecError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(createEmptyEditData());

  const formatTimeOfDay = (value) => {
    switch (value) {
      case 'MORNING': return 'Morning';
      case 'AFTERNOON': return 'Afternoon';
      case 'EVENING': return 'Evening';
      case 'NIGHT': return 'Night';
      default: return value || 'Not specified';
    }
  };

  const formatMealTiming = (value) => {
    switch (value) {
      case 'BEFORE_LUNCH':
      case 'BEFORE_EATING':
        return 'Before eating';
      case 'AFTER_LUNCH':
      case 'AFTER_EATING':
        return 'After eating';
      default: return value || 'Not specified';
    }
  };

  useEffect(() => {
    let retryTimeoutId;

    const fetchActivityDetail = async () => {
      try {
        setLoadingActivity(true);
        const response = await getActivityDetail(id); // /activities/{id}
        setActivity(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingActivity(false);
      }
    }

    const fetchRecommendation = async (attempt = 0) => {
      try {
        setLoadingRecommendation(true);
        const response = await getActivityRecommendation(id); // /recommendations/activity/{id}
        setRecommendation(response.data);
        setRecError(null);
      } catch (error) {
        if (error.response && error.response.status === 404) {
          const maxAttempts = 6;
          if (attempt < maxAttempts) {
            setRecError('AI recommendation is being generated. Retrying...');
            retryTimeoutId = setTimeout(() => {
              fetchRecommendation(attempt + 1);
            }, 5000);
            return;
          }
          setRecError('No AI recommendation generated yet for this activity.');
        } else {
          console.error('Error fetching recommendation:', error);
          setRecError('Failed to load AI recommendation.');
        }
      } finally {
        setLoadingRecommendation(false);
      }
    };

    fetchActivityDetail();
    fetchRecommendation();

    return () => {
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
    };
  }, [id]);

  // When activity is loaded, prefill edit form
  useEffect(() => {
    if (activity) {
      setEditData(buildEditDataFromActivity(activity));
    }
  }, [activity, buildEditDataFromActivity]);

  const formatForDatetimeLocal = (isoString) => {
    try {
      const dt = new Date(isoString);
      // shift to local and strip seconds
      const tzOffset = dt.getTimezoneOffset();
      const local = new Date(dt.getTime() - tzOffset * 60000);
      return local.toISOString().slice(0,16);
    } catch {
      return '';
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this activity?")) return;

    try {
      await deleteActivity(id);
      alert("Activity deleted successfully");
      navigate("/");
    } catch (error) {
      if (error.response) {
        console.error(
          "Delete failed with response:",
          error.response.status,
          error.response.data
        );
      } else {
        console.error("Delete failed (network/CORS?):", error.message);
      }
      alert("Failed to delete activity");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const updatedPayload = {
        type: editData.type,
        duration: Number(editData.duration),
        caloriesBurned: Number(editData.caloriesBurned),
        // prefer edited startTime if provided, otherwise keep existing
        startTime: editData.startTime && editData.startTime !== '' ? editData.startTime : activity.startTime,
        additionalMetrics: buildPayloadMetrics(editData, editData.type)
      };

      await updateActivity(id, updatedPayload);

      alert("Activity updated successfully. AI may regenerate the recommendation.");

      // Update local state so UI reflects changes
      setActivity(prev => ({
        ...prev,
        type: editData.type,
        duration: Number(editData.duration),
        caloriesBurned: Number(editData.caloriesBurned),
        startTime: updatedPayload.startTime,
        additionalMetrics: updatedPayload.additionalMetrics
      }));

      setIsEditing(false);
    } catch (error) {
      if (error.response) {
        console.error(
          "Update failed with response:",
          error.response.status,
          error.response.data
        );
      } else {
        console.error("Update failed (network/CORS?):", error.message);
      }
      alert("Failed to update activity");
    }
  };

  const handleEditFieldChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditTypeChange = (type) => {
    setEditData(prev => {
      const pruned = pruneHiddenMetrics(prev, type);
      return {
        ...prev,
        ...pruned,
        type
      };
    });
  };

  if (loadingActivity || !activity) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading activity details...</p>
        </div>
      </div>
    );
  }

  const metrics = activity.additionalMetrics || {};
  const visibleDetailMetrics = getVisibleMetrics(activity.type);
  const visibleEditMetrics = getVisibleMetrics(editData.type || activity.type);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6 transition group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to Home</span>
      </button>

      {/* Activity Details Card */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-8 mb-6 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Flame className="text-blue-400" size={24} />
          </div>
          Activity Details
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Activity Type */}
          <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-blue-400" size={20} />
              <p className="text-gray-400 text-sm font-medium">Activity Type</p>
            </div>
            <p className="text-2xl font-bold text-white">{activity.type}</p>
          </div>

          {/* Duration */}
          <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-green-400" size={20} />
              <p className="text-gray-400 text-sm font-medium">Duration</p>
            </div>
            <p className="text-2xl font-bold text-white">
              {activity.duration}{' '}
              <span className="text-lg text-gray-400">minutes</span>
            </p>
          </div>

          {/* Calories Burned */}
          <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <Flame className="text-orange-400" size={20} />
              <p className="text-gray-400 text-sm font-medium">Calories Burned</p>
            </div>
            <p className="text-2xl font-bold text-white">
              {activity.caloriesBurned}{' '}
              <span className="text-lg text-gray-400">kcal</span>
            </p>
          </div>

          {/* Date */}
          <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="text-purple-400" size={20} />
              <p className="text-gray-400 text-sm font-medium">Date</p>
            </div>
                <p className="text-lg font-semibold text-white">
                  {activity.startTime
                    ? new Date(activity.startTime).toLocaleString()
                    : activity.createdAt
                      ? new Date(activity.createdAt).toLocaleString()
                      : 'N/A'}
                </p>
          </div>

          {/* Time of Day */}
          {visibleDetailMetrics.timeOfDay && (
          <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-blue-300" size={20} />
              <p className="text-gray-400 text-sm font-medium">Time of Day</p>
            </div>
            <p className="text-xl font-semibold text-white">
              {formatTimeOfDay(metrics.timeOfDay)}
            </p>
          </div>
          )}

          {/* Meal Timing */}
          {visibleDetailMetrics.mealTiming && (
          <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <Flame className="text-pink-300" size={20} />
              <p className="text-gray-400 text-sm font-medium">Around Lunch</p>
            </div>
            <p className="text-xl font-semibold text-white">
              {formatMealTiming(metrics.mealTiming)}
            </p>
          </div>
          )}

          {/* Water Intake */}
          {visibleDetailMetrics.waterIntakeMl && (
          <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <Droplet className="text-cyan-300" size={20} />
              <p className="text-gray-400 text-sm font-medium">Water Intake</p>
            </div>
            <p className="text-xl font-semibold text-white">
              {metrics.waterIntakeMl != null && metrics.waterIntakeMl !== ''
                ? `${metrics.waterIntakeMl} ml`
                : 'Not specified'}
            </p>
          </div>
          )}

          {/* Heart Rate */}
          {visibleDetailMetrics.heartRateBpm && (
          <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <Flame className="text-red-400" size={20} />
              <p className="text-gray-400 text-sm font-medium">Heart Rate</p>
            </div>
            <p className="text-xl font-semibold text-white">
              {metrics.heartRateBpm != null && metrics.heartRateBpm !== ''
                ? `${metrics.heartRateBpm} BPM`
                : 'Not specified'}
            </p>
          </div>
          )}

          {/* Distance / Laps */}
          {visibleDetailMetrics.distance && (
          <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-blue-400" size={20} />
              <p className="text-gray-400 text-sm font-medium">{getDistanceLabel(activity.type)}</p>
            </div>
            <p className="text-xl font-semibold text-white">
              {metrics.distance != null && metrics.distance !== ''
                ? `${metrics.distance}${getDistanceUnit(activity.type)}`
                : 'Not specified'}
            </p>
          </div>
          )}

          {visibleDetailMetrics.strokeType && (
          <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-cyan-300" size={20} />
              <p className="text-gray-400 text-sm font-medium">{getFieldCardLabel(activity.type, 'strokeType')}</p>
            </div>
            <p className="text-xl font-semibold text-white">{metrics.strokeType || 'Not specified'}</p>
          </div>
          )}

          {visibleDetailMetrics.avgSpeedKmh && (
          <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-green-300" size={20} />
              <p className="text-gray-400 text-sm font-medium">{getFieldCardLabel(activity.type, 'avgSpeedKmh')}</p>
            </div>
            <p className="text-xl font-semibold text-white">
              {metrics.avgSpeedKmh != null && metrics.avgSpeedKmh !== '' ? `${metrics.avgSpeedKmh} km/h` : 'Not specified'}
            </p>
          </div>
          )}

          {visibleDetailMetrics.elevationGainM && (
          <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-purple-300" size={20} />
              <p className="text-gray-400 text-sm font-medium">{getFieldCardLabel(activity.type, 'elevationGainM')}</p>
            </div>
            <p className="text-xl font-semibold text-white">
              {metrics.elevationGainM != null && metrics.elevationGainM !== '' ? `${metrics.elevationGainM} m` : 'Not specified'}
            </p>
          </div>
          )}

          {visibleDetailMetrics.sets && (
          <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <Flame className="text-yellow-300" size={20} />
              <p className="text-gray-400 text-sm font-medium">{getFieldCardLabel(activity.type, 'sets')}</p>
            </div>
            <p className="text-xl font-semibold text-white">{metrics.sets != null && metrics.sets !== '' ? metrics.sets : 'Not specified'}</p>
          </div>
          )}

          {visibleDetailMetrics.reps && (
          <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <Flame className="text-orange-300" size={20} />
              <p className="text-gray-400 text-sm font-medium">{getFieldCardLabel(activity.type, 'reps')}</p>
            </div>
            <p className="text-xl font-semibold text-white">{metrics.reps != null && metrics.reps !== '' ? metrics.reps : 'Not specified'}</p>
          </div>
          )}

          {visibleDetailMetrics.weightKg && (
          <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <Flame className="text-red-300" size={20} />
              <p className="text-gray-400 text-sm font-medium">{getFieldCardLabel(activity.type, 'weightKg')}</p>
            </div>
            <p className="text-xl font-semibold text-white">
              {metrics.weightKg != null && metrics.weightKg !== '' ? `${metrics.weightKg} kg` : 'Not specified'}
            </p>
          </div>
          )}

          {visibleDetailMetrics.sessionIntensity && (
          <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-pink-300" size={20} />
              <p className="text-gray-400 text-sm font-medium">{getFieldCardLabel(activity.type, 'sessionIntensity')}</p>
            </div>
            <p className="text-xl font-semibold text-white">{metrics.sessionIntensity || 'Not specified'}</p>
          </div>
          )}

          {visibleDetailMetrics.focusArea && (
          <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-teal-300" size={20} />
              <p className="text-gray-400 text-sm font-medium">{getFieldCardLabel(activity.type, 'focusArea')}</p>
            </div>
            <p className="text-xl font-semibold text-white">{metrics.focusArea || 'Not specified'}</p>
          </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setIsEditing(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-medium transition"
          >
            Edit Activity
          </button>

          <button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            Delete Activity
          </button>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mt-6">
            <h2 className="text-2xl font-bold text-white mb-4">Edit Activity</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-gray-300 mb-1">Activity Type</label>
                <select
                  value={editData.type}
                  onChange={(e) => handleEditTypeChange(e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                >
                  <option value="RUNNING">Running</option>
                  <option value="CARDIO">Cardio</option>
                  <option value="SWIMMING">Swimming</option>
                  <option value="WALKING">Walking</option>
                  <option value="CYCLING">Cycling</option>
                  <option value="YOGA">Yoga</option>
                  <option value="HIIT">HIIT</option>
                  <option value="WEIGHT_TRAINING">Weight Training</option>
                  <option value="STRETCHING">Stretching</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-gray-300 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={editData.duration}
                  onChange={(e) => handleEditFieldChange('duration', e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                />
              </div>

              {/* Calories */}
              <div>
                <label className="block text-gray-300 mb-1">Calories Burned</label>
                <input
                  type="number"
                  value={editData.caloriesBurned}
                  onChange={(e) => handleEditFieldChange('caloriesBurned', e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                />
              </div>

              {/* Time of Day */}
              {visibleEditMetrics.timeOfDay && (
              <div>
                <label className="block text-gray-300 mb-1">Time of Day</label>
                <select
                  value={editData.timeOfDay}
                  onChange={(e) => handleEditFieldChange('timeOfDay', e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                >
                  <option value="">Select time of day</option>
                  <option value="MORNING">Morning</option>
                  <option value="AFTERNOON">Afternoon</option>
                  <option value="EVENING">Evening</option>
                  <option value="NIGHT">Night</option>
                </select>
              </div>
              )}

              {/* Start Date & Time */}
              <div>
                <label className="block text-gray-300 mb-1">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={editData.startTime}
                  onChange={(e) => handleEditFieldChange('startTime', e.target.value)}
                  max={(() => {
                    const now = new Date();
                    const tzOffset = now.getTimezoneOffset();
                    const local = new Date(now.getTime() - tzOffset * 60000);
                    return local.toISOString().slice(0,16);
                  })()}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                />
              </div>

              {/* Meal Timing */}
              {visibleEditMetrics.mealTiming && (
              <div>
                <label className="block text-gray-300 mb-1">Before/After Lunch</label>
                <select
                  value={editData.mealTiming}
                  onChange={(e) => handleEditFieldChange('mealTiming', e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                >
                  <option value="">Select option</option>
                  <option value="BEFORE_EATING">Before eating</option>
                  <option value="AFTER_EATING">After eating</option>
                </select>
              </div>
              )}

              {/* Water Intake */}
              {visibleEditMetrics.waterIntakeMl && (
              <div>
                <label className="block text-gray-300 mb-1">Water Intake (ml)</label>
                <input
                  type="number"
                  min="0"
                  value={editData.waterIntakeMl}
                  onChange={(e) => handleEditFieldChange('waterIntakeMl', e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                />
              </div>
              )}

              {/* Heart Rate */}
              {visibleEditMetrics.heartRateBpm && (
              <div>
                <label className="block text-gray-300 mb-1">Heart Rate (BPM)</label>
                <input
                  type="number"
                  min="0"
                  max="220"
                  value={editData.heartRateBpm}
                  onChange={(e) => handleEditFieldChange('heartRateBpm', e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                />
              </div>
              )}

              {/* Distance / Laps */}
              {visibleEditMetrics.distance && (
              <div>
                <label className="block text-gray-300 mb-1">{getDistanceInputLabel(editData.type || activity.type)}</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={editData.distance}
                  onChange={(e) => handleEditFieldChange('distance', e.target.value)}
                  placeholder={getDistancePlaceholder(editData.type || activity.type)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                />
              </div>
              )}

              {visibleEditMetrics.strokeType && (
              <div>
                <label className="block text-gray-300 mb-1">Stroke Type</label>
                <input
                  type="text"
                  value={editData.strokeType}
                  onChange={(e) => handleEditFieldChange('strokeType', e.target.value)}
                  placeholder="e.g., freestyle"
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                />
              </div>
              )}

              {visibleEditMetrics.avgSpeedKmh && (
              <div>
                <label className="block text-gray-300 mb-1">Avg Speed (km/h)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={editData.avgSpeedKmh}
                  onChange={(e) => handleEditFieldChange('avgSpeedKmh', e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                />
              </div>
              )}

              {visibleEditMetrics.elevationGainM && (
              <div>
                <label className="block text-gray-300 mb-1">Elevation Gain (m)</label>
                <input
                  type="number"
                  min="0"
                  value={editData.elevationGainM}
                  onChange={(e) => handleEditFieldChange('elevationGainM', e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                />
              </div>
              )}

              {visibleEditMetrics.sets && (
              <div>
                <label className="block text-gray-300 mb-1">Total Sets</label>
                <input
                  type="number"
                  min="0"
                  value={editData.sets}
                  onChange={(e) => handleEditFieldChange('sets', e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                />
              </div>
              )}

              {visibleEditMetrics.reps && (
              <div>
                <label className="block text-gray-300 mb-1">Total Reps</label>
                <input
                  type="number"
                  min="0"
                  value={editData.reps}
                  onChange={(e) => handleEditFieldChange('reps', e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                />
              </div>
              )}

              {visibleEditMetrics.weightKg && (
              <div>
                <label className="block text-gray-300 mb-1">Max/Working Weight (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editData.weightKg}
                  onChange={(e) => handleEditFieldChange('weightKg', e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                />
              </div>
              )}

              {visibleEditMetrics.sessionIntensity && (
              <div>
                <label className="block text-gray-300 mb-1">Session Intensity</label>
                <select
                  value={editData.sessionIntensity}
                  onChange={(e) => handleEditFieldChange('sessionIntensity', e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                >
                  <option value="">Select intensity</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              )}

              {visibleEditMetrics.focusArea && (
              <div>
                <label className="block text-gray-300 mb-1">Focus Area</label>
                <input
                  type="text"
                  value={editData.focusArea}
                  onChange={(e) => handleEditFieldChange('focusArea', e.target.value)}
                  placeholder="e.g., flexibility"
                  className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                />
              </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-gray-300 hover:text-gray-100 px-4 py-3"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* AI Recommendation Card (unchanged logic, but now uses new metrics in backend prompt) */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-8 shadow-2xl">
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
            <Lightbulb className="text-purple-400" size={24} />
          </div>
          AI Recommendation
        </h2>

        {loadingRecommendation && (
          <p className="text-gray-400">Loading recommendation...</p>
        )}

        {!loadingRecommendation && recError && (
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 px-4 py-3 rounded-lg mb-4">
            <AlertCircle size={20} />
            <span>{recError}</span>
          </div>
        )}

        {!loadingRecommendation && recommendation && (
          <>
            {/* Analysis Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="text-blue-400" size={20} />
                <h3 className="text-xl font-bold text-blue-400">Analysis</h3>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-5 border border-gray-600">
                <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                  {recommendation.recommendation}
                </p>
              </div>
            </div>

            {/* Improvements */}
            {recommendation.improvements && recommendation.improvements.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="text-yellow-400" size={20} />
                  <h3 className="text-xl font-bold text-yellow-400">Improvements</h3>
                </div>
                <div className="space-y-3">
                  {recommendation.improvements.map((imp, index) => (
                    <div
                      key={index}
                      className="flex gap-3 bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20"
                    >
                      <span className="text-yellow-400 font-bold">•</span>
                      <p className="text-gray-300 flex-1">{imp}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {recommendation.suggestions && recommendation.suggestions.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="text-green-400" size={20} />
                  <h3 className="text-xl font-bold text-green-400">Suggestions</h3>
                </div>
                <div className="space-y-3">
                  {recommendation.suggestions.map((sug, index) => (
                    <div
                      key={index}
                      className="flex gap-3 bg-green-500/10 rounded-lg p-4 border border-green-500/20"
                    >
                      <span className="text-green-400 font-bold">•</span>
                      <p className="text-gray-300 flex-1">{sug}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safety */}
            {recommendation.safety && recommendation.safety.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="text-red-400" size={20} />
                  <h3 className="text-xl font-bold text-red-400">Safety Guidelines</h3>
                </div>
                <div className="space-y-3">
                  {recommendation.safety.map((s, index) => (
                    <div
                      key={index}
                      className="flex gap-3 bg-red-500/10 rounded-lg p-4 border border-red-500/20"
                    >
                      <span className="text-red-400 font-bold">•</span>
                      <p className="text-gray-300 flex-1">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ActivityDetail;
