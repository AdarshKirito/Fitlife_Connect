import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router';
import { getActivities } from '../services/api';
import { Calendar, Clock, Flame, ArrowLeft, TrendingUp, Droplet } from 'lucide-react';

const AllActivities = () => {
  const [activities, setActivities] = useState([]);
  const navigate = useNavigate();

  const fetchActivities = async () => {
    try {
      const response = await getActivities();
      setActivities(response.data);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    fetchActivities();
  }, []);

  const formatTimeOfDay = (value) => {
    switch (value) {
      case 'MORNING': return 'Morning';
      case 'AFTERNOON': return 'Afternoon';
      case 'EVENING': return 'Evening';
      case 'NIGHT': return 'Night';
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition"
          >
            <ArrowLeft size={20} />
            Back to Home
          </button>
          
          <button
            onClick={() => navigate('/complete-recommendation')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full font-medium transition-all transform hover:scale-105 shadow-lg"
          >
            <TrendingUp size={20} />
            Get Complete Recommendations
          </button>
        </div>

        <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-8 shadow-2xl">
          <h1 className="text-4xl font-bold text-white mb-2">All Activities</h1>
          <p className="text-gray-400 mb-8">Total Activities: {activities.length}</p>

          {activities.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">
                No activities yet. Start tracking your fitness journey!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.map((activity) => {
                const metrics = activity.additionalMetrics || {};
                const prettyTimeOfDay = formatTimeOfDay(metrics.timeOfDay);

                return (
                  <div 
                    key={activity.id}
                    onClick={() => navigate(`/activities/${activity.id}`)}
                    className="group bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:border-blue-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/20"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-blue-400 group-hover:text-blue-300 transition">
                        {activity.type}
                      </h3>
                      <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500/30 transition">
                        <Flame className="text-blue-400" size={24} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-gray-300">
                        <Clock className="text-blue-400" size={18} />
                        <span className="text-sm">
                          Duration: <span className="font-semibold text-white">{activity.duration} min</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-gray-300">
                        <Flame className="text-orange-400" size={18} />
                        <span className="text-sm">
                          Calories: <span className="font-semibold text-white">{activity.caloriesBurned} kcal</span>
                        </span>
                      </div>

                      {prettyTimeOfDay && (
                        <div className="flex items-center gap-3 text-gray-300">
                          <Clock className="text-green-400" size={18} />
                          <span className="text-sm">
                            Time: <span className="font-semibold text-white">{prettyTimeOfDay}</span>
                          </span>
                        </div>
                      )}

                      {metrics.waterIntakeMl != null && metrics.waterIntakeMl !== '' && (
                        <div className="flex items-center gap-3 text-gray-300">
                          <Droplet className="text-cyan-400" size={18} />
                          <span className="text-sm">
                            Water: <span className="font-semibold text-white">{metrics.waterIntakeMl} ml</span>
                          </span>
                        </div>
                      )}

                      {activity.date && (
                        <div className="flex items-center gap-3 text-gray-300">
                          <Calendar className="text-green-400" size={18} />
                          <span className="text-sm">
                            {new Date(activity.date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <span className="text-blue-400 text-sm font-medium group-hover:text-blue-300 transition">
                        View Details →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AllActivities
