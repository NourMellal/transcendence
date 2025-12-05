import Component from '../../../core/Component';
import { GameRenderer } from '../utils/GameRenderer';
import type {
  Ball,
  BallStateEvent,
  GameEndEvent,
  GameStartEvent,
  GameStateUpdateEvent,
  Paddle,
  PaddleUpdateEvent,
} from '../types/game.types';
import { gameWS } from '@/modules/shared/services/WebSocketClient';
import type { WSConnectionState } from '@/modules/shared/types/websocket.types';
import { isOnlineMode } from '../utils/featureFlags';
import { gameService } from '../services/GameService';
import { appState } from '@/state';

interface GameCanvasProps {
  gameId?: string; // Optional: for online mode
}

type ConnectionStatus = WSConnectionState | 'reconnecting';

interface GameCanvasState {
  isGameRunning: boolean;
  connectionStatus?: ConnectionStatus;
  mySide?: 'left' | 'right';
}

export class GameCanvas extends Component<GameCanvasProps, GameCanvasState> {
  private canvas!: HTMLCanvasElement;
  private renderer!: GameRenderer;
  private resizeObserver: ResizeObserver | null = null;

  private animationId: number | null = null;
  private isOnline: boolean = false;
  private wsUnsubscribes: Array<() => void> = [];

  private readonly BASE_WIDTH = 800;
  private readonly BASE_HEIGHT = 600;
  private readonly LOCAL_VERTICAL_PADDING = 30;
  private readonly WALL_PADDING = 25;
  private readonly PADDLE_SPEED = 8;
  private readonly INPUT_THROTTLE_MS = 16;

  private mouseY: number = this.BASE_HEIGHT / 2;
  private keys: Record<string, boolean> = {};
  private lastInputSentAt = 0;
  private lastSentPaddleY: number | null = null;

  private ball!: Ball;
  private player1!: Paddle;
  private player2!: Paddle;
  private isRunning: boolean = false;
  private mySide: 'left' | 'right' = 'left';

  // Configurable controls (can be changed later)
  private readonly player2Controls = {
    up: 'ArrowUp',
    down: 'ArrowDown',
  };

  private mouseMoveHandler?: (e: MouseEvent) => void;
  private touchMoveHandler?: (e: TouchEvent) => void;
  private touchStartHandler?: (e: TouchEvent) => void;
  private pointerMoveHandler?: (e: PointerEvent) => void;
  private keyDownHandler?: (e: KeyboardEvent) => void;
  private keyUpHandler?: (e: KeyboardEvent) => void;
  private startStopBtn?: HTMLButtonElement | null;
  private restartBtn?: HTMLButtonElement | null;
  private handleButtonClick = (e: Event): void => {
    const target = e.target as HTMLElement;
    const button = target.closest('[data-action]') as HTMLButtonElement | null;

    if (!button || this.isOnline) return;

    const action = button.dataset.action;
    if (action === 'start-game') {
      this.toggleLocalGame();
    } else if (action === 'restart-game') {
      this.resetGame();
      this.renderer.render(this.ball, this.player1, this.player2);
      this.updateScoreDisplay();
    }
  };

  getInitialState(): GameCanvasState {
    return {
      isGameRunning: false,
      connectionStatus: 'disconnected',
    };
  }

  private initializeGameObjects(): void {
    this.ball = {
      x: this.BASE_WIDTH / 2,
      y: this.BASE_HEIGHT / 2,
      radius: 5,
      velocityX: 5,
      velocityY: 5,
      speed: 7,
      maxSpeed: 15
    };

    this.player1 = {
      x: 10,
      y: this.BASE_HEIGHT / 2 - 50,
      width: 10,
      height: 100,
      score: 0,
      dy: 0
    };

    this.player2 = {
      x: this.BASE_WIDTH - 20,
      y: this.BASE_HEIGHT / 2 - 50,
      width: 10,
      height: 100,
      score: 0,
      dy: 0
    };
  }

  render(): string {
    return `
      <div class="game-canvas-wrapper space-y-4 sm:space-y-6">
        <!-- Canvas Container -->
        <div class="glass-panel-mobile sm:glass-panel relative rounded-xl sm:rounded-2xl overflow-hidden" style="border: 1px solid rgba(255, 255, 255, 0.1);">
          <div class="game-area rounded-lg sm:rounded-xl overflow-hidden" style="background: var(--color-bg-dark); aspect-ratio: 4 / 3;">
            <canvas
              id="game-canvas"
              class="w-full h-full"
              style="display: block; image-rendering: crisp-edges;"
            ></canvas>
          </div>
        </div>

        <!-- Control Buttons -->
        <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center px-4 sm:px-0">
          <button
            id="start-stop-btn"
            data-action="start-game"
            class="btn-touch w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 text-base sm:text-lg touch-feedback"
            style="background: white; color: var(--color-bg-dark);"
            onmouseover="this.style.background='var(--color-brand-secondary)'; this.style.color='white';"
            onmouseout="this.style.background='white'; this.style.color='var(--color-bg-dark)';"
          >
            ▶️ Start Game
          </button>

          <button
            id="restart-btn"
            data-action="restart-game"
            class="btn-touch w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 text-base sm:text-lg touch-feedback"
            style="border: 2px solid rgba(255, 255, 255, 0.2); color: white; background: rgba(255, 255, 255, 0.05);"
          >
            🔄 Restart
          </button>
        </div>

        <!-- Score Display -->
        <div class="glass-panel-mobile sm:glass-panel px-4 sm:px-8 py-4 sm:py-6 rounded-xl sm:rounded-2xl" style="border: 1px solid rgba(255, 255, 255, 0.1);">
          <div class="grid grid-cols-2 gap-4 sm:gap-8 text-center">
            <div class="space-y-2">
              <div class="text-xs sm:text-sm font-medium" style="color: rgba(255, 255, 255, 0.6);">Player 1</div>
              <div class="text-3xl sm:text-4xl lg:text-5xl font-mono font-bold" style="color: var(--color-brand-primary);">
                <span id="player1-score">0</span>
              </div>
            </div>
            <div class="space-y-2">
              <div class="text-xs sm:text-sm font-medium" style="color: rgba(255, 255, 255, 0.6);">Player 2</div>
              <div class="text-3xl sm:text-4xl lg:text-5xl font-mono font-bold" style="color: var(--color-brand-secondary);">
                <span id="player2-score">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  onMount(): void {
    this.canvas = this.element!.querySelector('#game-canvas') as HTMLCanvasElement;
    this.renderer = new GameRenderer(this.canvas);

    this.initializeGameObjects();
    this.isOnline = isOnlineMode() && Boolean(this.props.gameId);

    this.resizeCanvas();
    this.observeCanvasResize();
    this.renderer.render(this.ball, this.player1, this.player2);

    this.attachEventListeners();

    if (this.isOnline) {
      this.disableLocalButtons();
      void this.syncSideAndState();
      void this.setupWebSocket();
    }
  }

  protected attachEventListeners(): void {
    if (!this.element) {
      return;
    }

    this.canvas = this.element.querySelector('#game-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      return;
    }

    this.renderer = new GameRenderer(this.canvas);
    this.resizeCanvas();
    this.startStopBtn = this.element.querySelector('#start-stop-btn') as HTMLButtonElement | null;
    this.restartBtn = this.element.querySelector('#restart-btn') as HTMLButtonElement | null;

    this.element.removeEventListener('click', this.handleButtonClick);
    this.element.addEventListener('click', this.handleButtonClick);

    if (this.isOnline) {
      this.disableLocalButtons();
    }

    this.registerPointerHandlers();
    this.registerKeyboardHandlers();
  }

  private observeCanvasResize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
      if (!this.isRunning) {
        this.renderer.render(this.ball, this.player1, this.player2);
      }
    });

    this.resizeObserver.observe(container);
  }

  private disableLocalButtons(): void {
    this.startStopBtn = this.startStopBtn ?? (this.element?.querySelector('#start-stop-btn') as HTMLButtonElement | null);
    this.restartBtn = this.restartBtn ?? (this.element?.querySelector('#restart-btn') as HTMLButtonElement | null);

    if (this.startStopBtn) {
      this.startStopBtn.disabled = true;
      this.startStopBtn.textContent = 'Live match';
      this.startStopBtn.style.opacity = '0.6';
    }
    if (this.restartBtn) {
      this.restartBtn.disabled = true;
      this.restartBtn.style.opacity = '0.6';
    }
  }

  private registerPointerHandlers(): void {
    if (this.isOnline) {
      this.removePointerHandlers();
      return;
    }

    if (this.mouseMoveHandler) {
      this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
    }
    this.mouseMoveHandler = (event: MouseEvent) => this.handlePointerInput(event.clientY);
    this.canvas.addEventListener('mousemove', this.mouseMoveHandler);

    if (this.touchMoveHandler) {
      this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
    }
    this.touchMoveHandler = (event: TouchEvent) => {
      event.preventDefault();
      const touch = event.touches[0];
      if (touch) {
        this.handlePointerInput(touch.clientY);
      }
    };
    this.canvas.addEventListener('touchmove', this.touchMoveHandler, { passive: false });

    if (this.touchStartHandler) {
      this.canvas.removeEventListener('touchstart', this.touchStartHandler);
    }
    this.touchStartHandler = (event: TouchEvent) => {
      event.preventDefault();
      const touch = event.touches[0];
      if (touch) {
        this.handlePointerInput(touch.clientY);
      }
    };
    this.canvas.addEventListener('touchstart', this.touchStartHandler, { passive: false });

    if (this.pointerMoveHandler) {
      this.canvas.removeEventListener('pointermove', this.pointerMoveHandler);
    }
    this.pointerMoveHandler = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || event.pointerType === 'pen') {
        this.handlePointerInput(event.clientY);
      }
    };
    this.canvas.addEventListener('pointermove', this.pointerMoveHandler);
  }

  private removePointerHandlers(): void {
    if (this.mouseMoveHandler) {
      this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
      this.mouseMoveHandler = undefined;
    }
    if (this.touchMoveHandler) {
      this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
      this.touchMoveHandler = undefined;
    }
    if (this.touchStartHandler) {
      this.canvas.removeEventListener('touchstart', this.touchStartHandler);
      this.touchStartHandler = undefined;
    }
    if (this.pointerMoveHandler) {
      this.canvas.removeEventListener('pointermove', this.pointerMoveHandler);
      this.pointerMoveHandler = undefined;
    }
  }

  private registerKeyboardHandlers(): void {
    if (this.keyDownHandler) {
      document.removeEventListener('keydown', this.keyDownHandler);
    }
    this.keyDownHandler = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
      }
      this.keys[event.key] = true;
    };
    document.addEventListener('keydown', this.keyDownHandler);

    if (this.keyUpHandler) {
      document.removeEventListener('keyup', this.keyUpHandler);
    }
    this.keyUpHandler = (event: KeyboardEvent) => {
      this.keys[event.key] = false;
    };
    document.addEventListener('keyup', this.keyUpHandler);
  }

  private handlePointerInput(clientY: number): void {
    if (this.isOnline) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleY = this.BASE_HEIGHT / rect.height;
    this.mouseY = (clientY - rect.top) * scaleY;
  }

  private async setupWebSocket(): Promise<void> {
    if (!this.props.gameId) return;

    const updateStatus = (status: ConnectionStatus) => this.setState({ connectionStatus: status });

    this.wsUnsubscribes.push(
      gameWS.on('connect', () => {
        updateStatus('connected');
        gameWS.send('join_game', { gameId: this.props.gameId });
      }),
      gameWS.on('disconnect', () => updateStatus('disconnected')),
      gameWS.on('connect_error', () => updateStatus('error')),
      gameWS.on('game_start', (event: GameStartEvent) => this.handleGameStart(event)),
      gameWS.on('game_state', (event: GameStateUpdateEvent) => this.applyGameStateUpdate(event)),
      gameWS.on('ball_state', (event: BallStateEvent) => this.applyBallStateUpdate(event)),
      gameWS.on('paddle_update', (event: PaddleUpdateEvent) => this.applyPaddleUpdate(event)),
      gameWS.on('game_end', (event: GameEndEvent) => this.handleGameEnd(event)),
      gameWS.on('error', (data: unknown) => {
        console.error('[GameCanvas] Game error:', data);
      })
    );

    const state = gameWS.getState();
    if (state && state !== this.state.connectionStatus) {
      updateStatus(state as ConnectionStatus);
    }

    await gameWS.connect();
  }

  private async syncSideAndState(): Promise<void> {
    if (!this.props.gameId) return;
    try {
      const game = await gameService.getGame(this.props.gameId);
      const currentUserId = (appState.auth.get()?.user as { id?: string } | undefined)?.id;
      const players = game.players ?? [];
      if (players[0]?.id === currentUserId) {
        this.mySide = 'left';
      } else if (players[1]?.id === currentUserId) {
        this.mySide = 'right';
      }
    } catch (error) {
      console.warn('[GameCanvas] syncSideAndState failed', error);
    }
  }

  private emitPaddleSet(y: number): void {
    if (!this.props.gameId || !this.isRunning) return;
    if (this.lastSentPaddleY !== null && Math.abs(this.lastSentPaddleY - y) < 0.5) {
      return;
    }
    const now = performance.now();
    if (now - this.lastInputSentAt < this.INPUT_THROTTLE_MS) {
      return;
    }
    this.lastInputSentAt = now;
    this.lastSentPaddleY = y;

    gameWS.send('paddle_set', {
      gameId: this.props.gameId,
      y,
    });
  }

  private getMyPaddle(): Paddle {
    return this.mySide === 'left' ? this.player1 : this.player2;
  }

  private handleGameStart(event: GameStartEvent): void {
    if (!this.isCurrentGame(event.gameId)) return;
    this.startLoop();
  }

  private handleGameEnd(event: GameEndEvent): void {
    if (!this.isCurrentGame(event.gameId)) return;

    this.player1.score = event.finalScore.left ?? this.player1.score;
    this.player2.score = event.finalScore.right ?? this.player2.score;
    this.updateScoreDisplay();

    this.stopLoop();
    this.renderer.render(this.ball, this.player1, this.player2);
  }

  private applyGameStateUpdate(payload: GameStateUpdateEvent): void {
    if (!this.isCurrentGame(payload.gameId)) {
      return;
    }

    this.ball.x = payload.ball.x;
    this.ball.y = payload.ball.y;
    this.ball.velocityX = payload.ball.vx;
    this.ball.velocityY = payload.ball.vy;

    this.player1.y = payload.paddles.left.y;
    this.player2.y = payload.paddles.right.y;

    this.player1.score = payload.score.player1;
    this.player2.score = payload.score.player2;
    this.updateScoreDisplay();

    if (this.isOnline && !this.isRunning && this.isPlayingStatus(payload.status)) {
      this.startLoop();
    }

    this.renderer.render(this.ball, this.player1, this.player2);
  }

  private applyBallStateUpdate(payload: BallStateEvent): void {
    if (!this.isCurrentGame(payload.gameId)) {
      return;
    }

    this.ball.x = payload.ball.x;
    this.ball.y = payload.ball.y;
    this.ball.velocityX = payload.ball.vx;
    this.ball.velocityY = payload.ball.vy;

    if (this.isOnline && !this.isRunning && this.isPlayingStatus(payload.status)) {
      this.startLoop();
    }

    this.renderer.render(this.ball, this.player1, this.player2);
  }

  private applyPaddleUpdate(payload: PaddleUpdateEvent): void {
    if (!this.isCurrentGame(payload.gameId)) return;

    if (payload.side === 'right') {
      this.player2.y = payload.y;
    } else {
      this.player1.y = payload.y;
    }

    this.renderer.render(this.ball, this.player1, this.player2);
  }

  private updateScoreDisplay(): void {
    const player1ScoreEl = this.element?.querySelector('#player1-score');
    const player2ScoreEl = this.element?.querySelector('#player2-score');

    if (player1ScoreEl) player1ScoreEl.textContent = String(this.player1.score);
    if (player2ScoreEl) player2ScoreEl.textContent = String(this.player2.score);
  }

  private resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const aspectRatio = this.BASE_WIDTH / this.BASE_HEIGHT;

    let displayWidth = containerWidth;
    let displayHeight = containerWidth / aspectRatio;

    if (displayHeight > containerHeight) {
      displayHeight = containerHeight;
      displayWidth = containerHeight * aspectRatio;
    }

    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;
    this.canvas.width = this.BASE_WIDTH * dpr;
    this.canvas.height = this.BASE_HEIGHT * dpr;

    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  private clampOnlinePaddleY(y: number): number {
    const paddle = this.getMyPaddle();
    return Math.max(0, Math.min(this.BASE_HEIGHT - paddle.height, y));
  }

  private clampLocalPaddleY(y: number, paddleHeight: number): number {
    const lowerBound = this.LOCAL_VERTICAL_PADDING;
    const upperBound = this.BASE_HEIGHT - this.LOCAL_VERTICAL_PADDING - paddleHeight;
    return Math.max(lowerBound, Math.min(upperBound, y));
  }

  private toggleLocalGame(): void {
    if (this.isOnline || !this.startStopBtn) {
      return;
    }

    if (this.isRunning) {
      this.stopLoop();
      this.startStopBtn.textContent = '▶️ Start Game';
    } else {
      this.startLoop();
      this.startStopBtn.textContent = '⏹ Stop Game';
    }
  }

  private startLoop(): void {
    if (this.isRunning) return;

    this.lastSentPaddleY = null;
    this.lastInputSentAt = 0;
    this.isRunning = true;
    this.setState({ isGameRunning: true });
    this.runFrame();
  }

  private stopLoop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.setState({ isGameRunning: false });

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private runFrame(): void {
    if (!this.isRunning) return;

    if (this.isOnline) {
      this.updateOnlineInput();
    } else {
      this.updateLocalPhysics();
    }

    this.renderer.render(this.ball, this.player1, this.player2);
    this.animationId = requestAnimationFrame(() => this.runFrame());
  }

  private updateOnlinePaddle(targetTop: number): void {
    if (!this.isOnline || !this.isRunning) return;

    const paddle = this.getMyPaddle();
    const clamped = this.clampOnlinePaddleY(targetTop);
    paddle.y = clamped;
    this.emitPaddleSet(clamped);
  }

  private updateOnlineInput(): void {
    if (!this.isOnline) return;

    const paddle = this.getMyPaddle();

    if (this.keys['ArrowUp']) {
      this.updateOnlinePaddle(paddle.y - this.PADDLE_SPEED);
    } else if (this.keys['ArrowDown']) {
      this.updateOnlinePaddle(paddle.y + this.PADDLE_SPEED);
    }
  }

  private isCurrentGame(gameId?: string): boolean {
    if (!gameId) return true;
    return gameId === this.props.gameId;
  }

  private isPlayingStatus(status?: GameStateUpdateEvent['status']): boolean {
    return status === 'PLAYING' || status === 'IN_PROGRESS';
  }

  private collision(b: Ball, p: Paddle): boolean {
    return (
      b.x + b.radius > p.x &&
      b.x - b.radius < p.x + p.width &&
      b.y + b.radius > p.y &&
      b.y - b.radius < p.y + p.height
    );
  }

  private resetBall(): void {
    this.ball.x = this.BASE_WIDTH / 2;
    this.ball.y = this.BASE_HEIGHT / 2;
    const direction = Math.random() > 0.5 ? 1 : -1;
    this.ball.velocityX = direction * this.ball.speed;
    this.ball.velocityY = (Math.random() - 0.5) * 8; // Range: -4 to 4
    this.ball.speed = 7;
  }

  private resetGame(): void {
    this.player1.score = 0;
    this.player2.score = 0;
    this.resetBall();
    this.updateScoreDisplay();
    this.renderer.render(this.ball, this.player1, this.player2);
  }

  private updateLocalPhysics(): void {
    const { ball, player1, player2 } = this;

    player1.y = this.clampLocalPaddleY(this.mouseY - player1.height / 2, player1.height);

    if (this.keys[this.player2Controls.up]) player2.y -= this.PADDLE_SPEED;
    if (this.keys[this.player2Controls.down]) player2.y += this.PADDLE_SPEED;

    player2.y = this.clampLocalPaddleY(player2.y, player2.height);

    ball.x += ball.velocityX;
    ball.y += ball.velocityY;

    // Wall collision with clamping
    if (ball.y + ball.radius > this.BASE_HEIGHT - this.WALL_PADDING || ball.y - ball.radius < this.WALL_PADDING) {
      ball.velocityY = -ball.velocityY;
      ball.y = Math.max(this.WALL_PADDING + ball.radius, Math.min(this.BASE_HEIGHT - this.WALL_PADDING - ball.radius, ball.y));
    }

    const player = ball.x < this.BASE_WIDTH / 2 ? player1 : player2;

    // Collision with directional check
    if (this.collision(ball, player)) {
      const isMovingTowardsPaddle =
        (player === player1 && ball.velocityX < 0) ||
        (player === player2 && ball.velocityX > 0);

      if (isMovingTowardsPaddle) {
        const collidePoint = (ball.y - (player.y + player.height / 2)) / (player.height / 2);
        const angleRad = (Math.PI / 4) * collidePoint;
        const direction = ball.x < this.BASE_WIDTH / 2 ? 1 : -1;

        ball.velocityX = direction * ball.speed * Math.cos(angleRad);
        ball.velocityY = ball.speed * Math.sin(angleRad);
        ball.speed = Math.min(ball.speed + 0.3, ball.maxSpeed);

        // Push ball outside paddle to prevent re-collision
        ball.x = player === player1 ? player.x + player.width + ball.radius : player.x - ball.radius;
      }
    }

    if (ball.x - ball.radius < 0) {
      player2.score++;
      this.resetBall();
      this.updateScoreDisplay();
    } else if (ball.x + ball.radius > this.BASE_WIDTH) {
      player1.score++;
      this.resetBall();
      this.updateScoreDisplay();
    }
  }

  onUnmount(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.isOnline) {
      this.wsUnsubscribes.forEach((unsubscribe) => unsubscribe());
      this.wsUnsubscribes = [];
      gameWS.disconnect();
    }

    this.removePointerHandlers();

    if (this.keyDownHandler) {
      document.removeEventListener('keydown', this.keyDownHandler);
      this.keyDownHandler = undefined;
    }

    if (this.keyUpHandler) {
      document.removeEventListener('keyup', this.keyUpHandler);
      this.keyUpHandler = undefined;
    }

    this.startStopBtn = null;
    this.restartBtn = null;

    this.keys = {};
  }
}
