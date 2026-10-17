import React, { useState, useEffect, useRef } from "react";
import { StudyGroup, Message, Stroke, UserProgress } from "../types";
import { Users, Send, Edit, Shield, Save, Palette, Trash2, ArrowLeft, Plus, CheckCircle, Sparkles } from "lucide-react";

interface StudyGroupsProps {
  progress: UserProgress;
  onUpdateProgress: (newProgress: Partial<UserProgress>) => void;
  onAddReminder: (text: string, type: "motivational" | "break" | "cheer") => void;
}

export default function StudyGroups({ progress, onUpdateProgress, onAddReminder }: StudyGroupsProps) {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Whiteboard drawing tool state
  const [currentColor, setCurrentColor] = useState("#6366f1");
  const [currentWidth, setCurrentWidth] = useState(3);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);

  // Form state for creating new group
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupTopic, setNewGroupTopic] = useState("General");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  // Fetch groups on mount and poll periodically
  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/groups");
      const data = await response.json();
      if (response.ok) {
        setGroups(data);
      }
    } catch (err) {
      console.error("Error fetching study groups:", err);
    }
  };

  useEffect(() => {
    fetchGroups();
    const interval = setInterval(fetchGroups, 10000); // Poll every 10s for new messages/activity
    return () => clearInterval(interval);
  }, []);

  const activeGroup = groups.find((g) => g.id === activeGroupId) || null;

  // Sync notes and whiteboard when active group changes
  useEffect(() => {
    if (activeGroup) {
      setNotesInput(activeGroup.sharedNotes);
      drawWhiteboardStrokes();
    }
  }, [activeGroupId, groups]);

  // Handle drawing on Canvas
  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasMousePos(e);
    setIsDrawing(true);
    setCurrentPoints([pos]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getCanvasMousePos(e);
    const updatedPoints = [...currentPoints, pos];
    setCurrentPoints(updatedPoints);

    // Draw temporary lines in real time
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(currentPoints[currentPoints.length - 1].x, currentPoints[currentPoints.length - 1].y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handleCanvasMouseUp = async () => {
    if (!isDrawing || !activeGroup) return;
    setIsDrawing(false);

    if (currentPoints.length < 2) return;

    const newStroke: Stroke = {
      id: `stroke-${Date.now()}`,
      points: currentPoints,
      color: currentColor,
      width: currentWidth,
    };

    const updatedWhiteboard = [...(activeGroup.whiteboard || []), newStroke];

    // Optimistic UI Update
    const updatedGroups = groups.map((g) => {
      if (g.id === activeGroup.id) {
        return { ...g, whiteboard: updatedWhiteboard };
      }
      return g;
    });
    setGroups(updatedGroups);

    // Push to server
    try {
      await fetch(`/api/groups/${activeGroup.id}/whiteboard`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whiteboard: updatedWhiteboard }),
      });
    } catch (err) {
      console.error("Error saving whiteboard:", err);
    }
  };

  const drawWhiteboardStrokes = () => {
    const canvas = canvasRef.current;
    if (!canvas || !activeGroup) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear whole canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all strokes
    const strokes = activeGroup.whiteboard || [];
    strokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length < 2) return;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  };

  // Clear whiteboard
  const handleClearWhiteboard = async () => {
    if (!activeGroup) return;
    const updatedGroups = groups.map((g) => {
      if (g.id === activeGroup.id) {
        return { ...g, whiteboard: [] };
      }
      return g;
    });
    setGroups(updatedGroups);

    try {
      await fetch(`/api/groups/${activeGroup.id}/whiteboard`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whiteboard: [] }),
      });
      drawWhiteboardStrokes();
    } catch (err) {
      console.error("Error clearing whiteboard:", err);
    }
  };

  // Save notes to backend
  const handleSaveNotes = async () => {
    if (!activeGroup) return;
    setIsEditingNotes(false);

    try {
      const response = await fetch(`/api/groups/${activeGroup.id}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharedNotes: notesInput }),
      });
      const data = await response.json();
      if (response.ok) {
        setGroups(groups.map((g) => (g.id === activeGroup.id ? data : g)));
        onAddReminder(`📝 Shared notes in '${activeGroup.name}' updated! Great teamwork.`, "cheer");
      }
    } catch (err) {
      console.error("Error saving notes:", err);
    }
  };

  // Submit chat message to the group
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeGroup) return;

    const textToSend = chatInput;
    setChatInput("");

    try {
      const response = await fetch(`/api/groups/${activeGroup.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSend }),
      });
      const data = await response.json();
      if (response.ok) {
        // Immediately update with new chat
        setGroups(groups.map((g) => (g.id === activeGroup.id ? data : g)));
        onUpdateProgress({
          studyHours: parseFloat((progress.studyHours + 0.1).toFixed(1)),
        });

        // Small delay to trigger mock responses
        setTimeout(async () => {
          await fetchGroups();
        }, 2000);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Handle creating a new study room group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDesc,
          topic: newGroupTopic,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setGroups([...groups, data]);
        setActiveGroupId(data.id);
        setShowCreateForm(false);
        setNewGroupName("");
        setNewGroupDesc("");
        onAddReminder(`🚀 You launched a new study room: '${data.name}'! Members are arriving.`, "cheer");
      }
    } catch (err) {
      console.error("Error creating group:", err);
    }
  };

  // Simulate a quick peer drawing help
  const handleSimulatePeerDrawing = async () => {
    if (!activeGroup) return;
    onAddReminder("✏️ Marcus is drawing a calculus flowchart on the whiteboard...", "cheer");

    const peerStrokes: Stroke = {
      id: `stroke-peer-${Date.now()}`,
      points: [
        { x: 100, y: 150 },
        { x: 150, y: 150 },
        { x: 150, y: 200 },
        { x: 100, y: 200 },
        { x: 100, y: 150 },
      ],
      color: "#f43f5e",
      width: 4,
    };

    const updatedWhiteboard = [...(activeGroup.whiteboard || []), peerStrokes];

    try {
      await fetch(`/api/groups/${activeGroup.id}/whiteboard`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whiteboard: updatedWhiteboard }),
      });
      await fetchGroups();
    } catch (err) {
      console.error("Error writing peer stroke:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="virtual-groups-section">
      {/* LEFT COLUMN: Rooms List / Details (4 cols) */}
      <div className="lg:col-span-4 space-y-4 text-left">
        {/* Active Group List */}
        {!activeGroupId ? (
          <div className="bg-white rounded-3xl border border-[#E8E2D9] p-6 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#3D5A3A] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#8BA888]" /> Virtual Study Rooms
                </h2>
                <p className="text-xs text-[#8C857E]">Form co-working groups & collaborate in real time.</p>
              </div>
              <button
                id="show-create-room-btn"
                onClick={() => setShowCreateForm(true)}
                className="w-9 h-9 bg-[#F1EDE4] hover:bg-[#E8E2D9] text-[#3D5A3A] rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                title="Create a study room"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {showCreateForm ? (
              <form onSubmit={handleCreateGroup} className="space-y-4 p-4 bg-[#F1EDE4]/50 rounded-2xl border border-[#E8E2D9]" id="create-room-form">
                <h3 className="text-xs font-bold text-[#3D5A3A] uppercase tracking-widest">Start a Virtual Room</h3>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C857E] mb-1">Room Name</label>
                  <input
                    id="new-room-name"
                    type="text"
                    required
                    placeholder="e.g. MCAT Bio Flashcards Session"
                    className="w-full text-xs px-3 py-2 border border-[#E8E2D9] rounded-xl bg-white focus:outline-hidden"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C857E] mb-1">Subject Topic</label>
                  <select
                    id="new-room-topic"
                    className="w-full text-xs px-3 py-2 border border-[#E8E2D9] rounded-xl bg-white focus:outline-hidden"
                    value={newGroupTopic}
                    onChange={(e) => setNewGroupTopic(e.target.value)}
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="English">English</option>
                    <option value="General Study">General Study</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C857E] mb-1">Description</label>
                  <input
                    id="new-room-desc"
                    type="text"
                    placeholder="Explain what everyone is co-working on."
                    className="w-full text-xs px-3 py-2 border border-[#E8E2D9] rounded-xl bg-white focus:outline-hidden"
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    id="cancel-create-room-btn"
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 text-xs py-2 border border-[#E8E2D9] text-[#4A443F] font-bold rounded-xl hover:bg-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-create-room-btn"
                    type="submit"
                    className="flex-1 text-xs py-2 bg-[#8BA888] text-white font-bold rounded-xl hover:bg-[#7A9777] transition-colors cursor-pointer"
                  >
                    Launch Room
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3.5" id="rooms-grid-container">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => setActiveGroupId(group.id)}
                    className="p-4 border border-[#E8E2D9] rounded-2xl hover:border-[#8BA888] bg-linear-to-b from-white to-[#F9F7F2]/30 cursor-pointer transition-all hover:shadow-sm group text-left"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <h3 className="text-sm font-serif font-bold text-[#4A443F] group-hover:text-[#3D5A3A] transition-colors">{group.name}</h3>
                      <span className="text-[10px] bg-[#DEE5DC] text-[#3D5A3A] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {group.topic}
                      </span>
                    </div>
                    <p className="text-xs text-[#8C857E] line-clamp-2 leading-relaxed mb-4">{group.description}</p>

                    <div className="flex justify-between items-center border-t border-[#E8E2D9]/40 pt-3">
                      <div className="flex gap-1">
                        {group.members.slice(0, 3).map((m, mIdx) => (
                          <div
                            key={mIdx}
                            className={`w-5 h-5 rounded-full ${m.avatarColor} text-white flex items-center justify-center text-[8px] font-bold ring-2 ring-white`}
                            title={`${m.name} (${m.isOnline ? "Online" : "Offline"})`}
                          >
                            {m.name[0]}
                          </div>
                        ))}
                        {group.members.length > 3 && (
                          <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[8px] font-bold">
                            +{group.members.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-[#5D805A] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5D805A] animate-pulse"></span>
                        {group.members.filter((m) => m.isOnline).length} Co-working
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Active group controls panel */
          <div className="bg-white rounded-3xl border border-[#E8E2D9] p-5 shadow-sm space-y-5">
            <button
              id="back-to-rooms-btn"
              onClick={() => setActiveGroupId(null)}
              className="flex items-center gap-1.5 text-xs text-[#8BA888] font-bold hover:text-[#7A9777] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Leave Co-Working Room
            </button>

            <div className="border-b border-[#E8E2D9] pb-3 text-left">
              <span className="text-[9px] font-bold text-[#3D5A3A] bg-[#DEE5DC] px-2.5 py-1 rounded-full uppercase tracking-widest">
                {activeGroup?.topic} Study Session
              </span>
              <h2 className="text-lg font-serif font-bold text-[#4A443F] mt-2.5">{activeGroup?.name}</h2>
              <p className="text-xs text-[#8C857E] leading-relaxed mt-1">{activeGroup?.description}</p>
            </div>

            {/* Active Members List */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C857E] mb-2.5">Connected Peers ({activeGroup?.members.length})</h3>
              <div className="grid grid-cols-2 gap-2" id="active-members-list">
                {activeGroup?.members.map((m, mIdx) => (
                  <div key={mIdx} className="flex items-center gap-2 p-2 border border-[#E8E2D9] rounded-xl bg-[#F9F7F2]/40">
                    <div className={`w-6 h-6 rounded-full ${m.avatarColor} text-white flex items-center justify-center text-[10px] font-extrabold`}>
                      {m.name[0]}
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-[#4A443F]">{m.name}</p>
                      <span className="text-[8px] text-[#8C857E] block flex items-center gap-0.5">
                        <span className={`w-1 h-1 rounded-full ${m.isOnline ? "bg-[#8BA888] animate-pulse" : "bg-gray-300"}`}></span>
                        {m.isOnline ? "Co-working" : "Away"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulated Live Action Button */}
            <div className="p-4 bg-[#F1EDE4] rounded-2xl border border-[#E8E2D9] space-y-2.5">
              <h4 className="font-bold text-[#3D5A3A] flex items-center gap-1 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#8BA888]" /> Need Whiteboard help?
              </h4>
              <p className="text-[10px] text-[#8C857E] leading-relaxed">
                Click here to request Marcus to assist by drawing a calculus outline model on your board!
              </p>
              <button
                id="request-peer-drawing-btn"
                onClick={handleSimulatePeerDrawing}
                className="w-full text-[10px] bg-[#8BA888] hover:bg-[#7A9777] text-white font-bold uppercase tracking-wider py-2 rounded-xl cursor-pointer transition-colors"
              >
                Request Cooperative Sketch
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Active Room Canvas Whiteboard, Chat, and Shared Notes (8 cols) */}
      <div className="lg:col-span-8 flex flex-col space-y-6 text-left">
        {activeGroup ? (
          <>
            {/* Whiteboard + Notes tab selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* INTERACTIVE WHITEBOARD CANVAS */}
              <div className="bg-white rounded-3xl border border-[#E8E2D9] p-5 shadow-sm space-y-3.5">
                <div className="flex justify-between items-center border-b border-[#E8E2D9]/40 pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#3D5A3A] flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-[#8BA888]" /> Collaborative Whiteboard
                  </h3>
                  <button
                    id="clear-whiteboard-btn"
                    onClick={handleClearWhiteboard}
                    className="p-1 text-gray-400 hover:text-red-500 rounded-md transition-colors cursor-pointer"
                    title="Clear Whiteboard"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Drawing Tools bar */}
                <div className="flex items-center justify-between gap-2 p-1.5 bg-[#F1EDE4] rounded-xl border border-[#E8E2D9]">
                  <div className="flex gap-1.5">
                    {["#3D5A3A", "#8BA888", "#D69E88", "#A67C52", "#14b8a6"].map((color) => (
                      <button
                        key={color}
                        onClick={() => setCurrentColor(color)}
                        className={`w-5 h-5 rounded-full border border-white cursor-pointer transition-transform ${currentColor === color ? "scale-115 ring-2 ring-[#8BA888]/40" : ""}`}
                        style={{ backgroundColor: color }}
                      ></button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#8C857E]">Brush:</span>
                    <select
                      id="whiteboard-brush-size"
                      className="text-[10px] px-1 py-0.5 border border-[#E8E2D9] rounded-md bg-white text-[#4A443F]"
                      value={currentWidth}
                      onChange={(e) => setCurrentWidth(parseInt(e.target.value))}
                    >
                      <option value={2}>Thin</option>
                      <option value={4}>Medium</option>
                      <option value={8}>Thick</option>
                    </select>
                  </div>
                </div>

                <div className="relative border border-[#E8E2D9] bg-[#F9F7F2]/60 rounded-2xl overflow-hidden h-64">
                  <canvas
                    id="study-room-canvas"
                    ref={canvasRef}
                    width={400}
                    height={256}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    className="w-full h-full cursor-crosshair block"
                  ></canvas>
                </div>
              </div>

              {/* COLLABORATIVE NOTES SECTION */}
              <div className="bg-white rounded-3xl border border-[#E8E2D9] p-5 shadow-sm space-y-3.5">
                <div className="flex justify-between items-center border-b border-[#E8E2D9]/40 pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#3D5A3A] flex items-center gap-1.5">
                    <Edit className="w-4 h-4 text-[#8BA888]" /> Collaborative Shared Notes
                  </h3>
                  {!isEditingNotes ? (
                    <button
                      id="edit-notes-btn"
                      onClick={() => setIsEditingNotes(true)}
                      className="text-[10px] text-[#8BA888] font-bold hover:text-[#7A9777] uppercase tracking-wider flex items-center gap-0.5 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                  ) : (
                    <button
                      id="save-notes-btn"
                      onClick={handleSaveNotes}
                      className="text-[10px] text-[#5D805A] font-bold hover:text-[#3D5A3A] uppercase tracking-wider flex items-center gap-0.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Note
                    </button>
                  )}
                </div>

                {!isEditingNotes ? (
                  <div className="p-4 bg-[#F9F7F2]/40 border border-[#E8E2D9] rounded-2xl h-74 overflow-y-auto text-xs leading-relaxed text-[#4A443F] whitespace-pre-line font-serif">
                    {activeGroup.sharedNotes || "No notes compiled yet. Click Edit to outline study goals!"}
                  </div>
                ) : (
                  <textarea
                    id="edit-shared-notes-textarea"
                    className="w-full text-xs p-3.5 border border-[#E8E2D9] bg-[#F9F7F2]/30 rounded-2xl h-74 focus:outline-hidden focus:ring-1 focus:ring-[#8BA888] font-mono leading-relaxed"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* LIVE GROUP CHAT SPACE */}
            <div className="bg-white rounded-3xl border border-[#E8E2D9] p-5 shadow-sm flex flex-col h-[320px]">
              <div className="border-b border-[#E8E2D9]/40 pb-2.5 mb-3 flex justify-between items-center">
                <span className="text-xs font-bold text-[#3D5A3A] flex items-center gap-1">
                  <Users className="w-4 h-4 text-[#8BA888]" /> Room Live Chat ({activeGroup.name})
                </span>
                <span className="text-[10px] text-[#8C857E] font-bold uppercase tracking-wider">Active Room Chat</span>
              </div>

              {/* Chat Feed */}
              <div className="flex-1 overflow-y-auto p-2 space-y-3 font-sans no-scrollbar bg-[#F9F7F2]/10 rounded-2xl" id="group-chat-messages-box">
                {activeGroup.chat.map((msg) => {
                  const isMe = msg.sender === "user";
                  return (
                    <div key={msg.id} className={`flex gap-2 max-w-[85%] ${isMe ? "ml-auto flex-row-reverse text-right" : "mr-auto text-left"}`}>
                      {!isMe && (
                        <div className={`w-6 h-6 shrink-0 rounded-full ${msg.avatarColor || "bg-gray-400"} text-white flex items-center justify-center font-extrabold text-[10px] select-none`}>
                          {msg.senderName[0]}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold text-[#4A443F]">{msg.senderName}</span>
                          <span className="text-[8px] text-[#8C857E]">{msg.timestamp}</span>
                        </div>
                        <div className={`p-2.5 rounded-2xl text-xs leading-relaxed ${isMe ? "bg-[#8BA888] text-white rounded-tr-none font-medium" : "bg-[#F1EDE4] text-[#4A443F] rounded-tl-none"}`}>
                          <p>{msg.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Send */}
              <form onSubmit={handleSendChatMessage} className="mt-3 border-t border-[#E8E2D9]/40 pt-2 flex gap-2" id="group-chat-input-form">
                <input
                  id="group-chat-input"
                  type="text"
                  placeholder={`Chat with ${activeGroup.members.map((m) => m.name).join(", ")}...`}
                  className="w-full text-xs px-3.5 py-2.5 border border-[#E8E2D9] rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#8BA888] bg-[#F9F7F2]/30"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button
                  id="send-group-chat-btn"
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2.5 bg-[#8BA888] hover:bg-[#7A9777] disabled:bg-gray-200 text-white rounded-xl transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="bg-[#F1EDE4]/30 rounded-[32px] border-2 border-dashed border-[#E8E2D9] flex flex-col items-center justify-center p-12 text-center h-[520px]">
            <Users className="w-12 h-12 text-[#8C857E] mb-3 opacity-60" />
            <h3 className="text-base font-serif font-bold text-[#3D5A3A]">Select or Start a Co-Working Room</h3>
            <p className="text-xs text-[#8C857E] max-w-sm mt-2 leading-relaxed">
              Forming a virtual study room allows you to co-work, share notes, sketch models on a whiteboard, and interact with peers to eliminate isolation study fatigue.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
