import { describe, it, expect } from 'vitest';
import {
  calculateTS,
  adjustPlayerStats,
  calculateCareerStats
} from './statsCalculations';
import type { PlayerSeasonStats, LeagueBaseline } from './statsCalculations';

describe('statsCalculations utils', () => {
  describe('calculateTS', () => {
    it('calculates true shooting percentage correctly', () => {
      // TS% = PTS / (2 * (FGA + 0.44 * FTA))
      // e.g. PTS = 20, FGA = 10, FTA = 10
      // TS% = 20 / (2 * (10 + 4.4)) = 20 / 28.8 = ~0.6944
      expect(calculateTS(20, 10, 10)).toBeCloseTo(0.6944, 4);
    });

    it('returns 0 when shots and free throws are zero to prevent division by zero', () => {
      expect(calculateTS(0, 0, 0)).toBe(0);
    });
  });

  describe('adjustPlayerStats', () => {
    const dummyPlayerStats: PlayerSeasonStats = {
      season: '1995-96',
      team: 'CHI',
      gp: 82,
      min: 3090, // ~37.7 mpg
      pts: 2491, // ~30.4 ppg
      reb: 543,
      ast: 352,
      stl: 180,
      blk: 41,
      tov: 197,
      pf: 195,
      fgm: 916,
      fga: 1850,
      fg3m: 111,
      fg3a: 260,
      ftm: 548,
      fta: 650
    };

    const eraBaseline: LeagueBaseline = {
      season: '1995-96',
      league_pace: 91.8,
      league_ts_pct: 0.542,
      league_fg3a_per_fga: 0.160
    };

    const modernBaseline: LeagueBaseline = {
      season: '2023-24',
      league_pace: 98.5,
      league_ts_pct: 0.580,
      league_fg3a_per_fga: 0.390
    };

    it('correctly calculates raw averages per game', () => {
      const adjusted = adjustPlayerStats(dummyPlayerStats, eraBaseline, modernBaseline);
      
      expect(adjusted.gp).toBe(82);
      expect(adjusted.min).toBeCloseTo(37.68, 2);
      expect(adjusted.pts).toBeCloseTo(30.38, 2);
      expect(adjusted.fgPct).toBeCloseTo(916 / 1850, 4);
      expect(adjusted.fg3Pct).toBeCloseTo(111 / 260, 4);
      expect(adjusted.ftPct).toBeCloseTo(548 / 650, 4);
    });

    it('projects pace adjusted stats per 75 possessions', () => {
      const adjusted = adjustPlayerStats(dummyPlayerStats, eraBaseline, modernBaseline);

      // Formula: RawStat * 3600 / (EraPace * Minutes)
      const expectedPaceFactor = 3600 / (91.8 * 3090);
      const expectedPts75 = dummyPlayerStats.pts * expectedPaceFactor;
      expect(adjusted.pts_per75).toBeCloseTo(expectedPts75, 4);
    });

    it('calculates modern relative TS% (rTS)', () => {
      const adjusted = adjustPlayerStats(dummyPlayerStats, eraBaseline, modernBaseline);
      
      const rawTS = calculateTS(dummyPlayerStats.pts, dummyPlayerStats.fga, dummyPlayerStats.fta);
      const expectedRTS = rawTS - eraBaseline.league_ts_pct;
      
      expect(adjusted.modern_rTS).toBeCloseTo(expectedRTS, 4);
      expect(adjusted.modern_ts_pct).toBeCloseTo(modernBaseline.league_ts_pct + expectedRTS, 4);
    });

    it('applies hand-checking modifier to modern TS%', () => {
      const adjusted = adjustPlayerStats(dummyPlayerStats, eraBaseline, modernBaseline, {
        handChecking: 1.1 // Boost TS% by 10%
      });

      const rawTS = calculateTS(dummyPlayerStats.pts, dummyPlayerStats.fga, dummyPlayerStats.fta);
      const expectedRTS = rawTS - eraBaseline.league_ts_pct;
      const expectedTS = (modernBaseline.league_ts_pct + expectedRTS) * 1.1;

      expect(adjusted.modern_ts_pct).toBeCloseTo(expectedTS, 4);
    });

    it('applies modern 3-point volume override if provided', () => {
      const adjusted = adjustPlayerStats(dummyPlayerStats, eraBaseline, modernBaseline, {
        threePointVolumeOverride: 0.50 // 50% 3PA rate baseline override
      });

      // era_3far = 260 / 1850 = 0.1405
      // rel_3far = era_3far / 0.160 = 0.8784
      // modern_3far = 0.8784 * 0.50 = 0.4392
      // modern_fg3a_per75 = modern_3far * fga_per75
      const paceFactor = 3600 / (91.8 * 3090);
      const fga_per75 = dummyPlayerStats.fga * paceFactor;
      const expectedFg3a75 = 0.439189 * fga_per75;
      
      expect(adjusted.modern_fg3a_per75).toBeCloseTo(expectedFg3a75, 4);
    });
  });

  describe('calculateCareerStats', () => {
    const seasons: PlayerSeasonStats[] = [
      {
        season: '1990-91',
        team: 'CHI',
        gp: 82,
        min: 3034,
        pts: 2580,
        reb: 492,
        ast: 453,
        stl: 223,
        blk: 83,
        tov: 202,
        pf: 228,
        fgm: 990,
        fga: 1837,
        fg3m: 29,
        fg3a: 93,
        ftm: 571,
        fta: 671
      },
      {
        season: '1991-92',
        team: 'CHI',
        gp: 80,
        min: 3102,
        pts: 2404,
        reb: 511,
        ast: 489,
        stl: 182,
        blk: 75,
        tov: 200,
        pf: 201,
        fgm: 943,
        fga: 1817,
        fg3m: 27,
        fg3a: 100,
        ftm: 491,
        fta: 590
      }
    ];

    const baselines: Record<string, LeagueBaseline> = {
      '1990-91': {
        season: '1990-91',
        league_pace: 97.8,
        league_ts_pct: 0.534,
        league_fg3a_per_fga: 0.076
      },
      '1991-92': {
        season: '1991-92',
        league_pace: 96.6,
        league_ts_pct: 0.531,
        league_fg3a_per_fga: 0.077
      }
    };

    it('aggregates multi-season totals', () => {
      const { careerStats } = calculateCareerStats(seasons, baselines);

      expect(careerStats.gp).toBe(162);
      expect(careerStats.min).toBe(6136);
      expect(careerStats.pts).toBe(4984);
      expect(careerStats.reb).toBe(1003);
      expect(careerStats.ast).toBe(942);
    });

    it('calculates games-played weighted career baselines', () => {
      const { careerBaseline } = calculateCareerStats(seasons, baselines);

      // Weighted pace: (97.8 * 82 + 96.6 * 80) / 162 = 15747.6 / 162 = 97.2074 -> rounded to 1 decimal = 97.2
      expect(careerBaseline.league_pace).toBe(97.2);
      // Weighted TS: (0.534 * 82 + 0.531 * 80) / 162 = 86.268 / 162 = 0.532518 -> rounded to 4 decimals = 0.5325
      expect(careerBaseline.league_ts_pct).toBe(0.5325);
    });
  });
});
