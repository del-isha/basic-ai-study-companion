import React, { useState } from "react";
import { UserProgress, StudyGoal } from "../types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from "recharts";
import { Trophy, Clock, CheckSquare, BarChart3, Plus, Trash2, ShieldCheck, Flame, BookOpen } from "lucide-react";

interface ProgressDashboardProps {
  progress: UserProgress;
  onUpdateProgress: (newProgress: Partial<UserProgress>) => void;
  onAddReminder: (text: string, type: "motivational" | "break" | "cheer") => void;
}

export default function ProgressDashboard({ progress, onUpdateProgress, onAddReminder }: ProgressDashboardProps) {
  const [newGoalInput, setNewGoalInput] = useState("");

  // Toggle goal completion state
  const handleToggleGoal = (goalId: string) => {
    const updatedGoals = progress.dailyGoals.map((g) => {
      if (g.id === goalId) {
        const nextState = !g.completed;
        if (nextState) {
          onAddReminder(`🎯 Goal Completed! " ${g.text} ". Keep checking them off!`, "cheer");
        }
        return { ...g, completed: nextState };
      }
      return g;
    });

    onUpdateProgress({ dailyGoals: updatedGoals });
  };

  // Add a new goal
  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalInput.trim()) return;

    const newGoal: StudyGoal = {
      id: `goal-${Date.now()}`,
      text: newGoalInput.trim(),
      completed: false,
    };

    onUpdateProgress({
      dailyGoals: [...progress.dailyGoals, newGoal],
    });
    setNewGoalInput("");
  };

  // Delete a goal
  const handleDeleteGoal = (goalId: string) => {
    const updatedGoals = progress.dailyGoals.filter((g) => g.id !== goalId);
    onUpdateProgress({ dailyGoals: updatedGoals });
  };

  return (
    <div className="space-y-6" id="progress-dashboard-section">
      {/* 4 STATS CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-cards-container">
        {/* Study Hours Card */}
        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-5 flex items-center gap-3.5 shadow-sm text-left">
          <div className="p-3 bg-[#DEE5DC] rounded-xl text-[#3D5A3A] shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C857E] block font-sans">Study Hours</span>
            <p className="text-xl font-serif font-bold text-[#4A443F]">{progress.studyHours} hrs</p>
            <span className="text-[9px] text-[#5D805A] font-bold block">▲ +1.4 hrs today</span>
          </div>
        </div>

        {/* Study Streak Card */}
        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-5 flex items-center gap-3.5 shadow-sm text-left">
          <div className="p-3 bg-[#F1EDE4] rounded-xl text-[#A67C52] shrink-0">
            <Flame className="w-5 h-5 text-[#D69E88]" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C857E] block font-sans">Study Streak</span>
            <p className="text-xl font-serif font-bold text-[#4A443F]">{progress.streakDays} Days</p>
            <span className="text-[9px] text-[#D69E88] font-bold block">🔥 Super streak active!</span>
          </div>
        </div>

        {/* Mastered Cards Card */}
        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-5 flex items-center gap-3.5 shadow-sm text-left">
          <div className="p-3 bg-[#E9EDDE] rounded-xl text-[#5D805A] shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C857E] block font-sans">Cards Mastered</span>
            <p className="text-xl font-serif font-bold text-[#4A443F]">
              {progress.cardsMastered} / {progress.totalCards}
            </p>
            <span className="text-[9px] text-[#5D805A] font-bold block">
              🎯 {Math.round((progress.cardsMastered / Math.max(1, progress.totalCards)) * 100)}% mastery rate
            </span>
          </div>
        </div>

        {/* Quiz Averages Card */}
        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-5 flex items-center gap-3.5 shadow-sm text-left">
          <div className="p-3 bg-[#DEE5DC] rounded-xl text-[#3D5A3A] shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C857E] block font-sans">Quiz Average</span>
            <p className="text-xl font-serif font-bold text-[#4A443F]">{progress.quizScoreAverage}%</p>
            <span className="text-[9px] text-gray-500 block">📝 {progress.quizzesTaken} quizzes completed</span>
          </div>
        </div>
      </div>

      {/* RECHARTS GRAPHS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Study Hours Area Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E8E2D9] p-6 shadow-sm text-left space-y-4">
          <div>
            <h3 className="text-base font-serif font-bold text-[#3D5A3A] flex items-center gap-1.5">
              <BarChart3 className="w-4.5 h-4.5 text-[#8BA888]" /> Weekly Study Volume
            </h3>
            <p className="text-xs text-[#8C857E]">Total hours spent co-working or studying with Aura daily.</p>
          </div>

          <div className="h-56 w-full text-xs" id="recharts-weekly-volume-box">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progress.weeklyStudyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8BA888" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8BA888" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D9" />
                <XAxis dataKey="day" stroke="#8C857E" />
                <YAxis stroke="#8C857E" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#F1EDE4",
                    borderRadius: "12px",
                    color: "#4A443F",
                    fontSize: "11px",
                    border: "1px solid #E8E2D9",
                  }}
                />
                <Area type="monotone" dataKey="hours" stroke="#8BA888" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subject Breakdown Bar Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-[#E8E2D9] p-6 shadow-sm text-left space-y-4">
          <div>
            <h3 className="text-base font-serif font-bold text-[#3D5A3A] flex items-center gap-1.5">
              <BookOpen className="w-4.5 h-4.5 text-[#8BA888]" /> Subject breakdown
            </h3>
            <p className="text-xs text-[#8C857E]">Time allocation and scores across study fields.</p>
          </div>

          <div className="h-56 w-full text-xs" id="recharts-subject-breakdown-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progress.subjectBreakdown} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D9" />
                <XAxis dataKey="subject" stroke="#8C857E" tickFormatter={(v) => v.substring(0, 5)} />
                <YAxis stroke="#8C857E" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#F1EDE4",
                    borderRadius: "12px",
                    color: "#4A443F",
                    fontSize: "11px",
                    border: "1px solid #E8E2D9",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }} />
                <Bar name="Study Hours" dataKey="hours" fill="#8BA888" radius={[4, 4, 0, 0]} />
                <Bar name="Avg Score %" dataKey="score" fill="#D69E88" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DAILY CO-WORKING GOALS MANAGEMENT PANEL */}
      <div className="bg-white rounded-3xl border border-[#E8E2D9] p-6 shadow-sm text-left space-y-4">
        <div>
          <h3 className="text-base font-serif font-bold text-[#3D5A3A] flex items-center gap-1.5">
            <CheckSquare className="w-4.5 h-4.5 text-[#8BA888]" /> Co-Working Daily Study Goals
          </h3>
          <p className="text-xs text-[#8C857E]">Keep yourself and your virtual study rooms accountable with action checklists.</p>
        </div>

        {/* Add goal form */}
        <form onSubmit={handleAddGoal} className="flex gap-2" id="add-goal-form">
          <input
            id="new-goal-input"
            type="text"
            required
            placeholder="Add a daily co-working goal (e.g., Solve 10 trigonometry problems, Revise Ohm's law)..."
            className="flex-1 text-xs px-3.5 py-3 border border-[#E8E2D9] rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#8BA888] focus:border-[#8BA888] bg-[#F9F7F2]/40 text-[#4A443F]"
            value={newGoalInput}
            onChange={(e) => setNewGoalInput(e.target.value)}
          />
          <button
            id="add-goal-btn"
            type="submit"
            className="flex items-center gap-1.5 bg-[#8BA888] hover:bg-[#7A9777] text-white font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl cursor-pointer transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Goal
          </button>
        </form>

        {/* Goals Checklist */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto" id="goals-list-container">
          {progress.dailyGoals.map((goal) => (
            <div
              key={goal.id}
              className={`flex items-center justify-between p-3.5 border rounded-xl transition-colors ${
                goal.completed ? "bg-[#DEE5DC]/20 border-[#8BA888]" : "bg-[#F9F7F2]/30 border-[#E8E2D9]"
              }`}
            >
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={goal.completed}
                  onChange={() => handleToggleGoal(goal.id)}
                  className="w-4.5 h-4.5 rounded-md border-[#E8E2D9] text-[#8BA888] focus:ring-[#8BA888] cursor-pointer"
                />
                <span className={`text-xs ${goal.completed ? "line-through text-gray-400 font-medium" : "text-[#4A443F] font-bold"}`}>
                  {goal.text}
                </span>
              </label>

              <button
                id={`delete-goal-btn-${goal.id}`}
                onClick={() => handleDeleteGoal(goal.id)}
                className="p-1 text-gray-400 hover:text-red-500 rounded-md transition-colors cursor-pointer"
                title="Delete goal"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {progress.dailyGoals.length === 0 && (
            <div className="p-8 border border-dashed border-[#E8E2D9] rounded-xl text-center text-[#8C857E] text-xs">
              All daily goals are completed or empty. Set one above to start focusing!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
