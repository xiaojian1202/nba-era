import React, { useState, useMemo } from 'react';
import { usePlayerData } from './hooks/usePlayerData';
import { StatControl } from './components/StatControl';
import type { AdjustmentMode } from './components/StatControl';
import { ModifiersPanel } from './components/ModifiersPanel';
import { PlayerCard } from './components/PlayerCard';
import { VisualizationSuite } from './components/VisualizationSuite';
import { adjustPlayerStats } from './utils/statsCalculations';
import type { AdjustedStats, LeagueBaseline } from './utils/statsCalculations';
import { Shield } from 'lucide-react';

interface PlayerConfig {
  slotId: number;
  playerId: number | null;
  season: string | null;
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

  // Modifiers state
  const [handChecking, setHandChecking] = useState<number>(1.0);
  const [threePointVolume, setThreePointVolume] = useState<string>('default');
  const [paceOverride, setPaceOverride] = useState<string>('default');

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
    
    // Resolve 3FAr volume override
    let threePointVolumeOverride: number | undefined = undefined;
    if (threePointVolume !== 'default') {
      const overrideDecadeBaseline = decadeBaselines[threePointVolume];
      if (overrideDecadeBaseline) {
        threePointVolumeOverride = overrideDecadeBaseline.league_fg3a_per_fga;
      }
    }

    activeConfigs.forEach(config => {
      const player = loadedPlayers[config.playerId];
      if (!player) return;

      const seasonStats = player.seasons.find(s => s.season === config.season);
      const eraBaseline = leagueBaselines[config.season];
      const targetEraBaselineOrig = decadeBaselines[targetBaseline];

      if (seasonStats && eraBaseline && targetEraBaselineOrig) {
        // Clone and apply pace override if selected
        const targetEraBaseline = { ...targetEraBaselineOrig };
        if (paceOverride !== 'default') {
          targetEraBaseline.league_pace = parseFloat(paceOverride);
        }

        map[config.slotId] = adjustPlayerStats(seasonStats, eraBaseline, targetEraBaseline, {
          handChecking,
          threePointVolumeOverride
        });
      }
    });

    return map;
  }, [activeConfigs, loadedPlayers, leagueBaselines, decadeBaselines, targetBaseline, handChecking, threePointVolume, paceOverride]);

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
      {/* Header */}
      <header className="app-header">
        <div className="header-logo">
          <Shield className="logo-icon" size={24} />
          <h1>NBA Era Translator</h1>
        </div>
        <p className="header-tagline">
          Era-adjust player and team statistics to neutralize the impact of pace and floor spacing.
        </p>
      </header>

      {/* Main Grid: 4 Comparison Slots */}
      <main className="main-content">
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
            threePointVolume={threePointVolume}
            onThreePointVolumeChange={setThreePointVolume}
            paceOverride={paceOverride}
            onPaceOverrideChange={setPaceOverride}
          />
        </section>

        {/* Visualizations Suite */}
        <section className="visualizations-section">
          <VisualizationSuite
            selectedConfigs={activeConfigs}
            loadedPlayers={loadedPlayers}
            adjustmentMode={adjustmentMode}
            adjustedStatsMap={adjustedStatsMap}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>© 2026 NBA Era Translator. Neutral, unbiased historical comparisons since 1951.</p>
      </footer>
    </div>
  );
};
export default App;
