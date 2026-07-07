import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlayerCard } from './PlayerCard';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { PlayerIndexItem, PlayerData } from '../hooks/usePlayerData';

describe('PlayerCard Component', () => {
  const mockPlayerIndex: PlayerIndexItem[] = [
    { id: 23, name: 'Michael Jordan', start: '1984-85', end: '2002-03', total_pts: 32292, total_min: 41011, is_star: true },
    { id: 6, name: 'LeBron James', start: '2003-04', end: '2023-24', total_pts: 40474, total_min: 56597, is_star: true },
    { id: 30, name: 'Stephen Curry', start: '2009-10', end: '2023-24', total_pts: 23668, total_min: 32000, is_star: true }
  ];

  const mockLoadedPlayers: Record<number, PlayerData> = {
    23: {
      id: 23,
      name: 'Michael Jordan',
      seasons: [
        {
          season: '1995-96', team: 'CHI', gp: 82, min: 3090, pts: 2491, reb: 543, ast: 352, stl: 180, blk: 41, tov: 197, pf: 195, fgm: 916, fga: 1850, fg3m: 111, fg3a: 260, ftm: 548, fta: 650
        }
      ]
    }
  };

  let onPlayerSelectMock = vi.fn();
  let onRemoveMock = vi.fn();
  let loadPlayerMock = vi.fn();

  beforeEach(() => {
    onPlayerSelectMock = vi.fn();
    onRemoveMock = vi.fn();
    loadPlayerMock = vi.fn().mockImplementation(async (id) => mockLoadedPlayers[id] || null);
  });

  it('renders search input when no player is selected', () => {
    render(
      <PlayerCard
        slotId={1}
        playerIndex={mockPlayerIndex}
        selectedPlayerId={null}
        selectedSeason={null}
        onPlayerSelect={onPlayerSelectMock}
        onRemove={onRemoveMock}
        loadPlayer={loadPlayerMock}
        loadedPlayers={{}}
      />
    );

    expect(screen.getByPlaceholderText('Search NBA Player...')).toBeInTheDocument();
    expect(screen.getByText('Slot 1')).toBeInTheDocument();
  });

  it('shows autocomplete suggestions and handles player selection', async () => {
    render(
      <PlayerCard
        slotId={1}
        playerIndex={mockPlayerIndex}
        selectedPlayerId={null}
        selectedSeason={null}
        onPlayerSelect={onPlayerSelectMock}
        onRemove={onRemoveMock}
        loadPlayer={loadPlayerMock}
        loadedPlayers={{}}
      />
    );

    const input = screen.getByPlaceholderText('Search NBA Player...');
    fireEvent.change(input, { target: { value: 'Jordan' } });

    // Autocomplete dropdown should render Michael Jordan
    const dropdownItem = await screen.findByText('Michael Jordan');
    expect(dropdownItem).toBeInTheDocument();

    // Select the suggestion
    fireEvent.mouseDown(dropdownItem);

    // loadPlayer should be triggered
    expect(loadPlayerMock).toHaveBeenCalledWith(23);

    await waitFor(() => {
      expect(onPlayerSelectMock).toHaveBeenCalledWith(23, '1995-96');
    });
  });

  it('closes suggestions when clicking outside', async () => {
    render(
      <div>
        <div data-testid="outside">Outside Click Area</div>
        <PlayerCard
          slotId={1}
          playerIndex={mockPlayerIndex}
          selectedPlayerId={null}
          selectedSeason={null}
          onPlayerSelect={onPlayerSelectMock}
          onRemove={onRemoveMock}
          loadPlayer={loadPlayerMock}
          loadedPlayers={{}}
        />
      </div>
    );

    const input = screen.getByPlaceholderText('Search NBA Player...');
    fireEvent.change(input, { target: { value: 'Jordan' } });

    const dropdownItem = await screen.findByText('Michael Jordan');
    expect(dropdownItem).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByText('Michael Jordan')).not.toBeInTheDocument();
    });
  });
});
