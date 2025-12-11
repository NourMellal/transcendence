import { appState, type AuthStateData } from '@/state';
import { authEvents } from '@/modules/shared/utils/AuthEventEmitter';
import { userService } from '../api/UserService';

export type PresenceStatus = 'ONLINE' | 'OFFLINE' | 'INGAME';

const DEFAULT_HEARTBEAT_MS = 60_000;

function resolveHeartbeatInterval(): number {
  const raw = Number(import.meta.env.VITE_PRESENCE_HEARTBEAT_MS);
  if (Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  return DEFAULT_HEARTBEAT_MS;
}

export class PresenceManager {
  private readonly heartbeatMs = resolveHeartbeatInterval();
  private intervalId: number | null = null;
  private currentStatus: PresenceStatus = 'OFFLINE';
  private initialized = false;
  private lifecycleBound = false;
  private unsubscribers: Array<() => void> = [];

  initialize(): void {
    if (this.initialized || typeof window === 'undefined') {
      return;
    }

    this.initialized = true;
    this.unsubscribers.push(
      appState.auth.subscribe((authState) => this.handleAuthChange(authState)),
      authEvents.on('logout', () => {
        void this.flushStatus('OFFLINE', true);
      })
    );
    this.handleAuthChange(appState.auth.get());
    this.bindLifecycleListeners();
  }

  async setStatus(status: PresenceStatus): Promise<void> {
    this.currentStatus = status;
    if (!this.intervalId && this.canSend()) {
      this.startTimer();
    }
    await this.flushStatus(status);
  }

  async markInGame(isPlaying: boolean): Promise<void> {
    await this.setStatus(isPlaying ? 'INGAME' : 'ONLINE');
  }

  private handleAuthChange(authState: AuthStateData): void {
    if (authState.isAuthenticated && authState.user?.id) {
      if (this.currentStatus === 'OFFLINE') {
        this.currentStatus = 'ONLINE';
      }
      this.startTimer();
      void this.flushCurrentStatus();
    } else {
      this.stopTracking();
    }
  }

  private startTimer(): void {
    if (this.intervalId || typeof window === 'undefined') {
      return;
    }

    this.intervalId = window.setInterval(() => {
      void this.flushCurrentStatus();
    }, this.heartbeatMs);
  }

  private stopTracking(): void {
    if (this.intervalId && typeof window !== 'undefined') {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.currentStatus !== 'OFFLINE') {
      this.currentStatus = 'OFFLINE';
    }

    void this.flushStatus('OFFLINE');
  }

  private async flushCurrentStatus(): Promise<void> {
    await this.flushStatus(this.currentStatus);
  }

  private async flushStatus(status: PresenceStatus, keepAlive = false): Promise<void> {
    if (!this.canSend()) {
      return;
    }

    try {
      await userService.updateStatus(status, keepAlive ? { keepalive: true } : undefined);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[PresenceManager] Failed to update presence', error);
      }
    }
  }

  private canSend(): boolean {
    const auth = appState.auth.get();
    return Boolean(auth.isAuthenticated && auth.user?.id && auth.token);
  }

  private bindLifecycleListeners(): void {
    if (this.lifecycleBound || typeof window === 'undefined') {
      return;
    }

    window.addEventListener('pagehide', this.handleUnload);
    window.addEventListener('beforeunload', this.handleUnload);
    this.lifecycleBound = true;
  }

  private handleUnload = (): void => {
    void this.flushStatus('OFFLINE', true);
  };
}

export const presenceManager = new PresenceManager();
