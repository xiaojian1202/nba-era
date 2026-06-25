import { useState, useEffect } from 'react';
import type { PlayerSeasonStats, LeagueBaseline } from '../utils/statsCalculations';

export interface PlayerIndexItem {
  id: number;
  name: string;
  start: string;
  end: string;
  total_pts: number;
  total_min: number;
  is_star: boolean;
}

export interface PlayerData {
  id: number;
  name: string;
  seasons: PlayerSeasonStats[];
}

export function usePlayerData() {
  const [playerIndex, setPlayerIndex] = useState<PlayerIndexItem[]>([]);
  const [leagueBaselines, setLeagueBaselines] = useState<Record<string, LeagueBaseline>>({});
  const [loadedPlayers, setLoadedPlayers] = useState<Record<number, PlayerData>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load index and baselines on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        
        // Fetch player index
        const indexResponse = await fetch('/data/player_index.json');
        if (!indexResponse.ok) {
          throw new Error('Failed to load player index. Please run compile_dataset.py first.');
        }
        const indexData = await indexResponse.json();
        setPlayerIndex(indexData);

        // Fetch league baselines
        const baselinesResponse = await fetch('/data/league_baselines.json');
        if (!baselinesResponse.ok) {
          throw new Error('Failed to load league baselines. Please run compile_dataset.py first.');
        }
        const baselinesData = await baselinesResponse.json();
        setLeagueBaselines(baselinesData);

        setError(null);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error loading static assets');
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  // Fetch individual player data on-demand
  const loadPlayer = async (id: number): Promise<PlayerData | null> => {
    // Return cached if available
    if (loadedPlayers[id]) {
      return loadedPlayers[id];
    }

    try {
      const response = await fetch(`/data/players/${id}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load player stats for ID: ${id}`);
      }
      const data: PlayerData = await response.json();
      
      setLoadedPlayers(prev => ({
        ...prev,
        [id]: data
      }));
      
      return data;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  return {
    playerIndex,
    leagueBaselines,
    loadedPlayers,
    loading,
    error,
    loadPlayer
  };
}
