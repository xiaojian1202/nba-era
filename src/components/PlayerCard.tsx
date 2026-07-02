import React, { useState, useEffect, useRef } from 'react';
import { Search, Trash2, User, Star } from 'lucide-react';
import type { PlayerIndexItem, PlayerData } from '../hooks/usePlayerData';

// NBA Team Colors mapping (Primary & Secondary) to style jersey-themed badges
export const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  ATL: { primary: '#c8102e', secondary: '#ffcd00' },
  BOS: { primary: '#007a33', secondary: '#ba9653' },
  BKN: { primary: '#000000', secondary: '#ffffff' },
  NJN: { primary: '#002a60', secondary: '#c4ced4' },
  CHA: { primary: '#00788c', secondary: '#1d1160' },
  CHH: { primary: '#00788c', secondary: '#1d1160' },
  CHO: { primary: '#00788c', secondary: '#1d1160' },
  CHI: { primary: '#ce1141', secondary: '#000000' },
  CLE: { primary: '#860038', secondary: '#fdbb30' },
  DAL: { primary: '#00538c', secondary: '#b0b7bc' },
  DEN: { primary: '#0e2240', secondary: '#fec524' },
  DET: { primary: '#1d428a', secondary: '#d50032' },
  GSW: { primary: '#1d428a', secondary: '#ffc72c' },
  SFW: { primary: '#1d428a', secondary: '#ffc72c' },
  HOU: { primary: '#ce1141', secondary: '#c4ced4' },
  IND: { primary: '#002d62', secondary: '#fdbb30' },
  LAC: { primary: '#c8102e', secondary: '#1d428a' },
  SDC: { primary: '#007ac1', secondary: '#f05133' },
  BUF: { primary: '#00538c', secondary: '#ffcd00' },
  LAL: { primary: '#552583', secondary: '#fdb927' },
  MEM: { primary: '#5d76a9', secondary: '#f5b112' },
  VAN: { primary: '#00b2a9', secondary: '#e31837' },
  MIA: { primary: '#98002e', secondary: '#f9a01b' },
  MIL: { primary: '#00471b', secondary: '#eee1c6' },
  MIN: { primary: '#0c2340', secondary: '#78be20' },
  NOP: { primary: '#0c2340', secondary: '#c8102e' },
  NOH: { primary: '#00788c', secondary: '#f5b112' },
  NOK: { primary: '#00788c', secondary: '#f5b112' },
  NYK: { primary: '#006bb6', secondary: '#f58426' },
  OKC: { primary: '#007ac1', secondary: '#f05133' },
  SEA: { primary: '#00653a', secondary: '#ffc200' },
  ORL: { primary: '#0077c0', secondary: '#c4ced4' },
  PHI: { primary: '#006bb6', secondary: '#ed174c' },
  SYR: { primary: '#002d62', secondary: '#e31837' },
  PHX: { primary: '#1d1160', secondary: '#e56020' },
  POR: { primary: '#e03a3e', secondary: '#000000' },
  SAC: { primary: '#5a2d81', secondary: '#63727a' },
  KCK: { primary: '#002855', secondary: '#d50032' },
  CIN: { primary: '#00471b', secondary: '#ffc200' },
  ROC: { primary: '#002855', secondary: '#c4ced4' },
  SAS: { primary: '#000000', secondary: '#c4ced4' },
  TOR: { primary: '#ce1141', secondary: '#000000' },
  UTA: { primary: '#002b5c', secondary: '#f9a01b' },
  NOJ: { primary: '#002b5c', secondary: '#f9a01b' },
  WAS: { primary: '#002b5c', secondary: '#e31837' },
  WSB: { primary: '#002b5c', secondary: '#ffc200' }
};

interface PlayerCardProps {
  slotId: number;
  playerIndex: PlayerIndexItem[];
  selectedPlayerId: number | null;
  selectedSeason: string | null;
  onPlayerSelect: (playerId: number | null, season: string | null) => void;
  onRemove: () => void;
  loadPlayer: (id: number) => Promise<PlayerData | null>;
  loadedPlayers: Record<number, PlayerData>;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  slotId,
  playerIndex,
  selectedPlayerId,
  selectedSeason,
  onPlayerSelect,
  onRemove,
  loadPlayer,
  loadedPlayers
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<PlayerIndexItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const player = selectedPlayerId ? loadedPlayers[selectedPlayerId] : null;

  // Filter autocomplete suggestions based on search text
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = playerIndex
      .filter(p => p.name.toLowerCase().includes(query))
      .slice(0, 10); // Limit to top 10 matches
      
    // Sort suggestions to place "star" historical figures or active players first
    filtered.sort((a, b) => {
      if (a.is_star && !b.is_star) return -1;
      if (!a.is_star && b.is_star) return 1;
      return b.total_pts - a.total_pts;
    });

    setSuggestions(filtered);
  }, [searchQuery, playerIndex]);

  // Handle click outside to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch player details on select
  const handleSelectSuggestion = async (pItem: PlayerIndexItem) => {
    setSearchQuery('');
    setIsOpen(false);
    const data = await loadPlayer(pItem.id);
    if (data && data.seasons.length > 0) {
      // Default to their highest scoring season or last season
      const sortedSeasons = [...data.seasons].sort((a, b) => b.pts - a.pts);
      const defaultSeason = sortedSeasons.length > 0 ? sortedSeasons[0].season : data.seasons[data.seasons.length - 1].season;
      onPlayerSelect(pItem.id, defaultSeason);
    }
  };

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onPlayerSelect(selectedPlayerId, e.target.value);
  };

  // Find the selected season's statistics for quick view
  const currentSeasonStats = player?.seasons.find(s => s.season === selectedSeason);

  // Resolve jersey-themed colors
  const teamCode = currentSeasonStats?.team;
  const avatarStyle = React.useMemo(() => {
    if (!teamCode) return {};
    const colors = TEAM_COLORS[teamCode] || { primary: '#6366f1', secondary: '#14b8a6' };
    return {
      backgroundColor: colors.primary,
      color: colors.secondary,
      borderColor: colors.secondary,
      borderWidth: '1.5px',
      borderStyle: 'solid' as const
    };
  }, [teamCode]);

  return (
    <div className={`player-card ${player ? 'has-player' : 'empty-slot'}`} ref={containerRef}>
      {player && currentSeasonStats ? (
        <div className="player-info-container">
          <div className="player-card-header">
            <div className="avatar-icon" style={avatarStyle}>
              <User size={24} />
            </div>
            <div className="player-meta">
              <h3 className="player-name">{player.name}</h3>
              <div className="player-timeline">
                {player.seasons[0].season.split('-')[0]} – {player.seasons[player.seasons.length - 1].season.split('-')[1]}
              </div>
            </div>
            <button onClick={onRemove} className="remove-btn" title="Remove Player" id={`remove-player-${slotId}`}>
              <Trash2 size={16} />
            </button>
          </div>

          <div className="season-selector-group">
            <label className="season-label">Select Season</label>
            <select
              value={selectedSeason || ''}
              onChange={handleSeasonChange}
              className="season-select"
              id={`select-season-${slotId}`}
            >
              {player.seasons.map((s) => (
                <option key={s.season} value={s.season}>
                  {s.season} ({s.team})
                </option>
              ))}
            </select>
          </div>

          <div className="quick-stats-grid">
            <div className="quick-stat-box">
              <span className="stat-label">GP</span>
              <span className="stat-val">{currentSeasonStats.gp}</span>
            </div>
            <div className="quick-stat-box">
              <span className="stat-label">MIN</span>
              <span className="stat-val">{(currentSeasonStats.min / currentSeasonStats.gp).toFixed(1)}</span>
            </div>
            <div className="quick-stat-box">
              <span className="stat-label">PTS</span>
              <span className="stat-val">{(currentSeasonStats.pts / currentSeasonStats.gp).toFixed(1)}</span>
            </div>
            <div className="quick-stat-box">
              <span className="stat-label">REB</span>
              <span className="stat-val">{(currentSeasonStats.reb / currentSeasonStats.gp).toFixed(1)}</span>
            </div>
            <div className="quick-stat-box">
              <span className="stat-label">AST</span>
              <span className="stat-val">{(currentSeasonStats.ast / currentSeasonStats.gp).toFixed(1)}</span>
            </div>
            <div className="quick-stat-box">
              <span className="stat-label">TS%</span>
              <span className="stat-val">
                {((currentSeasonStats.pts / (2 * (currentSeasonStats.fga + 0.44 * currentSeasonStats.fta))) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="search-slot-container">
          <div className="search-instructions">
            <div className="avatar-placeholder">
              <User size={32} />
            </div>
            <h4>Slot {slotId}</h4>
            <p>Search player since 1951</p>
          </div>
          
          <div className="search-bar-wrapper">
            <Search className="search-bar-icon" size={16} />
            <input
              type="text"
              placeholder="Search NBA Player..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="search-input"
              id={`search-player-input-${slotId}`}
            />
          </div>

          {isOpen && suggestions.length > 0 && (
            <ul className="suggestions-list">
              <li className="suggestions-legend">
                <Star size={10} className="star-icon" fill="currentColor" />
                <span>Star Player (&gt;15 PPG season or &gt;5k career pts)</span>
              </li>
              {suggestions.map((item) => (
                <li
                  key={item.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(item);
                  }}
                  className="suggestion-item"
                >
                  <div className="suggestion-name-box">
                    <span className="suggestion-name">{item.name}</span>
                    {item.is_star && <Star size={12} className="star-icon" fill="currentColor" />}
                  </div>
                  <span className="suggestion-years">
                    {item.start.split('-')[0]} - {item.end.split('-')[0]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
export default PlayerCard;
