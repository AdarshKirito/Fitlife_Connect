import axios from "axios"

const API_URL = 'http://localhost:8080/api'

const api = axios.create({
    baseURL: API_URL
});

api.interceptors.request.use((config) => {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (userId) {
        config.headers['X-User-ID'] = userId;
    }

    return config;
});

export const getActivities = () => api.get('/activities');
export const addActivity = (activity) => api.post('/activities', activity);
export const getActivityDetail = (id) => api.get(`/activities/${id}`);
export const getActivityRecommendation = (id) =>
  api.get(`/recommendations/activity/${id}`);
export const getUserRecommendation = (userId) =>
    api.get(`/recommendations/user/${userId}`);
export const getWeeklyRecommendation = (userId) =>
    api.get(`/recommendations/weekly/${userId}`);
export const regenerateWeeklyRecommendation = (userId) =>
    api.post(`/recommendations/weekly/${userId}/regenerate`);
export const getWeeklyPlanHistory = (userId) =>
    api.get(`/recommendations/weekly/${userId}/history`);
export const updateWeeklyPlanDayCompletion = (weeklyPlanId, day, completed) =>
    api.patch(`/recommendations/weekly/${weeklyPlanId}/days`, { day, completed });

export const deleteActivity = (id) => api.delete(`/activities/${id}`);
export const updateActivity = (id, data) => api.put(`/activities/${id}`, data);

