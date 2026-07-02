# NBA Era Stats Visualizer & Dream Team Builder

An interactive web application designed to compare NBA players across eras by translating historic performance data into modern (or vintage) baselines, and a **Dream Team Builder** that lets you draft cross-era rosters under strict decade constraints and evaluate their performance.

---

## 🏀 What is NBA Era?

Directly comparing player statistics from different decades is notoriously difficult due to changing paces, defensive rules, and the evolution of the three-point shot. A player averaging 25 PPG in the low-scoring, slow-paced 1990s is fundamentally different from a player doing so in the fast-paced, high-spacing 2020s.

**NBA Era** solves this by normalizing season-by-season statistics using two main engines:
1. **Pace Adjustment**: Scaling all volume statistics (points, rebounds, assists, etc.) to a standardized **Per 75 Possessions** metric based on that season's historical pace.
2. **Efficiency Adjustment (rTS%)**: Translating shooting efficiency using **Relative True Shooting (rTS%)**—calculating how much more/less efficient a player was compared to their own era's league average, then projecting that delta onto a target era's baseline.

---

## ✨ Core Features

### 1. Cross-Era Comparison Suite
* **Normalizer Modes**: Toggle between **Raw Per-Game**, **Pace-Adjusted (Per 75 Possessions)**, and **Modernized Projections** (scaling stats to a selected target decade baseline, like the 2020s).
* **Rule Modifiers**: Fine-tune adjustments with custom sliders or toggles, such as:
  * **Hand-Checking Penalty**: Simulates how a player's efficiency (TS%) would change when playing with or without physical perimeter defense.
  * **3-Point Volume Override**: Scales projected modern three-point attempt rates.
* **Interactive Visualization Suite**: Responsive charts showing scoring efficiency distributions, player attribute radars, and season-by-season comparison trends.

### 2. Dream Team Builder
* **Decade-Locked Draft Slots**: Assemble a 5-player lineup where **every player must represent a different decade** (1950s through 2020s).
* **Decade Roll Mechanic**: Roll a slot machine to assign a random decade to each slot, unlocking that era's player pool.
* **Smart Autocomplete Search**: Search and filter players who overlapped with the rolled decade, ordered by star power and total points.

### 3. Record Prediction & Synergy Engine
As you draft your lineup, a custom scouting algorithm predicts your team's **predicted 82-game record** and analyzes **lineup chemistry** based on:
* **Playmaking Synergy**: Checks for elite floor-generals (APG >= 7.5).
* **Spacing & Gravity**: Evaluates cumulative perimeter volume (3PA >= 15.0).
* **Interior Rim Protection**: Checks for paint anchors alterating shots (BPG >= 2.0).
* **Glass Control**: Evaluates rebounding presence (RPG >= 10.0).
* **Ball Dominance Penalty**: Applies a chemistry tax if you draft too many high-volume isolation scorers (4+ players with >= 22 PPG), simulating diminishing returns when there is "only one ball."

### 4. Automated Python Data Pipeline
* Located in `data-pipeline/`.
* Automatically aggregates historical NBA statistical datasets, computes season-by-season baselines (pace, league TS%, 3PA rates), compiles index lists, and exports modular, compressed JSON assets loaded on-demand by the React application.

---

## 🛠️ Tech Stack

* **Frontend Framework**: React 19 + TypeScript + Vite
* **Styling**: Vanilla CSS (Custom Design System, variables, responsive flex/grids)
* **Icons**: Lucide React
* **Charts**: Recharts
* **Data Pipeline**: Python 3 (pandas, numpy)
* **Testing**: Vitest + React Testing Library + JSDOM

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **Python 3.11+** (if compiling custom player datasets)

### Installation
1. Clone the repository and navigate to the directory:
   ```bash
   git clone https://github.com/your-username/nba-era.git
   cd nba-era
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```

### Compile Data (Optional)
If you want to re-compile or update the player statistical database:
1. Initialize the Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r data-pipeline/requirements.txt
   ```
2. Run the compiler:
   ```bash
   python data-pipeline/compile_dataset.py
   ```
This updates the static JSON assets under `public/data/`.

### Run Locally (Development Server)
Launch the local development server with Hot Module Replacement (HMR):
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing Harness

The project includes a comprehensive Vitest test suite checking stats math, caching hooks, and UI interaction states.

* **Run all tests (Single Pass)**:
  ```bash
  npm run test
  ```
* **Run tests in interactive watch mode**:
  ```bash
  npm run test:watch
  ```

---

## 📦 Production Build & Deployment

To compile the application into a highly optimized, static HTML/CSS/JS bundle (packaged under the `dist/` directory):

```bash
npm run build
```

### Static Hosting
Because the app compiles into fully static assets and queries pre-built JSON databases, it is ideal for zero-cost edge hosting:
* **Vercel / Netlify**: Simply link the repository, set the build command to `npm run build`, and the output directory to `dist`.
* **GitHub Pages**: Build the bundle and publish using standard actions.
