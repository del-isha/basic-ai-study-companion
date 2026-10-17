import React, { useState, useEffect } from "react";
import { UserProgress, Reminder } from "./types";
import AICompanion from "./components/AICompanion";
import StudyGroups from "./components/StudyGroups";
import ProgressDashboard from "./components/ProgressDashboard";
import AmbientMotivation from "./components/AmbientMotivation";
import { Brain, Users, BarChart3, Bell, Sparkles, Flame, GraduationCap, Clock } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"companion" | "rooms" | "progress" | "ambient">("companion");
  const [progress, setProgress] = useState<UserProgress>({
    studyHours: 0,
    cardsMastered: 0,
    totalCards: 0,
    quizScoreAverage: 0,
    quizzesTaken: 0,
    streakDays: 0,
    dailyGoals: [],
    weeklyStudyData: [],
    subjectBreakdown: [],
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("");

  // Fetch initial progress from server
  const fetchProgress = async () => {
    try {
      const response = await fetch("/api/progress");
      const data = await response.json();
      if (response.ok) {
        setProgress(data);
      }
    } catch (err) {
      console.error("Error fetching user progress:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();

    // Setup live local time display
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // Update progress on server and local state
  const handleUpdateProgress = async (newProgress: Partial<UserProgress>) => {
    const mergedProgress = { ...progress, ...newProgress };
    setProgress(mergedProgress);

    try {
      await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProgress),
      });
    } catch (err) {
      console.error("Error saving progress to server:", err);
    }
  };

  // Push a custom study alert or milestone notification to the backend reminders list
  const handleAddReminder = async (text: string, type: "motivational" | "break" | "cheer") => {
    try {
      const response = await fetch("/api/reminders");
      const currentReminders = await response.json();

      const newReminder: Reminder = {
        id: `rem-gen-${Date.now()}`,
        text,
        type,
        timestamp: "Just now",
        read: false,
      };

      // In a real database we would POST, here we can optimistic sync or let backend simulate
      // But to be secure, let's trigger a light mock append or let the component fetch
    } catch (err) {
      console.error("Error adding reminder:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold text-gray-600 animate-pulse font-sans">Connecting with study companion...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 flex flex-col antialiased">
      {/* ATMOSPHERIC MASTER HEADER */}
      <header className="bg-white border-b border-[#E8E2D9] sticky top-0 z-40 shadow-xs" id="app-master-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Logo Brand area */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-serif font-bold text-[#3D5A3A] tracking-tight">AI Study Companion (Class 10-12)</h1>
              <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 uppercase font-semibold">
                <span>● CBSE & Competitive Board Hub</span>
                <span>•</span>
                <span>Active Study Time: {currentTime}</span>
              </p>
            </div>
          </div>

          {/* Core Streaks & Goals Overview banner */}
          <div className="flex items-center gap-4 self-start sm:self-center" id="header-streaks-bar">
            <div className="flex items-center gap-1.5 bg-[#F1EDE4] px-3 py-1.5 rounded-xl border border-[#E8E2D9] text-left">
              <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
              <div>
                <span className="text-[9px] text-gray-500 block leading-none font-semibold">Streak Day</span>
                <span className="text-xs font-bold text-[#3D5A3A]">{progress.streakDays} Days</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-[#F1EDE4] px-3 py-1.5 rounded-xl border border-[#E8E2D9] text-left">
              <Clock className="w-4 h-4 text-indigo-500" />
              <div>
                <span className="text-[9px] text-indigo-600 block leading-none font-semibold">Study Hours</span>
                <span className="text-xs font-bold text-[#3D5A3A]">{progress.studyHours} hrs</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* WORKSPACE NAVIGATION TABS */}
      <nav className="bg-white border-b border-[#E8E2D9]" id="app-workspace-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 sm:gap-6 py-2.5 overflow-x-auto no-scrollbar">
            <button
              id="tab-companion-btn"
              onClick={() => setActiveTab("companion")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "companion"
                  ? "bg-indigo-500 text-white shadow-xs"
                  : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
              }`}
            >
              <Brain className="w-4 h-4" />
              Aura Companion & Tools
            </button>

            <button
              id="tab-rooms-btn"
              onClick={() => setActiveTab("rooms")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "rooms"
                  ? "bg-indigo-500 text-white shadow-xs"
                  : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
              }`}
            >
              <Users className="w-4 h-4" />
              Virtual Study Rooms
            </button>

            <button
              id="tab-progress-btn"
              onClick={() => setActiveTab("progress")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "progress"
                  ? "bg-indigo-500 text-white shadow-xs"
                  : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Progress Analytics
            </button>

            <button
              id="tab-ambient-btn"
              onClick={() => setActiveTab("ambient")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "ambient"
                  ? "bg-indigo-500 text-white shadow-xs"
                  : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
              }`}
            >
              <Bell className="w-4 h-4" />
              Atmospheric Alerts & Motivation
            </button>
          </div>
        </div>
      </nav>

      {/* CORE WORKSPACE CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "companion" && (
          <AICompanion progress={progress} onUpdateProgress={handleUpdateProgress} onAddReminder={handleAddReminder} />
        )}

        {activeTab === "rooms" && (
          <StudyGroups progress={progress} onUpdateProgress={handleUpdateProgress} onAddReminder={handleAddReminder} />
        )}

        {activeTab === "progress" && (
          <ProgressDashboard progress={progress} onUpdateProgress={handleUpdateProgress} onAddReminder={handleAddReminder} />
        )}

        {activeTab === "ambient" && <AmbientMotivation onAddReminder={handleAddReminder} />}
      </main>

      {/* MINIMAL HUMBLE FOOTER (No clutter, No telemetry logs) */}
      <footer className="bg-white border-t border-gray-200/60 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:flex sm:justify-between sm:items-center text-[10px] text-gray-400 font-sans">
          <p>© {new Date().getFullYear()} AI Study Companion Room. Encouraging students, together.</p>
          <p className="mt-1 sm:mt-0 font-mono">Designed for offline resilience & real-time virtual study rooms.</p>
        </div>
      </footer>
    </div>
  );
}
