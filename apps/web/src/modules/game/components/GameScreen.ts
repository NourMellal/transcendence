import { Component } from '@/components/base/Component';
import type { GameContext } from './GameCanvas';
import { GameCanvas } from './GameCanvas';
import { GameChatPanel } from './GameChatPanel';
import { GamePresenceIndicator } from './GamePresenceIndicator';
import { gameRealtimeService } from '../services/GameRealtimeService';

export interface GameScreenContext extends GameContext {
  username?: string;
}

export class GameScreen extends Component {
  private readonly canvas = new GameCanvas();
  private readonly chatPanel = new GameChatPanel();
  private readonly presencePanel = new GamePresenceIndicator();
  private context?: GameScreenContext;

  constructor() {
    super('section', 'game-screen');
  }

  setContext(context: GameScreenContext): void {
    this.context = context;
    this.canvas.setContext(context);
    this.chatPanel.setContext({ gameId: context.gameId });
    this.presencePanel.setContext({ gameId: context.gameId });
  }

  protected render(): void {
    this.element.innerHTML = `
      <div class="game-screen__header">
        <h2>Live Match</h2>
        <div class="game-screen__meta">
          <span>Game ID: ${this.context?.gameId ?? 'n/a'}</span>
          <span>Player: ${this.context?.username ?? 'guest'}</span>
        </div>
      </div>
      <div class="game-screen__content">
        <div class="game-screen__board" data-game-board></div>
        <aside class="game-screen__sidebar">
          <div data-presence-panel></div>
          <div data-chat-panel></div>
        </aside>
      </div>
    `;

    const board = this.element.querySelector('[data-game-board]') as HTMLElement | null;
    const presence = this.element.querySelector('[data-presence-panel]') as HTMLElement | null;
    const chat = this.element.querySelector('[data-chat-panel]') as HTMLElement | null;

    if (board) {
      this.canvas.mount(board);
    }
    if (presence) {
      this.presencePanel.mount(presence);
    }
    if (chat) {
      this.chatPanel.mount(chat);
    }
  }

  override cleanup(): void {
    this.canvas.unmount();
    this.chatPanel.unmount();
    this.presencePanel.unmount();
    gameRealtimeService.disconnect();
    super.cleanup();
  }
}
