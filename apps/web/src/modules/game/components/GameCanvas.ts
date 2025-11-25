import { Component } from '@/components/base/Component';
import type { GameStateUpdatePayload } from '@/modules/shared/types/websocket.types';
import { gameRealtimeService } from '../services/GameRealtimeService';

export interface GameContext {
  gameId: string;
  playerId?: string;
  side?: 'left' | 'right';
}

interface LocalGameState {
  ball: { x: number; y: number };
  leftPaddleY: number;
  rightPaddleY: number;
  score: { left: number; right: number };
  lastUpdate: number | null;
}

const DEFAULT_STATE: LocalGameState = {
  ball: { x: 50, y: 50 },
  leftPaddleY: 50,
  rightPaddleY: 50,
  score: { left: 0, right: 0 },
  lastUpdate: null,
};

export class GameCanvas extends Component {
  private context?: GameContext;
  private state: LocalGameState = { ...DEFAULT_STATE };
  private gameSubscription?: () => void;
  private isRealtimeReady = false;

  constructor(private readonly realtime = gameRealtimeService) {
    super('div', 'game-canvas');
  }

  setContext(context: GameContext): void {
    this.context = context;
    if (this.mounted && !this.isRealtimeReady) {
      void this.initializeRealtime();
    }
  }

  override mount(parent: HTMLElement): void {
    super.mount(parent);
    if (this.context && !this.isRealtimeReady) {
      void this.initializeRealtime();
    }
  }

  protected render(): void {
    const { ball, leftPaddleY, rightPaddleY, score, lastUpdate } = this.state;

    this.element.innerHTML = `
      <div class="game-canvas__hud">
        <div class="game-canvas__score">
          <span class="game-canvas__score-player">Left: ${score.left}</span>
          <span class="game-canvas__score-player">Right: ${score.right}</span>
        </div>
        <div class="game-canvas__metadata">
          <span>Ball: (${ball.x.toFixed(0)}, ${ball.y.toFixed(0)})</span>
          <span>Paddles: L ${leftPaddleY.toFixed(0)} / R ${rightPaddleY.toFixed(0)}</span>
          <span>Last update: ${lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'n/a'}</span>
        </div>
      </div>
      <div class="game-canvas__board">
        <div class="game-canvas__paddle game-canvas__paddle--left" style="top: ${leftPaddleY}%"></div>
        <div class="game-canvas__paddle game-canvas__paddle--right" style="top: ${rightPaddleY}%"></div>
        <div class="game-canvas__ball" style="left: ${ball.x}%; top: ${ball.y}%"></div>
      </div>
    `;
  }

  override cleanup(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.gameSubscription?.();
    this.gameSubscription = undefined;
    this.isRealtimeReady = false;
    super.cleanup();
  }

  private async initializeRealtime(): Promise<void> {
    if (!this.context?.gameId) {
      console.warn('[GameCanvas] Game context missing, cannot connect to realtime service');
      return;
    }

    try {
      if (this.realtime.getCurrentGameId() !== this.context.gameId) {
        await this.realtime.joinGame(this.context.gameId);
      } else {
        await this.realtime.connect();
      }

      this.gameSubscription?.();
      this.gameSubscription = this.realtime.subscribeToGameState((payload) => {
        this.applyServerState(payload);
      });

      document.addEventListener('keydown', this.handleKeyDown);
      document.addEventListener('keyup', this.handleKeyUp);

      this.isRealtimeReady = true;
    } catch (error) {
      this.isRealtimeReady = false;
      console.error('[GameCanvas] Failed to initialize realtime', error);
    }
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) {
      return;
    }

    if (event.key === 'ArrowUp') {
      this.realtime.sendPaddleMove('up');
    } else if (event.key === 'ArrowDown') {
      this.realtime.sendPaddleMove('down');
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      this.realtime.sendPaddleMove('stop');
    }
  };

  private applyServerState(payload: GameStateUpdatePayload): void {
    this.state = {
      ball: { x: payload.ball.x, y: payload.ball.y },
      leftPaddleY: payload.paddles.left.y,
      rightPaddleY: payload.paddles.right.y,
      score: payload.score,
      lastUpdate: payload.timestamp,
    };
    this.update();
  }
}
