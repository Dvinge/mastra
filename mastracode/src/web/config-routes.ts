import type { Hono } from 'hono';

import type { AuthStorage } from '../auth/storage.js';

/**
 * Server-side configuration routes for the web app.
 *
 * The browser has no access to the credential store or the model catalog, so
 * the web settings panel asks the server — which owns both — to list providers
 * and manage API keys. This mirrors the TUI's `/api-keys` command, exposing the
 * same `AuthStorage`-backed key management over HTTP.
 *
 * Keys are never returned to the client; only their presence and source.
 */

/** A model provider with the current source of its credentials. */
export interface ProviderInfo {
  provider: string;
  /** Env var the provider's key is read from, if any. */
  envVar?: string;
  /** Where the active credential comes from. */
  source: 'stored' | 'env' | 'none';
}

/** Minimal harness surface this module needs (the model catalog). */
interface ModelCatalog {
  listAvailableModels: () => Promise<
    Array<{ provider: string; hasApiKey: boolean; apiKeyEnvVar?: string }>
  >;
}

/**
 * Build a deduplicated, sorted list of providers from the model catalog,
 * annotated with where each provider's credential currently comes from.
 * Mirrors the TUI's `/api-keys` provider list.
 */
export async function listProviders(harness: ModelCatalog, authStorage?: AuthStorage): Promise<ProviderInfo[]> {
  const models = await harness.listAvailableModels();
  const seen = new Map<string, ProviderInfo>();

  for (const model of models) {
    if (seen.has(model.provider)) continue;

    let source: ProviderInfo['source'] = 'none';
    if (authStorage?.hasStoredApiKey(model.provider)) {
      source = 'stored';
    } else if (model.apiKeyEnvVar && process.env[model.apiKeyEnvVar]) {
      source = 'env';
    } else if (model.hasApiKey) {
      source = 'env';
    }

    seen.set(model.provider, { provider: model.provider, envVar: model.apiKeyEnvVar, source });
  }

  return Array.from(seen.values()).sort((a, b) => a.provider.localeCompare(b.provider));
}

/**
 * Mount the web config routes on the given Hono app:
 *   - `GET    /api/web/config/providers`              — list providers + key source
 *   - `PUT    /api/web/config/providers/:provider/key` — set/update a provider's API key
 *   - `DELETE /api/web/config/providers/:provider/key` — remove a stored API key
 */
export function mountConfigRoutes(
  app: Hono,
  options: { harness: ModelCatalog; authStorage?: AuthStorage },
): void {
  const { harness, authStorage } = options;

  app.get('/api/web/config/providers', async c => {
    try {
      return c.json({ providers: await listProviders(harness, authStorage) });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  });

  app.put('/api/web/config/providers/:provider/key', async c => {
    if (!authStorage) return c.json({ error: 'Credential storage is not available' }, 503);
    const provider = c.req.param('provider');
    let body: { key?: unknown; envVar?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }
    const key = typeof body.key === 'string' ? body.key.trim() : '';
    if (!key) return c.json({ error: 'Missing required field: key' }, 400);
    const envVar = typeof body.envVar === 'string' ? body.envVar : undefined;
    try {
      authStorage.setStoredApiKey(provider, key, envVar);
      const providers = await listProviders(harness, authStorage);
      return c.json({ ok: true, provider: providers.find(p => p.provider === provider) });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  });

  app.delete('/api/web/config/providers/:provider/key', async c => {
    if (!authStorage) return c.json({ error: 'Credential storage is not available' }, 503);
    const provider = c.req.param('provider');
    try {
      authStorage.remove(`apikey:${provider}`);
      const providers = await listProviders(harness, authStorage);
      return c.json({ ok: true, provider: providers.find(p => p.provider === provider) });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  });
}
