export interface Message {
  id: string;
  sender: "user" | "ai" | "peer";
  senderName: string;
  text: string;
  timestamp: string;
  avatarColor?: string;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  topic: string;
  mastered: boolean;
  difficulty: "easy" | "medium" | "hard";
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  topic: string;
  questions: QuizQuestion[];
}

export interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  topic: string;
  activeMembersCount: number;
  members: { name: string; avatarColor: string; isOnline: boolean }[];
  chat: Message[];
  whiteboard: Stroke[];
  sharedNotes: string;
}

export interface StudyGoal {
  id: string;
  text: string;
  completed: boolean;
}

export interface WeeklyData {
  day: string;
  hours: number;
}

export interface SubjectStats {
  subject: string;
  hours: number;
  score: number;
}

export interface UserProgress {
  studyHours: number;
  cardsMastered: number;
  totalCards: number;
  quizScoreAverage: number;
  quizzesTaken: number;
  streakDays: number;
  dailyGoals: StudyGoal[];
  weeklyStudyData: WeeklyData[];
  subjectBreakdown: SubjectStats[];
}

export interface Reminder {
  id: string;
  text: string;
  type: "motivational" | "break" | "cheer";
  timestamp: string;
  read: boolean;
}
