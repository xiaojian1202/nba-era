import React, { useState, useMemo } from 'react';
import { usePlayerData } from './hooks/usePlayerData';
import { StatControl } from './components/StatControl';
import type { AdjustmentMode } from './components/StatControl';
import { ModifiersPanel } from './components/ModifiersPanel';
import { PlayerCard } from './components/PlayerCard';
import { VisualizationSuite } from './components/VisualizationSuite';
import { adjustPlayerStats } from './utils/statsCalculations';
import type { AdjustedStats, LeagueBaseline } from './utils/statsCalculations';
import { ArrowRightLeft, Crown, MessageSquare, Sun, Moon } from 'lucide-react';
import { BasketballOutlined, BasketballFlat, BasketballGradient } from './components/BasketballIcons';
import { DreamTeamSuite } from './components/DreamTeamSuite';
import { FeedbackModal } from './components/FeedbackModal';

interface PlayerConfig {
  slotId: number;
  playerId: number | null;
  season: string | null;
}

interface DreamTeamSlot {
  slotId: number;
  rolledDecade: string | null;
  playerId: number | null;
}

export const App: React.FC = () => {
  const {
    playerIndex,
    leagueBaselines,
    loadedPlayers,
    loading,
    error,
    loadPlayer
  } = usePlayerData();

  // Mode state: raw, per75, modernized
  const [adjustmentMode, setAdjustmentMode] = useState<AdjustmentMode>('modernized');

  // Target decade baseline to adjust stats to. Defaults to "2020s"
  const [targetBaseline, setTargetBaseline] = useState<string>('2020s');

  // View state: 'comparison' or 'dream-team'
  const [activeView, setActiveView] = useState<'comparison' | 'dream-team'>('comparison');

  // Feedback modal open state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);

  // Theme state: 'light' (Hardwood Classic) or 'dark' (Courtside Dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  // Sync theme with HTML data-theme attribute
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Dream Team builder slots state
  const [dreamSlots, setDreamSlots] = useState<DreamTeamSlot[]>([
    { slotId: 1, rolledDecade: null, playerId: null },
    { slotId: 2, rolledDecade: null, playerId: null },
    { slotId: 3, rolledDecade: null, playerId: null },
    { slotId: 4, rolledDecade: null, playerId: null },
    { slotId: 5, rolledDecade: null, playerId: null }
  ]);

  // Modifiers state
  const [handChecking, setHandChecking] = useState<boolean>(false);

  // Support up to 4 comparison slots
  const [slots, setSlots] = useState<PlayerConfig[]>([
    { slotId: 1, playerId: null, season: null },
    { slotId: 2, playerId: null, season: null },
    { slotId: 3, playerId: null, season: null },
    { slotId: 4, playerId: null, season: null }
  ]);

  // Compute decade-averaged baselines dynamically from the season baselines
  const decadeBaselines = useMemo(() => {
    if (!leagueBaselines || Object.keys(leagueBaselines).length === 0) return {};

    const decadeGroups: Record<string, { paceSum: number; tsSum: number; fg3aSum: number; count: number }> = {};

    Object.entries(leagueBaselines).forEach(([season, baseline]) => {
      const startYear = parseInt(season.split('-')[0], 10);
      const decade = `${Math.floor(startYear / 10) * 10}s`; // e.g. "1990s"

      if (!decadeGroups[decade]) {
        decadeGroups[decade] = { paceSum: 0, tsSum: 0, fg3aSum: 0, count: 0 };
      }

      decadeGroups[decade].paceSum += baseline.league_pace;
      decadeGroups[decade].tsSum += baseline.league_ts_pct;
      decadeGroups[decade].fg3aSum += baseline.league_fg3a_per_fga;
      decadeGroups[decade].count += 1;
    });

    const baselines: Record<string, LeagueBaseline> = {};
    Object.entries(decadeGroups).forEach(([decade, data]) => {
      baselines[decade] = {
        season: decade,
        league_pace: Math.round((data.paceSum / data.count) * 10) / 10,
        league_ts_pct: Math.round((data.tsSum / data.count) * 10000) / 10000,
        league_fg3a_per_fga: Math.round((data.fg3aSum / data.count) * 1000) / 1000
      };
    });

    return baselines;
  }, [leagueBaselines]);

  // Extract a sorted list of unique decades in descending order (e.g. 2020s, 2010s, 2000s...)
  const decadesList = useMemo(() => {
    return Object.keys(decadeBaselines).sort((a, b) => b.localeCompare(a));
  }, [decadeBaselines]);

  // Update target baseline when decades load
  React.useEffect(() => {
    if (decadesList.length > 0 && !decadesList.includes(targetBaseline)) {
      setTargetBaseline(decadesList[0]);
    }
  }, [decadesList, targetBaseline]);

  // Update a single slot with a selected player and season
  const handlePlayerSelect = (slotId: number, playerId: number | null, season: string | null) => {
    setSlots(prev => prev.map(s => s.slotId === slotId ? { ...s, playerId, season } : s));
  };

  // Remove a player from a slot
  const handleRemovePlayer = (slotId: number) => {
    handlePlayerSelect(slotId, null, null);
  };

  // Filter configurations to only those slots that have a player selected
  const activeConfigs = useMemo(() => {
    return slots.filter((s): s is { slotId: number; playerId: number; season: string } =>
      s.playerId !== null && s.season !== null
    );
  }, [slots]);

  // Pre-calculate adjusted stats for all active slots
  const adjustedStatsMap = useMemo(() => {
    const map: Record<number, AdjustedStats> = {};

    activeConfigs.forEach(config => {
      const player = loadedPlayers[config.playerId];
      if (!player) return;

      const seasonStats = player.seasons.find(s => s.season === config.season);
      const eraBaseline = leagueBaselines[config.season];
      const targetEraBaselineOrig = decadeBaselines[targetBaseline];

      if (seasonStats && eraBaseline && targetEraBaselineOrig) {
        map[config.slotId] = adjustPlayerStats(seasonStats, eraBaseline, targetEraBaselineOrig, {
          handChecking: handChecking ? 0.9 : 1.0
        });
      }
    });

    return map;
  }, [activeConfigs, loadedPlayers, leagueBaselines, decadeBaselines, targetBaseline, handChecking]);

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="spinner"></div>
        <h2>Initializing NBA Era Database...</h2>
        <p>Loading historical player directory since 1951</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error-screen">
        <h2>Initialization Failed</h2>
        <p className="error-text">{error}</p>
        <p className="help-text">
          Please run the compilation pipeline first:
          <code className="code-block">python3 data-pipeline/compile_dataset.py</code>
        </p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header — Compact nav bar with integrated view switcher */}
      <header className="app-header">
        <div className="header-logo">
          {/* BasketballFlat, BasketballGradient, BasketballOutline available */}
          <BasketballFlat className="logo-icon" style={{ width: 22, height: 22 }} />
          <h1>NBA Era Translator</h1>
        </div>

        <div className="view-switcher-container">
          <div className="toggle-container">
            <button
              className={`toggle-btn ${activeView === 'comparison' ? 'active' : ''}`}
              onClick={() => setActiveView('comparison')}
              id="view-comparison-tab"
            >
              <ArrowRightLeft size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Player Comparison
            </button>
            <button
              className={`toggle-btn ${activeView === 'dream-team' ? 'active' : ''}`}
              onClick={() => setActiveView('dream-team')}
              id="view-dream-team-tab"
            >
              <Crown size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Dream Team
            </button>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="theme-toggle-btn"
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            id="theme-toggle-button"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            className="header-feedback-btn"
            onClick={() => setIsFeedbackOpen(true)}
            id="header-feedback-button"
          >
            <MessageSquare size={14} style={{ marginRight: 6 }} />
            Feedback
          </button>
        </div>
      </header>

      <main className="main-content">
        {activeView === 'comparison' ? (
          <>
            {/* Showcase Hero Section */}
            <section className="showcase-hero-section">
              <div className="hero-content">
                <h2>Cross-Era NBA Translator</h2>
                <p>
                  Ever wondered how historical legends would perform in today's high-pace, space-oriented game?
                  Compare statistics normalized across NBA history by adjusting for pace, shooting efficiency, and spacing.
                </p>

                <div className="showcase-steps-grid">
                  <div className="showcase-step">
                    <span className="step-num">1</span>
                    <div className="step-text">
                      <h5>Select & Adjust Eras</h5>
                      <p>Search and add up to 4 players. Default seasons are auto-selected.</p>
                    </div>
                  </div>

                  <div className="showcase-step">
                    <span className="step-num">2</span>
                    <div className="step-text">
                      <h5>Normalize Spacing</h5>
                      <p>Choose a target era baseline to project all statistics onto that style of play.</p>
                    </div>
                  </div>

                  <div className="showcase-step">
                    <span className="step-num">3</span>
                    <div className="step-text">
                      <h5>Analyze Skill Profiles</h5>
                      <p>Evaluate cross-era matchup charts, relative efficiency metrics, and point distributions.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid-section">
              <div className="comparison-grid-layout">
                {slots.map((slot) => (
                  <PlayerCard
                    key={slot.slotId}
                    slotId={slot.slotId}
                    playerIndex={playerIndex}
                    selectedPlayerId={slot.playerId}
                    selectedSeason={slot.season}
                    onPlayerSelect={(pId, ssn) => handlePlayerSelect(slot.slotId, pId, ssn)}
                    onRemove={() => handleRemovePlayer(slot.slotId)}
                    loadPlayer={loadPlayer}
                    loadedPlayers={loadedPlayers}
                  />
                ))}
              </div>
            </section>

            {/* Adjuster Toggles */}
            <section className="control-section">
              <StatControl
                currentMode={adjustmentMode}
                onModeChange={setAdjustmentMode}
                targetBaseline={targetBaseline}
                onBaselineChange={setTargetBaseline}
                baselinesList={decadesList}
              />
              <ModifiersPanel
                handChecking={handChecking}
                onHandCheckingChange={setHandChecking}
              />
            </section>

            {/* Visualizations Suite */}
            <section className="visualizations-section">
              <VisualizationSuite
                selectedConfigs={activeConfigs}
                loadedPlayers={loadedPlayers}
                adjustmentMode={adjustmentMode}
                adjustedStatsMap={adjustedStatsMap}
                targetBaseline={targetBaseline}
                leagueBaselines={leagueBaselines}
                decadeBaselines={decadeBaselines}
                theme={theme}
              />
            </section>
          </>
        ) : (
          <>
            <section className="dream-team-section">
              <DreamTeamSuite
                slots={dreamSlots}
                onSlotsChange={setDreamSlots}
                playerIndex={playerIndex}
                leagueBaselines={leagueBaselines}
                loadedPlayers={loadedPlayers}
                loadPlayer={loadPlayer}
              />
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>NBA Era Translator. Historical comparisons since 1951.</p>
      </footer>

      {/* Floating Action Button for Feedback */}
      <button
        className="floating-feedback-btn"
        onClick={() => setIsFeedbackOpen(true)}
        title="Send Feedback"
        aria-label="Send Feedback"
        id="floating-feedback-button"
      >
        <MessageSquare size={20} />
      </button>

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
};
export default App;
