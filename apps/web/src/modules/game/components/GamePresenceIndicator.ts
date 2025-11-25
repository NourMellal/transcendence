import { Component } from '@/components/base/Component';
import type { PresenceUpdatePayload } from '@/modules/shared/types/websocket.types';
import { gameRealtimeService } from '../services/GameRealtimeService';

interface PresenceContext {
  gameId?: string;
}

export class GamePresenceIndicator extends Component {
  private presenceMap = new Map<string, PresenceUpdatePayload>();
  private subscription?: () => void;
  private context?: PresenceContext;

  constructor(private readonly realtime = gameRealtimeService) {
    super('div', 'game-presence-indicator');
  }

  setContext(context: PresenceContext): void {
    this.context = context;
    if (this.mounted && !this.subscription) {
      this.startSubscription();
    }
  }

  override mount(parent: HTMLElement): void {
    super.mount(parent);
    if (!this.subscription) {
      this.startSubscription();
    }
  }

  protected render(): void {
    const players = Array.from(this.presenceMap.values());

    this.element.innerHTML = `
      <div class="game-presence-indicator__header">
        <h3>Players</h3>
        <button class="game-presence-indicator__refresh" type="button">Refresh</button>
      </div>
      <ul class="game-presence-indicator__list">
        ${
          players.length === 0
            ? '<li class="game-presence-indicator__empty">No players connected</li>'
            : players
                .map(
                  (player) => `
              <li class="game-presence-indicator__player game-presence-indicator__player--${player.status.toLowerCase()}">
                <span class="game-presence-indicator__name">${player.username}</span>
                <span class="game-presence-indicator__status">${player.status}</span>
              </li>
            `
                )
                .join('')
        }
      </ul>
    `;

    const refreshButton = this.element.querySelector('.game-presence-indicator__refresh') as HTMLButtonElement | null;
    refreshButton?.addEventListener('click', () => this.realtime.sendPresenceHeartbeat('ingame'));
  }

  override cleanup(): void {
    this.subscription?.();
    this.subscription = undefined;
    super.cleanup();
  }

  private startSubscription(): void {
    if (this.context?.gameId === undefined) {
      return;
    }

    this.subscription = this.realtime.subscribeToPresence((payload) => {
      if (this.context?.gameId && payload.gameId !== this.context.gameId) {
        return;
      }
      this.presenceMap.set(payload.userId, payload);
      this.update();
    });
  }
}
