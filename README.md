# NBA Era Translator & Dream Team Simulator

> Cross-era NBA player analytics, mathematical era normalization, and a constraint-based Dream Team season simulator.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-nba--era.vercel.app-0070F3?style=for-the-badge&logo=vercel&logoColor=white)](https://nba-era.vercel.app)
[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**🌐 Live Application:** [https://nba-era.vercel.app](https://nba-era.vercel.app)

---

## 🏀 Why NBA Era?

Directly comparing NBA statistics across different decades is inherently misleading:
- **Pace Variance**: The 1960s averaged over 115 possessions per 48 minutes, while the late 1990s slugged along at under 89.
- **Shot Selection & Spacing**: Pre-1979 basketball had no three-point line, whereas modern offenses attempt over 35 three-pointers per game.
- **Rule Changes**: Defensive illegal defense rules, the 2004 hand-checking ban, and shifting free-throw rates fundamentally alter raw box-score metrics.

**NBA Era** translates historical statistics into comparable baselines using mathematical normalizations, giving fans and analysts an objective lens for cross-generation debates.

---

## ✨ Key Features

### 1. Cross-Era Comparison Suite
- **Multi-Player Head-to-Head**: Compare up to 4 players simultaneously across single seasons or full career averages.
- **Statistical Normalization Modes**:
  - **Raw Per-Game**: Unadjusted historical box-score averages.
  - **Pace-Adjusted (Per 75 Possessions)**: Standardized to 75 team possessions (the typical workload of a modern star over 36 minutes).
  - **Modernized Projections**: Projects volume and scoring efficiency onto a target decade baseline (e.g., 2020s) using Relative True Shooting (rTS%) and era-relative shot distribution.
- **Era Modifiers**: Toggle historical conditions like the **Hand-Checking Penalty** to simulate defensive rule shifts.
- **Visual Analytics**: Interactive radar charts, scoring distribution spreads, and season-by-season performance trajectories.

### 2. Dream Team Builder & Season Simulator
- **Decade-Locked Draft**: Build an ultimate 5-man lineup where **every roster slot must represent a distinct decade** (1950s through 2020s).
- **Decade Slot Machine**: Roll random decade assignments for each slot with rapid cycling animations.
- **Instant Roster Search**: Autocomplete filter across hundreds of historical players with star indicators and career stats preview.
- **Scouting & Chemistry Engine**: Evaluates lineup balance, playmaking threshold ($APG \ge 7.5$), rim protection ($BPG \ge 2.0$), perimeter spacing ($3PA \ge 15.0$), and applies a **Ball Dominance Tax** for lineups with 4+ high-volume isolation scorers.
- **Viral 82-Game Simulation**: Simulates the full regular season with animated possession resolution and reveals your team's predicted win-loss record.

### 3. Automated Data Pipeline
- Lightweight Python ETL pipeline (`data-pipeline/`) that processes historical NBA datasets, calculates season-by-season league pace and efficiency baselines, and generates chunked, compressed JSON assets for instant client-side loading.

---

## 📐 Mathematical Methodology

### 1. Pace Normalization (Per 75 Possessions)
$$\text{Stat}_{\text{per75}} = \text{Stat}_{\text{raw}} \times \frac{3600}{\text{Pace}_{\text{era}} \times \text{Minutes}}$$

### 2. Efficiency Translation (Relative True Shooting - rTS%)
$$\text{TS}\% = \frac{\text{PTS}}{2 \times (\text{FGA} + 0.44 \times \text{FTA})}$$
$$\text{rTS}\% = \text{TS}\% - \text{LeagueTS}\%_{\text{era}}$$
$$\text{Projected TS}\% = \text{LeagueTS}\%_{\text{target}} + \text{rTS}\%$$

### 3. Projected Modern Scoring Volume
$$\text{Projected PTS}_{\text{per75}} = \text{Projected TS}\% \times 2 \times (\text{FGA}_{\text{per75}} + 0.44 \times \text{FTA}_{\text{per75}})$$

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tooling** | [Vite 6](https://vitejs.dev/) |
| **Styling** | Custom Vanilla CSS (Design Tokens, Glassmorphism, CSS Grid/Flexbox) |
| **Visualizations** | [Recharts](https://recharts.org/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Unit & Component Testing** | [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/) + JSDOM |
| **Code Quality** | [Oxlint](https://oxc.rs/) + [Commitlint](https://commitlint.js.org/) + [Husky](https://typicode.github.io/husky/) |
| **Data Processing** | Python 3 (pandas, numpy) |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Python**: 3.11+ (only required if recompiling the raw dataset)

### 1. Clone & Install
```bash
git clone https://github.com/xiaojian1202/nba-era.git
cd nba-era
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Run Test Suite
```bash
npm run test
```

### 4. Build for Production
```bash
npm run build
npm run preview
```

---

## 📊 Rebuilding the Dataset (Optional)

The static data files in `public/data/` come pre-compiled. If you wish to update or recompute the player database:

```bash
# Setup Python virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r data-pipeline/requirements.txt

# Run the compilation script
python data-pipeline/compile_dataset.py
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).


