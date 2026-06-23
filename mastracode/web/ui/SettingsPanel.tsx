import type { HarnessAvailableModel } from '@mastra/client-js';

import { ProvidersSection } from './ProvidersSection';
import type { Density, Theme } from './theme';

interface SettingsPanelProps {
  theme: Theme;
  density: Density;
  models: HarnessAvailableModel[];
  currentModelId: string | null;
  baseUrl?: string;
  onThemeChange: (theme: Theme) => void;
  onDensityChange: (density: Density) => void;
  onModelChange: (modelId: string) => void;
  onClose: () => void;
}

/** A small preferences modal for appearance settings. */
export function SettingsPanel({
  theme,
  density,
  models,
  currentModelId,
  baseUrl,
  onThemeChange,
  onDensityChange,
  onModelChange,
  onClose,
}: SettingsPanelProps) {
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

        {models.length > 0 && (
          <div className="settings-row">
            <div className="settings-label">
              <span>Model</span>
              <span className="settings-hint">Default model for this session</span>
            </div>
            <select
              className="settings-select"
              aria-label="Model"
              value={currentModelId ?? ''}
              onChange={e => onModelChange(e.target.value)}
            >
              {currentModelId && !models.some(m => m.id === currentModelId) && (
                <option value={currentModelId}>{currentModelId}</option>
              )}
              {models.map(m => (
                <option key={m.id} value={m.id} disabled={!m.hasApiKey}>
                  {m.modelName}
                  {m.hasApiKey ? '' : ' (no API key)'}
                </option>
              ))}
            </select>
          </div>
        )}

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

        <ProvidersSection baseUrl={baseUrl} />
      </div>
    </div>
  );
}
