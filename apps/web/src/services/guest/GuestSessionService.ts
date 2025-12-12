import { appState, createInitialGuestState, type GuestSessionState } from '@/state';

type PersistedGuestSession = Pick<GuestSessionState, 'alias' | 'createdAt' | 'lastUsedAt'>;

const STORAGE_KEY = 'transcendence.guest.session';

export class GuestSessionService {
  hydrateFromStorage(): void {
    if (!this.hasStorage()) return;
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as PersistedGuestSession;
      if (!parsed.alias) return;

      appState.guest.set({
        alias: parsed.alias,
        status: 'alias_selected',
        createdAt: parsed.createdAt ?? new Date().toISOString(),
        lastUsedAt: parsed.lastUsedAt ?? new Date().toISOString(),
      });
    } catch (error) {
      console.warn('[GuestSessionService] Failed to hydrate guest session:', error);
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  startSession(rawAlias: string): string {
    const alias = this.normalizeAlias(rawAlias);
    if (!alias) {
      throw new Error('Alias is required.');
    }

    const now = new Date().toISOString();
    const current = appState.guest.get();
    const nextState: GuestSessionState = {
      alias,
      status: 'alias_selected',
      createdAt: current.createdAt ?? now,
      lastUsedAt: now,
    };

    appState.guest.set(nextState);
    if (this.hasStorage()) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    }

    return alias;
  }

  clearSession(): void {
    if (this.hasStorage()) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
    appState.guest.set(createInitialGuestState());
  }

  getAlias(): string | null {
    return appState.guest.get().alias;
  }

  private hasStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
  }

  private normalizeAlias(raw: string): string {
    if (!raw) return '';
    const trimmed = raw.trim().replace(/\s+/g, ' ');
    const cleaned = trimmed.replace(/[^A-Za-z0-9 _-]/g, '');
    return cleaned.slice(0, 16);
  }
}

export const guestSessionService = new GuestSessionService();
