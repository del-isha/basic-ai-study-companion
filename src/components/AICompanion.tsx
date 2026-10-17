import React, { useState, useEffect } from "react";
import { Message, Flashcard, Quiz, QuizQuestion, UserProgress } from "../types";
import { Sparkles, Send, Brain, ChevronLeft, ChevronRight, CheckCircle2, RotateCcw, AlertCircle, HelpCircle, FileText, Check, Plus } from "lucide-react";

interface AICompanionProps {
  progress: UserProgress;
  onUpdateProgress: (newProgress: Partial<UserProgress>) => void;
  onAddReminder: (text: string, type: "motivational" | "break" | "cheer") => void;
}

export default function AICompanion({ progress, onUpdateProgress, onAddReminder }: AICompanionProps) {
  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<Message[]>([
    {
      id: "a1",
      sender: "ai",
      senderName: "Aura",
      text: "Hello! I am Aura, your AI study companion. Don't worry about studying alone—I'm here to explain concepts, quiz you, or keep you motivated! What are we mastering today?",
      timestamp: "09:45 AM",
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Generation State
  const [topic, setTopic] = useState("");
  const [material, setMaterial] = useState("");
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Flashcards Study State
  const [flashcards, setFlashcards] = useState<Flashcard[]>([
    {
      id: "f-init-1",
      question: "What is Ohm's Law? Write its formula.",
      answer: "The current flowing through a conductor is directly proportional to the potential difference across it, provided physical conditions (like temperature) remain constant. Formula: V = IR.",
      topic: "Physics",
      mastered: false,
      difficulty: "easy",
    },
    {
      id: "f-init-2",
      question: "State Newton's Second Law of Motion.",
      answer: "The rate of change of momentum of a body is directly proportional to the applied force and takes place in the direction of the force. F = ma.",
      topic: "Physics",
      mastered: false,
      difficulty: "medium",
    },
    {
      id: "f-init-3",
      question: "What is a Python dictionary? How is it declared?",
      answer: "A dictionary in Python stores data in key-value pairs. It is unordered, mutable, and does not allow duplicate keys. Declared using curly braces: my_dict = {'key': 'value'}.",
      topic: "Computer Science",
      mastered: false,
      difficulty: "medium",
    },
  ]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz State
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submittedQuiz, setSubmittedQuiz] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Send message to Aura AI Companion
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsgText = chatInput;
    setChatInput("");

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMsg: Message = {
      id: `chat-${Date.now()}`,
      sender: "user",
      senderName: "You",
      text: userMsgText,
      timestamp: timeStr,
    };

    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setIsChatLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsgText, history: newHistory }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setChatHistory((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          senderName: "Aura",
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      // Boost study hours slightly for engaging with AI
      onUpdateProgress({
        studyHours: parseFloat((progress.studyHours + 0.1).toFixed(1)),
      });
    } catch (err: any) {
      console.warn("API Error, falling back to simulated companion response:", err);
      // Fallback response for offline or unconfigured API keys
      setTimeout(() => {
        const fallbacks = [
          "That is a great question! Let's break this down step-by-step. What part feels most confusing to you?",
          "I completely understand studying alone is difficult. Remember, taking deep breaths and chunking study materials is highly effective. Let me generate a quiz to test your memory!",
          "Great job staying committed. Would you like me to create some customized flashcards on this topic to help you memorize?",
          "I'm right here with you! Let's conquer this study session together. Try explaining the concept to me in your own words!",
        ];
        const randomReply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        setChatHistory((prev) => [
          ...prev,
          {
            id: `ai-fall-${Date.now()}`,
            sender: "ai",
            senderName: "Aura (Offline)",
            text: `[Offline Mode] ${randomReply}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }, 1000);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Generate Personalized Flashcards using AI
  const handleGenerateFlashcards = async () => {
    if (!topic.trim() && !material.trim()) {
      setErrorMessage("Please specify a study topic or paste some notes first.");
      return;
    }

    setIsGeneratingCards(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/gemini/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, material }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      if (data.flashcards && data.flashcards.length > 0) {
        setFlashcards(data.flashcards);
        setCurrentCardIndex(0);
        setIsFlipped(false);
        onAddReminder(`🆕 Aura generated ${data.flashcards.length} custom cards on '${topic || "your material"}'!`, "cheer");
      }
    } catch (err: any) {
      console.warn("API Error, generating simulated cards:", err);
      // Simulated Fallback Flashcards
      setTimeout(() => {
        const fallbackCards: Flashcard[] = [
          {
            id: `fc-fall-1-${Date.now()}`,
            question: `Explain the fundamental concept of ${topic || "your study topic"}.`,
            answer: `It involves core principles focusing on structured processes, core structures, and theoretical integration.`,
            topic: topic || "Concept study",
            mastered: false,
            difficulty: "medium",
          },
          {
            id: `fc-fall-2-${Date.now()}`,
            question: `What are 2 common mistakes when studying ${topic || "this topic"}?`,
            answer: `1. Rushing into complex elements without mastering basics.\n2. Passively reading notes instead of active recall study.`,
            topic: topic || "Study guide",
            mastered: false,
            difficulty: "easy",
          },
          {
            id: `fc-fall-3-${Date.now()}`,
            question: `What is a key real-world application of ${topic || "this topic"}?`,
            answer: `It enables systems optimization, enhanced problem-solving models, and builds stronger analytic foundations.`,
            topic: topic || "Application",
            mastered: false,
            difficulty: "hard",
          },
        ];
        setFlashcards(fallbackCards);
        setCurrentCardIndex(0);
        setIsFlipped(false);
        onUpdateProgress({ totalCards: progress.totalCards + fallbackCards.length });
        onAddReminder(`✨ Aura generated study cards on '${topic || "your topic"}' (Offline Demo).`, "cheer");
      }, 1500);
    } finally {
      setIsGeneratingCards(false);
    }
  };

  // Generate Personalized Quiz using AI
  const handleGenerateQuiz = async () => {
    if (!topic.trim() && !material.trim()) {
      setErrorMessage("Please specify a study topic or paste some notes first.");
      return;
    }

    setIsGeneratingQuiz(true);
    setErrorMessage("");
    setActiveQuiz(null);
    setSelectedAnswers({});
    setSubmittedQuiz(false);

    try {
      const response = await fetch("/api/gemini/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, material }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      if (data.quiz) {
        setActiveQuiz(data.quiz);
        onAddReminder(`📝 Aura created a personalized quiz: '${data.quiz.title}'! Ready to test?`, "cheer");
      }
    } catch (err: any) {
      console.warn("API Error, generating simulated quiz:", err);
      // Simulated Fallback Quiz
      setTimeout(() => {
        const fallbackQuiz: Quiz = {
          id: `quiz-fall-${Date.now()}`,
          title: `Quiz: ${topic || "Study Session Overview"}`,
          topic: topic || "General Study",
          questions: [
            {
              id: "q-fall-1",
              question: `Which of the following is the most efficient way to study ${topic || "a topic"}?`,
              options: [
                "Reading the same chapter 5 times in a row",
                "Using active recall and spaced repetition flashcards",
                "Highlighting every line in the textbook",
                "Studying for 8 hours without any breaks",
              ],
              correctAnswerIndex: 1,
              explanation: "Active recall forces the brain to retrieve information, strengthening synaptic connections. Great job!",
            },
            {
              id: "q-fall-2",
              question: "How does joining a virtual study group help with study fatigue?",
              options: [
                "It allows others to write all your study summaries for you",
                "It reduces isolation and fosters shared progress accountability",
                "It guarantees you never have to take exams",
                "It completely replaces private individual study",
              ],
              correctAnswerIndex: 1,
              explanation: "Virtual study rooms give you social validation, motivation, and quick answers from peers when stuck.",
            },
          ],
        };
        setActiveQuiz(fallbackQuiz);
        onAddReminder(`✨ Aura generated an offline study quiz on '${topic || "your topic"}'.`, "cheer");
      }, 1500);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Handle flashcard mastery toggle
  const toggleCardMastered = () => {
    const updatedCards = [...flashcards];
    const currentCard = updatedCards[currentCardIndex];
    const wasMastered = currentCard.mastered;
    currentCard.mastered = !wasMastered;

    setFlashcards(updatedCards);

    // Update progress total
    const change = wasMastered ? -1 : 1;
    onUpdateProgress({
      cardsMastered: Math.min(progress.totalCards, Math.max(0, progress.cardsMastered + change)),
    });

    if (!wasMastered) {
      onAddReminder(`🎯 Card Mastered! Your knowledge on '${currentCard.topic}' is sharpening.`, "cheer");
    }
  };

  // Submit Quiz Responses
  const handleSubmitQuiz = () => {
    if (!activeQuiz) return;

    let score = 0;
    activeQuiz.questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswerIndex) {
        score++;
      }
    });

    const percent = Math.round((score / activeQuiz.questions.length) * 100);
    setQuizScore(percent);
    setSubmittedQuiz(true);

    // Update progress score averages
    const totalTaken = progress.quizzesTaken + 1;
    const newAverage = Math.round((progress.quizScoreAverage * progress.quizzesTaken + percent) / totalTaken);

    onUpdateProgress({
      quizzesTaken: totalTaken,
      quizScoreAverage: newAverage,
      studyHours: parseFloat((progress.studyHours + 0.3).toFixed(1)),
    });

    onAddReminder(`🏆 You completed '${activeQuiz.title}' with a score of ${percent}%!`, "cheer");
  };

  const handleSelectAnswer = (questionId: string, optionIndex: number) => {
    if (submittedQuiz) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="ai-companion-section">
      {/* LEFT COLUMN: Study Materials Generator & Interactive study tools (8 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Topic Input Box */}
        <div className="bg-white rounded-3xl border border-[#E8E2D9] p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-[#E9EDDE] rounded-xl text-[#5D805A]">
              <Brain className="w-5 h-5" id="brain-icon" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-serif font-bold text-[#3D5A3A]">AI Study Material Creator</h2>
              <p className="text-xs text-[#8C857E] font-sans">
                Tell Aura what you are studying or paste your textbook notes. She will create tailored study sets.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-left">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8C857E] mb-1.5">Study Topic / Subject</label>
              <input
                id="study-topic-input"
                type="text"
                placeholder="e.g. Ohm's Law, Chemical Bonding, Cell Organelles, Trigonometry, Python Lists"
                className="w-full text-xs px-3 py-2.5 border border-[#E8E2D9] rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#8BA888] focus:border-[#8BA888] transition-colors bg-[#F9F7F2]/40"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="text-left">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8C857E] mb-1.5">Textbook Materials / Notes (Optional)</label>
              <textarea
                id="study-notes-input"
                placeholder="Paste paragraphs of study material, definitions, or code blocks here to personalize cards and quizzes."
                rows={4}
                className="w-full text-xs px-3 py-2.5 border border-[#E8E2D9] rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#8BA888] focus:border-[#8BA888] transition-colors bg-[#F9F7F2]/40"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
              />
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100" id="error-message-box">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                id="generate-flashcards-btn"
                onClick={handleGenerateFlashcards}
                disabled={isGeneratingCards || isGeneratingQuiz}
                className="flex-1 flex items-center justify-center gap-2 bg-[#8BA888] hover:bg-[#7A9777] text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isGeneratingCards ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Generate Flashcards
              </button>

              <button
                id="generate-quiz-btn"
                onClick={handleGenerateQuiz}
                disabled={isGeneratingCards || isGeneratingQuiz}
                className="flex-1 flex items-center justify-center gap-2 bg-[#3D5A3A] hover:bg-[#2F472C] text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isGeneratingQuiz ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Generate Quiz
              </button>
            </div>
          </div>
        </div>

        {/* ACTIVE FLASHCARDS STUDY BOX */}
        {flashcards.length > 0 && (
          <div className="bg-[#F1EDE4] rounded-3xl border border-[#E8E2D9] p-6 shadow-sm" id="flashcard-study-container">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#8BA888] bg-white px-3 py-1 rounded-full border border-[#E8E2D9]">
                Topic: {flashcards[currentCardIndex]?.topic}
              </span>
              <span className="text-xs font-bold tracking-widest text-[#D69E88] uppercase">
                Card {currentCardIndex + 1} / {flashcards.length}
              </span>
            </div>

            {/* Flashcard Box */}
            <div
              id="interactive-flashcard"
              onClick={() => setIsFlipped(!isFlipped)}
              className="h-64 w-full relative rounded-[32px] border border-[#E8E2D9] bg-white flex flex-col justify-between p-8 cursor-pointer hover:shadow-md transition-all duration-300 select-none group"
            >
              {/* Question / Answer */}
              <div className="flex flex-col justify-center items-center flex-1 text-center px-4">
                {!isFlipped ? (
                  <div>
                    <span className="text-[10px] font-bold text-[#D69E88] tracking-[0.2em] uppercase block mb-3">QUESTION</span>
                    <p className="text-lg md:text-xl font-medium leading-snug text-[#4A443F]">
                      {flashcards[currentCardIndex]?.question}
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-[10px] font-bold text-[#5D805A] tracking-[0.2em] uppercase block mb-3">RECALL ANSWER</span>
                    <p className="text-sm md:text-base leading-relaxed text-[#5D5750] whitespace-pre-line font-serif">
                      {flashcards[currentCardIndex]?.answer}
                    </p>
                  </div>
                )}
              </div>

              {/* Card Footer Toggles */}
              <div className="flex justify-between items-center border-t border-[#E8E2D9] pt-4">
                <span className="text-[10px] text-[#8C857E] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-[#8BA888]" />
                  Tap to flip
                </span>

                <button
                  id="master-flashcard-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCardMastered();
                  }}
                  className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider py-2 px-3.5 rounded-xl transition-colors cursor-pointer ${
                    flashcards[currentCardIndex]?.mastered
                      ? "bg-[#DEE5DC] text-[#3D5A3A] border border-[#8BA888]"
                      : "bg-[#F1EDE4] text-[#4A443F] hover:bg-[#E8E2D9]"
                  }`}
                >
                  {flashcards[currentCardIndex]?.mastered ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  {flashcards[currentCardIndex]?.mastered ? "Mastered!" : "Mark Mastered"}
                </button>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-5">
              <button
                id="prev-flashcard-btn"
                disabled={currentCardIndex === 0}
                onClick={() => {
                  setCurrentCardIndex((p) => p - 1);
                  setIsFlipped(false);
                }}
                className="w-12 h-12 rounded-full border-2 border-[#E8E2D9] flex items-center justify-center text-[#8C857E] hover:bg-white transition-colors disabled:opacity-40 cursor-pointer"
                title="Previous Card"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex gap-2">
                {flashcards.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentCardIndex(i);
                      setIsFlipped(false);
                    }}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentCardIndex ? "bg-[#8BA888]" : "bg-white border border-[#E8E2D9]"}`}
                  ></button>
                ))}
              </div>

              <button
                id="next-flashcard-btn"
                disabled={currentCardIndex === flashcards.length - 1}
                onClick={() => {
                  setCurrentCardIndex((p) => p + 1);
                  setIsFlipped(false);
                }}
                className="w-12 h-12 rounded-full border-2 border-[#E8E2D9] flex items-center justify-center text-[#8C857E] hover:bg-white transition-colors disabled:opacity-40 cursor-pointer"
                title="Next Card"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE QUIZ BOX */}
        {activeQuiz && (
          <div className="bg-white rounded-3xl border border-[#E8E2D9] p-6 shadow-sm" id="quiz-runner-container">
            <div className="flex justify-between items-center border-b border-[#E8E2D9] pb-3 mb-4">
              <div className="text-left">
                <span className="text-[10px] font-bold text-[#8BA888] uppercase tracking-widest block mb-0.5">ACTIVE QUIZ</span>
                <h3 className="text-base font-serif font-bold text-[#3D5A3A]">{activeQuiz.title}</h3>
              </div>
              {submittedQuiz && (
                <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${quizScore >= 75 ? "bg-[#DEE5DC] text-[#3D5A3A]" : "bg-[#F1EDE4] text-[#A67C52]"}`}>
                  Score: {quizScore}%
                </div>
              )}
            </div>

            <div className="space-y-6">
              {activeQuiz.questions.map((q, qIdx) => {
                const isSelected = selectedAnswers[q.id] !== undefined;
                return (
                  <div key={q.id} className="space-y-2 text-left">
                    <p className="text-sm font-semibold text-[#4A443F]">
                      {qIdx + 1}. {q.question}
                    </p>

                    <div className="grid grid-cols-1 gap-2">
                      {q.options.map((opt, optIdx) => {
                        const isCurrentSelected = selectedAnswers[q.id] === optIdx;
                        const isCorrect = optIdx === q.correctAnswerIndex;

                        let optionStyle = "border-[#E8E2D9] hover:border-[#8BA888]";
                        if (isCurrentSelected) optionStyle = "border-[#8BA888] bg-[#DEE5DC]/30 text-[#3D5A3A]";

                        if (submittedQuiz) {
                          if (isCorrect) {
                            optionStyle = "border-[#8BA888] bg-[#DEE5DC] text-[#3D5A3A] font-medium";
                          } else if (isCurrentSelected) {
                            optionStyle = "border-[#D69E88] bg-red-50 text-red-900";
                          } else {
                            optionStyle = "border-[#E8E2D9]/40 bg-gray-50/50 opacity-60";
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            disabled={submittedQuiz}
                            onClick={() => handleSelectAnswer(q.id, optIdx)}
                            className={`w-full text-left text-xs p-3.5 border rounded-xl transition-all cursor-pointer flex justify-between items-center ${optionStyle}`}
                          >
                            <span>{opt}</span>
                            {submittedQuiz && isCorrect && <CheckCircle2 className="w-4 h-4 text-[#5D805A]" />}
                          </button>
                        );
                      })}
                    </div>

                    {submittedQuiz && (
                      <div className="p-3.5 bg-[#F1EDE4] rounded-xl text-xs text-[#5D5750] leading-relaxed italic border-l-4 border-[#8BA888]">
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-[#E8E2D9] flex gap-3">
              {!submittedQuiz ? (
                <button
                  id="submit-quiz-btn"
                  onClick={handleSubmitQuiz}
                  disabled={Object.keys(selectedAnswers).length < activeQuiz.questions.length}
                  className="w-full flex items-center justify-center gap-2 bg-[#8BA888] hover:bg-[#7A9777] text-white text-xs font-bold uppercase tracking-wider py-3.5 rounded-xl disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Submit Quiz Answers
                </button>
              ) : (
                <button
                  id="reset-quiz-btn"
                  onClick={() => {
                    setSelectedAnswers({});
                    setSubmittedQuiz(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#F1EDE4] hover:bg-[#E8E2D9] text-[#4A443F] text-xs font-bold uppercase tracking-wider py-3.5 rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Quiz Again
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Chat History with AI Companion (5 cols) */}
      <div className="lg:col-span-5 flex flex-col h-[600px] bg-white rounded-3xl border border-[#E8E2D9] shadow-sm">
        {/* Chat Header */}
        <div className="p-4 border-b border-[#E8E2D9] bg-[#F1EDE4]/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="flex h-3 w-3 absolute -top-0.5 -right-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8BA888] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#5D805A]"></span>
              </span>
              <div className="w-9 h-9 rounded-full bg-[#3D5A3A] text-white flex items-center justify-center font-bold text-sm">
                A
              </div>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-[#3D5A3A]">Aura AI Study Buddy</h3>
              <span className="text-[10px] text-[#5D805A] font-bold flex items-center gap-1">
                ● Connected & Active
              </span>
            </div>
          </div>
          <span className="text-[10px] bg-[#DEE5DC] text-[#3D5A3A] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Study Companion
          </span>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans no-scrollbar bg-[#F9F7F2]/20" id="ai-chat-messages-box">
          {chatHistory.map((msg) => {
            const isAI = msg.sender === "ai";
            return (
              <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isAI ? "mr-auto text-left" : "ml-auto flex-row-reverse text-right"}`}>
                {isAI && (
                  <div className="w-7 h-7 shrink-0 rounded-full bg-[#DEE5DC] text-[#3D5A3A] flex items-center justify-center font-bold text-xs select-none">
                    Au
                  </div>
                )}
                <div>
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${isAI ? "bg-[#F1EDE4] text-[#4A443F] rounded-tl-none" : "bg-[#8BA888] text-white rounded-tr-none font-medium"}`}>
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block px-1">{msg.timestamp}</span>
                </div>
              </div>
            );
          })}
          {isChatLoading && (
            <div className="flex gap-3 mr-auto items-center">
              <div className="w-7 h-7 shrink-0 rounded-full bg-[#DEE5DC] text-[#3D5A3A] flex items-center justify-center font-bold text-xs">
                Au
              </div>
              <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-[#F1EDE4] text-gray-500 text-xs rounded-tl-none">
                <span className="font-sans">Aura is brainstorming</span>
                <span className="flex gap-0.5 items-center justify-center">
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-300"></span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-[#E8E2D9] bg-white rounded-b-3xl" id="ai-chat-input-form">
          <div className="relative flex items-center">
            <input
              id="ai-chat-input"
              type="text"
              placeholder="Ask Aura a study question or seek study motivation..."
              className="w-full text-xs pl-3.5 pr-11 py-3 border border-[#E8E2D9] rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#8BA888] focus:border-[#8BA888] bg-[#F9F7F2]/30"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isChatLoading}
            />
            <button
              id="send-ai-chat-btn"
              type="submit"
              disabled={!chatInput.trim() || isChatLoading}
              className="absolute right-2 p-2 bg-[#8BA888] hover:bg-[#7A9777] disabled:bg-gray-200 text-white rounded-lg transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
