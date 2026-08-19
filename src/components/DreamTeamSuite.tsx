import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Trash2, User, Star, Trophy, Sparkles, RefreshCw, Play, CheckCircle2, RotateCcw } from 'lucide-react';
import type { PlayerIndexItem, PlayerData } from '../hooks/usePlayerData';
import { calculateCareerStats } from '../utils/statsCalculations';
import type { LeagueBaseline, PlayerSeasonStats } from '../utils/statsCalculations';
import { TEAM_COLORS } from './PlayerCard';

// Available decades for selection
const ALL_DECADES = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];

// Helper to format player name as F. Lastname (e.g. Michael Jordan -> M. Jordan)
const formatPlayerName = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return `${firstName.charAt(0)}. ${lastName}`;
};

const SIMULATION_MESSAGES = [
  'Simulating 82-game regular season...',
  'Calculating pace, spacing & shot creation...',
  'Resolving 4th-quarter clutch possessions...',
  'Finalizing regular season standings...'
];

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
}

export const DreamTeamSuite: React.FC<DreamTeamSuiteProps> = ({
  slots,
  onSlotsChange,
  playerIndex,
  leagueBaselines,
  loadedPlayers,
  loadPlayer
}) => {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  // Local rolling state per slot
  const [rollingStates, setRollingStates] = useState<Record<number, { isRolling: boolean; tempDecade: string }>>({});

  // Search query states per slot
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});

  // Open search list states per slot
  const [openSearchSlots, setOpenSearchSlots] = useState<Record<number, boolean>>({});

  // Simulation & Reveal States (viral 82-0 reveal pattern)
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);

  // Animated counter values
  const [displayWins, setDisplayWins] = useState(0);
  const [displayLosses, setDisplayLosses] = useState(0);

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

  // Track lineup state to reset revealed results if lineup is edited
  const lineupKey = useMemo(() => {
    return slots.map(s => `${s.slotId}:${s.playerId ?? 'empty'}`).join('|');
  }, [slots]);

  const prevLineupKeyRef = useRef(lineupKey);
  useEffect(() => {
    if (prevLineupKeyRef.current !== lineupKey) {
      prevLineupKeyRef.current = lineupKey;
      setIsRevealed(false);
      setIsSimulating(false);
    }
  }, [lineupKey]);

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

  // Reset all slots
  const handleResetAll = () => {
    const resetSlots = slots.map(s => ({ slotId: s.slotId, rolledDecade: null, playerId: null }));
    onSlotsChange(resetSlots);
    setSearchQueries({});
    setOpenSearchSlots({});
  };

  // Calculate career average stats for loaded players
  const playerAverages = useMemo(() => {
    const map: Record<number, {
      careerStats: PlayerSeasonStats;
      primaryTeam: string;
      rawAverages: {
        gp: number;
        mpg: number;
        ppg: number;
        rpg: number;
        apg: number;
        spg: number;
        bpg: number;
        tov: number;
        fga: number;
        fta: number;
        fg3a: number;
        tsPct: number;
      }
    }> = {};

    slots.forEach(slot => {
      if (slot.playerId === null) return;
      const player = loadedPlayers[slot.playerId];
      if (!player) return;

      const { careerStats } = calculateCareerStats(player.seasons, leagueBaselines);

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

      const gp = careerStats.gp || 1;
      const tsDenom = 2 * (careerStats.fga + 0.44 * careerStats.fta);
      const rawTS = tsDenom > 0 ? (careerStats.pts / tsDenom) : 0;

      map[slot.playerId] = {
        careerStats,
        primaryTeam,
        rawAverages: {
          gp,
          mpg: careerStats.min / gp,
          ppg: careerStats.pts / gp,
          rpg: careerStats.reb / gp,
          apg: careerStats.ast / gp,
          spg: careerStats.stl / gp,
          bpg: careerStats.blk / gp,
          tov: careerStats.tov / gp,
          fga: careerStats.fga / gp,
          fta: careerStats.fta / gp,
          fg3a: careerStats.fg3a / gp,
          tsPct: rawTS
        }
      };
    });

    return map;
  }, [slots, loadedPlayers, leagueBaselines]);

  // Compute composite team ratings and predict wins record
  const teamScoutingReport = useMemo(() => {
    const draftedPlayers = slots
      .map(s => s.playerId !== null ? playerAverages[s.playerId] : null)
      .filter((p): p is NonNullable<typeof p> => p !== undefined && p !== null);

    // Results are only computed for a complete 5-player roster
    if (draftedPlayers.length !== 5) return null;

    // 1. Total PPG (Combined raw career averages)
    const totalRawPPG = draftedPlayers.reduce((sum, p) => sum + p.rawAverages.ppg, 0);

    // 2. Composite TS%
    let totalPts = 0;
    let totalShots = 0;
    draftedPlayers.forEach(p => {
      const shots = p.careerStats.fga + 0.44 * p.careerStats.fta;
      totalPts += p.careerStats.pts;
      totalShots += shots;
    });
    const compositeTS = totalShots > 0 ? (totalPts / (2 * totalShots)) : 0;

    // 3. Lineup Chemistry Heuristics
    let baseScore = 60;

    // Find max stats
    const maxAst = Math.max(...draftedPlayers.map(p => p.rawAverages.apg));
    const maxReb = Math.max(...draftedPlayers.map(p => p.rawAverages.rpg));
    const maxBlk = Math.max(...draftedPlayers.map(p => p.rawAverages.bpg));
    const maxStl = Math.max(...draftedPlayers.map(p => p.rawAverages.spg));

    // Total raw 3PA per game
    const total3PA = draftedPlayers.reduce((sum, p) => sum + p.rawAverages.fg3a, 0);

    // Playmaking check
    if (maxAst >= 7.5) {
      baseScore += 10;
    } else if (maxAst >= 5.0) {
      baseScore += 5;
    } else {
      baseScore -= 5;
    }

    // Rebounds check
    if (maxReb >= 10.0) {
      baseScore += 10;
    } else if (maxReb >= 7.5) {
      baseScore += 5;
    } else {
      baseScore -= 5;
    }

    // Rim Protection check
    if (maxBlk >= 2.0) {
      baseScore += 10;
    } else if (maxBlk >= 1.0) {
      baseScore += 5;
    } else {
      baseScore -= 5;
    }

    // Steals/Perimeter check
    if (maxStl >= 1.8) {
      baseScore += 5;
    }

    // Spacing check (adjust thresholds for raw stats since pre-1980 is 0)
    if (total3PA >= 15.0) {
      baseScore += 10;
    } else if (total3PA >= 8.0) {
      baseScore += 5;
    } else {
      baseScore -= 5;
    }

    // Ball Dominance check
    const highVolumeScorers = draftedPlayers.filter(p => p.rawAverages.ppg >= 22.0).length;
    if (highVolumeScorers >= 4) {
      baseScore -= 10;
    } else if (highVolumeScorers <= 1) {
      baseScore -= 5;
    } else if (highVolumeScorers === 2 || highVolumeScorers === 3) {
      baseScore += 10;
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
    }

    const chemistry = Math.max(45, Math.min(100, baseScore));

    // Predict wins in an 82 game season purely based on raw stats
    let predictedWins = 45; // Base wins for a standard draft lineup

    // 1. Impact of Efficiency (TS% typically ranges from 52% to 62%)
    predictedWins += (compositeTS - 0.56) * 100;

    // 2. Impact of Scoring Volume (combined PPG typically ranges from 90 to 135)
    predictedWins += (totalRawPPG - 110) * 0.25;

    // 3. Impact of Playmaking (combined APG typically ranges from 18 to 36)
    const totalRawAPG = draftedPlayers.reduce((sum, p) => sum + p.rawAverages.apg, 0);
    predictedWins += (totalRawAPG - 25) * 0.5;

    // 4. Impact of Rebounding (combined RPG typically ranges from 30 to 45)
    const totalRawRPG = draftedPlayers.reduce((sum, p) => sum + p.rawAverages.rpg, 0);
    predictedWins += (totalRawRPG - 38) * 0.4;

    // 5. Defense (combined SPG + BPG typically ranges from 5 to 14)
    const totalRawSPG = draftedPlayers.reduce((sum, p) => sum + p.rawAverages.spg, 0);
    const totalRawBPG = draftedPlayers.reduce((sum, p) => sum + p.rawAverages.bpg, 0);
    predictedWins += (totalRawSPG + totalRawBPG - 9.0) * 1.5;

    // 6. Turnovers (combined TOV typically ranges from 8 to 18)
    const totalRawTOV = draftedPlayers.reduce((sum, p) => sum + p.rawAverages.tov, 0);
    predictedWins -= (totalRawTOV - 14) * 1.5;

    // 7. Chemistry rating impact
    predictedWins += (chemistry - 75) * 0.4;

    let finalWins = Math.round(predictedWins);

    // Clamp between 0 and 82 for realistic full range
    finalWins = Math.max(0, Math.min(82, finalWins));

    const finalLosses = 82 - finalWins;
    const predictedRecord = `${finalWins} - ${finalLosses}`;

    let ratingLabel = "Lottery Bound";
    if (finalWins === 82) {
      ratingLabel = "82-0 Perfection";
    } else if (finalWins >= 68) {
      ratingLabel = "All-Time Dynastic Force";
    } else if (finalWins >= 60) {
      ratingLabel = "Championship Contender";
    } else if (finalWins >= 50) {
      ratingLabel = "Playoff Lock";
    } else if (finalWins >= 41) {
      ratingLabel = "Competitive Roster";
    } else if (finalWins >= 30) {
      ratingLabel = "Play-in Bubble Team";
    }

    return {
      totalRawPPG,
      compositeTS,
      chemistry,
      predictedWins: finalWins,
      predictedLosses: finalLosses,
      predictedRecord,
      ratingLabel
    };
  }, [slots, playerAverages, playerIndex]);

  // Animate counter values when results are revealed
  useEffect(() => {
    if (!isRevealed || !teamScoutingReport) {
      setDisplayWins(0);
      setDisplayLosses(0);
      return;
    }

    const targetWins = teamScoutingReport.predictedWins;
    const targetLosses = teamScoutingReport.predictedLosses;
    const duration = 900;
    const startTime = performance.now();

    let animFrameId: number;

    const updateCounter = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);

      setDisplayWins(Math.round(targetWins * ease));
      setDisplayLosses(Math.round(targetLosses * ease));

      if (progress < 1) {
        animFrameId = requestAnimationFrame(updateCounter);
      } else {
        setDisplayWins(targetWins);
        setDisplayLosses(targetLosses);
      }
    };

    animFrameId = requestAnimationFrame(updateCounter);
    return () => cancelAnimationFrame(animFrameId);
  }, [isRevealed, teamScoutingReport]);

  // Trigger Season Simulation
  const handleSimulate = () => {
    if (draftedPlayerIds.length !== 5) return;
    setIsSimulating(true);
    setIsRevealed(false);
    setSimulationStep(0);

    setTimeout(() => setSimulationStep(1), 350);
    setTimeout(() => setSimulationStep(2), 700);
    setTimeout(() => setSimulationStep(3), 1050);
    setTimeout(() => {
      setIsSimulating(false);
      setIsRevealed(true);
    }, 1400);
  };

  return (
    <div className="dream-team-suite-container">
      <div className="dream-team-intro-card">
        <div className="intro-header">
          <Trophy className="trophy-icon" size={32} />
          <h2>Dream Team Builder</h2>
        </div>
        <p className="intro-text">
          Assemble the ultimate 5-player lineup using your favorite players across all eras!<br></br>
          <b></b> Every player must represent a different decade.
          Roll a random decade for each player and project their predicted record in an 82-game season.
        </p>
        {draftedPlayerIds.length > 0 && (
          <button className="reset-all-btn" onClick={handleResetAll}>
            <RefreshCw size={14} />
            <span>Reset Lineup</span>
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
          const suggestions = (() => {
            if (!slot.rolledDecade || searchVal.trim().length < 2) return [];
            const query = searchVal.toLowerCase();
            const filtered = playerIndex.filter(p => {
              const nameMatch = p.name.toLowerCase().includes(query);
              if (!nameMatch) return false;
              return checkCareerDecadeOverlap(p.start, p.end, slot.rolledDecade!);
            }).slice(0, 10);

            filtered.sort((a, b) => {
              if (a.is_star && !b.is_star) return -1;
              if (!a.is_star && b.is_star) return 1;
              return b.total_pts - a.total_pts;
            });

            return filtered;
          })();

          // Team-jersey color style
          const avatarStyle = (() => {
            if (!stats?.primaryTeam) return {};
            const colors = TEAM_COLORS[stats.primaryTeam] || { primary: '#6366f1', secondary: '#14b8a6' };
            return {
              backgroundColor: colors.primary,
              color: colors.secondary,
              borderColor: colors.secondary,
              borderWidth: '1.5px',
              borderStyle: 'solid' as const
            };
          })();

          return (
            <div
              key={slot.slotId}
              ref={el => { cardsRefs.current[slot.slotId] = el; }}
              className={`dream-player-card ${player ? 'has-player' :
                slot.rolledDecade ? 'decade-locked' :
                  isRolling ? 'rolling' : 'empty-slot'
                }`}
              onMouseMove={handleMouseMove}
            >
              {/* Case 1: Player Selected */}
              {player && stats ? (
                <div className="player-info-container">
                  <div className="player-card-header">
                    <div className="avatar-icon" style={avatarStyle}>
                      <User size={20} />
                    </div>
                    <div className="player-meta">
                      <h3 className="player-name">{formatPlayerName(player.name)}</h3>
                      <div className="decade-tag">
                        <span className="decade-label">{slot.rolledDecade}</span>
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

                  {/* Quick view of raw career-average stats */}
                  <div className="quick-stats-grid">
                    <div className="quick-stat-box">
                      <span className="stat-label">GP</span>
                      <span className="stat-val">{stats.rawAverages.gp}</span>
                    </div>
                    <div className="quick-stat-box">
                      <span className="stat-label">MIN</span>
                      <span className="stat-val">{stats.rawAverages.mpg.toFixed(1)}</span>
                    </div>

                    <div className="quick-stat-box highlight">
                      <span className="stat-label">PPG</span>
                      <span className="stat-val">{stats.rawAverages.ppg.toFixed(1)}</span>
                    </div>

                    <div className="quick-stat-box">
                      <span className="stat-label">RPG</span>
                      <span className="stat-val">{stats.rawAverages.rpg.toFixed(1)}</span>
                    </div>
                    <div className="quick-stat-box">
                      <span className="stat-label">APG</span>
                      <span className="stat-val">{stats.rawAverages.apg.toFixed(1)}</span>
                    </div>

                    <div className="quick-stat-box highlight">
                      <span className="stat-label">TS%</span>
                      <span className="stat-val">{(stats.rawAverages.tsPct * 100).toFixed(1)}%</span>
                    </div>
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

                      {isOpen && (suggestions.length > 0 || searchVal.trim().length < 2) && (
                        <ul className="suggestions-list" role="listbox">
                          {searchVal.trim().length < 2 ? (
                            <li className="suggestions-legend search-helper-text" style={{ fontStyle: 'italic', padding: '12px' }}>
                              Type at least 2 characters to search...
                            </li>
                          ) : (
                            <>
                              <li className="suggestions-legend">
                                <Star size={10} className="star-icon" fill="currentColor" />
                                <span>Star Players (All-Star / All-NBA) in the {slot.rolledDecade}</span>
                              </li>
                              {suggestions.map((item) => {
                                const isDrafted = draftedPlayerIds.includes(item.id);
                                return (
                                  <li
                                    key={item.id}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      if (!isDrafted) {
                                        handleSelectPlayer(slot.slotId, item);
                                      }
                                    }}
                                    className={`suggestion-item ${isDrafted ? 'disabled' : ''}`}
                                    role="option"
                                    aria-disabled={isDrafted}
                                  >
                                    <div className="suggestion-name-box">
                                      <span className="suggestion-name" style={{ color: isDrafted ? 'var(--text-muted)' : 'inherit' }}>{formatPlayerName(item.name)}</span>
                                      {item.is_star && <Star size={11} className="star-icon" fill="currentColor" />}
                                      {isDrafted && <span className="drafted-badge">Drafted</span>}
                                    </div>
                                    <span className="suggestion-years">
                                      {item.start.split('-')[0]} - {item.end.split('-')[0]}
                                    </span>
                                  </li>
                                );
                              })}
                            </>
                          )}
                        </ul>
                      )}
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
                        <button
                          onClick={() => handleRollEra(slot.slotId)}
                          className="roll-era-btn"
                        >
                          <span>Roll Era</span>
                        </button>
                      </div>
                    )}
            </div>
          );
        })}
      </div>

      {/* 82-0 Viral Season Simulation & Reveal Section */}
      {isRevealed && teamScoutingReport ? (
        // STATE 1: FINAL RESULTS REVEALED
        <div className="sim-results-hero-card">
          <div className="sim-results-header">
            <div className="sim-badge-wrapper">
              <div className={`rating-tier-badge ${teamScoutingReport.predictedWins >= 60 ? 'tier-elite' : teamScoutingReport.predictedWins >= 50 ? 'tier-good' : 'tier-subpar'}`}>
                <Trophy size={14} className="tier-icon" />
                <span>{teamScoutingReport.ratingLabel}</span>
              </div>
            </div>
            
            <div className="sim-record-display">
              <div className="record-counter-main">
                <span className="record-digit-wins">{displayWins}</span>
                <span className="record-separator">-</span>
                <span className="record-digit-losses">{displayLosses}</span>
              </div>
              <h3 className="record-caption">Predicted 82-Game Record</h3>
            </div>
          </div>

          <div className="report-metrics-grid">
            <div className="report-metric-box">
              <span className="metric-label">Combined PPG</span>
              <span className="metric-val">{teamScoutingReport.totalRawPPG.toFixed(1)}</span>
              <span className="metric-sub text-muted">Sum of player raw PPG</span>
            </div>

            <div className="report-metric-box">
              <span className="metric-label">Composite TS%</span>
              <span className="metric-val">{(teamScoutingReport.compositeTS * 100).toFixed(1)}%</span>
              <span className="metric-sub text-muted">Team shooting efficiency</span>
            </div>

            <div className="report-metric-box chemistry-box">
              <span className="metric-label">Lineup Chemistry</span>
              <div className="chem-bar-container">
                <div className="chem-bar" style={{ width: `${teamScoutingReport.chemistry}%` }}></div>
              </div>
              <span className="metric-val">{teamScoutingReport.chemistry}%</span>
              <span className="metric-sub text-muted">Synergy of roles and spacing</span>
            </div>
          </div>

          <div className="sim-results-actions">
            <button className="sim-action-btn primary" onClick={handleSimulate}>
              <Play size={15} fill="currentColor" />
              <span>Simulate Again</span>
            </button>
            <button className="sim-action-btn secondary" onClick={handleResetAll}>
              <RotateCcw size={15} />
              <span>Draft New Lineup</span>
            </button>
          </div>
        </div>
      ) : isSimulating ? (
        // STATE 2: ACTIVE SEASON SIMULATION TICKER
        <div className="sim-suspense-card">
          <div className="sim-suspense-glow"></div>
          <div className="sim-suspense-spinner">
            <Trophy size={42} className="sim-pulse-icon" />
          </div>
          <h3 className="sim-ticker-headline">Simulating 82-Game Season</h3>
          <p className="sim-ticker-subtext">{SIMULATION_MESSAGES[simulationStep]}</p>
          <div className="sim-progress-track">
            <div
              className="sim-progress-fill"
              style={{ width: `${((simulationStep + 1) / SIMULATION_MESSAGES.length) * 100}%` }}
            ></div>
          </div>
        </div>
      ) : draftedPlayerIds.length === 5 ? (
        // STATE 3: READY TO SIMULATE LAUNCHPAD
        <div className="sim-launchpad-card">
          <div className="sim-launchpad-badge">
            <Sparkles size={14} className="sparkle-icon" />
            <span>Lineup Assembled (5/5)</span>
          </div>
          <h3 className="sim-launchpad-title">Ready for 82 Games!</h3>
          <p className="sim-launchpad-description">
            Your 5-player cross-era superteam is locked in. Run the 82-game regular season simulation to reveal your predicted record and chemistry rating.
          </p>
          <button className="sim-start-btn" onClick={handleSimulate}>
            <Play size={18} fill="currentColor" />
            <span>Simulate 82-Game Season</span>
          </button>
        </div>
      ) : (
        // STATE 4: LINEUP IN PROGRESS (DRAFTING)
        <div className="sim-draft-progress-card">
          <div className="sim-progress-header">
            <Trophy size={28} className="progress-trophy-icon" />
            <div>
              <h3>Draft Your Starting 5</h3>
              <p className="sim-progress-sub">
                Draft 5 players across distinct eras to unlock regular season simulation. Results are revealed once your roster is complete!
              </p>
            </div>
          </div>

          <div className="sim-slot-indicators">
            {slots.map(s => {
              const p = s.playerId !== null ? loadedPlayers[s.playerId] : null;
              const isFilled = Boolean(p);
              return (
                <div key={s.slotId} className={`sim-slot-indicator ${isFilled ? 'filled' : s.rolledDecade ? 'rolled' : 'empty'}`}>
                  <div className="slot-indicator-dot">
                    {isFilled ? <CheckCircle2 size={12} /> : <span>{s.slotId}</span>}
                  </div>
                  <div className="slot-indicator-info">
                    <span className="slot-indicator-title">
                      {isFilled ? formatPlayerName(p!.name) : s.rolledDecade ? `${s.rolledDecade}` : `Slot ${s.slotId}`}
                    </span>
                    <span className="slot-indicator-meta">
                      {isFilled ? s.rolledDecade : s.rolledDecade ? 'Awaiting Draft' : 'Unrolled Era'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sim-progress-bar-container">
            <div className="sim-progress-bar-track">
              <div className="sim-progress-bar-value" style={{ width: `${(draftedPlayerIds.length / 5) * 100}%` }}></div>
            </div>
            <span className="sim-progress-count">{draftedPlayerIds.length} of 5 Players Drafted</span>
          </div>
        </div>
      )}
    </div>
  );
};
