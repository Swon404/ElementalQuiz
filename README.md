# ⚛️ ElementalQuiz

A fun, interactive periodic table quiz game built for kids! Learn about all 118 elements through quizzes, fun facts, and exploration — guided by **Elementor**, your friendly atom mascot.

![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-6-blue) ![Vite](https://img.shields.io/badge/Vite-8-purple) ![PWA](https://img.shields.io/badge/PWA-Offline%20Ready-green)

## Features

### 🎮 Unified games

Choose **Solo**, **2 Players**, or **Player vs Bot**, then play the same seven-game catalogue:

- **Quiz Battle** — Element questions with Classic, Sprint, and Showdown variants
- **True or False Blitz** — Decide whether element statements are true before the timer expires
- **Element Match** — Timed Hunt and Time Trial boards; this is the preserved multiplayer-first matching game
- **Clue Duel** — Identify elements from progressively clearer clues
- **Symbol Pick** — Pick the correct chemical symbol from close look-alikes
- **Atomic Order** — Arrange elements using Easy, Medium, or Hard rules and 1×–4× tile sizes
- **Atom Quiz** — Questions about atomic structure, forces, radiation, and related science

Every compatible configuration has its own leaderboard category. Bots participate in sessions but are never added to human leaderboards.

### 🏆 Championship

- Choose an ordered combination of the same seven games
- Quick, Standard, and Epic lengths
- Solo, 2 Players, and Player vs Bot formats
- Solo Championships reuse the normal Solo games, update each game's leaderboard, and use equal-weight normalized scores
- Equal game weighting: 100 points for a win, 50 each for a draw, and 0 for a loss
- Individual game leaderboards update after each leg
- Exact game/rules combinations have separate Championship leaderboards

### 🔍 Explore and Create

- **Explore** — Browse the periodic table, open element details, study one element in Deep Dive, or learn about rare and radioactive Exotic Elements
- **Element Lab** — Invent custom elements and retain them in the player collection

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

## Content Safety Guidelines

This app is designed for kids, so fact and question wording should stay educational and age-appropriate.

- Keep safety and health information factual, calm, and non-graphic.
- Avoid death-centered, violent, or sensational phrasing in prompts, hints, and explanations.
- Prefer wording that teaches safe behavior (for example: testing, protection, careful handling).
- If a historical event is relevant, describe it briefly without graphic detail.
- Preserve scientific accuracy while using child-friendly language.

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
│   ├── gameResults.ts        # Generic game and Championship leaderboards
│   ├── scoring.ts            # EP, ranks & difficulty config
│   ├── sounds.ts             # SFX
│   ├── storage.ts            # Profile, progress & custom-element persistence
│   └── tts.ts                # Optional text-to-speech
├── games/              # Canonical catalogue and shared game engines
│   ├── catalog.ts
│   ├── atomicOrder.ts
│   ├── clueDuel.ts
│   ├── elementMatch.ts
│   ├── symbolPick.ts
│   └── trueFalse.ts
├── screens/
│   ├── HomeScreen.tsx
│   ├── IntroScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── GameHubScreen.tsx       # Shared game and player-format catalogue
│   ├── QuizScreen.tsx          # Quiz Battle content variants
│   ├── AtomQuizScreen.tsx
│   ├── ExoticQuizScreen.tsx
│   ├── SymbolPickScreen.tsx
│   ├── ElementOrderScreen.tsx  # Canonical Atomic Order Solo UI
│   ├── SoloClueDuelScreen.tsx
│   ├── SoloElementMatchScreen.tsx
│   ├── SoloTrueFalseScreen.tsx
│   ├── ElementLabScreen.tsx
│   ├── TwoPlayerScreen.tsx     # All 2-player modes + Championship
│   └── ExploreScreen.tsx
├── App.tsx
├── main.tsx
└── styles.css
```

## License

This project is for personal/educational use.
