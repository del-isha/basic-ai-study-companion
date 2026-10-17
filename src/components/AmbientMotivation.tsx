import React, { useState, useEffect } from "react";
import { Reminder } from "../types";
import { Bell, Sparkles, Volume2, Smile, AlertTriangle, Coffee, Play, Pause, Compass, CheckCircle2 } from "lucide-react";

interface AmbientMotivationProps {
  onAddReminder: (text: string, type: "motivational" | "break" | "cheer") => void;
}

interface AudioSound {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export default function AmbientMotivation({ onAddReminder }: AmbientMotivationProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isTriggeringMood, setIsTriggeringMood] = useState(false);
  const [activeSoundId, setActiveSoundId] = useState<string | null>(null);
  const [volume, setVolume] = useState(50);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Ambiance Sound options
  const sounds: AudioSound[] = [
    { id: "lofi", name: "Lofi Study Beats", emoji: "🎧", description: "Subtle vintage chords & mellow rhythms for deep study blocks." },
    { id: "rain", name: "Cozy Rainy Window", emoji: "🌧️", description: "Soft soothing rainfall and gentle thunder rumbles." },
    { id: "coffee", name: "Parisian Coffee Shop", emoji: "☕", description: "Low clatter of ceramic cups and cozy background murmurs." },
    { id: "library", name: "Oxford College Library", emoji: "📚", description: "Deep rustling pages, whispers, and soothing dead quiet hum." },
  ];

  // Fetch reminders on mount and poll
  const fetchReminders = async () => {
    try {
      const response = await fetch("/api/reminders");
      const data = await response.json();
      if (response.ok) {
        setReminders(data);
      }
    } catch (err) {
      console.error("Error fetching reminders:", err);
    }
  };

  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 6000); // Poll more frequently for study reminders
    return () => clearInterval(interval);
  }, []);

  // Poll for simulated time elapsed in focus sound
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeSoundId) {
      timer = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [activeSoundId]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch("/api/reminders/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (response.ok) {
        setReminders(data);
      }
    } catch (err) {
      console.error("Error marking reminder read:", err);
    }
  };

  // Trigger Gemini customized mood boost
  const handleTriggerMoodBoost = async (mood: string) => {
    setIsTriggeringMood(true);
    try {
      const response = await fetch("/api/reminders/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood }),
      });
      const data = await response.json();
      if (response.ok) {
        setReminders((prev) => [data, ...prev]);
        onAddReminder(`✨ Aura created a mood boost reminder tailored to your feeling: "${mood}"`, "motivational");
      }
    } catch (err) {
      console.warn("API Error, falling back to offline mood responses:", err);
      // Mock localized mood response on API error
      setTimeout(() => {
        const fallbacks: Record<string, string> = {
          lonely: "Aura is right here studying with you! You are never alone in this virtual workspace.",
          tired: "Take a 5-minute break. Grab a glass of water and stretch. You've earned it!",
          stuck: "Don't beat yourself up! Break the problem down or consult with your co-working study group.",
          distracted: "Put your phone away for just 15 minutes. Let's do a short Pomodoro together right now!",
        };
        const text = fallbacks[mood] || "Stay strong! You are making great progress.";
        const fallbackReminder: Reminder = {
          id: `rem-fall-${Date.now()}`,
          text: `✨ Aura Boost: ${text} [Offline Mode]`,
          type: "motivational",
          timestamp: "Just now",
          read: false,
        };
        setReminders((prev) => [fallbackReminder, ...prev]);
      }, 800);
    } finally {
      setIsTriggeringMood(false);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="ambient-motivation-section">
      {/* LEFT COLUMN: Reminders Panel & Live Feed (7 cols) */}
      <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E8E2D9] p-6 shadow-sm text-left flex flex-col h-[520px]">
        <div className="flex items-center justify-between border-b border-[#E8E2D9]/40 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#8BA888] animate-swing" />
            <div>
              <h2 className="text-base font-serif font-bold text-[#3D5A3A]">Co-Working Alerts & Reminders</h2>
              <p className="text-xs text-[#8C857E] font-sans">Aura companion encouragements & study group activities.</p>
            </div>
          </div>
          <span className="text-[10px] text-[#3D5A3A] font-bold uppercase tracking-wider bg-[#DEE5DC] px-2.5 py-1 rounded-full">
            {reminders.filter((r) => !r.read).length} Unread Alerts
          </span>
        </div>

        {/* Reminders Feed */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 font-sans no-scrollbar" id="reminders-feed-container">
          {reminders.map((rem) => {
            let typeColor = "border-[#E8E2D9] bg-[#F9F7F2]/40 text-[#4A443F]";
            if (rem.type === "break") typeColor = "border-[#E8E2D9] bg-[#F1EDE4]/70 text-[#4A443F]";
            if (rem.type === "cheer") typeColor = "border-[#8BA888] bg-[#DEE5DC]/30 text-[#3D5A3A]";

            return (
              <div
                key={rem.id}
                className={`p-3.5 border rounded-2xl flex items-start justify-between gap-3 transition-opacity ${typeColor} ${
                  rem.read ? "opacity-55" : ""
                }`}
              >
                <div className="text-xs">
                  <p className="leading-relaxed font-semibold">{rem.text}</p>
                  <span className="text-[9px] text-[#8C857E] mt-1 block font-mono">{rem.timestamp}</span>
                </div>

                {!rem.read && (
                  <button
                    id={`mark-read-btn-${rem.id}`}
                    onClick={() => handleMarkAsRead(rem.id)}
                    className="shrink-0 p-1 hover:bg-white rounded-md text-gray-400 hover:text-emerald-600 transition-colors cursor-pointer"
                    title="Mark Read"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}

          {reminders.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full text-[#8C857E] text-xs">
              No recent notifications or notifications generated yet.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Mood triggers and Focus Sounds (5 cols) */}
      <div className="lg:col-span-5 space-y-6 text-left">
        {/* MOOD SUPPORT STATION */}
        <div className="bg-white rounded-3xl border border-[#E8E2D9] p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-serif font-bold text-[#3D5A3A] flex items-center gap-1.5">
              <Smile className="w-4.5 h-4.5 text-[#8BA888]" /> Aura Mood Support Station
            </h3>
            <p className="text-xs text-[#8C857E] font-sans">
              Feeling lonely or struggling to study alone? Tell Aura how you feel to trigger a customized AI motivation push.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5" id="mood-buttons-grid">
            {[
              { id: "lonely", label: "I feel lonely", emoji: "🤝" },
              { id: "tired", label: "I'm exhausted", emoji: "💤" },
              { id: "stuck", label: "I'm feeling stuck", emoji: "🧠" },
              { id: "distracted", label: "I'm distracted", emoji: "📱" },
            ].map((mood) => (
              <button
                id={`mood-btn-${mood.id}`}
                key={mood.id}
                disabled={isTriggeringMood}
                onClick={() => handleTriggerMoodBoost(mood.id)}
                className="p-4 border border-[#E8E2D9] rounded-2xl hover:border-[#8BA888] bg-linear-to-b from-white to-[#F9F7F2]/40 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-sm transition-all disabled:opacity-50"
              >
                <span className="text-lg mb-1">{mood.emoji}</span>
                <span className="text-xs font-bold text-[#4A443F]">{mood.label}</span>
              </button>
            ))}
          </div>

          {isTriggeringMood && (
            <div className="flex items-center gap-2 text-xs text-[#3D5A3A] justify-center p-2 bg-[#DEE5DC]/50 rounded-xl animate-pulse" id="mood-loading-box">
              <Sparkles className="w-4 h-4 animate-spin text-[#8BA888]" />
              <span>Aura is preparing your motivation card...</span>
            </div>
          )}
        </div>

        {/* FOCUS AMBIANCE CONTROLS */}
        <div className="bg-white rounded-3xl border border-[#E8E2D9] p-5 shadow-sm space-y-4" id="ambiance-player-container">
          <div>
            <h3 className="text-base font-serif font-bold text-[#3D5A3A] flex items-center gap-1.5">
              <Volume2 className="w-4.5 h-4.5 text-[#8BA888]" /> Study Ambiance Environment
            </h3>
            <p className="text-xs text-[#8C857E] font-sans">Block out isolating background silence and focus with cozy environments.</p>
          </div>

          {/* Sound options list */}
          <div className="space-y-2.5" id="focus-sounds-list">
            {sounds.map((sound) => {
              const isPlaying = activeSoundId === sound.id;
              return (
                <div
                  key={sound.id}
                  className={`p-3.5 border rounded-2xl flex items-center justify-between gap-3 transition-colors ${
                    isPlaying ? "bg-[#DEE5DC]/20 border-[#8BA888]" : "bg-[#F9F7F2]/30 border-[#E8E2D9]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl shrink-0 select-none">{sound.emoji}</span>
                    <div className="text-left">
                      <p className="text-xs font-bold text-[#4A443F]">{sound.name}</p>
                      <p className="text-[10px] text-[#8C857E] leading-normal max-w-[200px] font-sans">{sound.description}</p>
                    </div>
                  </div>

                  <button
                    id={`toggle-sound-btn-${sound.id}`}
                    onClick={() => setActiveSoundId(isPlaying ? null : sound.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                      isPlaying ? "bg-[#3D5A3A] text-white" : "bg-[#F1EDE4] text-[#4A443F] hover:bg-[#E8E2D9]"
                    }`}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Active Audio status controller */}
          {activeSoundId && (
            <div className="p-4 bg-[#3D5A3A] text-white rounded-2xl space-y-2.5 text-left shadow-sm" id="active-sound-status">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <Compass className="w-4 h-4 animate-spin text-[#8BA888]" />
                  Playing {sounds.find((s) => s.id === activeSoundId)?.name}
                </span>
                <span className="font-mono text-[10px]">{formatTimer(elapsedSeconds)} elapsed</span>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-2 text-white">
                <Volume2 className="w-4 h-4 shrink-0" />
                <input
                  id="sound-volume-slider"
                  type="range"
                  min={0}
                  max={100}
                  className="w-full h-1 bg-[#8BA888] rounded-lg appearance-none cursor-pointer accent-white"
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                />
                <span className="text-[9px] font-mono shrink-0">{volume}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
