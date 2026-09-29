const STORAGE_KEY = 'simpleinvoice.auth';

interface StoredToken {
  accessToken: string;
  /** Epoch milliseconds. */
  expiresAt: number;
}

/**
 * Persists the JWT in localStorage so a page refresh keeps the session.
 * Expired tokens are discarded on read, so the app never sends a token the
 * server would reject anyway. Storage access is guarded because it can
 * throw (private mode, blocked site data).
 */
export const tokenStorage = {
  get(now = Date.now()): string | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const stored = JSON.parse(raw) as StoredToken;
      if (typeof stored.accessToken !== 'string' || stored.expiresAt <= now) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return stored.accessToken;
    } catch {
      return null;
    }
  },

  set(accessToken: string, expiresInSeconds: number, now = Date.now()): void {
    try {
      const value: StoredToken = { accessToken, expiresAt: now + expiresInSeconds * 1000 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // Session then lasts only for this page load.
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clear.
    }
  },
};
