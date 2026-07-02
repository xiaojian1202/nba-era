import { render, screen, fireEvent, act } from '@testing-library/react';
import { DreamTeamSuite } from './DreamTeamSuite';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { PlayerIndexItem, PlayerData } from '../hooks/usePlayerData';
import type { LeagueBaseline } from '../utils/statsCalculations';

describe('DreamTeamSuite Component', () => {
  const mockPlayerIndex: PlayerIndexItem[] = [
    { id: 23, name: 'Michael Jordan', start: '1984-85', end: '2002-03', total_pts: 32292, total_min: 41011, is_star: true },
    { id: 6, name: 'LeBron James', start: '2003-04', end: '2023-24', total_pts: 40474, total_min: 56597, is_star: true },
    { id: 30, name: 'Stephen Curry', start: '2009-10', end: '2023-24', total_pts: 23668, total_min: 32000, is_star: true },
    { id: 32, name: 'Shaquille O\'Neal', start: '1992-93', end: '2010-11', total_pts: 28596, total_min: 41918, is_star: true },
    { id: 33, name: 'Kareem Abdul-Jabbar', start: '1969-70', end: '1988-89', total_pts: 38387, total_min: 57446, is_star: true }
  ];

  const mockLeagueBaselines: Record<string, LeagueBaseline> = {
    '1995-96': { season: '1995-96', league_pace: 91.8, league_ts_pct: 0.542, league_fg3a_per_fga: 0.160 },
    '2012-13': { season: '2012-13', league_pace: 92.0, league_ts_pct: 0.535, league_fg3a_per_fga: 0.200 },
    '2015-16': { season: '2015-16', league_pace: 95.8, league_ts_pct: 0.541, league_fg3a_per_fga: 0.285 },
    '2000-01': { season: '2000-01', league_pace: 91.3, league_ts_pct: 0.518, league_fg3a_per_fga: 0.137 },
    '1979-80': { season: '1979-80', league_pace: 103.1, league_ts_pct: 0.531, league_fg3a_per_fga: 0.028 }
  };

  const mockLoadedPlayers: Record<number, PlayerData> = {
    23: {
      id: 23,
      name: 'Michael Jordan',
      seasons: [
        {
          season: '1995-96', team: 'CHI', gp: 82, min: 3090, pts: 2491, reb: 543, ast: 352, stl: 180, blk: 41, tov: 197, pf: 195, fgm: 916, fga: 1850, fg3m: 111, fg3a: 260, ftm: 548, fta: 650
        }
      ]
    },
    6: {
      id: 6,
      name: 'LeBron James',
      seasons: [
        {
          season: '2012-13', team: 'MIA', gp: 76, min: 2877, pts: 2036, reb: 610, ast: 551, stl: 129, blk: 67, tov: 226, pf: 110, fgm: 765, fga: 1354, fg3m: 103, fg3a: 254, ftm: 403, fta: 535
        }
      ]
    },
    30: {
      id: 30,
      name: 'Stephen Curry',
      seasons: [
        {
          season: '2015-16', team: 'GSW', gp: 79, min: 2700, pts: 2375, reb: 430, ast: 527, stl: 169, blk: 15, tov: 262, pf: 161, fgm: 805, fga: 1598, fg3m: 402, fg3a: 886, ftm: 363, fta: 400
        }
      ]
    },
    32: {
      id: 32,
      name: 'Shaquille O\'Neal',
      seasons: [
        {
          season: '2000-01', team: 'LAL', gp: 74, min: 2924, pts: 2125, reb: 941, ast: 277, stl: 47, blk: 204, tov: 218, pf: 256, fgm: 813, fga: 1422, fg3m: 0, fg3a: 1, ftm: 499, fta: 972
        }
      ]
    },
    33: {
      id: 33,
      name: 'Kareem Abdul-Jabbar',
      seasons: [
        {
          season: '1979-80', team: 'LAL', gp: 82, min: 3143, pts: 2034, reb: 886, ast: 370, stl: 81, blk: 280, tov: 297, pf: 216, fgm: 835, fga: 1383, fg3m: 0, fg3a: 1, ftm: 364, fta: 476
        }
      ]
    }
  };

  const initialSlots = [
    { slotId: 1, rolledDecade: null, playerId: null },
    { slotId: 2, rolledDecade: null, playerId: null },
    { slotId: 3, rolledDecade: null, playerId: null },
    { slotId: 4, rolledDecade: null, playerId: null },
    { slotId: 5, rolledDecade: null, playerId: null }
  ];

  let onSlotsChangeMock = vi.fn();
  let loadPlayerMock = vi.fn();

  beforeEach(() => {
    onSlotsChangeMock = vi.fn();
    loadPlayerMock = vi.fn().mockImplementation(async (id) => mockLoadedPlayers[id] || null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the header and five empty slots initially', () => {
    render(
      <DreamTeamSuite
        slots={initialSlots}
        onSlotsChange={onSlotsChangeMock}
        playerIndex={mockPlayerIndex}
        leagueBaselines={mockLeagueBaselines}
        loadedPlayers={mockLoadedPlayers}
        loadPlayer={loadPlayerMock}
      />
    );

    expect(screen.getByText('Dream Team Builder')).toBeInTheDocument();
    
    // We should see "Slot 1" through "Slot 5" and 5 "Roll Era" buttons
    expect(screen.getByText('Slot 1')).toBeInTheDocument();
    expect(screen.getByText('Slot 5')).toBeInTheDocument();
    const rollButtons = screen.getAllByRole('button', { name: 'Roll Era' });
    expect(rollButtons).toHaveLength(5);
  });

  it('triggers decade rolling and updates with final decade selection', () => {
    vi.useFakeTimers();

    render(
      <DreamTeamSuite
        slots={initialSlots}
        onSlotsChange={onSlotsChangeMock}
        playerIndex={mockPlayerIndex}
        leagueBaselines={mockLeagueBaselines}
        loadedPlayers={mockLoadedPlayers}
        loadPlayer={loadPlayerMock}
      />
    );

    // Roll era for slot 1
    const rollButtons = screen.getAllByRole('button', { name: 'Roll Era' });
    fireEvent.click(rollButtons[0]);

    // Check that it enters rolling state
    expect(screen.getByText('Rolling era baseline...')).toBeInTheDocument();

    // Fast-forward fake timers to bypass setInterval (15 iterations of 60ms = 900ms)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Check that onSlotsChange was called with the updated slots
    expect(onSlotsChangeMock).toHaveBeenCalledTimes(1);
    const lastCalledWith = onSlotsChangeMock.mock.calls[0][0];
    expect(lastCalledWith[0].slotId).toBe(1);
    expect(lastCalledWith[0].rolledDecade).not.toBeNull();
  });

  it('shows autocomplete input and allows player search after a decade is rolled', () => {
    const slotsWithDecade = [
      { slotId: 1, rolledDecade: '1990s', playerId: null },
      ...initialSlots.slice(1)
    ];

    render(
      <DreamTeamSuite
        slots={slotsWithDecade}
        onSlotsChange={onSlotsChangeMock}
        playerIndex={mockPlayerIndex}
        leagueBaselines={mockLeagueBaselines}
        loadedPlayers={mockLoadedPlayers}
        loadPlayer={loadPlayerMock}
      />
    );

    expect(screen.getByText('1990s')).toBeInTheDocument();
    expect(screen.getByText('Must have played in the 1990s')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Search player...');
    expect(input).toBeInTheDocument();

    // Type query "Jordan"
    fireEvent.change(input, { target: { value: 'Jordan' } });

    // Autocomplete dropdown should render Michael Jordan
    expect(screen.getByText('M. Jordan')).toBeInTheDocument();
    
    // Draft the player
    const dropdownItem = screen.getByText('M. Jordan');
    fireEvent.mouseDown(dropdownItem);

    // loadPlayer should be triggered
    expect(loadPlayerMock).toHaveBeenCalledWith(23);
  });

  it('computes win prediction metrics and displays chemistry analytics when a full lineup is drafted', async () => {
    const fullLineupSlots = [
      { slotId: 1, rolledDecade: '1990s', playerId: 23 }, // MJ
      { slotId: 2, rolledDecade: '2010s', playerId: 6 },  // LeBron
      { slotId: 3, rolledDecade: '2020s', playerId: 30 }, // Steph
      { slotId: 4, rolledDecade: '2000s', playerId: 32 }, // Shaq
      { slotId: 5, rolledDecade: '1970s', playerId: 33 }  // Kareem
    ];

    render(
      <DreamTeamSuite
        slots={fullLineupSlots}
        onSlotsChange={onSlotsChangeMock}
        playerIndex={mockPlayerIndex}
        leagueBaselines={mockLeagueBaselines}
        loadedPlayers={mockLoadedPlayers}
        loadPlayer={loadPlayerMock}
      />
    );

    // The Lineup Scouting Report should display
    expect(screen.getByText('Lineup Scouting Report')).toBeInTheDocument();
    
    // Validate record prediction section displays
    expect(screen.getByText('Predicted 82-Game Record')).toBeInTheDocument();
    
    // Check for some predicted ratings (e.g. Championship Contender or Playoff Lock)
    const ratingLabel = screen.getByText(/Championship Contender|All-Time Dynastic Force|Playoff Lock/);
    expect(ratingLabel).toBeInTheDocument();

    // Verify chemistry feedback recommendation is rendered
    expect(screen.getByText('Synergy Analysis & Recommendations')).toBeInTheDocument();
  });
});
