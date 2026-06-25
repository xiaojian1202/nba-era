import React from 'react';

interface ModifiersPanelProps {
  handChecking: number; // 0.9, 1.0, 1.1
  onHandCheckingChange: (val: number) => void;
  threePointVolume: string; // 'default' | '1980s' | '1990s' | '2000s' | '2010s' | '2020s'
  onThreePointVolumeChange: (val: string) => void;
  paceOverride: string; // 'default' | '90' | '100' | '110' | '120'
  onPaceOverrideChange: (val: string) => void;
}

export const ModifiersPanel: React.FC<ModifiersPanelProps> = ({
  handChecking,
  onHandCheckingChange,
  threePointVolume,
  onThreePointVolumeChange,
  paceOverride,
  onPaceOverrideChange
}) => {
  return (
    <div className="control-panel modifiers-panel" style={{ marginTop: '20px' }}>
      {/* Hand-Checking Modifier */}
      <div className="control-group">
        <label className="control-label">Hand-Checking Modifier (Defense)</label>
        <div className="toggle-container">
          <button
            onClick={() => onHandCheckingChange(1.1)}
            className={`toggle-btn ${handChecking === 1.1 ? 'active' : ''}`}
            id="modifier-handcheck-plus"
          >
            +10% (Easier)
          </button>
          <button
            onClick={() => onHandCheckingChange(1.0)}
            className={`toggle-btn ${handChecking === 1.0 ? 'active' : ''}`}
            id="modifier-handcheck-zero"
          >
            0% (Default)
          </button>
          <button
            onClick={() => onHandCheckingChange(0.9)}
            className={`toggle-btn ${handChecking === 0.9 ? 'active' : ''}`}
            id="modifier-handcheck-minus"
          >
            -10% (Physical)
          </button>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Simulates how defensive rules and hand-checking affect scoring efficiency (TS%).
        </span>
      </div>

      {/* 3-Point Volume Override */}
      <div className="control-group">
        <label className="control-label">3-Point Volume Baseline</label>
        <select
          value={threePointVolume}
          onChange={(e) => onThreePointVolumeChange(e.target.value)}
          className="baseline-select"
          id="modifier-3pt-volume"
          style={{ maxWidth: '100%' }}
        >
          <option value="default">Default (Match Target Era)</option>
          <option value="1980s">1980s Baseline (~3% frequency)</option>
          <option value="1990s">1990s Baseline (~12% frequency)</option>
          <option value="2000s">2000s Baseline (~19% frequency)</option>
          <option value="2010s">2010s Baseline (~28% frequency)</option>
          <option value="2020s">2020s Baseline (~39% frequency)</option>
        </select>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Overrides the league-wide 3-point attempt rate used to project 3P volume.
        </span>
      </div>

      {/* Pace Override */}
      <div className="control-group">
        <label className="control-label">Pace Override (Possessions)</label>
        <select
          value={paceOverride}
          onChange={(e) => onPaceOverrideChange(e.target.value)}
          className="baseline-select"
          id="modifier-pace-override"
          style={{ maxWidth: '100%' }}
        >
          <option value="default">Default (Match Target Era)</option>
          <option value="90">90 (Gritty 90s/00s)</option>
          <option value="100">100 (Standard Modern)</option>
          <option value="110">110 (Transition 70s/80s)</option>
          <option value="120">120 (Run-and-Gun 60s)</option>
        </select>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Manually forces team possessions/48 mins to recalculate volume stats.
        </span>
      </div>
    </div>
  );
};
export default ModifiersPanel;
