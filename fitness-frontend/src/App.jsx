import { useContext, useEffect, useMemo, useState } from "react"
import { AuthContext } from "react-oauth2-code-pkce"
import { useDispatch } from "react-redux";
import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate } from "react-router"
import { logout, setCredentials } from "./store/authSlice";
import ActivityForm from "./components/ActivityForm";
import ActivityList from "./components/ActivityList";
import ActivityDetail from "./components/ActivityDetail";
import AllActivities from "./components/AllActivities";
import Navbar from "./components/Navbar";
import CompleteRecommendation from "./components/CompleteRecommendation";
import WeeklyPlan from "./components/WeeklyPlan";
import { Activity, Flame, Sparkles, CalendarDays } from "lucide-react";
import { getActivities } from "./services/api";

const HomePage = ({ isAuthenticated, tokenData }) => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const fetchActivities = async () => {
      try {
        const response = await getActivities();
        setActivities(response.data || []);
      } catch (error) {
        console.error("Failed to load activities for dashboard", error);
      }
    };

    fetchActivities();
  }, [isAuthenticated]);

  const stats = useMemo(() => {
    const totalActivities = activities.length;
    const totalMinutes = activities.reduce((sum, item) => sum + Number(item.duration || 0), 0);
    const totalCalories = activities.reduce((sum, item) => sum + Number(item.caloriesBurned || 0), 0);

    const activeDaysThisWeek = new Set(
      activities
        .map((item) => new Date(item.startTime || item.createdAt || item.updatedAt))
        .filter((date) => !Number.isNaN(date.getTime()))
        .filter((date) => {
          const now = new Date();
          const monday = new Date(now);
          const day = monday.getDay();
          const diff = day === 0 ? -6 : 1 - day;
          monday.setDate(monday.getDate() + diff);
          monday.setHours(0, 0, 0, 0);
          return date >= monday;
        })
        .map((date) => date.toISOString().slice(0, 10))
    ).size;

    return { totalActivities, totalMinutes, totalCalories, activeDaysThisWeek };
  }, [activities]);

  const displayName = tokenData?.given_name || tokenData?.email?.split("@")[0] || "Athlete";

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-6">
        <div className="max-w-2xl w-full rounded-3xl border border-gray-700 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-10 shadow-2xl">
          <h1 className="text-5xl font-black mb-4 tracking-tight">Fitness Freak</h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            Your AI-powered activity companion. Log in to unlock smart weekly plans, performance insights, and progress tracking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-8 px-4 md:px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-[radial-gradient(circle_at_15%_20%,rgba(6,182,212,0.2),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(59,130,246,0.2),transparent_38%),linear-gradient(to_bottom_right,#0b1220,#101828)] p-8 md:p-10 shadow-[0_20px_70px_rgba(8,145,178,0.2)]">
          <div className="relative z-10">
            <p className="text-cyan-300 uppercase tracking-[0.2em] text-xs font-semibold mb-3">Personal Training Dashboard</p>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
              Welcome back, {displayName}
            </h1>
            <p className="text-gray-300 mt-4 max-w-2xl text-lg">
              Build consistency, push performance, and let AI shape your next best training week.
            </p>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={() => navigate('/weekly-plan')}
                className="px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-xl font-bold transition"
              >
                Open Weekly Plan
              </button>
              <button
                onClick={() => navigate('/complete-recommendation')}
                className="px-5 py-3 border border-cyan-400/60 text-cyan-200 hover:bg-cyan-500/10 rounded-xl font-semibold transition"
              >
                AI Recommendations
              </button>
              <button
                onClick={() => document.getElementById('activity-form-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-5 py-3 border border-gray-500 text-gray-200 hover:bg-white/10 rounded-xl font-semibold transition"
              >
                Log New Activity
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-gray-700 bg-gray-900/70 p-5">
            <div className="flex items-center gap-2 text-cyan-300 mb-2"><Activity size={18} /> Total Activities</div>
            <div className="text-3xl font-black text-white">{stats.totalActivities}</div>
          </div>
          <div className="rounded-2xl border border-gray-700 bg-gray-900/70 p-5">
            <div className="flex items-center gap-2 text-blue-300 mb-2"><CalendarDays size={18} /> Active Days This Week</div>
            <div className="text-3xl font-black text-white">{stats.activeDaysThisWeek}</div>
          </div>
          <div className="rounded-2xl border border-gray-700 bg-gray-900/70 p-5">
            <div className="flex items-center gap-2 text-orange-300 mb-2"><Flame size={18} /> Calories Burned</div>
            <div className="text-3xl font-black text-white">{stats.totalCalories}</div>
          </div>
          <div className="rounded-2xl border border-gray-700 bg-gray-900/70 p-5">
            <div className="flex items-center gap-2 text-purple-300 mb-2"><Sparkles size={18} /> Total Minutes</div>
            <div className="text-3xl font-black text-white">{stats.totalMinutes}</div>
          </div>
        </section>

        <section id="activity-form-section" className="rounded-2xl border border-gray-700 bg-gray-900/70 p-6 md:p-8 shadow-2xl">
          <h2 className="text-3xl font-extrabold text-white mb-2">Track New Activity</h2>
          <p className="text-gray-400 mb-6">The more accurate your data, the better your AI analysis and weekly plan.</p>
          <ActivityForm onActivityAdded={() => window.location.reload()} />
        </section>

        <section className="rounded-2xl border border-gray-700 bg-gray-900/70 p-6 md:p-8 shadow-2xl">
          <ActivityList limit={3} showSeeMore={true} />
        </section>
      </div>
    </div>
  );
}

function App() {
  const { token, tokenData, logIn, logOut } = useContext(AuthContext);
  const dispatch = useDispatch();

  useEffect(() => {
    if (token) {
      dispatch(setCredentials({token, user: tokenData}));
    }
  }, [token, tokenData, dispatch]);

  const handleLogin = () => {
    console.log("Login button clicked");
    logIn();
  };

  const handleLogout = () => {
    console.log("Logout button clicked");
    dispatch(logout());
    logOut();
  };

  return (
    <Router>
      <Navbar 
        isAuthenticated={!!token}
        tokenData={tokenData}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
      
      <div className="pt-20">
        <Routes>
          <Route path="/" element={<HomePage isAuthenticated={!!token} tokenData={tokenData} />} />
          
          <Route path="/all-activities" element={
            token ? <AllActivities /> : <Navigate to="/" replace/>
          }/>
          
          <Route path="/complete-recommendation" element={
            token ? (
              <CompleteRecommendation 
                userId={tokenData?.sub}
                token={token}
              />
            ) : <Navigate to="/" replace/>
          }/>

          <Route path="/weekly-plan" element={
            token ? (
              <WeeklyPlan userId={tokenData?.sub} />
            ) : <Navigate to="/" replace/>
          }/>
          
          <Route path="/activities/:id" element={
            token ? (
              <div className="min-h-screen bg-gray-900 py-8 px-4">
                <ActivityDetail />
              </div>
            ) : <Navigate to="/" replace/>
          }/>
        </Routes>
      </div>
    </Router>
  )
}

export default App