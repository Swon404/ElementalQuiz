# ⚛️ ElementalQuiz

A fun, interactive periodic table quiz game built for kids! Learn about all 118 elements through quizzes, fun facts, and exploration — guided by **Elementor**, your friendly atom mascot.

![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-6-blue) ![Vite](https://img.shields.io/badge/Vite-8-purple) ![PWA](https://img.shields.io/badge/PWA-Offline%20Ready-green)

## Features

### 🎮 Single-Player Modes
- **Quick Quiz** — Randomised mixed-category questions
- **Deep Dive** — Pick any of the 118 elements and get quizzed specifically on that element
- **Atom Quiz** — Identify elements from a live atom model (protons/neutrons/electrons)
- **Exotic Quiz** — Hard-mode questions on rare and synthetic elements
- **Symbol Pick** — Pick the correct chemical symbol from look-alike distractors
- **Element Order** — Drag elements into atomic-number order against the clock
- **Memory Game** — Match element-name and symbol pairs (8/12/16 pairs)
- **Element Lab** — Invent your own custom element and add it to your collection
- **Explore** — Browse the full interactive periodic table and tap any element for details

### 👥 Two-Player Modes
Take turns on the same device with per-player names, avatars, and difficulty:
- **Quiz Battle** — Alternating questions, highest score wins
- **True/False Blitz** — Rapid-fire statement judging
- **Element Match** — Pairs memory game (8/12/16 pairs)
- **Clue Duel** — Turn-based elimination clues with ±1 scoring and opponent steal
- **Symbol Pick** — Pick the correct symbol from name-letter-fabricated look-alikes
- **Championship** — 5-game tournament across all of the above

### 🧠 Question Variety
12+ question categories with multiple generators each:
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
- **Rank progression** through Atom Explorer → Super Scientist → Element Emperor
- **Element collection** — collect elements as you learn about them
- **Player profiles** with stats tracking via localStorage
- **3 difficulty levels** — `Explorer` (36 most-famous elements, simpler questions, second chance), `Scientist` (86 elements), `Professor` (all 118)

### 📱 PWA Support
- Install as an app on any device
- Works offline after first load
- Responsive design for mobile and desktop
- Hardened mobile touch handling (no red tap-highlight, focus-visible-only outlines)

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
│   ├── AtomModel.tsx       # Animated atom (protons/neutrons/electrons)
│   ├── CollectionTable.tsx # Periodic table view of collected elements
│   ├── Elementor.tsx       # Mascot character (SVG)
│   ├── ElementInfo.tsx     # Element detail panel
│   ├── PeriodicTable.tsx   # Interactive periodic table
│   └── QuizCard.tsx        # Question display & answers
├── data/
│   ├── elements.ts         # All 118 elements with facts
│   └── comparisonData.ts   # Real-world size/mass comparisons
├── engine/
│   ├── questionGenerator.ts  # Question generation logic
│   ├── scoring.ts            # EP, ranks & difficulty config
│   ├── sounds.ts             # SFX
│   ├── storage.ts            # Profile, progress & custom-element persistence
│   └── tts.ts                # Optional text-to-speech
├── screens/
│   ├── HomeScreen.tsx
│   ├── IntroScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── QuizScreen.tsx          # Quick + Deep Dive
│   ├── AtomQuizScreen.tsx
│   ├── ExoticQuizScreen.tsx
│   ├── SymbolPickScreen.tsx
│   ├── ElementOrderScreen.tsx
│   ├── MemoryGameScreen.tsx
│   ├── ElementLabScreen.tsx
│   ├── TwoPlayerScreen.tsx     # All 2-player modes + Championship
│   └── ExploreScreen.tsx
├── App.tsx
├── main.tsx
└── styles.css
```

## License

This project is for personal/educational use.
