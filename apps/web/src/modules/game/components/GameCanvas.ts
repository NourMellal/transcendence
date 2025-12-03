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
  
  private readonly BASE_WIDTH = 1024;
  private readonly BASE_HEIGHT = 576;
  
  private keys: Record<string, boolean> = {};

  private ball!: Ball;
  private player1!: Paddle;
  private player2!: Paddle;
  private isRunning: boolean = false;

  private keyDownHandler?: (e: KeyboardEvent) => void;
  private keyUpHandler?: (e: KeyboardEvent) => void;
  private startStopBtn?: HTMLButtonElement | null;
  private restartBtn?: HTMLButtonElement | null;
  private readonly P1_UP = 'w';
  private readonly P1_DOWN = 's';
  private readonly P2_UP = 'ArrowUp';
  private readonly P2_DOWN = 'ArrowDown';
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
      <div class="game-controls">
        <button 
          id="start-stop-btn"
          data-action="start-game"
          class="game-controls__button"
        >
          ▶️ Start Game
        </button>

        <button 
          id="restart-btn"
          data-action="restart-game"
          class="game-controls__button game-controls__button--ghost"
        >
          🔄 Restart
        </button>
      </div>

      <div class="game-surface">
        <canvas 
          id="game-canvas" 
          class="game-surface__canvas"
        ></canvas>
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

    // Setup keyboard handlers
    this.keyDownHandler = (e: KeyboardEvent) => {
      const key = this.normalizeKey(e.key);
      if (this.isMovementKey(key)) {
        e.preventDefault();
      }
      this.keys[key] = true;
      
      // In online mode, emit paddle movement to server
      if (this.isOnline && this.props.gameId) {
        this.emitPaddleMove();
      }
    };
    document.addEventListener('keydown', this.keyDownHandler);

    this.keyUpHandler = (e: KeyboardEvent) => {
      const key = this.normalizeKey(e.key);
      this.keys[key] = false;
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
      gameWS.on('game_state', (data: GameStateUpdateEvent) => {
        this.applyGameStateUpdate(data);
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
    if (this.keys[this.P1_UP] || this.keys[this.P2_UP]) return 'up';
    if (this.keys[this.P1_DOWN] || this.keys[this.P2_DOWN]) return 'down';
    return undefined;
  }

  private normalizeKey(key: string): string {
    return key.length === 1 ? key.toLowerCase() : key;
  }

  private isMovementKey(key: string): boolean {
    return key === this.P1_UP || key === this.P1_DOWN || key === this.P2_UP || key === this.P2_DOWN;
  }

  private applyGameStateUpdate(payload: GameStateUpdateEvent): void {
    if (payload.gameId && payload.gameId !== this.props.gameId) {
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

    if (!this.isRunning) {
      this.renderer.render(this.ball, this.player1, this.player2);
    }
  }

  private resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (!container) return;
    
    const dpr = window.devicePixelRatio || 1;
    const containerWidth = container.clientWidth;
    const aspectRatio = this.BASE_WIDTH / this.BASE_HEIGHT;
    const displayWidth = containerWidth;
    const displayHeight = containerWidth / aspectRatio;
    
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
    
    const moveSpeed = 10;
    if (this.keys[this.P1_UP]) player1.y -= moveSpeed;
    if (this.keys[this.P1_DOWN]) player1.y += moveSpeed;
    if (this.keys[this.P2_UP]) player2.y -= moveSpeed;
    if (this.keys[this.P2_DOWN]) player2.y += moveSpeed;
    
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
