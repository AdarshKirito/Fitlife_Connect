import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarCheck2, Shield, Target, Zap, CalendarDays, RefreshCw } from 'lucide-react';
import {
  getWeeklyRecommendation,
  regenerateWeeklyRecommendation,
  getWeeklyPlanHistory,
  updateWeeklyPlanDayCompletion
} from '../services/api';

const WeeklyPlan = ({ userId }) => {
  const [plan, setPlan] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [updatingDay, setUpdatingDay] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const dayLabels = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY'
  ];

  const formatDay = (day) => day.charAt(0) + day.slice(1).toLowerCase();

  const completionPercent = (targetPlan) => {
    if (!targetPlan || !targetPlan.dayCompletion) {
      return 0;
    }

    const values = Object.values(targetPlan.dayCompletion);
    if (values.length === 0) {
      return 0;
    }

    const completed = values.filter(Boolean).length;
    return Math.round((completed / values.length) * 100);
  };

  const formatWeekLabel = (weekStartDate) => {
    if (!weekStartDate) {
      return 'Unknown week';
    }

    const date = new Date(`${weekStartDate}T00:00:00`);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const fetchWeeklyPlan = async () => {
    const response = await getWeeklyRecommendation(userId);
    setPlan(response.data);
    return response.data;
  };

  const fetchHistory = async () => {
    const response = await getWeeklyPlanHistory(userId);
    setHistory(response.data || []);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await fetchWeeklyPlan();
        await fetchHistory();
        setError(null);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setError('Weekly plan is not ready yet. Complete a few activities first.');
        } else {
          setError('Failed to load your weekly plan. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadData();
    }
  }, [userId]);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [cooldownSeconds]);

  const handleRegenerate = async () => {
    if (!userId || cooldownSeconds > 0 || regenerating) {
      return;
    }

    try {
      setRegenerating(true);
      const response = await regenerateWeeklyRecommendation(userId);
      setPlan(response.data);
      await fetchHistory();
      setCooldownSeconds(300);
      setError(null);
    } catch (err) {
      if (err.response && err.response.status === 429) {
        const message = err.response.data?.message || err.response.data?.error || 'Cooldown active.';
        const match = String(message).match(/(\d+)/);
        if (match) {
          setCooldownSeconds(Number(match[1]));
        }
        setError(String(message));
      } else {
        setError('Failed to regenerate weekly plan. Please try again.');
      }
    } finally {
      setRegenerating(false);
    }
  };

  const handleDayToggle = async (day) => {
    if (!plan || !plan.id || !plan.dayCompletion) {
      return;
    }

    const current = !!plan.dayCompletion[day];
    const nextValue = !current;

    setUpdatingDay(day);

    const optimistic = {
      ...plan,
      dayCompletion: {
        ...plan.dayCompletion,
        [day]: nextValue
      }
    };

    setPlan(optimistic);

    try {
      const response = await updateWeeklyPlanDayCompletion(plan.id, day, nextValue);
      setPlan(response.data);
      setHistory((prev) => prev.map((item) => (item.id === response.data.id ? response.data : item)));
      setError(null);
    } catch (err) {
      setPlan(plan);
      setError('Failed to update day completion. Please try again.');
    } finally {
      setUpdatingDay('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Building Your Weekly Plan</h2>
          <p className="text-gray-400">Analyzing your activity patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6 transition"
        >
          <ArrowLeft size={20} />
          Back to Home
        </button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {plan && (
          <>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-8 shadow-2xl mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
                <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                  <CalendarCheck2 className="text-white" size={30} />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white">Weekly AI Training Plan</h1>
                  <p className="text-gray-400 mt-1">7-day actionable plan based on your recent workouts</p>
                </div>
                </div>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating || cooldownSeconds > 0}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={18} className={regenerating ? 'animate-spin' : ''} />
                  {regenerating
                    ? 'Regenerating...'
                    : cooldownSeconds > 0
                      ? `Regenerate (${cooldownSeconds}s)`
                      : 'Regenerate Weekly Plan'}
                </button>
              </div>
              <p className="text-gray-400 mt-3 text-sm">
                Regenerate creates a fresh AI plan. Cooldown: 5 minutes between regenerations.
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-8 shadow-2xl">
              <div className="bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 rounded-xl p-6 mb-6 border border-indigo-500/30">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <CalendarDays className="text-indigo-300" size={22} />
                  Weekly Adherence Tracker
                </h2>
                <p className="text-gray-300 mb-4">Mark each day as completed when you finish that day&apos;s plan.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dayLabels.map((day) => {
                    const checked = !!plan.dayCompletion?.[day];
                    return (
                      <label key={day} className="flex items-center gap-3 bg-gray-800/60 rounded-lg p-3 border border-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={updatingDay === day}
                          onChange={() => handleDayToggle(day)}
                          className="w-4 h-4 accent-cyan-500"
                        />
                        <span className="text-gray-200">{formatDay(day)}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-cyan-300 mt-4 font-semibold">
                  Current week completion: {completionPercent(plan)}%
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-6 mb-6 border border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Target className="text-cyan-400" size={22} />
                  Weekly Strategy
                </h2>
                <div className="text-gray-300 whitespace-pre-line leading-relaxed">
                  {plan.recommendation}
                </div>
              </div>

              {plan.improvements && plan.improvements.length > 0 && (
                <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-6 mb-6 border border-orange-500/30">
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Zap className="text-orange-400" size={22} />
                    Focus Areas This Week
                  </h2>
                  <div className="space-y-3">
                    {plan.improvements.map((item, index) => (
                      <div key={index} className="text-gray-300">{index + 1}. {item}</div>
                    ))}
                  </div>
                </div>
              )}

              {plan.suggestions && plan.suggestions.length > 0 && (
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-6 mb-6 border border-green-500/30">
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <CalendarDays className="text-green-400" size={22} />
                    7-Day Plan
                  </h2>
                  <div className="space-y-3">
                    {plan.suggestions.map((dayPlan, index) => (
                      <div key={index} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700 text-gray-300">
                        {dayPlan}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {plan.safety && plan.safety.length > 0 && (
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-6 border border-blue-500/30">
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Shield className="text-blue-400" size={22} />
                    Safety Notes
                  </h2>
                  <div className="space-y-2">
                    {plan.safety.map((item, index) => (
                      <div key={index} className="text-gray-300">- {item}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-slate-500/10 to-blue-500/10 rounded-xl p-6 border border-slate-400/20 mt-6">
                <h2 className="text-2xl font-bold text-white mb-4">Weekly History Comparison</h2>
                {history.length === 0 ? (
                  <p className="text-gray-300">No historical plans available yet.</p>
                ) : (
                  <div className="space-y-3">
                    {history.slice(0, 8).map((item, index) => {
                      const currentPct = completionPercent(item);
                      const previousPct = history[index + 1] ? completionPercent(history[index + 1]) : null;
                      const delta = previousPct === null ? null : currentPct - previousPct;

                      return (
                        <div key={item.id} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div className="text-gray-100 font-semibold">Week of {formatWeekLabel(item.weekStartDate)}</div>
                            <div className="text-cyan-300">Adherence: {currentPct}%</div>
                          </div>
                          {delta !== null && (
                            <div className={`text-sm mt-1 ${delta >= 0 ? 'text-green-300' : 'text-orange-300'}`}>
                              {delta >= 0 ? '+' : ''}{delta}% vs previous week
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WeeklyPlan;
