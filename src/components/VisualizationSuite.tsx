import React from 'react';
import { ArrowRight } from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar
} from 'recharts';
import type { AdjustedStats } from '../utils/statsCalculations';
import type { PlayerData } from '../hooks/usePlayerData';

interface SelectedPlayerConfig {
  slotId: number;
  playerId: number;
  season: string;
}

interface VisualizationSuiteProps {
  selectedConfigs: SelectedPlayerConfig[];
  loadedPlayers: Record<number, PlayerData>;
  adjustmentMode: 'raw' | 'per75' | 'modernized';
  adjustedStatsMap: Record<number, AdjustedStats>;
  targetBaseline: string;
  leagueBaselines: Record<string, any>;
  decadeBaselines: Record<string, any>;
}

// Helper to convert hex to rgb for styling borders and shadows
const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
};

// Accent colors for visual representation of up to 4 players
const PALETTE = [
  { stroke: '#2563eb', fill: '#2563eb', name: 'Electric Blue' },     // Player 1
  { stroke: '#d97706', fill: '#d97706', name: 'Amber Gold' },       // Player 2
  { stroke: '#8b5cf6', fill: '#8b5cf6', name: 'Amethyst Purple' },  // Player 3
  { stroke: '#06b6d4', fill: '#06b6d4', name: 'Cyan' }              // Player 4
];

export const VisualizationSuite: React.FC<VisualizationSuiteProps> = ({
  selectedConfigs,
  loadedPlayers,
  adjustmentMode,
  adjustedStatsMap,
  targetBaseline,
  leagueBaselines,
  decadeBaselines
}) => {
  if (selectedConfigs.length === 0) {
    return (
      <div className="no-data-placeholder">
        <h3>No Players Selected</h3>
        <p>Search and add players to the slots above to begin comparison.</p>
      </div>
    );
  }

  // 1. Prepare Radar Chart Data (Normalized to 0-100 scale for visual balance)
  // Dimensions: Scoring, Rebounding, Playmaking, Spacing (3PA), Efficiency (TS%)
  const getRadarData = () => {
    const categories = [
      { name: 'Scoring', key: 'pts' },
      { name: 'Rebounding', key: 'reb' },
      { name: 'Playmaking', key: 'ast' },
      { name: 'Spacing (3PA)', key: 'fg3a' },
      { name: 'Efficiency (TS%)', key: 'ts' }
    ];

    return categories.map(cat => {
      const dataPoint: any = { subject: cat.name };

      selectedConfigs.forEach((config) => {
        const stats = adjustedStatsMap[config.slotId];
        if (!stats) return;

        let val = 0;
        let maxVal = 1;

        if (adjustmentMode === 'raw') {
          if (cat.key === 'pts') { val = stats.pts; maxVal = 35; }
          else if (cat.key === 'reb') { val = stats.reb; maxVal = 15; }
          else if (cat.key === 'ast') { val = stats.ast; maxVal = 12; }
          else if (cat.key === 'fg3a') { val = stats.fg3a; maxVal = 10; }
          else if (cat.key === 'ts') { val = stats.tsPct; maxVal = 0.68; }
        } else if (adjustmentMode === 'per75') {
          if (cat.key === 'pts') { val = stats.pts_per75; maxVal = 40; }
          else if (cat.key === 'reb') { val = stats.reb_per75; maxVal = 18; }
          else if (cat.key === 'ast') { val = stats.ast_per75; maxVal = 14; }
          else if (cat.key === 'fg3a') { val = stats.fg3a_per75; maxVal = 12; }
          else if (cat.key === 'ts') { val = stats.tsPct; maxVal = 0.68; }
        } else { // modernized
          if (cat.key === 'pts') { val = stats.modern_pts_per75; maxVal = 40; }
          else if (cat.key === 'reb') { val = stats.reb_per75; maxVal = 18; }
          else if (cat.key === 'ast') { val = stats.ast_per75; maxVal = 14; }
          else if (cat.key === 'fg3a') { val = stats.modern_fg3a_per75; maxVal = 12; }
          else if (cat.key === 'ts') { val = stats.modern_ts_pct; maxVal = 0.68; }
        }

        const player = loadedPlayers[config.playerId];
        const label = player ? `${player.name} (${config.season})` : `Slot ${config.slotId}`;

        // Compute index: (value / maxVal) * 100, capped at 100
        const index = Math.min(100, Math.max(0, (val / maxVal) * 100));
        dataPoint[label] = Math.round(index * 10) / 10;
      });

      return dataPoint;
    });
  };

  // 2. Prepare Bar Chart Data (Points Breakdown)
  const getBarData = () => {
    return selectedConfigs.map(config => {
      const stats = adjustedStatsMap[config.slotId];
      const player = loadedPlayers[config.playerId];
      const name = player ? `${player.name} (${config.season})` : `Slot ${config.slotId}`;

      if (!stats) return { name, '2PT Points': 0, '3PT Points': 0, 'FT Points': 0 };

      let pts_val = stats.pts;
      let fg3m_val = stats.fg3a * (stats.fg3Pct); // Estimate 3PM
      let ftm_val = stats.fta * stats.ftPct;

      if (adjustmentMode === 'per75') {
        pts_val = stats.pts_per75;
        fg3m_val = stats.fg3a_per75 * stats.fg3Pct;
        ftm_val = stats.fta_per75 * stats.ftPct;
      } else if (adjustmentMode === 'modernized') {
        pts_val = stats.modern_pts_per75;
        fg3m_val = stats.modern_fg3m_per75;
        ftm_val = stats.fta_per75 * stats.ftPct;
      }

      const ftPts = ftm_val;
      const fg3Pts = fg3m_val * 3;
      const fg2Pts = Math.max(0, pts_val - ftPts - fg3Pts);

      return {
        name,
        '2PT PTS': Math.round(fg2Pts * 10) / 10,
        '3PT PTS': Math.round(fg3Pts * 10) / 10,
        'FT PTS': Math.round(ftPts * 10) / 10
      };
    });
  };

  const radarData = getRadarData();
  const barData = getBarData();

  return (
    <div className="visualization-suite">
      <div className="charts-row">
        {/* Radar Chart */}
        <div className="chart-card">
          <h4>Player Skill Profile</h4>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="rgba(148, 163, 184, 0.08)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569' }} />
                {selectedConfigs.map((config, idx) => {
                  const player = loadedPlayers[config.playerId];
                  const label = player ? `${player.name} (${config.season})` : `Slot ${config.slotId}`;
                  const color = PALETTE[idx % PALETTE.length];
                  return (
                    <Radar
                      key={config.slotId}
                      name={label}
                      dataKey={label}
                      stroke={color.stroke}
                      fill={color.fill}
                      fillOpacity={0.15}
                    />
                  );
                })}
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-control)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '10px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="chart-card">
          <h4>Scoring Profile Breakdown</h4>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.06)" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis label={{ value: 'Points', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} tick={{ fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-control)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '10px' }} />
                <Bar dataKey="2PT PTS" stackId="a" fill="#2563eb" />
                <Bar dataKey="3PT PTS" stackId="a" fill="#d97706" />
                <Bar dataKey="FT PTS" stackId="a" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Era Translation Impact Cards */}
      {adjustmentMode === 'modernized' && (
        <div className="projection-impact-section">
          <div className="section-header">
            <h4>Era Translation Impact (Then vs. Now)</h4>
            <p className="section-subtitle">
              Detailed breakdown of how pace, spacing, and defensive rule adjustments project career stats onto the {targetBaseline} target era.
            </p>
          </div>
          <div className="projection-cards-grid">
            {selectedConfigs.map((config, idx) => {
              const stats = adjustedStatsMap[config.slotId];
              const player = loadedPlayers[config.playerId];
              if (!stats || !player) return null;

              const originalSeasonStats = player.seasons.find(s => s.season === config.season);
              const originalEraBaseline = leagueBaselines[config.season];
              const targetEraBaseline = decadeBaselines[targetBaseline];

              if (!originalSeasonStats || !originalEraBaseline || !targetEraBaseline) return null;

              const color = PALETTE[idx % PALETTE.length];

              // Calculate original averages
              const origPPG = originalSeasonStats.pts / originalSeasonStats.gp;
              const orig3PA = originalSeasonStats.fg3a / originalSeasonStats.gp;
              const origTS = (originalSeasonStats.pts / (2 * (originalSeasonStats.fga + 0.44 * originalSeasonStats.fta))) * 100;

              return (
                <div 
                  key={config.slotId} 
                  className="projection-impact-card" 
                  style={{ borderLeft: `4px solid ${color.stroke}`, boxShadow: `0 4px 20px rgba(${hexToRgb(color.stroke)}, 0.05)` }}
                >
                  <div className="card-player-header">
                    <span className="player-badge-indicator" style={{ backgroundColor: color.stroke }}></span>
                    <div>
                      <h5>{player.name}</h5>
                      <span className="season-label">{config.season} ({originalSeasonStats.team})</span>
                    </div>
                  </div>

                  <div className="impact-columns">
                    {/* Then */}
                    <div className="impact-col">
                      <div className="col-title">THEN ({config.season})</div>
                      <div className="metric-row">
                        <span className="metric-lbl">Pace</span>
                        <span className="metric-val">{originalEraBaseline.league_pace.toFixed(1)}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-lbl">PPG</span>
                        <span className="metric-val highlight">{origPPG.toFixed(1)}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-lbl">3PA</span>
                        <span className="metric-val">{orig3PA.toFixed(1)}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-lbl">TS%</span>
                        <span className="metric-val">{origTS.toFixed(1)}%</span>
                      </div>
                    </div>

                    {/* Arrow Divider */}
                    <div className="impact-divider">
                      <ArrowRight size={16} className="impact-arrow" />
                    </div>

                    {/* Now */}
                    <div className="impact-col projected">
                      <div className="col-title">NOW ({targetBaseline})</div>
                      <div className="metric-row">
                        <span className="metric-lbl">Pace</span>
                        <span className="metric-val">{targetEraBaseline.league_pace.toFixed(1)}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-lbl">PPG</span>
                        <span className="metric-val highlight" style={{ color: color.stroke }}>
                          {stats.modern_pts_per75.toFixed(1)}
                        </span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-lbl">3PA</span>
                        <span className="metric-val">
                          {stats.modern_fg3a_per75.toFixed(1)}
                        </span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-lbl">TS%</span>
                        <span className="metric-val">
                          {(stats.modern_ts_pct * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison Metrics Table */}
      <div className="table-card">
        <h4>Detailed Stats Comparison</h4>
        <div className="table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Category</th>
                {selectedConfigs.map((config, idx) => {
                  const player = loadedPlayers[config.playerId];
                  return (
                    <th key={config.slotId} style={{ color: PALETTE[idx % PALETTE.length].stroke }}>
                      {player ? player.name : `Slot ${config.slotId}`}
                      <div className="th-sub">{config.season}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Row: GP */}
              <tr>
                <td className="stat-name">Games Played (GP)</td>
                {selectedConfigs.map(config => {
                  const stats = adjustedStatsMap[config.slotId];
                  return <td key={config.slotId} className="stat-value">{stats ? stats.gp : '-'}</td>;
                })}
              </tr>

              {/* Row: MIN */}
              <tr>
                <td className="stat-name">Minutes Per Game</td>
                {selectedConfigs.map(config => {
                  const stats = adjustedStatsMap[config.slotId];
                  return <td key={config.slotId} className="stat-value">{stats ? stats.min.toFixed(1) : '-'}</td>;
                })}
              </tr>

              {/* Row: PTS */}
              <tr>
                <td className="stat-name font-bold">Points</td>
                {selectedConfigs.map(config => {
                  const stats = adjustedStatsMap[config.slotId];
                  if (!stats) return <td key={config.slotId}>-</td>;
                  const val = adjustmentMode === 'raw' ? stats.pts :
                    adjustmentMode === 'per75' ? stats.pts_per75 : stats.modern_pts_per75;
                  return <td key={config.slotId} className="stat-value font-bold">{val.toFixed(1)}</td>;
                })}
              </tr>

              {/* Row: REB */}
              <tr>
                <td className="stat-name">Rebounds</td>
                {selectedConfigs.map(config => {
                  const stats = adjustedStatsMap[config.slotId];
                  if (!stats) return <td key={config.slotId}>-</td>;
                  const val = adjustmentMode === 'raw' ? stats.reb : stats.reb_per75;
                  return <td key={config.slotId} className="stat-value">{val.toFixed(1)}</td>;
                })}
              </tr>

              {/* Row: AST */}
              <tr>
                <td className="stat-name">Assists</td>
                {selectedConfigs.map(config => {
                  const stats = adjustedStatsMap[config.slotId];
                  if (!stats) return <td key={config.slotId}>-</td>;
                  const val = adjustmentMode === 'raw' ? stats.ast : stats.ast_per75;
                  return <td key={config.slotId} className="stat-value">{val.toFixed(1)}</td>;
                })}
              </tr>

              {/* Row: STL */}
              <tr>
                <td className="stat-name">Steals</td>
                {selectedConfigs.map(config => {
                  const stats = adjustedStatsMap[config.slotId];
                  if (!stats) return <td key={config.slotId}>-</td>;
                  const val = adjustmentMode === 'raw' ? stats.stl : stats.stl_per75;
                  return <td key={config.slotId} className="stat-value">{val.toFixed(1)}</td>;
                })}
              </tr>

              {/* Row: BLK */}
              <tr>
                <td className="stat-name">Blocks</td>
                {selectedConfigs.map(config => {
                  const stats = adjustedStatsMap[config.slotId];
                  if (!stats) return <td key={config.slotId}>-</td>;
                  const val = adjustmentMode === 'raw' ? stats.blk : stats.blk_per75;
                  return <td key={config.slotId} className="stat-value">{val.toFixed(1)}</td>;
                })}
              </tr>

              {/* Row: TOV */}
              <tr>
                <td className="stat-name">Turnovers</td>
                {selectedConfigs.map(config => {
                  const stats = adjustedStatsMap[config.slotId];
                  if (!stats) return <td key={config.slotId}>-</td>;
                  const val = adjustmentMode === 'raw' ? stats.tov : stats.tov_per75;
                  return <td key={config.slotId} className="stat-value">{val.toFixed(1)}</td>;
                })}
              </tr>

              {/* Row: FG% */}
              <tr>
                <td className="stat-name">Field Goal % (FG%)</td>
                {selectedConfigs.map(config => {
                  const stats = adjustedStatsMap[config.slotId];
                  return <td key={config.slotId} className="stat-value">{stats ? `${(stats.fgPct * 100).toFixed(1)}%` : '-'}</td>;
                })}
              </tr>

              {/* Row: 3PA */}
              <tr>
                <td className="stat-name">3PA Per Game / Per 75</td>
                {selectedConfigs.map(config => {
                  const stats = adjustedStatsMap[config.slotId];
                  if (!stats) return <td key={config.slotId}>-</td>;
                  const val = adjustmentMode === 'raw' ? stats.fg3a :
                    adjustmentMode === 'per75' ? stats.fg3a_per75 : stats.modern_fg3a_per75;
                  return <td key={config.slotId} className="stat-value">{val.toFixed(1)}</td>;
                })}
              </tr>

              {/* Row: 3P% */}
              <tr>
                <td className="stat-name">3-Point % (3P%)</td>
                {selectedConfigs.map(config => {
                  const stats = adjustedStatsMap[config.slotId];
                  return <td key={config.slotId} className="stat-value">
                    {stats && stats.fg3a > 0 ? `${(stats.fg3Pct * 100).toFixed(1)}%` : '-'}
                  </td>;
                })}
              </tr>

              {/* Row: FT% */}
              <tr>
                <td className="stat-name">Free Throw % (FT%)</td>
                {selectedConfigs.map(config => {
                  const stats = adjustedStatsMap[config.slotId];
                  return <td key={config.slotId} className="stat-value">{stats ? `${(stats.ftPct * 100).toFixed(1)}%` : '-'}</td>;
                })}
              </tr>

              {/* Row: TS% */}
              <tr>
                <td className="stat-name font-bold">True Shooting % (TS%)</td>
                {selectedConfigs.map(config => {
                  const stats = adjustedStatsMap[config.slotId];
                  if (!stats) return <td key={config.slotId}>-</td>;
                  const val = adjustmentMode === 'modernized' ? stats.modern_ts_pct : stats.tsPct;
                  return <td key={config.slotId} className="stat-value font-bold">{(val * 100).toFixed(1)}%</td>;
                })}
              </tr>

              {/* Row: rTS% */}
              <tr>
                <td className="stat-name">Relative Efficiency (rTS%)</td>
                {selectedConfigs.map(config => {
                  const stats = adjustedStatsMap[config.slotId];
                  if (!stats) return <td key={config.slotId}>-</td>;
                  const val = stats.modern_rTS * 100;
                  const sign = val >= 0 ? '+' : '';
                  return (
                    <td key={config.slotId} className={`stat-value font-semibold ${val >= 0 ? 'text-green' : 'text-red'}`}>
                      {sign}{val.toFixed(1)}%
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default VisualizationSuite;
