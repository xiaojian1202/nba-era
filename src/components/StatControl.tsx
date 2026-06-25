import React from 'react';

export type AdjustmentMode = 'raw' | 'per75' | 'modernized';

interface StatControlProps {
  currentMode: AdjustmentMode;
  onModeChange: (mode: AdjustmentMode) => void;
  targetBaseline: string;
  onBaselineChange: (baseline: string) => void;
  baselinesList: string[];
}

export const StatControl: React.FC<StatControlProps> = ({
  currentMode,
  onModeChange,
  targetBaseline,
  onBaselineChange,
  baselinesList
}) => {
  return (
    <div className="control-panel">
      <div className="control-group">
        <label className="control-label">Adjustment Mode</label>
        <div className="toggle-container">
          <button
            onClick={() => onModeChange('raw')}
            className={`toggle-btn ${currentMode === 'raw' ? 'active' : ''}`}
            id="toggle-raw"
          >
            Raw Stats
          </button>
          <button
            onClick={() => onModeChange('per75')}
            className={`toggle-btn ${currentMode === 'per75' ? 'active' : ''}`}
            id="toggle-per75"
          >
            Per 75 Possessions
          </button>
          <button
            onClick={() => onModeChange('modernized')}
            className={`toggle-btn ${currentMode === 'modernized' ? 'active' : ''}`}
            id="toggle-modernized"
          >
            Era Projection
          </button>
        </div>
      </div>

      <div className="control-group">
        <label className="control-label">Target Baseline</label>
        <select
          value={targetBaseline}
          onChange={(e) => onBaselineChange(e.target.value)}
          className="baseline-select"
          id="baseline-season-select"
        >
          {baselinesList.map((baseline) => (
            <option key={baseline} value={baseline}>
              {baseline} Era
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
export default StatControl;
