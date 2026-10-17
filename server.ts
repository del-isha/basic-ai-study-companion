import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { Message, StudyGroup, UserProgress, Flashcard, Quiz, Reminder, Stroke } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// ============================================================
// RATE LIMITING — Prevent API exhaustion
// ============================================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10; // max AI requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count++;
  return true;
}

// ============================================================
// RESPONSE CACHING — Avoid redundant API calls
// ============================================================
const flashcardCache = new Map<string, { data: Flashcard[]; timestamp: number }>();
const quizCache = new Map<string, { data: Quiz; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

function getCacheKey(topic: string, material: string): string {
  return `${topic.toLowerCase().trim()}::${material.toLowerCase().trim().substring(0, 100)}`;
}

// ============================================================
// RICH OFFLINE QUESTION BANKS — Class 10-12 CBSE
// ============================================================
const OFFLINE_FLASHCARDS: Record<string, Flashcard[]> = {
  physics: [
    { id: "off-phy-1", question: "State Newton's Second Law of Motion.", answer: "The rate of change of momentum of a body is directly proportional to the applied force and takes place in the direction of the force. F = ma.", topic: "Physics", mastered: false, difficulty: "easy" },
    { id: "off-phy-2", question: "What is Ohm's Law? Write its formula.", answer: "The current flowing through a conductor is directly proportional to the potential difference across it, provided temperature remains constant. V = IR.", topic: "Physics", mastered: false, difficulty: "easy" },
    { id: "off-phy-3", question: "Define electric power. What is its SI unit?", answer: "Electric power is the rate at which electrical energy is consumed. P = VI = I²R = V²/R. SI unit is Watt (W).", topic: "Physics", mastered: false, difficulty: "medium" },
    { id: "off-phy-4", question: "State the law of conservation of energy.", answer: "Energy can neither be created nor destroyed. It can only be transformed from one form to another. The total energy of an isolated system remains constant.", topic: "Physics", mastered: false, difficulty: "easy" },
    { id: "off-phy-5", question: "What is the difference between concave and convex lens?", answer: "A concave lens is thinner at the centre and diverges light rays. A convex lens is thicker at the centre and converges light rays to a focal point.", topic: "Physics", mastered: false, difficulty: "medium" },
  ],
  chemistry: [
    { id: "off-chem-1", question: "What is a chemical equation? Why should it be balanced?", answer: "A chemical equation represents a chemical reaction using symbols and formulae. It must be balanced to satisfy the Law of Conservation of Mass — atoms are neither created nor destroyed.", topic: "Chemistry", mastered: false, difficulty: "easy" },
    { id: "off-chem-2", question: "Define pH. What is the pH of pure water?", answer: "pH is the negative logarithm of hydrogen ion concentration: pH = -log[H⁺]. Pure water has a pH of 7 (neutral).", topic: "Chemistry", mastered: false, difficulty: "medium" },
    { id: "off-chem-3", question: "What are isotopes? Give an example.", answer: "Isotopes are atoms of the same element with the same atomic number but different mass numbers. Example: Carbon-12 (¹²C) and Carbon-14 (¹⁴C).", topic: "Chemistry", mastered: false, difficulty: "easy" },
    { id: "off-chem-4", question: "Explain the difference between ionic and covalent bonding.", answer: "Ionic bonding involves transfer of electrons between metals and non-metals (e.g., NaCl). Covalent bonding involves sharing of electrons between non-metals (e.g., H₂O).", topic: "Chemistry", mastered: false, difficulty: "medium" },
    { id: "off-chem-5", question: "What is the mole concept? What is Avogadro's number?", answer: "A mole is the amount of substance containing 6.022 × 10²³ particles (Avogadro's number). 1 mole of any substance has a mass equal to its molecular/atomic mass in grams.", topic: "Chemistry", mastered: false, difficulty: "hard" },
  ],
  biology: [
    { id: "off-bio-1", question: "What is photosynthesis? Write the balanced equation.", answer: "Photosynthesis is the process by which green plants convert CO₂ and H₂O into glucose and O₂ using sunlight. 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂.", topic: "Biology", mastered: false, difficulty: "easy" },
    { id: "off-bio-2", question: "What is the difference between mitosis and meiosis?", answer: "Mitosis produces 2 identical diploid cells (for growth/repair). Meiosis produces 4 genetically different haploid cells (for gamete formation). Meiosis involves crossing over.", topic: "Biology", mastered: false, difficulty: "medium" },
    { id: "off-bio-3", question: "Explain the structure and function of DNA.", answer: "DNA is a double helix made of nucleotides (sugar + phosphate + base). The 4 bases are A, T, G, C. A pairs with T, G pairs with C. DNA stores genetic information and controls protein synthesis.", topic: "Biology", mastered: false, difficulty: "medium" },
    { id: "off-bio-4", question: "What is the Krebs Cycle? Where does it occur?", answer: "The Krebs Cycle (Citric Acid Cycle) is a series of reactions in the mitochondrial matrix that oxidizes Acetyl-CoA to CO₂, producing 3 NADH, 1 FADH₂, and 1 GTP per turn.", topic: "Biology", mastered: false, difficulty: "hard" },
    { id: "off-bio-5", question: "What are the laws of Mendelian inheritance?", answer: "1. Law of Dominance — dominant allele masks recessive. 2. Law of Segregation — alleles separate during gamete formation. 3. Law of Independent Assortment — genes on different chromosomes assort independently.", topic: "Biology", mastered: false, difficulty: "medium" },
  ],
  mathematics: [
    { id: "off-math-1", question: "State the Quadratic Formula.", answer: "For ax² + bx + c = 0, the solutions are x = (-b ± √(b² - 4ac)) / 2a. The discriminant D = b² - 4ac determines the nature of roots.", topic: "Mathematics", mastered: false, difficulty: "easy" },
    { id: "off-math-2", question: "What is the Pythagorean Theorem?", answer: "In a right-angled triangle, the square of the hypotenuse equals the sum of squares of the other two sides: a² + b² = c².", topic: "Mathematics", mastered: false, difficulty: "easy" },
    { id: "off-math-3", question: "Define derivative. What does f'(x) represent?", answer: "The derivative f'(x) = lim(h→0) [f(x+h) - f(x)]/h. It represents the instantaneous rate of change of f(x), or the slope of the tangent line at point x.", topic: "Mathematics", mastered: false, difficulty: "medium" },
    { id: "off-math-4", question: "What is the formula for the sum of an Arithmetic Progression (AP)?", answer: "Sum of n terms: Sₙ = n/2 × [2a + (n-1)d] or Sₙ = n/2 × (a + l), where a = first term, d = common difference, l = last term.", topic: "Mathematics", mastered: false, difficulty: "medium" },
    { id: "off-math-5", question: "Write the trigonometric identity for sin²θ + cos²θ.", answer: "sin²θ + cos²θ = 1. Related identities: 1 + tan²θ = sec²θ and 1 + cot²θ = cosec²θ.", topic: "Mathematics", mastered: false, difficulty: "easy" },
  ],
  "computer science": [
    { id: "off-cs-1", question: "What is the difference between a compiler and an interpreter?", answer: "A compiler translates the entire source code into machine code at once before execution. An interpreter translates and executes code line by line. Python uses an interpreter; C uses a compiler.", topic: "Computer Science", mastered: false, difficulty: "easy" },
    { id: "off-cs-2", question: "What is a Python dictionary? How is it different from a list?", answer: "A dictionary stores key-value pairs (unordered, mutable). A list stores ordered, indexed elements. Dict uses {} with keys; list uses [] with indices. Dict lookup is O(1); list search is O(n).", topic: "Computer Science", mastered: false, difficulty: "medium" },
    { id: "off-cs-3", question: "Explain the concept of Object-Oriented Programming (OOP).", answer: "OOP organizes code around objects (instances of classes). Four pillars: Encapsulation (data hiding), Inheritance (code reuse), Polymorphism (many forms), and Abstraction (hiding complexity).", topic: "Computer Science", mastered: false, difficulty: "medium" },
    { id: "off-cs-4", question: "What is SQL? Name the basic SQL commands.", answer: "SQL (Structured Query Language) is used to manage relational databases. Basic commands: SELECT (query), INSERT (add), UPDATE (modify), DELETE (remove), CREATE TABLE, DROP TABLE.", topic: "Computer Science", mastered: false, difficulty: "easy" },
    { id: "off-cs-5", question: "What is the difference between stack and queue data structures?", answer: "Stack follows LIFO (Last In, First Out) — like a stack of plates. Queue follows FIFO (First In, First Out) — like a line. Stack operations: push/pop. Queue operations: enqueue/dequeue.", topic: "Computer Science", mastered: false, difficulty: "medium" },
  ],
  english: [
    { id: "off-eng-1", question: "What is the difference between Active and Passive Voice?", answer: "Active: Subject performs action (The cat chased the mouse). Passive: Subject receives action (The mouse was chased by the cat). Rule: Object becomes subject, verb changes to be + past participle.", topic: "English", mastered: false, difficulty: "easy" },
    { id: "off-eng-2", question: "Explain Direct and Indirect Speech with an example.", answer: "Direct: He said, 'I am happy.' Indirect: He said that he was happy. Changes: tense shifts back, pronouns change, 'said to' becomes 'told', time/place references change.", topic: "English", mastered: false, difficulty: "medium" },
    { id: "off-eng-3", question: "What are the types of clauses in English grammar?", answer: "Independent clause: can stand alone as a sentence. Dependent clause: cannot stand alone (Adverbial, Adjectival, Noun clause). Example: 'When it rains (dependent), I stay home (independent).'", topic: "English", mastered: false, difficulty: "medium" },
    { id: "off-eng-4", question: "Define a 'figure of speech'. Name 4 types with examples.", answer: "A figure of speech is a word/phrase used in a non-literal sense. Types: Simile (as brave as a lion), Metaphor (life is a journey), Personification (wind whispered), Hyperbole (I've told you a million times).", topic: "English", mastered: false, difficulty: "easy" },
    { id: "off-eng-5", question: "What is the structure of a formal letter?", answer: "1. Sender's address (top-right) 2. Date 3. Receiver's address (left) 4. Subject line 5. Salutation (Sir/Madam) 6. Body (3 paras: intro, details, conclusion) 7. Closing (Yours faithfully) 8. Name", topic: "English", mastered: false, difficulty: "easy" },
  ],
};

const OFFLINE_QUIZZES: Record<string, Quiz> = {
  physics: {
    id: "offq-phy", title: "Physics Quick Quiz — Class 10-12", topic: "Physics",
    questions: [
      { id: "oq-p1", question: "What is the SI unit of electric current?", options: ["Volt", "Ampere", "Ohm", "Watt"], correctAnswerIndex: 1, explanation: "Ampere (A) is the SI unit of electric current. Great recall!" },
      { id: "oq-p2", question: "A convex lens is also known as:", options: ["Diverging lens", "Converging lens", "Flat lens", "Cylindrical lens"], correctAnswerIndex: 1, explanation: "A convex lens converges parallel light rays to a focal point!" },
      { id: "oq-p3", question: "Which law states F = ma?", options: ["Newton's First Law", "Newton's Second Law", "Newton's Third Law", "Law of Gravitation"], correctAnswerIndex: 1, explanation: "Newton's Second Law of Motion states Force = mass × acceleration." },
      { id: "oq-p4", question: "The resistance of a conductor depends on:", options: ["Length only", "Area only", "Length, area, and material", "Temperature only"], correctAnswerIndex: 2, explanation: "R = ρL/A. Resistance depends on length, cross-sectional area, and resistivity." },
    ],
  },
  chemistry: {
    id: "offq-chem", title: "Chemistry Quick Quiz — Class 10-12", topic: "Chemistry",
    questions: [
      { id: "oq-c1", question: "What is the pH of a neutral solution?", options: ["0", "7", "14", "1"], correctAnswerIndex: 1, explanation: "Pure water has a pH of 7, which is neutral. Nice!" },
      { id: "oq-c2", question: "Which gas is evolved when zinc reacts with dilute HCl?", options: ["Oxygen", "Chlorine", "Hydrogen", "Nitrogen"], correctAnswerIndex: 2, explanation: "Zn + 2HCl → ZnCl₂ + H₂↑. Hydrogen gas is evolved. Excellent!" },
      { id: "oq-c3", question: "Na₂CO₃ is commonly known as:", options: ["Baking soda", "Washing soda", "Caustic soda", "Lime water"], correctAnswerIndex: 1, explanation: "Sodium carbonate (Na₂CO₃) is washing soda." },
      { id: "oq-c4", question: "Which of the following is an exothermic reaction?", options: ["Photosynthesis", "Electrolysis", "Combustion of methane", "Decomposition of CaCO₃"], correctAnswerIndex: 2, explanation: "Combustion releases heat energy (exothermic)." },
    ],
  },
  biology: {
    id: "offq-bio", title: "Biology Quick Quiz — Class 10-12", topic: "Biology",
    questions: [
      { id: "oq-b1", question: "Which organelle is called the 'powerhouse of the cell'?", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi body"], correctAnswerIndex: 2, explanation: "Mitochondria generate ATP through cellular respiration!" },
      { id: "oq-b2", question: "What is the basic unit of inheritance?", options: ["Chromosome", "Gene", "DNA", "RNA"], correctAnswerIndex: 1, explanation: "A gene is the functional unit of heredity." },
      { id: "oq-b3", question: "During photosynthesis, which gas is released?", options: ["Carbon dioxide", "Nitrogen", "Oxygen", "Hydrogen"], correctAnswerIndex: 2, explanation: "Oxygen is released as a byproduct of photosynthesis. Brilliant!" },
      { id: "oq-b4", question: "How many chambers does the human heart have?", options: ["2", "3", "4", "5"], correctAnswerIndex: 2, explanation: "The human heart has 4 chambers: 2 atria and 2 ventricles." },
    ],
  },
  mathematics: {
    id: "offq-math", title: "Mathematics Quick Quiz — Class 10-12", topic: "Mathematics",
    questions: [
      { id: "oq-m1", question: "If the discriminant (b²-4ac) is negative, the roots are:", options: ["Real and equal", "Real and distinct", "Not real (imaginary)", "Rational"], correctAnswerIndex: 2, explanation: "When D < 0, the quadratic has no real roots — they are imaginary." },
      { id: "oq-m2", question: "The sum of all angles in a triangle is:", options: ["90°", "180°", "270°", "360°"], correctAnswerIndex: 1, explanation: "The angle sum property: interior angles always sum to 180°." },
      { id: "oq-m3", question: "What is the derivative of sin(x)?", options: ["cos(x)", "-sin(x)", "-cos(x)", "tan(x)"], correctAnswerIndex: 0, explanation: "d/dx [sin(x)] = cos(x). A fundamental differentiation formula!" },
      { id: "oq-m4", question: "The common ratio in the GP: 2, 6, 18, 54 is:", options: ["2", "3", "4", "6"], correctAnswerIndex: 1, explanation: "Common ratio r = 6/2 = 3. Each term is multiplied by 3." },
    ],
  },
  "computer science": {
    id: "offq-cs", title: "Computer Science Quick Quiz — Class 11-12", topic: "Computer Science",
    questions: [
      { id: "oq-cs1", question: "Which of the following is a mutable data type in Python?", options: ["Tuple", "String", "List", "Integer"], correctAnswerIndex: 2, explanation: "Lists are mutable. Tuples, strings, and integers are immutable." },
      { id: "oq-cs2", question: "What does SQL stand for?", options: ["Simple Query Language", "Structured Query Language", "Standard Query Logic", "System Query Language"], correctAnswerIndex: 1, explanation: "SQL stands for Structured Query Language." },
      { id: "oq-cs3", question: "Which sorting algorithm has the best average time complexity?", options: ["Bubble Sort O(n²)", "Selection Sort O(n²)", "Merge Sort O(n log n)", "Insertion Sort O(n²)"], correctAnswerIndex: 2, explanation: "Merge Sort has O(n log n) average and worst-case complexity." },
      { id: "oq-cs4", question: "In Python, 'self' refers to:", options: ["The class itself", "The current instance of the class", "A global variable", "The parent class"], correctAnswerIndex: 1, explanation: "'self' refers to the current instance of the class." },
    ],
  },
};

function getOfflineFlashcards(topic: string): Flashcard[] {
  const key = topic.toLowerCase().trim();
  for (const [subject, cards] of Object.entries(OFFLINE_FLASHCARDS)) {
    if (key.includes(subject) || subject.includes(key)) {
      return cards.map((c, i) => ({ ...c, id: `${c.id}-${Date.now()}-${i}` }));
    }
  }
  const allCards = Object.values(OFFLINE_FLASHCARDS).flat();
  const shuffled = allCards.sort(() => Math.random() - 0.5).slice(0, 5);
  return shuffled.map((c, i) => ({ ...c, id: `${c.id}-${Date.now()}-${i}` }));
}

function getOfflineQuiz(topic: string): Quiz {
  const key = topic.toLowerCase().trim();
  for (const [subject, quiz] of Object.entries(OFFLINE_QUIZZES)) {
    if (key.includes(subject) || subject.includes(key)) {
      return { ...quiz, id: `${quiz.id}-${Date.now()}` };
    }
  }
  const quizzes = Object.values(OFFLINE_QUIZZES);
  const randomQuiz = quizzes[Math.floor(Math.random() * quizzes.length)];
  return { ...randomQuiz, id: `${randomQuiz.id}-${Date.now()}` };
}

// ============================================================
// In-Memory Database State — Class 10-12 Students
// ============================================================
let userProgress: UserProgress = {
  studyHours: 12.5,
  cardsMastered: 18,
  totalCards: 40,
  quizScoreAverage: 82,
  quizzesTaken: 4,
  streakDays: 5,
  dailyGoals: [
    { id: "g1", text: "Complete 1 practice quiz on Physics", completed: false },
    { id: "g2", text: "Revise Chemical Bonding notes for 20 mins", completed: true },
    { id: "g3", text: "Solve 10 Trigonometry problems", completed: false },
  ],
  weeklyStudyData: [
    { day: "Mon", hours: 1.5 },
    { day: "Tue", hours: 2.5 },
    { day: "Wed", hours: 3.0 },
    { day: "Thu", hours: 1.0 },
    { day: "Fri", hours: 2.0 },
    { day: "Sat", hours: 1.5 },
    { day: "Sun", hours: 1.0 },
  ],
  subjectBreakdown: [
    { subject: "Physics", hours: 4.5, score: 85 },
    { subject: "Chemistry", hours: 3.5, score: 78 },
    { subject: "Mathematics", hours: 2.5, score: 92 },
    { subject: "Biology", hours: 2.0, score: 73 },
  ],
};

let studyGroups: StudyGroup[] = [
  {
    id: "group-math",
    name: "Board Exam Maths Prep",
    description: "Focusing on Trigonometry, Coordinate Geometry, AP/GP, and Calculus basics for Class 10-12 boards.",
    topic: "Mathematics",
    activeMembersCount: 4,
    members: [
      { name: "Priya", avatarColor: "bg-pink-500", isOnline: true },
      { name: "Rahul", avatarColor: "bg-indigo-500", isOnline: true },
      { name: "Sneha", avatarColor: "bg-emerald-500", isOnline: true },
      { name: "You", avatarColor: "bg-primary-500", isOnline: true },
    ],
    chat: [
      { id: "c1", sender: "peer", senderName: "Priya", text: "Hey everyone! Anyone solved the Trigonometry problems from Chapter 8 yet?", timestamp: "09:30 AM", avatarColor: "bg-pink-500" },
      { id: "c2", sender: "peer", senderName: "Rahul", text: "I'm working on AP/GP problems now. The nth term formula keeps confusing me!", timestamp: "09:31 AM", avatarColor: "bg-indigo-500" },
      { id: "c3", sender: "peer", senderName: "Sneha", text: "Rahul, I wrote step-by-step notes for AP formulas in the shared notes tab. Check them out!", timestamp: "09:32 AM", avatarColor: "bg-emerald-500" },
    ],
    whiteboard: [{ id: "s1", points: [{ x: 50, y: 100 }, { x: 70, y: 80 }, { x: 90, y: 120 }], color: "#6366f1", width: 3 }],
    sharedNotes: "## Board Exam Maths Study Goals\n- Master Trigonometric identities: sin²θ + cos²θ = 1\n- Solve 10 AP/GP problems daily\n- Practice Coordinate Geometry: Distance, Section, Midpoint formulas\n\n### Key Formulas:\n- Quadratic: x = (-b ± √D) / 2a\n- AP Sum: Sₙ = n/2 [2a + (n-1)d]",
  },
  {
    id: "group-bio",
    name: "NEET Biology Prep",
    description: "Collaborative study for Biology — Cell Biology, Genetics, Human Physiology, and Ecology for boards & NEET.",
    topic: "Biology",
    activeMembersCount: 3,
    members: [
      { name: "Ananya", avatarColor: "bg-cyan-500", isOnline: true },
      { name: "Arjun", avatarColor: "bg-rose-500", isOnline: true },
      { name: "Kavya", avatarColor: "bg-amber-500", isOnline: false },
      { name: "You", avatarColor: "bg-primary-500", isOnline: true },
    ],
    chat: [
      { id: "b1", sender: "peer", senderName: "Ananya", text: "Let's revise the Krebs Cycle and Glycolysis pathway today! Board exam is in 2 months!", timestamp: "09:20 AM", avatarColor: "bg-cyan-500" },
      { id: "b2", sender: "peer", senderName: "Arjun", text: "Ready! I just finished drawing the cell organelle diagram with labels. Sharing on the whiteboard.", timestamp: "09:22 AM", avatarColor: "bg-rose-500" },
    ],
    whiteboard: [],
    sharedNotes: "## Biology Study Notes\n### Krebs Cycle (Citric Acid Cycle)\n1. Acetyl-CoA + Oxaloacetate → Citrate\n2. Per turn: 3 NADH, 1 FADH₂, 1 GTP\n\n### Mendel's Laws\n- Law of Dominance\n- Law of Segregation\n- Law of Independent Assortment",
  },
  {
    id: "group-phy",
    name: "JEE Physics Problem Solving",
    description: "Solving numericals on Mechanics, Electrostatics, Optics, and Modern Physics for JEE & board exams.",
    topic: "Physics",
    activeMembersCount: 2,
    members: [
      { name: "Aditya", avatarColor: "bg-purple-500", isOnline: true },
      { name: "Meera", avatarColor: "bg-teal-500", isOnline: true },
      { name: "You", avatarColor: "bg-primary-500", isOnline: true },
    ],
    chat: [
      { id: "cs1", sender: "peer", senderName: "Aditya", text: "Let's solve 5 Electrostatics numericals from the Coulomb's Law chapter today.", timestamp: "09:05 AM", avatarColor: "bg-purple-500" },
      { id: "cs2", sender: "peer", senderName: "Meera", text: "Sure! I also want to revise Ray Optics — mirror and lens formulas.", timestamp: "09:08 AM", avatarColor: "bg-teal-500" },
    ],
    whiteboard: [],
    sharedNotes: "## Physics Formula Sheet\n- Newton's 2nd Law: F = ma\n- Coulomb's Law: F = kq₁q₂/r²\n- Ohm's Law: V = IR\n- Mirror Formula: 1/f = 1/v + 1/u\n- Lens Formula: 1/f = 1/v - 1/u",
  },
];

let reminders: Reminder[] = [
  { id: "r1", text: "🌟 Priya from 'Board Exam Maths Prep' just completed her 1-hour Trigonometry session! Keep up the momentum.", type: "cheer", timestamp: "Just now", read: false },
  { id: "r2", text: "💧 Time for a short break! Stand up, stretch, and hydrate. Aura suggests a 5-minute breather before the next chapter.", type: "break", timestamp: "20 mins ago", read: false },
  { id: "r3", text: "🔥 Incredible! You are on a 5-day study streak. Board exams are getting closer — keep that momentum going!", type: "motivational", timestamp: "1 hour ago", read: true },
];

// Lazy Initialization of Gemini SDK Client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.log("⚠️ No Gemini API key configured. Running in offline mode with built-in question banks.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
  }
  return aiClient;
}

// Simulated peer responses for Class 10-12
const SIMULATED_PEER_RESPONSES: Record<string, { name: string; avatarColor: string; texts: string[] }[]> = {
  "group-math": [
    { name: "Priya", avatarColor: "bg-pink-500", texts: ["Just solved 15 Trigonometry problems in 30 minutes! Feeling confident.", "Aura's explanation of the Quadratic Formula was super helpful!", "Let's do a 25-minute Pomodoro block on Coordinate Geometry. Who's in?", "Practice is the key to board exam maths. We've got this!"] },
    { name: "Rahul", avatarColor: "bg-indigo-500", texts: ["Can someone help with the Section Formula problem from Exercise 7.2?", "Just checked our group stats — 8 hours combined study this week! 💪", "AP/GP chapter is finally making sense after using Aura's flashcards."] },
    { name: "Sneha", avatarColor: "bg-emerald-500", texts: ["Updated shared notes with all important formulas for Chapter 3.", "We'll crack these board exams together. Stay focused!", "Let's schedule a group quiz for tonight on Algebra."] },
  ],
  "group-bio": [
    { name: "Ananya", avatarColor: "bg-cyan-500", texts: ["Made flashcards on DNA Replication — the semi-conservative model is elegant!", "Did everyone revise Glycolysis steps? Board exam favorite topic!", "Studying biology with friends makes NEET prep so much easier."] },
    { name: "Arjun", avatarColor: "bg-rose-500", texts: ["Starting a Biology quiz on Human Physiology in 10 minutes!", "Let's focus on Ecology and Ecosystem chapter next.", "Our flashcard mastery is going up. We're at 75% now!"] },
  ],
  "group-phy": [
    { name: "Aditya", avatarColor: "bg-purple-500", texts: ["Drew the ray diagram for convex lens on the whiteboard!", "Electrostatics numericals are tough but we'll crack them together.", "Let's draw free body diagrams for mechanics problems."] },
    { name: "Meera", avatarColor: "bg-teal-500", texts: ["Writing the lens formula derivation in shared notes.", "Aura's explanation of electromagnetic induction was crystal clear!", "Completed 30 minutes of Physics problem solving! Taking a break."] },
  ],
};

// Periodic simulated notifications
setInterval(() => {
  const groupsWithPeers = Object.keys(SIMULATED_PEER_RESPONSES);
  const randomGroupId = groupsWithPeers[Math.floor(Math.random() * groupsWithPeers.length)];
  const group = studyGroups.find((g) => g.id === randomGroupId);
  if (group) {
    const pool = SIMULATED_PEER_RESPONSES[randomGroupId];
    const peer = pool[Math.floor(Math.random() * pool.length)];
    const text = peer.texts[Math.floor(Math.random() * peer.texts.length)];
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newMsg: Message = { id: `sim-${Date.now()}`, sender: "peer", senderName: peer.name, text, timestamp: timeStr, avatarColor: peer.avatarColor };
    group.chat.push(newMsg);
    if (group.chat.length > 50) group.chat.shift();
    const notificationTypes: ("motivational" | "break" | "cheer")[] = ["motivational", "cheer"];
    const randomType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
    const notificationsPool = [
      `💬 ${peer.name} posted in '${group.name}': "${text.substring(0, 50)}..."`,
      `💪 Study buddy ${peer.name} is co-working in '${group.name}'! Join them.`,
      `📈 Group '${group.name}' is heating up! Notes updated by ${peer.name}.`,
    ];
    reminders.unshift({ id: `rem-${Date.now()}`, text: notificationsPool[Math.floor(Math.random() * notificationsPool.length)], type: randomType, timestamp: "Just now", read: false });
    if (reminders.length > 20) reminders.pop();
  }
}, 45000);

// ============================================================
// Express API Routes
// ============================================================

app.get("/api/progress", (req, res) => { res.json(userProgress); });
app.put("/api/progress", (req, res) => { userProgress = { ...userProgress, ...req.body }; res.json(userProgress); });

app.get("/api/groups", (req, res) => { res.json(studyGroups); });
app.get("/api/groups/:id", (req, res) => {
  const group = studyGroups.find((g) => g.id === req.params.id);
  if (!group) return res.status(404).json({ error: "Group not found" });
  res.json(group);
});

app.post("/api/groups", (req, res) => {
  const { name, description, topic } = req.body;
  if (!name || !topic) return res.status(400).json({ error: "Name and topic are required" });
  const newGroup: StudyGroup = {
    id: `group-${Date.now()}`, name, description: description || "No description provided.", topic, activeMembersCount: 1,
    members: [
      { name: "You", avatarColor: "bg-primary-500", isOnline: true },
      { name: "Riya", avatarColor: "bg-orange-500", isOnline: true },
      { name: "Vikram", avatarColor: "bg-violet-500", isOnline: false },
    ],
    chat: [{ id: "msg-welcome", sender: "peer", senderName: "Riya", text: `Welcome! I'm Riya, glad you started the '${name}' study room. Let's prepare for boards together!`, timestamp: "Just now", avatarColor: "bg-orange-500" }],
    whiteboard: [],
    sharedNotes: `## Welcome to ${name}!\n- Outline key concepts and formulas\n- Collaborate on revision notes\n- Generate quizzes using Aura AI\n- Stay focused — board exams are approaching!`,
  };
  studyGroups.push(newGroup);
  res.status(201).json(newGroup);
});

app.post("/api/groups/:id/chat", (req, res) => {
  const group = studyGroups.find((g) => g.id === req.params.id);
  if (!group) return res.status(404).json({ error: "Group not found" });
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Message text is required" });
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const newMsg: Message = { id: `msg-${Date.now()}`, sender: "user", senderName: "You", text, timestamp: timeStr, avatarColor: "bg-primary-500" };
  group.chat.push(newMsg);
  userProgress.studyHours = parseFloat((userProgress.studyHours + 0.1).toFixed(1));
  setTimeout(() => {
    const peerPool = group.members.filter((m) => m.name !== "You" && m.isOnline);
    if (peerPool.length > 0) {
      const activePeer = peerPool[Math.floor(Math.random() * peerPool.length)];
      const peerReplies = ["That's a really good point! Let's note it down for revision.", "Agree! Working on board exam prep together is so much faster.", "Nice work. Let's test our understanding with a quick quiz next.", "Great insight! Let's keep pushing — boards are coming up!", "I'm updating our shared notes with this. Super helpful!"];
      const replyMsg: Message = { id: `reply-${Date.now()}`, sender: "peer", senderName: activePeer.name, text: peerReplies[Math.floor(Math.random() * peerReplies.length)], timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), avatarColor: activePeer.avatarColor };
      group.chat.push(replyMsg);
    }
  }, 1500);
  res.json(group);
});

app.put("/api/groups/:id/notes", (req, res) => {
  const group = studyGroups.find((g) => g.id === req.params.id);
  if (!group) return res.status(404).json({ error: "Group not found" });
  group.sharedNotes = req.body.sharedNotes || "";
  res.json(group);
});

app.put("/api/groups/:id/whiteboard", (req, res) => {
  const group = studyGroups.find((g) => g.id === req.params.id);
  if (!group) return res.status(404).json({ error: "Group not found" });
  group.whiteboard = req.body.whiteboard || [];
  res.json(group);
});

app.get("/api/reminders", (req, res) => { res.json(reminders); });
app.post("/api/reminders/read", (req, res) => {
  const { id } = req.body;
  const reminder = reminders.find((r) => r.id === id);
  if (reminder) reminder.read = true;
  res.json(reminders);
});

app.post("/api/reminders/trigger", async (req, res) => {
  try {
    const { mood } = req.body;
    const clientId = req.ip || "default";
    const fallbacks: Record<string, string> = {
      lonely: "You're never alone! Your study buddies are right here in the virtual room. Let's keep going together! 🤝",
      tired: "Take a 5-minute break — drink water, stretch your back. You've earned it! Come back refreshed. 💧",
      stuck: "Break the problem into smaller steps. Try explaining it aloud or ask in your study group! 🧠",
      distracted: "Put your phone away for just 15 minutes. One Pomodoro block — you can do it! 📵",
    };

    if (!checkRateLimit(clientId)) {
      const text = fallbacks[mood] || "Stay strong! Every hour of study brings you closer to your goals. ✨";
      const newReminder: Reminder = { id: `rem-${Date.now()}`, text: `✨ Aura: ${text}`, type: "motivational", timestamp: "Just now", read: false };
      reminders.unshift(newReminder);
      return res.json(newReminder);
    }

    const ai = getAIClient();
    if (!ai) {
      const text = fallbacks[mood] || "You're doing amazing! Stay consistent, and success will follow. ✨";
      const newReminder: Reminder = { id: `rem-${Date.now()}`, text: `✨ Aura Companion: ${text}`, type: "motivational", timestamp: "Just now", read: false };
      reminders.unshift(newReminder);
      return res.json(newReminder);
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Draft a single-sentence highly motivating, empathetic notification from a study companion called Aura. The student is a Class 10-12 Indian student preparing for board exams (CBSE/ISC) and competitive exams (JEE/NEET). They feel "${mood || "lonely study fatigue"}" while studying. Give warm reinforcement, a study tip, and make them feel they're never alone. Maximum 20 words.`,
    });
    const reminderText = response.text?.trim() || "Stay positive! You are doing great work, and we are studying together!";
    const newReminder: Reminder = { id: `rem-${Date.now()}`, text: `✨ Aura Companion: ${reminderText}`, type: "motivational", timestamp: "Just now", read: false };
    reminders.unshift(newReminder);
    res.json(newReminder);
  } catch (error: any) {
    console.error("Error generating reminder:", error);
    const fallbackReminder: Reminder = { id: `rem-${Date.now()}`, text: "✨ Aura: You're doing great! Every chapter you complete brings you closer to your dream score. Keep going! 🌟", type: "motivational", timestamp: "Just now", read: false };
    reminders.unshift(fallbackReminder);
    res.json(fallbackReminder);
  }
});

app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });
    const clientId = req.ip || "default";
    const offlineFallbacks = [
      "That's an excellent question! For board exams, focus on understanding the concept rather than rote memorization. Try explaining it in your own words!",
      "Great thinking! I suggest making short revision notes for this topic. Writing things down helps with long-term retention.",
      "I'm right here studying with you! Try the Pomodoro technique — 25 minutes of focused study followed by a 5-minute break.",
      "Wonderful effort! Generate flashcards on this topic using the panel on the left — active recall is the best study technique for board exams.",
      "Keep going! Every CBSE topper says consistency beats intensity. Study for shorter focused sessions rather than long unfocused ones.",
    ];

    if (!checkRateLimit(clientId)) {
      return res.json({ text: offlineFallbacks[Math.floor(Math.random() * offlineFallbacks.length)] });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.json({ text: offlineFallbacks[Math.floor(Math.random() * offlineFallbacks.length)] });
    }

    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.slice(-10).forEach((msg: any) => {
        contents.push({ role: msg.sender === "user" ? "user" : "model", parts: [{ text: msg.text }] });
      });
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
      config: {
        systemInstruction: `You are Aura, an elite, motivating, empathetic AI Study Companion for Indian students in Class 10th-12th. They prepare for CBSE/ISC board exams and competitive exams like JEE and NEET. Keep replies conversational, supportive, concise (under 3 sentences). Provide study tips relevant to Indian board exam patterns, NCERT concepts, and exam strategies. Always encourage! Be their companion against study isolation and exam anxiety.`,
      },
    });
    const aiReply = response.text?.trim() || "I'm right here with you! Let's conquer this chapter step-by-step.";
    res.json({ text: aiReply });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    const fallbacks = ["Great question! Try breaking it down into smaller parts.", "I'm here with you! For board exams, focus on NCERT solutions first — they cover 90% of the paper.", "Keep going! Generate flashcards on this topic using the tools on the left."];
    res.json({ text: fallbacks[Math.floor(Math.random() * fallbacks.length)] });
  }
});

app.post("/api/gemini/generate-flashcards", async (req, res) => {
  try {
    const { topic, material } = req.body;
    if (!topic && !material) return res.status(400).json({ error: "Please specify a topic or paste study material" });
    const clientId = req.ip || "default";
    const cacheKey = getCacheKey(topic || "", material || "");

    const cached = flashcardCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      userProgress.totalCards += cached.data.length;
      return res.json({ flashcards: cached.data });
    }

    if (!checkRateLimit(clientId)) {
      const offlineCards = getOfflineFlashcards(topic || material || "");
      userProgress.totalCards += offlineCards.length;
      return res.json({ flashcards: offlineCards });
    }

    const ai = getAIClient();
    if (!ai) {
      const offlineCards = getOfflineFlashcards(topic || material || "");
      userProgress.totalCards += offlineCards.length;
      return res.json({ flashcards: offlineCards });
    }

    const prompt = `Generate exactly 5 study flashcards for "${topic || "Study material"}" for a Class 10-12 Indian student (CBSE/ISC boards, JEE/NEET).\nMaterial: "${material || "General NCERT-level concepts"}"\nEnsure questions test key concepts, formulas, definitions from NCERT. Keep answers clear and exam-focused.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT, required: ["flashcards"],
          properties: {
            flashcards: {
              type: Type.ARRAY, items: {
                type: Type.OBJECT, required: ["question", "answer", "topic", "difficulty"],
                properties: {
                  question: { type: Type.STRING }, answer: { type: Type.STRING },
                  topic: { type: Type.STRING }, difficulty: { type: Type.STRING, enum: ["easy", "medium", "hard"] },
                },
              },
            },
          },
        },
      },
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    if (!parsedData.flashcards || !Array.isArray(parsedData.flashcards)) throw new Error("Invalid response");

    const flashcards: Flashcard[] = parsedData.flashcards.map((card: any, idx: number) => ({
      id: `card-${Date.now()}-${idx}`, question: card.question, answer: card.answer,
      topic: card.topic || topic || "AI Generated", mastered: false, difficulty: card.difficulty || "medium",
    }));

    flashcardCache.set(cacheKey, { data: flashcards, timestamp: Date.now() });
    userProgress.totalCards += flashcards.length;
    res.json({ flashcards });
  } catch (error: any) {
    console.error("Flashcards Error:", error);
    const offlineCards = getOfflineFlashcards(req.body.topic || req.body.material || "");
    userProgress.totalCards += offlineCards.length;
    res.json({ flashcards: offlineCards });
  }
});

app.post("/api/gemini/generate-quiz", async (req, res) => {
  try {
    const { topic, material } = req.body;
    if (!topic && !material) return res.status(400).json({ error: "Please specify a topic or paste study material" });
    const clientId = req.ip || "default";
    const cacheKey = getCacheKey(topic || "", material || "");

    const cached = quizCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return res.json({ quiz: cached.data });

    if (!checkRateLimit(clientId)) return res.json({ quiz: getOfflineQuiz(topic || material || "") });

    const ai = getAIClient();
    if (!ai) return res.json({ quiz: getOfflineQuiz(topic || material || "") });

    const prompt = `Generate a quiz with exactly 4 MCQs for "${topic || "Study material"}" for a Class 10-12 Indian student (CBSE/ISC boards, JEE/NEET).\nMaterial: "${material || "NCERT-level concepts"}"\nEach question: 4 options, one correct. Provide encouraging explanations.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT, required: ["title", "questions"],
          properties: {
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY, items: {
                type: Type.OBJECT, required: ["question", "options", "correctAnswerIndex", "explanation"],
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswerIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    if (!parsedData.questions || !Array.isArray(parsedData.questions)) throw new Error("Invalid response");

    const quiz: Quiz = {
      id: `quiz-${Date.now()}`, title: parsedData.title || `Quiz on ${topic || "Study Materials"}`, topic: topic || "AI Study Material",
      questions: parsedData.questions.map((q: any, idx: number) => ({
        id: `q-${Date.now()}-${idx}`, question: q.question, options: q.options || [],
        correctAnswerIndex: typeof q.correctAnswerIndex === "number" ? q.correctAnswerIndex : 0, explanation: q.explanation || "Correct!",
      })),
    };

    quizCache.set(cacheKey, { data: quiz, timestamp: Date.now() });
    res.json({ quiz });
  } catch (error: any) {
    console.error("Quiz Error:", error);
    res.json({ quiz: getOfflineQuiz(req.body.topic || req.body.material || "") });
  }
});

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => { res.sendFile(path.join(distPath, "index.html")); });
  }

  const hasKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
  const apiKeyStatus = hasKey ? "✅ Gemini API key configured" : "⚠️ No API key — running with built-in question banks (fully functional!)";

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🎓 AI Study Companion for Class 10-12 — running on http://0.0.0.0:${PORT}`);
    console.log(`${apiKeyStatus}`);
    console.log(`📚 Offline question banks: Physics, Chemistry, Biology, Mathematics, Computer Science, English`);
    console.log(`🛡️ Rate limiting: ${RATE_LIMIT_MAX} AI requests per minute`);
    console.log(`📦 Response caching: ${CACHE_TTL_MS / 60000} minute TTL\n`);
  });
}

start();
