import React from 'react';

interface ModifiersPanelProps {
  handChecking: boolean;
  onHandCheckingChange: (val: boolean) => void;
}

export const ModifiersPanel: React.FC<ModifiersPanelProps> = ({
  handChecking,
  onHandCheckingChange
}) => {
  return (
    <div className="control-panel modifiers-panel">
      {/* Hand-Checking Toggle */}
      <div className="control-group">
        <label className="control-label">Hand-Checking</label>
        <div className="toggle-container">
          <button
            onClick={() => onHandCheckingChange(false)}
            className={`toggle-btn ${!handChecking ? 'active' : ''}`}
            id="modifier-handcheck-off"
          >
            OFF
          </button>
          <button
            onClick={() => onHandCheckingChange(true)}
            className={`toggle-btn ${handChecking ? 'active' : ''}`}
            id="modifier-handcheck-on"
          >
            ON
          </button>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Simulates the hand-checking rule.
        </span>
      </div>
    </div>
  );
};
export default ModifiersPanel;
