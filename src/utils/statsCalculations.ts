export interface PlayerSeasonStats {
  season: string;
  team: string;
  gp: number;
  min: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  fgm: number;
  fga: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
}

export interface LeagueBaseline {
  season: string;
  league_pace: number;
  league_ts_pct: number;
  league_fg3a_per_fga: number;
}

export interface AdjustedStats {
  // Original Raw Per Game
  gp: number;
  min: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  fgPct: number;
  fg3Pct: number;
  ftPct: number;
  tsPct: number;
  fga: number;
  fta: number;
  fg3a: number;

  // Pace Adjusted (Per 75 Possessions)
  pts_per75: number;
  reb_per75: number;
  ast_per75: number;
  stl_per75: number;
  blk_per75: number;
  tov_per75: number;
  fga_per75: number;
  fta_per75: number;
  fg3a_per75: number;

  // Modern Projected Stats (Adjusted to Modern Pace & Spacing)
  modern_ts_pct: number;
  modern_rTS: number;
  modern_fg3a_per75: number;
  modern_fg3m_per75: number;
  modern_pts_per75: number; // Re-calculated using modern projected TS% and pace-adjusted shots
}

/**
 * Calculates raw shooting percentages
 */
export function calculateTS(pts: number, fga: number, fta: number): number {
  const denom = 2 * (fga + 0.44 * fta);
  return denom > 0 ? pts / denom : 0;
}

/**
 * Normalizes season-by-season statistics to both raw per-game and modern-adjusted metrics.
 */
export function adjustPlayerStats(
  playerStats: PlayerSeasonStats,
  eraBaseline: LeagueBaseline,
  modernBaseline: LeagueBaseline,
  modifiers?: {
    handChecking?: number;
    threePointVolumeOverride?: number;
  }
): AdjustedStats {
  const gp = playerStats.gp || 1;
  const min = playerStats.min;
  const fga = playerStats.fga;
  const fta = playerStats.fta;
  const fg3a = playerStats.fg3a;
  const fgm = playerStats.fgm;
  const fg3m = playerStats.fg3m;
  const ftm = playerStats.ftm;
  const pts = playerStats.pts;

  // 1. Raw Per Game Statistics
  const mins_pg = min / gp;
  const pts_pg = pts / gp;
  const reb_pg = playerStats.reb / gp;
  const ast_pg = playerStats.ast / gp;
  const stl_pg = playerStats.stl / gp;
  const blk_pg = playerStats.blk / gp;
  const tov_pg = playerStats.tov / gp;
  const pf_pg = playerStats.pf / gp;
  
  const fga_pg = fga / gp;
  const fta_pg = fta / gp;
  const fg3a_pg = fg3a / gp;

  const fgPct = fga > 0 ? fgm / fga : 0;
  const fg3Pct = fg3a > 0 ? fg3m / fg3a : 0;
  const ftPct = fta > 0 ? ftm / fta : 0;
  const tsPct = calculateTS(pts, fga, fta);

  // 2. Pace Adjustment (Per 75 Possessions)
  // Formula: RawStat * 3600 / (EraPace * Minutes)
  const pace = eraBaseline.league_pace;
  
  const paceFactor = (min > 0 && pace > 0) ? 3600 / (pace * min) : 0;

  const pts_per75 = pts * paceFactor;
  const reb_per75 = playerStats.reb * paceFactor;
  const ast_per75 = playerStats.ast * paceFactor;
  const stl_per75 = playerStats.stl * paceFactor;
  const blk_per75 = playerStats.blk * paceFactor;
  const tov_per75 = playerStats.tov * paceFactor;
  const fga_per75 = fga * paceFactor;
  const fta_per75 = fta * paceFactor;
  const fg3a_per75 = fg3a * paceFactor;

  // 3. Modern Efficiency Adjustments (rTS)
  const rTS = tsPct - eraBaseline.league_ts_pct;
  const handCheckMod = modifiers?.handChecking !== undefined ? modifiers.handChecking : 1.0;
  const modern_ts_pct = Math.max(0.1, Math.min(0.95, (modernBaseline.league_ts_pct + rTS) * handCheckMod));

  // 4. Modern 3-Point Projection
  // Scale player 3FAr relative to their era average, then project onto modern baseline
  let modern_fg3a_per75 = 0;
  let modern_fg3m_per75 = 0;

  const eraYearStr = playerStats.season.split("-")[0];
  const eraYear = parseInt(eraYearStr, 10);

  if (eraYear >= 1979) { // 3-point line was introduced in 1979-80
    const era_3far = fga > 0 ? fg3a / fga : 0;
    const rel_3far = eraBaseline.league_fg3a_per_fga > 0 ? era_3far / eraBaseline.league_fg3a_per_fga : 0;
    
    // Modern 3-point attempt rate is relative rate * modern baseline rate (or override rate)
    const target_3far_baseline = modifiers?.threePointVolumeOverride !== undefined 
      ? modifiers.threePointVolumeOverride 
      : modernBaseline.league_fg3a_per_fga;
      
    const modern_3far = rel_3far * target_3far_baseline;
    
    // modern 3pa is modern 3far * pace-adjusted fga
    modern_fg3a_per75 = modern_3far * fga_per75;
    
    // We assume the player maintains their historical 3P%
    modern_fg3m_per75 = modern_fg3a_per75 * fg3Pct;
  }

  // 5. Projected Modern Points Per 75 Possessions
  // Calculated by estimating points from projected modern efficiency (TS%) and shot volume:
  // Points = TS% * 2 * (FGA_per75 + 0.44 * FTA_per75)
  const modern_pts_per75 = modern_ts_pct * 2 * (fga_per75 + 0.44 * fta_per75);

  return {
    gp,
    min: mins_pg,
    pts: pts_pg,
    reb: reb_pg,
    ast: ast_pg,
    stl: stl_pg,
    blk: blk_pg,
    tov: tov_pg,
    pf: pf_pg,
    fgPct,
    fg3Pct,
    ftPct,
    tsPct,
    fga: fga_pg,
    fta: fta_pg,
    fg3a: fg3a_pg,

    // Per 75 stats
    pts_per75,
    reb_per75,
    ast_per75,
    stl_per75,
    blk_per75,
    tov_per75,
    fga_per75,
    fta_per75,
    fg3a_per75,

    // Modern projected
    modern_ts_pct,
    modern_rTS: rTS,
    modern_fg3a_per75,
    modern_fg3m_per75,
    modern_pts_per75
  };
}
