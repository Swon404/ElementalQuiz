# ⚛️ ElementalQuiz

A fun, interactive periodic table quiz game built for kids! Learn about all 118 elements through quizzes, fun facts, and exploration — guided by **Elementor**, your friendly atom mascot.

![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-6-blue) ![Vite](https://img.shields.io/badge/Vite-8-purple) ![PWA](https://img.shields.io/badge/PWA-Offline%20Ready-green)

## Features

### 🎮 Quiz Modes
- **Quick Quiz** — Test your knowledge with randomised questions across all categories
- **Deep Dive** — Pick any of the 118 elements and get quizzed specifically on that element
- **2-Player** — Take turns on the same device and see who knows more elements
- **Explorer** — Browse the full interactive periodic table and tap any element for details

### 🧠 Question Variety
12 question categories with multiple generators each:
- Symbol & name recognition
- Atomic numbers & periodic table position
- Element classification & groups
- Discovery history (who, when, where)
- States of matter & radioactivity
- Compounds & isotopes
- Real-world uses & how elements are obtained
- **6 fun-fact question types** — including true/false, "I Spy" two-clue puzzles, and "Amazing fact!" challenges

### 🌟 Fun Facts
Every element has **10 curated fun facts** focused on:
- Everyday connections kids can relate to (smoke detectors, phone batteries, toothpaste)
- Mind-blowing comparisons and world records
- Strange and amazing science
- Real-world "wow" moments and history

### 🤖 Elementor Mascot
A kawaii-style atom character that guides you through the app:
- Big expressive eyes with sparkles and animations
- Rosy cheeks and cute little arms
- 6 expressions: greeting, thinking, correct, wrong, hint, celebrate
- Contextual messages and encouragement throughout

### 📊 Progress System
- **Element Points (EP)** earned from correct answers
- **Rank progression** from Atom Apprentice to Element Emperor
- **Element collection** — collect elements as you learn about them
- **Player profiles** with stats tracking via localStorage
- 3 difficulty levels: Easy, Medium, Hard

### 📱 PWA Support
- Install as an app on any device
- Works offline after first load
- Responsive design for mobile and desktop

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)

### Install & Run

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **React 19** — UI framework
- **TypeScript 6** — Type safety
- **Vite 8** — Build tool & dev server
- **vite-plugin-pwa** — Service worker & offline support
- **localStorage** — Player data persistence

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Elementor.tsx      # Mascot character (SVG)
│   ├── ElementInfo.tsx    # Element detail panel
│   ├── PeriodicTable.tsx  # Interactive periodic table
│   └── QuizCard.tsx       # Question display & answers
├── data/
│   └── elements.ts        # All 118 elements with facts
├── engine/
│   ├── questionGenerator.ts  # Question generation logic
│   ├── scoring.ts            # EP, ranks & difficulty config
│   └── storage.ts            # Profile & progress persistence
├── screens/
│   ├── HomeScreen.tsx
│   ├── IntroScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── QuizScreen.tsx
│   ├── TwoPlayerScreen.tsx
│   └── ExploreScreen.tsx
├── App.tsx
├── main.tsx
└── styles.css
```

## License

This project is for personal/educational use.
