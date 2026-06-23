import type { Density, Theme } from './theme';

interface SettingsPanelProps {
  theme: Theme;
  density: Density;
  onThemeChange: (theme: Theme) => void;
  onDensityChange: (density: Density) => void;
  onClose: () => void;
}

/** A small preferences modal for appearance settings. */
export function SettingsPanel({ theme, density, onThemeChange, onDensityChange, onClose }: SettingsPanelProps) {
  return (
    <div className="palette-overlay" onClick={onClose}>
      <div
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={e => e.stopPropagation()}
      >
        <div className="settings-head">
          <h2 className="settings-title">Settings</h2>
          <button className="settings-close" onClick={onClose} aria-label="Close settings">×</button>
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <span>Theme</span>
            <span className="settings-hint">Color scheme for the interface</span>
          </div>
          <div className="seg" role="group" aria-label="Theme">
            <button
              className={`seg-btn ${theme === 'light' ? 'active' : ''}`}
              aria-pressed={theme === 'light'}
              onClick={() => onThemeChange('light')}
            >
              Light
            </button>
            <button
              className={`seg-btn ${theme === 'dark' ? 'active' : ''}`}
              aria-pressed={theme === 'dark'}
              onClick={() => onThemeChange('dark')}
            >
              Dark
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <span>Density</span>
            <span className="settings-hint">Spacing between messages and controls</span>
          </div>
          <div className="seg" role="group" aria-label="Density">
            <button
              className={`seg-btn ${density === 'comfortable' ? 'active' : ''}`}
              aria-pressed={density === 'comfortable'}
              onClick={() => onDensityChange('comfortable')}
            >
              Comfortable
            </button>
            <button
              className={`seg-btn ${density === 'compact' ? 'active' : ''}`}
              aria-pressed={density === 'compact'}
              onClick={() => onDensityChange('compact')}
            >
              Compact
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
