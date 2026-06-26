import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Trash2, User, Star, Trophy, Sparkles, RefreshCw, HelpCircle, Flame, ShieldAlert } from 'lucide-react';
import type { PlayerIndexItem, PlayerData } from '../hooks/usePlayerData';
import { adjustPlayerStats, calculateCareerStats } from '../utils/statsCalculations';
import type { LeagueBaseline, PlayerSeasonStats, AdjustedStats } from '../utils/statsCalculations';
import { TEAM_COLORS } from './PlayerCard';

// Available decades for selection
const ALL_DECADES = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];

interface DreamTeamSlot {
  slotId: number;
  rolledDecade: string | null;
  playerId: number | null;
}

interface DreamTeamSuiteProps {
  slots: DreamTeamSlot[];
  onSlotsChange: (newSlots: DreamTeamSlot[]) => void;
  playerIndex: PlayerIndexItem[];
  leagueBaselines: Record<string, LeagueBaseline>;
  loadedPlayers: Record<number, PlayerData>;
  loadPlayer: (id: number) => Promise<PlayerData | null>;
  targetBaseline: string;
  decadeBaselines: Record<string, LeagueBaseline>;
  adjustmentMode: 'raw' | 'per75' | 'modernized';
  handChecking: number;
  threePointVolume: string;
  paceOverride: string;
}

export const DreamTeamSuite: React.FC<DreamTeamSuiteProps> = ({
  slots,
  onSlotsChange,
  playerIndex,
  leagueBaselines,
  loadedPlayers,
  loadPlayer,
  targetBaseline,
  decadeBaselines,
  adjustmentMode,
  handChecking,
  threePointVolume,
  paceOverride
}) => {
  // Local rolling state per slot
  const [rollingStates, setRollingStates] = useState<Record<number, { isRolling: boolean; tempDecade: string }>>({});
  
  // Search query states per slot
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});
  
  // Open search list states per slot
  const [openSearchSlots, setOpenSearchSlots] = useState<Record<number, boolean>>({});

  // Refs to click outside detection
  const cardsRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Which decades are already locked
  const lockedDecades = useMemo(() => {
    return slots.map(s => s.rolledDecade).filter((d): d is string => d !== null);
  }, [slots]);

  // Which player IDs are currently selected (removed from available pool)
  const draftedPlayerIds = useMemo(() => {
    return slots.map(s => s.playerId).filter((id): id is number => id !== null);
  }, [slots]);

  // Handle clicking outside suggestion list
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.entries(cardsRefs.current).forEach(([slotIdStr, ref]) => {
        const slotId = parseInt(slotIdStr, 10);
        if (ref && !ref.contains(event.target as Node)) {
          setOpenSearchSlots(prev => ({ ...prev, [slotId]: false }));
        }
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if a player's career overlaps with a decade
  const checkCareerDecadeOverlap = (start: string, end: string, decade: string) => {
    const decadeStart = parseInt(decade.replace('s', ''), 10);
    const decadeEnd = decadeStart + 9;
    const pStart = parseInt(start.split('-')[0], 10);
    const pEnd = parseInt(end.split('-')[0], 10);
    return pStart <= decadeEnd && pEnd >= decadeStart;
  };

  // Roll a random decade for a slot
  const handleRollEra = (slotId: number) => {
    // Exclude already rolled decades and currently rolling ones
    const activeRollingDecades = Object.values(rollingStates)
      .filter(rs => rs.isRolling)
      .map(rs => rs.tempDecade);
      
    const excludedDecades = [...lockedDecades, ...activeRollingDecades];
    const availablePool = ALL_DECADES.filter(d => !excludedDecades.includes(d));

    if (availablePool.length === 0) return;

    // Pick final decade
    const randomIndex = Math.floor(Math.random() * availablePool.length);
    const finalDecade = availablePool[randomIndex];

    // Initialize rolling animation
    setRollingStates(prev => ({
      ...prev,
      [slotId]: { isRolling: true, tempDecade: ALL_DECADES[0] }
    }));

    let count = 0;
    const maxIterations = 15;
    const intervalTime = 60; // ms

    const timer = setInterval(() => {
      // Rotate rapidly through all decades to simulate random slot machine
      const randomTemp = ALL_DECADES[Math.floor(Math.random() * ALL_DECADES.length)];
      setRollingStates(prev => ({
        ...prev,
        [slotId]: { isRolling: true, tempDecade: randomTemp }
      }));

      count++;
      if (count >= maxIterations) {
        clearInterval(timer);
        setRollingStates(prev => ({
          ...prev,
          [slotId]: { isRolling: false, tempDecade: finalDecade }
        }));
        
        // Update slot with rolled decade
        const updated = slots.map(s => s.slotId === slotId ? { ...s, rolledDecade: finalDecade } : s);
        onSlotsChange(updated);
      }
    }, intervalTime);
  };

  // Handle player selection
  const handleSelectPlayer = async (slotId: number, item: PlayerIndexItem) => {
    // If drafted already, ignore
    if (draftedPlayerIds.includes(item.id)) return;

    setSearchQueries(prev => ({ ...prev, [slotId]: '' }));
    setOpenSearchSlots(prev => ({ ...prev, [slotId]: false }));

    // Preload player data
    await loadPlayer(item.id);

    const updated = slots.map(s => s.slotId === slotId ? { ...s, playerId: item.id } : s);
    onSlotsChange(updated);
  };

  // Remove player from slot (keeps decade rolled)
  const handleRemovePlayer = (slotId: number) => {
    const updated = slots.map(s => s.slotId === slotId ? { ...s, playerId: null } : s);
    onSlotsChange(updated);
  };

  // Reset entire slot (removes player & unlocks decade)
  const handleResetSlot = (slotId: number) => {
    const updated = slots.map(s => s.slotId === slotId ? { slotId, rolledDecade: null, playerId: null } : s);
    onSlotsChange(updated);
    setSearchQueries(prev => ({ ...prev, [slotId]: '' }));
  };

  // Reset all slots
  const handleResetAll = () => {
    const resetSlots = slots.map(s => ({ slotId: s.slotId, rolledDecade: null, playerId: null }));
    onSlotsChange(resetSlots);
    setSearchQueries({});
    setOpenSearchSlots({});
  };

  // Calculate career average stats for loaded players
  const playerAverages = useMemo(() => {
    const map: Record<number, { careerStats: PlayerSeasonStats; careerBaseline: LeagueBaseline; adjusted: AdjustedStats; primaryTeam: string }> = {};

    slots.forEach(slot => {
      if (slot.playerId === null) return;
      const player = loadedPlayers[slot.playerId];
      if (!player) return;

      const { careerStats, careerBaseline } = calculateCareerStats(player.seasons, leagueBaselines);

      // Determine primary team (by seasons played or games played)
      const teamCounts: Record<string, { seasons: number; gp: number }> = {};
      player.seasons.forEach(s => {
        if (!teamCounts[s.team]) {
          teamCounts[s.team] = { seasons: 0, gp: 0 };
        }
        teamCounts[s.team].seasons += 1;
        teamCounts[s.team].gp += s.gp;
      });
      let primaryTeam = 'ALL';
      let maxGP = 0;
      Object.entries(teamCounts).forEach(([team, data]) => {
        if (data.gp > maxGP) {
          maxGP = data.gp;
          primaryTeam = team;
        }
      });

      // Prepare target era baseline
      const targetDecadeBaselineOrig = decadeBaselines[targetBaseline];
      if (targetDecadeBaselineOrig) {
        const targetBaselineCopy = { ...targetDecadeBaselineOrig };
        if (paceOverride !== 'default') {
          targetBaselineCopy.league_pace = parseFloat(paceOverride);
        }

        let threePointVolumeOverride: number | undefined = undefined;
        if (threePointVolume !== 'default') {
          const overrideDecadeBaseline = decadeBaselines[threePointVolume];
          if (overrideDecadeBaseline) {
            threePointVolumeOverride = overrideDecadeBaseline.league_fg3a_per_fga;
          }
        }

        const adjusted = adjustPlayerStats(careerStats, careerBaseline, targetBaselineCopy, {
          handChecking,
          threePointVolumeOverride
        });

        map[slot.playerId] = {
          careerStats,
          careerBaseline,
          adjusted,
          primaryTeam
        };
      }
    });

    return map;
  }, [slots, loadedPlayers, leagueBaselines, decadeBaselines, targetBaseline, paceOverride, threePointVolume, handChecking]);

  // Compute composite team ratings
  const teamScoutingReport = useMemo(() => {
    const draftedPlayers = slots
      .map(s => s.playerId !== null ? playerAverages[s.playerId] : null)
      .filter((p): p is NonNullable<typeof p> => p !== undefined && p !== null);

    if (draftedPlayers.length === 0) return null;

    // 1. Total PPG
    // Sum of players' projected per-75 points
    const totalProjectedPPG = draftedPlayers.reduce((sum, p) => sum + p.adjusted.modern_pts_per75, 0);

    // 2. Composite TS%
    // Weighted by FGA + 0.44 * FTA
    let totalProjectedPts = 0;
    let totalPaceAdjShots = 0;
    draftedPlayers.forEach(p => {
      const shots = p.adjusted.fga_per75 + 0.44 * p.adjusted.fta_per75;
      totalProjectedPts += p.adjusted.modern_ts_pct * 2 * shots;
      totalPaceAdjShots += shots;
    });
    const compositeTS = totalPaceAdjShots > 0 ? (totalProjectedPts / (2 * totalPaceAdjShots)) : 0;

    // 3. Lineup Chemistry Heuristics
    // Criteria: Playmaking, Rim Protection, Perimeter Defense, Floor Spacing, Scoring Balance
    let baseScore = 60;
    const details: string[] = [];

    // Find max stats
    const maxAst = Math.max(...draftedPlayers.map(p => p.adjusted.ast));
    const maxReb = Math.max(...draftedPlayers.map(p => p.adjusted.reb));
    const maxBlk = Math.max(...draftedPlayers.map(p => p.careerStats.blk / p.careerStats.gp));
    const maxStl = Math.max(...draftedPlayers.map(p => p.careerStats.stl / p.careerStats.gp));
    
    // Total projected 3PA per 75
    const total3PA = draftedPlayers.reduce((sum, p) => sum + p.adjusted.modern_fg3a_per75, 0);

    // Playmaking check
    if (maxAst >= 7.5) {
      baseScore += 10;
      details.push('Elite Playmaker (APG >= 7.5) anchors spacing and facilitates easy looks.');
    } else if (maxAst >= 5.0) {
      baseScore += 5;
      details.push('Solid playmaking presence; ball movement is fluid.');
    } else {
      baseScore -= 5;
      details.push('Lack of an elite table-setter; half-court offense might stagnate.');
    }

    // Rebounds check
    if (maxReb >= 10.0) {
      baseScore += 10;
      details.push('Elite rebounder (RPG >= 10) secures possessions and limits second-chance points.');
    } else if (maxReb >= 7.5) {
      baseScore += 5;
      details.push('Competent team glass control.');
    } else {
      baseScore -= 5;
      details.push('Vulnerable on the boards; size disadvantage.');
    }

    // Rim Protection check
    if (maxBlk >= 2.0) {
      baseScore += 10;
      details.push('Elite rim protector (BPG >= 2.0) locks down the paint.');
    } else if (maxBlk >= 1.0) {
      baseScore += 5;
      details.push('Presence of interior shot alteration.');
    } else {
      baseScore -= 5;
      details.push('Weak interior defense; opponents will finish easily at the rim.');
    }

    // Steals/Perimeter check
    if (maxStl >= 1.8) {
      baseScore += 5;
      details.push('Elite perimeter disruptor (SPG >= 1.8) triggers fastbreaks.');
    }

    // Spacing check
    if (total3PA >= 25.0) {
      baseScore += 10;
      details.push('Elite floor spacing (Team 3PA/75 >= 25) creates wide driving lanes.');
    } else if (total3PA >= 15.0) {
      baseScore += 5;
      details.push('Capable deep-range spacing.');
    } else {
      baseScore -= 10;
      details.push('Poor deep shooting threats; defense will pack the paint.');
    }

    // Ball Dominance check
    const highVolumeScorers = draftedPlayers.filter(p => p.adjusted.fga_per75 >= 18.0).length;
    if (highVolumeScorers >= 4) {
      baseScore -= 10;
      details.push('Too many ball-dominant scorers (4+ players with >=18 FGA/75); diminishing returns.');
    } else if (highVolumeScorers <= 1 && draftedPlayers.length === 5) {
      baseScore -= 5;
      details.push('Lack of scoring volume; need more primary isolation options.');
    } else if (highVolumeScorers === 2 || highVolumeScorers === 3) {
      baseScore += 10;
      details.push('Ideal scoring balance; clear hierarchy of primary and secondary scoring options.');
    }

    // Star Power
    const starCount = draftedPlayers.filter((_, idx) => {
      const s = slots[idx];
      if (s.playerId === null) return false;
      const indexItem = playerIndex.find(p => p.id === s.playerId);
      return indexItem?.is_star;
    }).length;
    if (starCount >= 4) {
      baseScore += 5;
      details.push('Imposing star power creates immense gravitational pull.');
    }

    const chemistry = Math.max(45, Math.min(100, baseScore));

    return {
      totalProjectedPPG,
      compositeTS,
      chemistry,
      details,
      isComplete: draftedPlayers.length === 5
    };
  }, [slots, playerAverages, playerIndex]);

  return (
    <div className="dream-team-suite-container">
      <div className="dream-team-intro-card">
        <div className="intro-header">
          <Trophy className="trophy-icon" size={32} />
          <h2>Cross-Era Dream Team Builder</h2>
        </div>
        <p className="intro-text">
          Assemble the ultimate 5-player lineup. **Rule constraint**: Every player must represent a **different decade**. 
          We'll roll a random era for each slot, aggregate their **career-average stats**, and adjust their ratings to the **{targetBaseline}** target baseline.
        </p>
        {draftedPlayerIds.length > 0 && (
          <button className="reset-all-btn" onClick={handleResetAll}>
            <RefreshCw size={14} />
            <span>Reset Entire Lineup</span>
          </button>
        )}
      </div>

      {/* Grid of 5 Lineup Slots */}
      <div className="dream-team-grid">
        {slots.map(slot => {
          const isRolling = rollingStates[slot.slotId]?.isRolling;
          const tempDecade = rollingStates[slot.slotId]?.tempDecade;
          const searchVal = searchQueries[slot.slotId] || '';
          const isOpen = openSearchSlots[slot.slotId] || false;
          
          const player = slot.playerId !== null ? loadedPlayers[slot.playerId] : null;
          const stats = slot.playerId !== null ? playerAverages[slot.playerId] : null;

          // Autocomplete suggestions for this slot's rolled decade
          const suggestions = useMemo(() => {
            if (!slot.rolledDecade || searchVal.trim().length < 2) return [];
            const query = searchVal.toLowerCase();
            const filtered = playerIndex.filter(p => {
              const nameMatch = p.name.toLowerCase().includes(query);
              if (!nameMatch) return false;
              // Check decade overlap
              return checkCareerDecadeOverlap(p.start, p.end, slot.rolledDecade!);
            }).slice(0, 10);

            // Sort: star first, then by total career points
            filtered.sort((a, b) => {
              if (a.is_star && !b.is_star) return -1;
              if (!a.is_star && b.is_star) return 1;
              return b.total_pts - a.total_pts;
            });

            return filtered;
          }, [searchVal, slot.rolledDecade, playerIndex]);

          // Team-jersey color style
          const avatarStyle = useMemo(() => {
            if (!stats?.primaryTeam) return {};
            const colors = TEAM_COLORS[stats.primaryTeam] || { primary: '#6366f1', secondary: '#14b8a6' };
            return {
              backgroundColor: colors.primary,
              color: colors.secondary,
              borderColor: colors.secondary,
              borderWidth: '1.5px',
              borderStyle: 'solid' as const
            };
          }, [stats]);

          return (
            <div 
              key={slot.slotId}
              ref={el => { cardsRefs.current[slot.slotId] = el; }}
              className={`dream-player-card ${
                player ? 'has-player' : 
                slot.rolledDecade ? 'decade-locked' : 
                isRolling ? 'rolling' : 'empty-slot'
              }`}
            >
              {/* Case 1: Player Selected */}
              {player && stats ? (
                <div className="player-info-container">
                  <div className="player-card-header">
                    <div className="avatar-icon" style={avatarStyle}>
                      <User size={20} />
                    </div>
                    <div className="player-meta">
                      <h3 className="player-name">{player.name}</h3>
                      <div className="decade-tag">
                        <span className="decade-label">{slot.rolledDecade} representative</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemovePlayer(slot.slotId)} 
                      className="remove-btn" 
                      title="Remove Draft Pick"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="career-years-info">
                    Career: {player.seasons[0].season.split('-')[0]} – {player.seasons[player.seasons.length - 1].season.split('-')[1]} ({stats.primaryTeam})
                  </div>

                  {/* Quick view of career-average stats translated to target era */}
                  <div className="quick-stats-grid">
                    <div className="quick-stat-box">
                      <span className="stat-label">GP</span>
                      <span className="stat-val">{stats.careerStats.gp}</span>
                    </div>
                    <div className="quick-stat-box">
                      <span className="stat-label">MIN</span>
                      <span className="stat-val">{(stats.careerStats.min / stats.careerStats.gp).toFixed(1)}</span>
                    </div>
                    
                    <div className="quick-stat-box highlight">
                      <span className="stat-label">PPG ({targetBaseline})</span>
                      <span className="stat-val">
                        {adjustmentMode === 'raw' ? stats.adjusted.pts.toFixed(1) :
                         adjustmentMode === 'per75' ? stats.adjusted.pts_per75.toFixed(1) :
                         stats.adjusted.modern_pts_per75.toFixed(1)}
                      </span>
                    </div>

                    <div className="quick-stat-box">
                      <span className="stat-label">RPG</span>
                      <span className="stat-val">
                        {adjustmentMode === 'raw' ? stats.adjusted.reb.toFixed(1) : stats.adjusted.reb_per75.toFixed(1)}
                      </span>
                    </div>
                    <div className="quick-stat-box">
                      <span className="stat-label">APG</span>
                      <span className="stat-val">
                        {adjustmentMode === 'raw' ? stats.adjusted.ast.toFixed(1) : stats.adjusted.ast_per75.toFixed(1)}
                      </span>
                    </div>
                    
                    <div className="quick-stat-box highlight">
                      <span className="stat-label">TS% ({targetBaseline})</span>
                      <span className="stat-val">
                        {(adjustmentMode === 'modernized' 
                          ? stats.adjusted.modern_ts_pct * 100 
                          : stats.adjusted.tsPct * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button onClick={() => handleResetSlot(slot.slotId)} className="reset-slot-action">
                      Reset Slot (Unlock Decade)
                    </button>
                  </div>
                </div>
              ) : 
              
              // Case 2: Decade Rolled, Awaiting Selection
              slot.rolledDecade ? (
                <div className="search-slot-container">
                  <div className="search-instructions">
                    <div className="decade-reveal-animation">
                      <Sparkles className="sparkle-icon animate-pulse" size={16} />
                      <span className="decade-result-text">{slot.rolledDecade}</span>
                    </div>
                    <h4>Draft Player</h4>
                    <p className="sub-instruction">Must have played in the {slot.rolledDecade}</p>
                  </div>

                  <div className="search-bar-wrapper">
                    <Search className="search-bar-icon" size={14} />
                    <input
                      type="text"
                      placeholder="Search player..."
                      value={searchVal}
                      onChange={(e) => {
                        setSearchQueries(prev => ({ ...prev, [slot.slotId]: e.target.value }));
                        setOpenSearchSlots(prev => ({ ...prev, [slot.slotId]: true }));
                      }}
                      onFocus={() => setOpenSearchSlots(prev => ({ ...prev, [slot.slotId]: true }))}
                      className="search-input"
                    />
                  </div>

                  {isOpen && suggestions.length > 0 && (
                    <ul className="suggestions-list">
                      <li className="suggestions-legend">
                        <Star size={10} className="star-icon" fill="currentColor" />
                        <span>Star Players in the {slot.rolledDecade}</span>
                      </li>
                      {suggestions.map((item) => {
                        const isDrafted = draftedPlayerIds.includes(item.id);
                        return (
                          <li
                            key={item.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => !isDrafted && handleSelectPlayer(slot.slotId, item)}
                            className={`suggestion-item ${isDrafted ? 'disabled' : ''}`}
                          >
                            <div className="suggestion-name-box">
                              <span className="suggestion-name" style={{ color: isDrafted ? '#6b7280' : 'inherit' }}>{item.name}</span>
                              {item.is_star && <Star size={11} className="star-icon" fill="currentColor" />}
                              {isDrafted && <span className="drafted-badge">Drafted</span>}
                            </div>
                            <span className="suggestion-years">
                              {item.start.split('-')[0]} - {item.end.split('-')[0]}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="card-actions">
                    <button onClick={() => handleResetSlot(slot.slotId)} className="reset-slot-action">
                      Reroll Decade
                    </button>
                  </div>
                </div>
              ) : 
              
              // Case 3: Spinning Animation
              isRolling ? (
                <div className="rolling-decade-container">
                  <div className="spinner-glow"></div>
                  <div className="rolling-text-rapid">
                    {tempDecade}
                  </div>
                  <p>Rolling era baseline...</p>
                </div>
              ) : 
              
              // Case 4: Totally Empty Slot (Unrolled)
              (
                <div className="unrolled-slot-container">
                  <div className="slot-number-badge">Slot {slot.slotId}</div>
                  <div className="help-icon-box" title="Click Roll Era to unlock a random decade constraint.">
                    <HelpCircle size={32} className="text-muted opacity-40" />
                  </div>
                  <h4>Decade Locked</h4>
                  <button 
                    onClick={() => handleRollEra(slot.slotId)}
                    className="roll-era-btn"
                  >
                    <Flame size={16} />
                    <span>Roll Era</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scouting Report Summary */}
      {teamScoutingReport ? (
        <div className="team-scouting-report-card">
          <div className="report-header">
            <Trophy className="report-title-icon" size={24} />
            <h3>Lineup Scouting Report</h3>
          </div>

          <div className="report-metrics-grid">
            <div className="report-metric-box">
              <span className="metric-label">Composite TS% ({targetBaseline})</span>
              <span className="metric-val">{(teamScoutingReport.compositeTS * 100).toFixed(1)}%</span>
              <span className="metric-sub text-muted">Lineup shooting efficiency</span>
            </div>

            <div className="report-metric-box">
              <span className="metric-label">Pace-Adjusted PPG ({targetBaseline})</span>
              <span className="metric-val">{teamScoutingReport.totalProjectedPPG.toFixed(1)}</span>
              <span className="metric-sub text-muted">Sum of career per-75 points</span>
            </div>

            <div className="report-metric-box chemistry-box">
              <span className="metric-label">Lineup Chemistry Rating</span>
              <div className="chem-bar-container">
                <div className="chem-bar" style={{ width: `${teamScoutingReport.chemistry}%` }}></div>
              </div>
              <span className="metric-val">{teamScoutingReport.chemistry}%</span>
              <span className="metric-sub text-muted">Synergy of roles and spacing</span>
            </div>
          </div>

          <div className="scouting-feedback-section">
            <h4>Synergy Analysis & Recommendations</h4>
            {teamScoutingReport.details.length > 0 ? (
              <ul className="synergy-feedback-list">
                {teamScoutingReport.details.map((detail, idx) => {
                  const isNegative = detail.includes('Lack of') || detail.includes('Vulnerable') || detail.includes('Weak') || detail.includes('Too many') || detail.includes('Poor');
                  return (
                    <li key={idx} className={isNegative ? 'negative-feedback' : 'positive-feedback'}>
                      {isNegative ? (
                        <ShieldAlert size={14} className="feedback-icon" />
                      ) : (
                        <Sparkles size={14} className="feedback-icon" />
                      )}
                      <span>{detail}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="no-feedback-text">Lineup empty. Draft players to see scouting analytics.</p>
            )}

            {!teamScoutingReport.isComplete && (
              <div className="incomplete-lineup-alert">
                <Sparkles size={14} className="pulse-icon" />
                <span>Fill all 5 slots (each representing a different decade) to unlock full analysis.</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="scouting-report-placeholder">
          <Trophy size={48} className="opacity-20 mb-4" />
          <h3>Awaiting Lineup Selection</h3>
          <p className="text-muted max-w-md text-center">
            Roll eras for each of the 5 slots above and draft players to evaluate your lineup's cross-era efficiency and chemistry.
          </p>
        </div>
      )}
    </div>
  );
};
