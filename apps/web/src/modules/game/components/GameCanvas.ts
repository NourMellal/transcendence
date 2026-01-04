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
import { navigate } from '@/routes';
import { parseQueryParams } from '@/utils/helpers';

interface GameCanvasProps {
  gameId?: string; // Optional: for online mode
  onScoreUpdate?: (score: { left: number; right: number }) => void;
}

type ConnectionStatus = WSConnectionState | 'reconnecting';

interface GameCanvasState {
  isGameRunning: boolean;
  connectionStatus?: ConnectionStatus;
  mySide?: 'left' | 'right';
  showEndModal: boolean;
  winnerName?: string;
  winnerId?: string;
}

export class GameCanvas extends Component<GameCanvasProps, GameCanvasState> {
  private canvas!: HTMLCanvasElement;
  private renderer!: GameRenderer;
  private resizeObserver: ResizeObserver | null = null;

  private animationId: number | null = null;
  private isOnline: boolean = false;
  private wsUnsubscribes: Array<() => void> = [];
  private autoReady: boolean = false;
  private autoReadyKnown: boolean = false;
  private autoReadySent: boolean = false;
  private isTournamentGame: boolean = false;
  private tournamentReturnPath?: string;

  private readonly BASE_WIDTH = 800;
  private readonly BASE_HEIGHT = 600;
  private readonly LOCAL_VERTICAL_PADDING = 30;
  private readonly WALL_PADDING = 25;
  private readonly PADDLE_SPEED = 8;
  private readonly INPUT_THROTTLE_MS = 16;
  private readonly WINNING_SCORE = 11;

  private mouseY: number = this.BASE_HEIGHT / 2;
  private keys: Record<string, boolean> = {};
  private lastInputSentAt = 0;
  private lastSentPaddleY: number | null = null;

  private ball!: Ball;
  private player1!: Paddle;
  private player2!: Paddle;
  private isRunning: boolean = false;
  private mySide: 'left' | 'right' = 'left';

  private keyDownHandler?: (e: KeyboardEvent) => void;
  private keyUpHandler?: (e: KeyboardEvent) => void;
  private mouseMoveHandler?: (e: MouseEvent) => void;
  private touchMoveHandler?: (e: TouchEvent) => void;
  private touchStartHandler?: (e: TouchEvent) => void;
  private pointerMoveHandler?: (e: PointerEvent) => void;
  private startStopBtn?: HTMLButtonElement | null;
  private restartBtn?: HTMLButtonElement | null;
  private returnHomeBtn?: HTMLButtonElement | null;
  private returnHomeHandler?: (event: Event) => void;
  private readonly player2Controls = { up: 'ArrowUp', down: 'ArrowDown' };
  private readonly player1Controls = { up: 'w', down: 's' };
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
      showEndModal: false,
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
      <div class="game-canvas-wrapper flex flex-col gap-6 sm:gap-8 relative w-full max-w-[800px] mx-auto">
        ${this.renderEndModal()}
        
        <!-- Game Canvas -->
        <div class="relative w-full group">
          <!-- Glass card container -->
          <div class="relative rounded-[2rem] p-1 overflow-hidden" style="background: rgba(28, 28, 30, 0.7); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.08);">
            
            <!-- Inner game area -->
            <div class="relative rounded-[1.8rem] w-full overflow-hidden flex flex-col" style="background: #050505; border: 1px solid rgba(255, 255, 255, 0.05); aspect-ratio: 4 / 3; box-shadow: inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);">
              
              <!-- Score Overlay on Canvas -->
              <div class="absolute top-6 sm:top-8 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none select-none">
                <div class="relative">
                  <!-- Score glow -->
                  <div class="absolute -inset-1 rounded-full opacity-30" style="background: rgba(255, 0, 110, 0.5); filter: blur(8px);"></div>
                  <!-- Score card -->
                  <div class="relative rounded-full px-4 sm:px-6 py-1.5 sm:py-2 flex items-center justify-center gap-4 sm:gap-6" style="background: rgba(28, 28, 30, 0.7); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);">
                    <span id="player1-score" class="text-lg sm:text-xl font-bold text-white tabular-nums drop-shadow-md">0</span>
                    <div class="h-1.5 w-1.5 rounded-full" style="background: rgba(255, 0, 110, 0.8); box-shadow: 0 0 8px rgba(255, 0, 110, 0.6);"></div>
                    <span id="player2-score" class="text-lg sm:text-xl font-bold text-white tabular-nums drop-shadow-md">0</span>
                  </div>
                </div>
              </div>
              
              <!-- Canvas -->
              <canvas
                id="game-canvas"
                class="w-full h-full"
                style="display: block; image-rendering: crisp-edges;"
              ></canvas>
            </div>
          </div>
        </div>

        <!-- Bottom Controls Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
          
          <!-- Score Panel -->
          <div class="relative group">
            <!-- Glow -->
            <div class="absolute -inset-0.5 rounded-2xl opacity-20 transition duration-500" style="background: rgba(255, 0, 110, 0.5); filter: blur(12px);"></div>
            <!-- Glass card -->
            <div class="relative rounded-2xl p-6 flex justify-between items-center h-full" style="background: rgba(28, 28, 30, 0.7); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.08);">
              <div class="flex flex-col items-center flex-1 border-r border-white/10">
                <span class="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase mb-1">Player 1</span>
                <span id="player1-score-panel" class="text-3xl font-light text-white">0</span>
              </div>
              <div class="flex flex-col items-center flex-1">
                <span class="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase mb-1">Player 2</span>
                <span id="player2-score-panel" class="text-3xl font-light text-white">0</span>
              </div>
            </div>
          </div>

          <!-- Control Buttons Panel -->
          <div class="relative group">
            <!-- Glow -->
            <div class="absolute -inset-0.5 rounded-2xl opacity-20 transition duration-500" style="background: rgba(255, 0, 110, 0.5); filter: blur(12px);"></div>
            <!-- Glass card -->
            <div class="relative rounded-2xl p-6 flex gap-4 items-center justify-center h-full" style="background: rgba(28, 28, 30, 0.7); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.08);">
              <button
                id="start-stop-btn"
                data-action="start-game"
                class="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-medium transition-all duration-200 transform active:scale-95 hover:bg-gray-100"
                style="background: white; color: black; box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2);"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8" fill="currentColor"></polygon></svg>
                <span>Start Game</span>
              </button>

              <button
                id="restart-btn"
                data-action="restart-game"
                class="flex-none flex items-center justify-center py-3 px-4 rounded-xl font-medium transition-all duration-200 transform active:scale-95 hover:bg-white/10"
                style="background: rgba(255, 255, 255, 0.05); color: white; border: 1px solid rgba(255, 255, 255, 0.1); backdrop-filter: blur(8px);"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderEndModal(): string {
    if (!this.state.showEndModal) {
      return '';
    }

    const winnerLabel = this.state.winnerName ?? 'Winner';
    const returnLabel = this.getReturnLabel();

    return `
      <div class="absolute inset-0 z-20 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-md rounded-2xl"></div>
        <div class="relative w-full max-w-md mx-4 rounded-2xl p-8 text-center overflow-hidden" style="border: 1px solid rgba(255, 255, 255, 0.1); background: linear-gradient(135deg, rgba(13, 17, 23, 0.98) 0%, rgba(27, 31, 35, 0.98) 100%); box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);">
          <!-- Subtle glow effect -->
          <div class="absolute inset-0 opacity-10" style="background: radial-gradient(circle at 50% 0%, var(--color-brand-primary), transparent 60%);"></div>

          <div class="relative">
            <p class="text-xs sm:text-sm uppercase tracking-widest font-semibold" style="color: rgba(255, 255, 255, 0.5); letter-spacing: 0.15em;">Match Finished</p>
            <h3 class="text-3xl sm:text-5xl font-bold mt-4 mb-8 flex items-center justify-center gap-3" style="color: #ffffff; text-shadow: 0 2px 20px rgba(0, 179, 217, 0.4);">
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="48" height="48" fill="currentColor"><path d="M96 1.2H32v9.9h64V1.2zm31.7 12.3h-34l-93.4.2S-1.4 31.4 3 43.5c3.7 10.1 15 16.3 15 16.3l-4.1 5.4 5.4 2.7 5.4-9.5S10.4 49.8 7 42.1C3.7 34.5 4.3 19 4.3 19h30.4c.2 5.2 0 13.5-1.7 21.7-1.9 9.1-6.6 19.6-10.1 21.1 7.7 10.7 22.3 19.9 29 19.7 0 6.2.3 18-6.7 23.6-7 5.6-10.8 13.6-10.8 13.6h-6.7v8.1h72.9v-8.1h-6.7s-3.8-8-10.8-13.6c-7-5.6-6.7-17.4-6.7-23.6 6.8.2 21.4-8.8 29.1-19.5-3.6-1.4-8.3-12.2-10.2-21.2-1.7-8.2-1.8-16.5-1.7-21.7h29.1s1.4 15.4-1.9 23-17.4 16.3-17.4 16.3l5.5 9.5L114 65l-4.1-5.4s11.3-6.2 15-16.3c4.5-12.1 2.8-29.8 2.8-29.8z"/></svg>
              ${winnerLabel}
            </h3>
            <button
              data-action="return-home"
              class="btn-touch px-8 py-4 rounded-xl font-semibold touch-feedback transition-all duration-300 hover:scale-105"
              style="background: linear-gradient(135deg, #00b3d9 0%, #0095b8 100%); color: white; box-shadow: 0 4px 20px rgba(0, 179, 217, 0.3); border: 1px solid rgba(255, 255, 255, 0.1);"
            >
              ${returnLabel}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private showGameEndModal(winnerId?: string, winnerName?: string): void {
    if (this.state.showEndModal) {
      return;
    }

    const label = winnerName ?? this.deriveWinnerLabel(winnerId);
    this.setState({ showEndModal: true, winnerName: label, winnerId });
  }

  private deriveWinnerLabel(winnerId?: string): string {
    if (!winnerId) {
      return 'Winner';
    }

    const currentUserId = (appState.auth.get().user as { id?: string } | undefined)?.id;
    if (currentUserId && currentUserId === winnerId) {
      return 'You Win';
    }

    return 'Opponent Wins';
  }

  private handleReturnHome(): void {
    navigate(this.getReturnPath());
  }

  onMount(): void {
    this.canvas = this.element!.querySelector('#game-canvas') as HTMLCanvasElement;
    this.renderer = new GameRenderer(this.canvas);

    this.initializeGameObjects();
    this.isOnline = isOnlineMode() && Boolean(this.props.gameId);

    this.resizeCanvas();
    this.observeCanvasResize();
    this.renderer.render(this.ball, this.player1, this.player2);

    this.resolveTournamentReturnPath();
    this.attachEventListeners();

    if (this.isOnline) {
      this.disableLocalButtons();
      void this.syncSideAndState().finally(() => {
        void this.maybeAutoReady(true);
      });
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

    if (this.returnHomeBtn && this.returnHomeHandler) {
      this.returnHomeBtn.removeEventListener('click', this.returnHomeHandler);
    }
    this.returnHomeBtn = this.element.querySelector('[data-action="return-home"]') as HTMLButtonElement | null;
    if (this.returnHomeBtn) {
      this.returnHomeHandler = (event: Event) => {
        event.preventDefault();
        this.handleReturnHome();
      };
      this.returnHomeBtn.addEventListener('click', this.returnHomeHandler);
    }
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
      // Prevent scrolling for game control keys
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown' ||
          event.key === 'w' || event.key === 's' || event.key === 'W' || event.key === 'S') {
        event.preventDefault();
      }
      // Store lowercase for letter keys for consistent checking
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      this.keys[key] = true;
    };
    document.addEventListener('keydown', this.keyDownHandler);

    if (this.keyUpHandler) {
      document.removeEventListener('keyup', this.keyUpHandler);
    }
    this.keyUpHandler = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      this.keys[key] = false;
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
        void this.maybeAutoReady();
      }),
      gameWS.on('disconnect', () => updateStatus('disconnected')),
      gameWS.on('connect_error', () => updateStatus('error')),
      gameWS.on('game_start', (event: GameStartEvent) => this.handleGameStart(event)),
      gameWS.on('game_state', (event: GameStateUpdateEvent) => this.applyGameStateUpdate(event)),
      gameWS.on('ball_state', (event: BallStateEvent) => this.applyBallStateUpdate(event)),
      gameWS.on('paddle_update', (event: PaddleUpdateEvent) => this.applyPaddleUpdate(event)),
      gameWS.on('game:finished', (event: GameEndEvent) => this.handleGameEnd(event)),
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
      this.isTournamentGame = game.mode === 'TOURNAMENT';
      this.autoReady = this.isTournamentGame;
      this.autoReadyKnown = true;
    } catch (error) {
      console.warn('[GameCanvas] syncSideAndState failed', error);
    }
  }

  private async maybeAutoReady(force = false): Promise<void> {
    if (!this.props.gameId || this.autoReadySent) return;
    if (!this.autoReadyKnown) {
      try {
        const game = await gameService.getGame(this.props.gameId);
        this.isTournamentGame = game.mode === 'TOURNAMENT';
        this.autoReady = this.isTournamentGame;
        this.autoReadyKnown = true;
      } catch (error) {
        console.warn('[GameCanvas] Auto-ready check failed', error);
        return;
      }
    }

    if (!this.autoReady) return;
    if (!force && gameWS.getState() !== 'connected') return;

    this.autoReadySent = true;
    gameWS.send('ready', { gameId: this.props.gameId });
  }

  private resolveTournamentReturnPath(): void {
    const params = parseQueryParams();
    if (params.tournamentId) {
      this.tournamentReturnPath = `/tournament/${params.tournamentId}`;
    }
  }

  private getReturnLabel(): string {
    if (this.tournamentReturnPath) {
      return 'Return to Bracket';
    }
    if (this.isTournamentGame) {
      return 'Return to Tournaments';
    }
    return 'Return to Dashboard';
  }

  private getReturnPath(): string {
    if (this.tournamentReturnPath) {
      return this.tournamentReturnPath;
    }
    if (this.isTournamentGame) {
      return '/tournament/list';
    }
    return '/dashboard';
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
    this.showGameEndModal(event.winnerId, event.winnerUsername);
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
    const player1ScorePanelEl = this.element?.querySelector('#player1-score-panel');
    const player2ScorePanelEl = this.element?.querySelector('#player2-score-panel');

    if (player1ScoreEl) player1ScoreEl.textContent = String(this.player1.score);
    if (player2ScoreEl) player2ScoreEl.textContent = String(this.player2.score);
    if (player1ScorePanelEl) player1ScorePanelEl.textContent = String(this.player1.score);
    if (player2ScorePanelEl) player2ScorePanelEl.textContent = String(this.player2.score);
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
      this.startStopBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="display: inline-block; vertical-align: middle; margin-right: 6px;"><g data-name="24.play circle"><path d="M12 0a12 12 0 1 0 12 12A12.013 12.013 0 0 0 12 0zm0 22a10 10 0 1 1 10-10 10.011 10.011 0 0 1-10 10z"/><path d="m10.8 15.8 5-4a1 1 0 0 0 0-1.6l-5-4a1 1 0 0 0-1.6.8v8a1 1 0 0 0 1.6.8z"/></g></svg>Start Game';
    } else {
      this.startLoop();
      this.startStopBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="display: inline-block; vertical-align: middle; margin-right: 6px;"><g data-name="pause circle"><path d="M12 0a12 12 0 1 0 12 12A12 12 0 0 0 12 0zm0 22a10 10 0 1 1 10-10 10 10 0 0 1-10 10z"/><path d="M14 8v8a1 1 0 0 0 2 0V8a1 1 0 0 0-2 0zM8 8v8a1 1 0 0 0 2 0V8a1 1 0 0 0-2 0z"/></g></svg>Stop Game';
    }
  }

  private startLoop(): void {
    if (this.isRunning) return;

    this.lastSentPaddleY = null;
    this.lastInputSentAt = 0;
    this.isRunning = true;
    this.setState({ isGameRunning: true });
    // Update score display after setState re-rendered the HTML
    this.updateScoreDisplay();
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

    // Re-render to keep game objects visible when stopped
    this.renderer.render(this.ball, this.player1, this.player2);
    // Update score display after setState re-rendered the HTML
    this.updateScoreDisplay();
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
    this.player1.y = this.BASE_HEIGHT / 2 - this.player1.height / 2;
    this.player2.y = this.BASE_HEIGHT / 2 - this.player2.height / 2;
    this.resetBall();
    this.updateScoreDisplay();
    this.renderer.render(this.ball, this.player1, this.player2);

    // Re-enable start button after reset
    if (this.startStopBtn) {
      this.startStopBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="display: inline-block; vertical-align: middle; margin-right: 6px;"><g data-name="24.play circle"><path d="M12 0a12 12 0 1 0 12 12A12.013 12.013 0 0 0 12 0zm0 22a10 10 0 1 1 10-10 10.011 10.011 0 0 1-10 10z"/><path d="m10.8 15.8 5-4a1 1 0 0 0 0-1.6l-5-4a1 1 0 0 0-1.6.8v8a1 1 0 0 0 1.6.8z"/></g></svg>Start Game';
      this.startStopBtn.disabled = false;
      this.startStopBtn.style.opacity = '1';
    }
  }

  private updateLocalPhysics(): void {
    const { ball, player1, player2 } = this;

    // Player 1 keyboard controls (W/S)
    if (this.keys[this.player1Controls.up]) player1.y -= this.PADDLE_SPEED;
    if (this.keys[this.player1Controls.down]) player1.y += this.PADDLE_SPEED;
    player1.y = this.clampLocalPaddleY(player1.y, player1.height);

    // Player 2 keyboard controls (Arrow keys)
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
      this.props.onScoreUpdate?.({ left: player1.score, right: player2.score });
      if (player2.score >= this.WINNING_SCORE) {
        this.endGame('Player 2');
        return;
      }
    } else if (ball.x + ball.radius > this.BASE_WIDTH) {
      player1.score++;
      this.resetBall();
      this.updateScoreDisplay();
      this.props.onScoreUpdate?.({ left: player1.score, right: player2.score });
      if (player1.score >= this.WINNING_SCORE) {
        this.endGame('Player 1');
        return;
      }
    }
  }

  private endGame(winner: string): void {
    this.stopLoop();
    if (this.startStopBtn) {
      this.startStopBtn.innerHTML = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="18" height="18" fill="currentColor" style="display: inline-block; vertical-align: middle; margin-right: 6px;"><path d="M96 1.2H32v9.9h64V1.2zm31.7 12.3h-34l-93.4.2S-1.4 31.4 3 43.5c3.7 10.1 15 16.3 15 16.3l-4.1 5.4 5.4 2.7 5.4-9.5S10.4 49.8 7 42.1C3.7 34.5 4.3 19 4.3 19h30.4c.2 5.2 0 13.5-1.7 21.7-1.9 9.1-6.6 19.6-10.1 21.1 7.7 10.7 22.3 19.9 29 19.7 0 6.2.3 18-6.7 23.6-7 5.6-10.8 13.6-10.8 13.6h-6.7v8.1h72.9v-8.1h-6.7s-3.8-8-10.8-13.6c-7-5.6-6.7-17.4-6.7-23.6 6.8.2 21.4-8.8 29.1-19.5-3.6-1.4-8.3-12.2-10.2-21.2-1.7-8.2-1.8-16.5-1.7-21.7h29.1s1.4 15.4-1.9 23-17.4 16.3-17.4 16.3l5.5 9.5L114 65l-4.1-5.4s11.3-6.2 15-16.3c4.5-12.1 2.8-29.8 2.8-29.8z"/></svg>${winner} Wins!`;
      this.startStopBtn.disabled = true;
    }
    this.showGameEndModal(undefined, winner);
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

    if (this.returnHomeBtn && this.returnHomeHandler) {
      this.returnHomeBtn.removeEventListener('click', this.returnHomeHandler);
    }
    this.returnHomeBtn = null;
    this.returnHomeHandler = undefined;

    this.startStopBtn = null;
    this.restartBtn = null;

    this.keys = {};
  }
}
