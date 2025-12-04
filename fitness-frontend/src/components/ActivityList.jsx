import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router';
import { getActivities } from '../services/api';
import { Calendar, Clock, Flame, Droplet } from 'lucide-react';

const ActivityList = ({ limit, showSeeMore = false }) => {
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

  const displayedActivities = limit ? activities.slice(0, limit) : activities;

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
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-white mb-6">Recent Activities</h2>
      
      {activities.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">
            No activities yet. Add your first activity above!
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedActivities.map((activity) => {
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

          {showSeeMore && activities.length > limit && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => navigate('/all-activities')}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50"
              >
                See All Activities ({activities.length})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ActivityList
