import { useEffect, useMemo, useRef, useState } from 'react';

interface ProviderInfo {
  provider: string;
  envVar?: string;
  source: 'stored' | 'env' | 'none';
}

const SOURCE_LABEL: Record<ProviderInfo['source'], string> = {
  stored: 'Key saved',
  env: 'From env',
  none: 'Not set',
};

/**
 * Provider + API-key management. Mirrors the TUI's `/api-keys` command:
 * configured providers are listed first with their key source; the full
 * catalog is searchable so any provider's key can be added. Keys are written
 * to the server's credential store and never read back to the client.
 */
export function ProvidersSection({ baseUrl = '' }: { baseUrl?: string }) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [keyDraft, setKeyDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const keyInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/web/config/providers`);
      if (!res.ok) throw new Error(`Failed to load providers (${res.status})`);
      const data = (await res.json()) as { providers: ProviderInfo[] };
      setProviders(data.providers ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl]);

  useEffect(() => {
    if (editing) keyInputRef.current?.focus();
  }, [editing]);

  const configured = useMemo(() => providers.filter(p => p.source !== 'none'), [providers]);
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return providers.filter(p => p.provider.toLowerCase().includes(q)).slice(0, 8);
  }, [providers, search]);

  const saveKey = async (provider: string, envVar?: string) => {
    const key = keyDraft.trim();
    if (!key) return;
    setBusy(true);
    try {
      const res = await fetch(`${baseUrl}/api/web/config/providers/${encodeURIComponent(provider)}/key`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key, envVar }),
      });
      if (!res.ok) throw new Error(`Failed to save key (${res.status})`);
      setEditing(null);
      setKeyDraft('');
      setSearch('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const removeKey = async (provider: string) => {
    setBusy(true);
    try {
      const res = await fetch(`${baseUrl}/api/web/config/providers/${encodeURIComponent(provider)}/key`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`Failed to remove key (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const renderRow = (p: ProviderInfo) => {
    const isEditing = editing === p.provider;
    return (
      <div key={p.provider} className="provider-row">
        <div className="provider-info">
          <span className="provider-name">{p.provider}</span>
          <span className={`provider-pill ${p.source}`}>{SOURCE_LABEL[p.source]}</span>
        </div>
        {isEditing ? (
          <div className="provider-edit">
            <input
              ref={keyInputRef}
              type="password"
              className="provider-key-input"
              placeholder="Paste API key"
              value={keyDraft}
              onChange={e => setKeyDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void saveKey(p.provider, p.envVar);
                if (e.key === 'Escape') { setEditing(null); setKeyDraft(''); }
              }}
            />
            <button className="btn btn-primary btn-sm" disabled={busy || !keyDraft.trim()} onClick={() => void saveKey(p.provider, p.envVar)}>
              Save
            </button>
            <button className="btn btn-sm" disabled={busy} onClick={() => { setEditing(null); setKeyDraft(''); }}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="provider-actions">
            <button className="btn btn-sm" disabled={busy} onClick={() => { setEditing(p.provider); setKeyDraft(''); }}>
              {p.source === 'stored' ? 'Update' : 'Add key'}
            </button>
            {p.source === 'stored' && (
              <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => void removeKey(p.provider)}>
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="settings-section">
      <div className="settings-section-head">
        <span>Providers &amp; API keys</span>
        <span className="settings-hint">Keys are stored on the server, never shown back</span>
      </div>

      {error && <div className="provider-error">{error}</div>}
      {loading ? (
        <div className="provider-loading">Loading providers…</div>
      ) : (
        <>
          <div className="provider-list">
            {configured.length === 0 && <div className="provider-empty">No providers configured yet.</div>}
            {configured.map(renderRow)}
          </div>

          <div className="provider-add">
            <input
              type="text"
              className="provider-search"
              placeholder="Search providers to add a key…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {matches.length > 0 && (
              <div className="provider-matches">
                {matches.filter(p => p.source === 'none').map(renderRow)}
                {matches.every(p => p.source !== 'none') && (
                  <div className="provider-empty">All matches already configured above.</div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
