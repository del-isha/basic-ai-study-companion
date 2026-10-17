<div align="center">
  <img width="1200" height="475" alt="AI Study Companion Banner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />

  # 📚 AI Study Companion & Virtual Study Groups

  **An intelligent study platform featuring AI-generated flashcards, interactive quizzes, collaborative virtual study rooms, real-time whiteboards, ambient focus timers, and progress tracking.**

  [![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
  [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
  [![Google GenAI](https://img.shields.io/badge/Google%20GenAI-Gemini%20API-4285f4?logo=google&logoColor=white)](https://ai.google.dev/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

---

## 🌟 Key Features

- **🧠 AI-Powered Companion**:
  - Automatically generate personalized flashcards and multiple-choice quizzes on any topic using Google's Gemini API (`@google/genai`).
  - **Offline Question Bank**: Built-in comprehensive CBSE Class 10–12 question banks (Physics, Chemistry, Biology, Mathematics, Computer Science, English) ensuring uninterrupted learning even without an active API key or internet access.
  - In-memory response caching (30-minute TTL) and API rate limiting to prevent quota exhaustion.

- **👥 Virtual Study Rooms**:
  - Create and join topic-specific study rooms.
  - Interactive collaborative whiteboard with freehand drawing, shapes, and color picking.
  - Integrated live room chat and participant presence indicators.

- **⏱️ Ambient Motivation & Focus**:
  - Built-in Pomodoro focus timer with customizable study/break intervals.
  - Soothing ambient background soundscapes (Lo-Fi, Coffee Shop, Rain, White Noise).
  - Motivational quote generator and daily encouragement nudges.

- **📊 Progress & Mastery Dashboard**:
  - Visual analytics tracking study streaks, flashcard mastery rates, and quiz accuracy.
  - Interactive charts powered by Recharts detailing subject performance breakdowns.

---

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Motion (Framer Motion)](https://motion.dev/), [Lucide React](https://lucide.dev/), [Recharts](https://recharts.org/)
- **Backend**: [Node.js](https://nodejs.org/), [Express](https://expressjs.com/), [tsx](https://github.com/privatenumber/tsx), [esbuild](https://esbuild.github.io/)
- **AI Integration**: [Google GenAI SDK](https://www.npmjs.com/package/@google/genai) (`@google/genai`)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (bundled with Node.js)
- *(Optional)* [Google Gemini API Key](https://aistudio.google.com/app/apikey) for custom AI generation

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/del-isha/basic-ai-study-companion.git
   cd basic-ai-study-companion
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and add your Gemini API key:
   ```env
   GEMINI_API_KEY="your-gemini-api-key-here"
   ```
   *(Note: The application functions in offline mode using the built-in CBSE question bank if no API key is provided.)*

4. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Express server with Vite in development mode |
| `npm run build` | Builds the client bundle and bundles the server using esbuild |
| `npm start` | Runs the production-built application (`dist/server.cjs`) |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run clean` | Cleans up the `dist/` build directory |

---

## 📁 Project Structure

```
basic-ai-study-companion/
├── assets/             # Static assets
├── src/
│   ├── components/     # UI Components
│   │   ├── AICompanion.tsx       # AI flashcard & quiz generator
│   │   ├── AmbientMotivation.tsx # Focus timer & soundscapes
│   │   ├── ProgressDashboard.tsx # Analytics & charts
│   │   └── StudyGroups.tsx       # Collaborative study rooms & whiteboard
│   ├── App.tsx         # Main application layout & navigation
│   ├── index.css       # Tailwind & global stylesheet
│   ├── main.tsx        # React root entry point
│   └── types.ts        # Shared TypeScript data models
├── server.ts           # Express server & Gemini API integration
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
├── package.json        # Dependencies & scripts
└── .gitignore          # Git exclusion rules
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
