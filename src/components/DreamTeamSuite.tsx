import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Trash2, User, Star, Trophy, Sparkles, RefreshCw, ShieldAlert } from 'lucide-react';
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

    if (draftedPlayers.length === 0) return null;

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
    const details: string[] = [];

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

    // Spacing check (adjust thresholds for raw stats since pre-1980 is 0)
    if (total3PA >= 15.0) {
      baseScore += 10;
      details.push('Elite floor spacing (Team 3PA >= 15) creates wide driving lanes.');
    } else if (total3PA >= 8.0) {
      baseScore += 5;
      details.push('Capable deep-range spacing.');
    } else {
      baseScore -= 5;
      details.push('Limited deep shooting threats; defenses may collapse in the paint.');
    }

    // Ball Dominance check
    const highVolumeScorers = draftedPlayers.filter(p => p.rawAverages.ppg >= 22.0).length;
    if (highVolumeScorers >= 4) {
      baseScore -= 10;
      details.push('Too many ball-dominant scorers (4+ players with >=22 PPG); diminishing returns.');
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

    if (draftedPlayers.length === 5) {
      // Clamp between 25 and 74 wins for realistic outcomes of all-star dream lineups
      finalWins = Math.max(25, Math.min(74, finalWins));
    } else {
      // Scale down for incomplete lineup
      finalWins = Math.max(10, Math.min(41, Math.round((draftedPlayers.length / 5) * finalWins)));
    }

    const finalLosses = 82 - finalWins;
    const predictedRecord = `${finalWins} - ${finalLosses}`;

    let ratingLabel = "Play-in Bubble Team";
    if (finalWins >= 68) {
      ratingLabel = "All-Time Dynastic Force";
    } else if (finalWins >= 60) {
      ratingLabel = "Championship Contender";
    } else if (finalWins >= 50) {
      ratingLabel = "Playoff Lock";
    } else if (finalWins >= 41) {
      ratingLabel = "Competitive Roster";
    }

    return {
      totalRawPPG,
      compositeTS,
      chemistry,
      details,
      isComplete: draftedPlayers.length === 5,
      predictedRecord,
      ratingLabel
    };
  }, [slots, playerAverages, playerIndex]);

  return (
    <div className="dream-team-suite-container">
      <div className="dream-team-intro-card">
        <div className="intro-header">
          <Trophy className="trophy-icon" size={32} />
          <h2>Dream Team Builder</h2>
        </div>
        <p className="intro-text">
          Assemble the ultimate 5-player lineup using your favorite players across all eras!<br></br>
          <b>Rule constraint:</b> Every player must represent a different decade.
          We'll roll a random era for each and project their predicted record in an 82-game season.
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
                              onMouseDown={(e) => {
                                e.preventDefault();
                                if (!isDrafted) {
                                  handleSelectPlayer(slot.slotId, item);
                                }
                              }}
                              className={`suggestion-item ${isDrafted ? 'disabled' : ''}`}
                            >
                              <div className="suggestion-name-box">
                                <span className="suggestion-name" style={{ color: isDrafted ? '#6b7280' : 'inherit' }}>{formatPlayerName(item.name)}</span>
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

      {/* Scouting Report Summary */}
      {teamScoutingReport ? (
        <div className="team-scouting-report-card">
          <div className="report-header">
            <Trophy className="report-title-icon" size={24} />
            <h3>Lineup Scouting Report</h3>
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

            <div className="report-metric-box record-box">
              <span className="metric-label">Predicted 82-Game Record</span>
              <span className="metric-val">{teamScoutingReport.predictedRecord}</span>
              <span className="metric-sub text-muted font-semibold text-green" style={{ color: 'var(--color-star)' }}>
                {teamScoutingReport.ratingLabel}
              </span>
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
          <Trophy size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <h3>Awaiting Lineup Selection</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '28rem', textAlign: 'center' }}>
            Roll eras for each of the 5 slots above and draft players to evaluate your lineup's cross-era efficiency and chemistry.
          </p>
        </div>
      )}
    </div>
  );
};
