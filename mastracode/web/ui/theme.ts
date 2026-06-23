/** Theme persistence: localStorage with a system-preference fallback. */

export type Theme = 'dark' | 'light';

const KEY = 'mastracode.theme';

/** The stored theme if set, else the OS preference, else dark. */
export function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* localStorage unavailable (private mode, SSR) */
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* non-fatal */
  }
}

/** Reflect the theme onto the document root so CSS variables switch. */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}
