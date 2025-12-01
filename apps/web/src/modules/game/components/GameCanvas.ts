import Component from '../../../core/Component';
import { GameRenderer } from '../utils/GameRenderer';
import type { Ball, Paddle, GameStateUpdateEvent } from '../types/game.types';
import { gameWS } from '@/modules/shared/services/WebSocketClient';
import { isOnlineMode } from '../utils/featureFlags';

interface GameCanvasProps {
  gameId?: string; // Optional: for online mode
}

interface GameCanvasState {
  isGameRunning: boolean;
  connectionStatus?: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'failed';
}

export class GameCanvas extends Component<GameCanvasProps, GameCanvasState> {
  private canvas!: HTMLCanvasElement;
  private renderer!: GameRenderer;
  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private isOnline: boolean = false;
  private wsUnsubscribes: Array<() => void> = [];
  
  private readonly BASE_WIDTH = 800;
  private readonly BASE_HEIGHT = 600;
  
  private mouseY: number = this.BASE_HEIGHT / 2;
  private touchY: number = this.BASE_HEIGHT / 2;
  private keys: { [key: string]: boolean } = {};

  private ball!: Ball;
  private player1!: Paddle;
  private player2!: Paddle;
  private isRunning: boolean = false;

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
    const button = target.closest('[data-action]') as HTMLElement;
    
    if (!button) return;
    
    const action = button.dataset.action;
    console.log('[GameCanvas] Button clicked with action:', action);
    
    if (action === 'start-game') {
      console.log('[GameCanvas] Start game action triggered');
      this.toggleGame(this.startStopBtn as HTMLButtonElement);
    } else if (action === 'restart-game') {
      console.log('[GameCanvas] Restart game action triggered');
      this.resetGame();
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
          <div class="game-area aspect-video rounded-lg sm:rounded-xl overflow-hidden" style="background: var(--color-bg-dark);">
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
    this.renderer = new GameRenderer(this.canvas );
    
    this.initializeGameObjects();
    
    // Determine if we're in online mode
    this.isOnline = isOnlineMode() && !!this.props.gameId;
    
    if (this.isOnline) {
      console.log('[GameCanvas] Online mode - setting up WebSocket...');
      void this.setupWebSocket();
    } else {
      console.log('[GameCanvas] Local mode - using client-side physics');
    }
    
    this.resizeCanvas();
    
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
      if (!this.isRunning) {
        this.renderer.render(this.ball, this.player1, this.player2);
      }
    });
    
    const container = this.canvas.parentElement;
    if (container) {
      this.resizeObserver.observe(container);
    }
    
    this.renderer.render(this.ball, this.player1, this.player2);
    
    // Attach event listeners after DOM is ready
    this.attachEventListeners();
  }

  protected attachEventListeners(): void {
    console.log('[GameCanvas] Attaching event listeners...');
    
    if (!this.element) {
      console.warn('[GameCanvas] Element not found, skipping event listeners');
      return;
    }
    
    // Re-query canvas after re-render
    this.canvas = this.element.querySelector('#game-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      console.warn('[GameCanvas] Canvas not found, skipping event listeners');
      return;
    }
    
    // Recreate renderer with the new canvas
    this.renderer = new GameRenderer(this.canvas);
    this.resizeCanvas();
    
    // Query button references for updating text/disabled state
    this.startStopBtn = this.element.querySelector('#start-stop-btn') as HTMLButtonElement | null;
    this.restartBtn = this.element.querySelector('#restart-btn') as HTMLButtonElement | null;

    console.log('[GameCanvas] Start button found:', !!this.startStopBtn);
    console.log('[GameCanvas] Restart button found:', !!this.restartBtn);

    // Use event delegation on the parent element - this survives re-renders
    // Remove old listener first to prevent duplicates
    this.element.removeEventListener('click', this.handleButtonClick);
    this.element.addEventListener('click', this.handleButtonClick);

    // Setup mouse/touch handlers for paddle control
    this.mouseMoveHandler = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleY = this.BASE_HEIGHT / rect.height;
      this.mouseY = (e.clientY - rect.top) * scaleY;
    };
    this.canvas.addEventListener('mousemove', this.mouseMoveHandler);

    this.touchMoveHandler = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleY = this.BASE_HEIGHT / rect.height;
        this.touchY = (e.touches[0].clientY - rect.top) * scaleY;
        this.mouseY = this.touchY;
      }
    };
    this.canvas.addEventListener('touchmove', this.touchMoveHandler, { passive: false });

    this.touchStartHandler = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleY = this.BASE_HEIGHT / rect.height;
        this.touchY = (e.touches[0].clientY - rect.top) * scaleY;
        this.mouseY = this.touchY;
      }
    };
    this.canvas.addEventListener('touchstart', this.touchStartHandler, { passive: false });

    this.pointerMoveHandler = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        const rect = this.canvas.getBoundingClientRect();
        const scaleY = this.BASE_HEIGHT / rect.height;
        this.mouseY = (e.clientY - rect.top) * scaleY;
      }
    };
    this.canvas.addEventListener('pointermove', this.pointerMoveHandler);

    // Setup keyboard handlers
    this.keyDownHandler = (e: KeyboardEvent) => {
      this.keys[e.key] = true;
      
      // In online mode, emit paddle movement to server
      if (this.isOnline && this.props.gameId) {
        this.emitPaddleMove();
      }
    };
    document.addEventListener('keydown', this.keyDownHandler);

    this.keyUpHandler = (e: KeyboardEvent) => {
      this.keys[e.key] = false;
    };
    document.addEventListener('keyup', this.keyUpHandler);
  }

  private async setupWebSocket(): Promise<void> {
    if (!this.props.gameId) return;

    console.log('[GameCanvas] Connecting WebSocket for game:', this.props.gameId);

    const updateStatus = (status: GameCanvasState['connectionStatus']) =>
      this.setState({ connectionStatus: status });

    this.wsUnsubscribes.push(
      gameWS.on('connect', () => {
        updateStatus('connected');
        gameWS.send('join_game', { gameId: this.props.gameId });
      }),
      gameWS.on('disconnect', () => updateStatus('disconnected')),
      gameWS.on('connect_error', () => updateStatus('error')),
      gameWS.on('game_start', (data: any) => {
        if (data?.gameId === this.props.gameId) {
          this.isRunning = true;
          this.setState({ isGameRunning: true });
          this.gameLoop();
        }
      }),
      gameWS.on('game_state', (data: any) => {
        const payloadGameId = data?.gameId ?? data?.id;
        if (payloadGameId !== this.props.gameId) {
          return;
        }

        const ballPosition = data?.ball?.position ?? data?.ball;
        const ballVelocity = data?.ball?.velocity ?? data?.ball;

        if (ballPosition) {
          this.ball.x = ballPosition.x ?? this.ball.x;
          this.ball.y = ballPosition.y ?? this.ball.y;
        }

        if (ballVelocity) {
          this.ball.velocityX = ballVelocity.velocityX ?? ballVelocity.dx ?? this.ball.velocityX;
          this.ball.velocityY = ballVelocity.velocityY ?? ballVelocity.dy ?? this.ball.velocityY;
        }

        const paddles = data?.paddles;
        const players = Array.isArray(data?.players) ? data.players : undefined;

        if (paddles?.left?.y !== undefined) {
          this.player1.y = paddles.left.y;
        } else if (players?.[0]?.paddle?.position?.y !== undefined) {
          this.player1.y = players[0].paddle.position.y;
        }

        if (paddles?.right?.y !== undefined) {
          this.player2.y = paddles.right.y;
        } else if (players?.[1]?.paddle?.position?.y !== undefined) {
          this.player2.y = players[1].paddle.position.y;
        }

        const score = data?.score;
        if (score) {
          this.player1.score = score.left ?? score.player1 ?? this.player1.score;
          this.player2.score = score.right ?? score.player2 ?? this.player2.score;
        }

        if (!this.isRunning) {
          this.renderer.render(this.ball, this.player1, this.player2);
        }
      }),
      gameWS.on('game_end', (data: any) => {
        if (data?.gameId === this.props.gameId) {
          console.log('[GameCanvas] Game finished:', data);
          this.isRunning = false;
          this.setState({ isGameRunning: false });

          if (data.finalScore) {
            this.player1.score = data.finalScore.left ?? 0;
            this.player2.score = data.finalScore.right ?? 0;
          }

          if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
          }
        }
      }),
      gameWS.on('error', (data: any) => {
        console.error('[GameCanvas] Game error:', data);
      })
    );

    const state = gameWS.getState();
    if (state && state !== this.state.connectionStatus) {
      updateStatus(state as GameCanvasState['connectionStatus']);
    }

    await gameWS.connect();
  }

  private emitPaddleMove(): void {
    if (!this.props.gameId) return;

    const direction = this.resolveDirection();
    if (!direction) {
      return;
    }

    gameWS.send('paddle_move', {
      gameId: this.props.gameId,
      direction,
      deltaTime: 0.016,
    });
  }

  private resolveDirection(): 'up' | 'down' | undefined {
    if (this.keys['ArrowUp']) return 'up';
    if (this.keys['ArrowDown']) return 'down';
    return undefined;
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
    
  // imageRendering is set in the static canvas markup; no need to set it here again
  }

  private toggleGame(button: HTMLButtonElement): void {
    console.log('[GameCanvas] toggleGame called, current isRunning:', this.isRunning);
    const nextRunning = !this.isRunning;
    
    this.isRunning = nextRunning;
    console.log('[GameCanvas] Setting isRunning to:', nextRunning);
    
    this.setState({ isGameRunning: nextRunning });
    
    if (nextRunning) {
      console.log('[GameCanvas] Starting game loop...');
      button.textContent = 'Stop Game';
      button.classList.remove('bg-green-600', 'hover:bg-green-700');
      button.classList.add('bg-red-600', 'hover:bg-red-700');
      this.gameLoop();
    } else {
      console.log('[GameCanvas] Stopping game...');
      button.textContent = 'Start Game';
      button.classList.remove('bg-red-600', 'hover:bg-red-700');
      button.classList.add('bg-green-600', 'hover:bg-green-700');
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }
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
    this.ball.velocityX = -this.ball.velocityX;
    this.ball.speed = 7;
  }

  private resetGame(): void {
    this.player1.score = 0;
    this.player2.score = 0;
    this.resetBall();
  }

  private updateGame(): void {
    if (!this.isRunning) return;
    
    // In online mode, server handles physics - we only update our paddle
    if (this.isOnline) {
      // Forward input to the server; authoritative state is streamed via game_state
      this.emitPaddleMove();
      return;
    }
    
    // Local mode: run full client-side physics
    const { ball, player1, player2 } = this;
    
    player1.y = this.mouseY - player1.height / 2;
    
    if (this.keys[this.player2Controls.up]) player2.y -= 8;
    if (this.keys[this.player2Controls.down]) player2.y += 8;
    
    player1.y = Math.max(30, Math.min(this.BASE_HEIGHT - player1.height - 30, player1.y));
    player2.y = Math.max(30, Math.min(this.BASE_HEIGHT - player2.height - 30, player2.y));
    
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;
    
    if (ball.y + ball.radius > this.BASE_HEIGHT - 25 || ball.y - ball.radius < 25) {
      ball.velocityY = -ball.velocityY;
    }
    
    const player = ball.x < this.BASE_WIDTH / 2 ? player1 : player2;
    
    if (this.collision(ball, player)) {
      const collidePoint = (ball.y - (player.y + player.height / 2)) / (player.height / 2);
      const angleRad = (Math.PI / 4) * collidePoint;
      const direction = ball.x < this.BASE_WIDTH / 2 ? 1 : -1;
      
      ball.velocityX = direction * ball.speed * Math.cos(angleRad);
      ball.velocityY = ball.speed * Math.sin(angleRad);
      ball.speed = Math.min(ball.speed + 0.3, ball.maxSpeed);
    }
    
    if (ball.x - ball.radius < 0) {
      player2.score++;
      this.resetBall();
    } else if (ball.x + ball.radius > this.BASE_WIDTH) {
      player1.score++;
      this.resetBall();
    }
  }

  private gameLoop(): void {
    if (!this.isRunning) return;
    
    this.updateGame();
    this.renderer.render(this.ball, this.player1, this.player2);
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  onUnmount(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Disconnect WebSocket in online mode
    if (this.isOnline) {
      console.log('[GameCanvas] Disconnecting WebSocket...');
      this.wsUnsubscribes.forEach((unsubscribe) => unsubscribe());
      this.wsUnsubscribes = [];
      gameWS.disconnect();
    }

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

    if (this.keyDownHandler) {
      document.removeEventListener('keydown', this.keyDownHandler);
      this.keyDownHandler = undefined;
    }

    if (this.keyUpHandler) {
      document.removeEventListener('keyup', this.keyUpHandler);
      this.keyUpHandler = undefined;
    }

    if (this.startStopBtn && this.startStopHandler) {
      this.startStopBtn.removeEventListener('click', this.startStopHandler);
      this.startStopHandler = undefined;
    }

    if (this.restartBtn && this.restartHandler) {
      this.restartBtn.removeEventListener('click', this.restartHandler);
      this.restartHandler = undefined;
    }

    this.startStopBtn = null;
    this.restartBtn = null;

    this.keys = {};
  }
}
