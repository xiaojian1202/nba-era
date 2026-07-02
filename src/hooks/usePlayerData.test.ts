import { renderHook, waitFor } from '@testing-library/react';
import { usePlayerData } from './usePlayerData';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('usePlayerData Hook', () => {
  const dummyPlayerIndex = [
    { id: 2544, name: 'LeBron James', start: '2003-04', end: '2023-24', total_pts: 40474, total_min: 56597, is_star: true }
  ];

  const dummyBaselines = {
    '2023-24': {
      season: '2023-24',
      league_pace: 98.5,
      league_ts_pct: 0.580,
      league_fg3a_per_fga: 0.390
    }
  };

  const dummyPlayerData = {
    id: 2544,
    name: 'LeBron James',
    seasons: [
      {
        season: '2023-24',
        team: 'LAL',
        gp: 71,
        min: 2500,
        pts: 1800,
        reb: 500,
        ast: 500,
        stl: 90,
        blk: 40,
        tov: 240,
        pf: 80,
        fgm: 650,
        fga: 1200,
        fg3m: 140,
        fg3a: 340,
        ftm: 360,
        fta: 480
      }
    ]
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads player index and league baselines on mount', async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.includes('player_index.json')) {
        return Promise.resolve({ ok: true, json: async () => dummyPlayerIndex } as Response);
      }
      if (urlStr.includes('league_baselines.json')) {
        return Promise.resolve({ ok: true, json: async () => dummyBaselines } as Response);
      }
      return Promise.resolve({ ok: false } as Response);
    });

    const { result } = renderHook(() => usePlayerData());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.playerIndex).toEqual(dummyPlayerIndex);
    expect(result.current.leagueBaselines).toEqual(dummyBaselines);
  });

  it('sets error state if index loading fails', async () => {
    // Silence console.error for clean test logs
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(fetch).mockImplementation(() => {
      return Promise.resolve({ ok: false, statusText: 'Not Found' } as Response);
    });

    const { result } = renderHook(() => usePlayerData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('Failed to load player index');
    
    consoleSpy.mockRestore();
  });

  it('fetches on-demand player data and caches it', async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.includes('player_index.json')) {
        return Promise.resolve({ ok: true, json: async () => dummyPlayerIndex } as Response);
      }
      if (urlStr.includes('league_baselines.json')) {
        return Promise.resolve({ ok: true, json: async () => dummyBaselines } as Response);
      }
      if (urlStr.includes('players/2544.json')) {
        return Promise.resolve({ ok: true, json: async () => dummyPlayerData } as Response);
      }
      return Promise.resolve({ ok: false } as Response);
    });

    const { result } = renderHook(() => usePlayerData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let player;
    await waitFor(async () => {
      player = await result.current.loadPlayer(2544);
      expect(player).toEqual(dummyPlayerData);
    });

    // Wait for state update to propagate to result.current.loadedPlayers
    await waitFor(() => {
      expect(result.current.loadedPlayers[2544]).toEqual(dummyPlayerData);
    });

    // Call loadPlayer again (should read from cache)
    const cachedPlayer = await result.current.loadPlayer(2544);
    expect(cachedPlayer).toEqual(dummyPlayerData);
  });
});
