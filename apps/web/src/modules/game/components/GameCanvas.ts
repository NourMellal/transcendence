import Component from '../../../core/Component';
import { GameRenderer } from '../utils/GameRenderer';
import type { Ball, Paddle } from '../types/game.types';

interface GameCanvasProps {}

interface GameCanvasState {
  ball: Ball;
  player1: Paddle;
  player2: Paddle;
  isGameRunning: boolean;
}

export class GameCanvas extends Component<GameCanvasProps, GameCanvasState> {
  private canvas!: HTMLCanvasElement;
  private renderer!: GameRenderer;
  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  
  private readonly BASE_WIDTH = 800;
  private readonly BASE_HEIGHT = 600;
  
  private mouseY: number = this.BASE_HEIGHT / 2;
  private keys: { [key: string]: boolean } = {};

  getInitialState(): GameCanvasState {
    return {
      ball: {
        x: this.BASE_WIDTH / 2,
        y: this.BASE_HEIGHT / 2,
        radius: 5,
        velocityX: 5,
        velocityY: 5,
        speed: 7,
        maxSpeed: 15
      },
      player1: {
        x: 10,
        y: this.BASE_HEIGHT / 2 - 50,
        width: 10,
        height: 100,
        score: 0,
        dy: 0
      },
      player2: {
        x: this.BASE_WIDTH - 20,
        y: this.BASE_HEIGHT / 2 - 50,
        width: 10,
        height: 100,
        score: 0,
        dy: 0
      },
      isGameRunning: false
    };
  }

  render(): string {
    return `
      <div class="relative max-w-4xl mx-auto p-4">
        <div class="glass-panel glass-panel-mobile p-4 sm:p-8" style="border: 1px solid rgba(255, 255, 255, 0.1); padding-top: calc(env(safe-area-inset-top) + 1rem); padding-bottom: calc(env(safe-area-inset-bottom) + 1rem);">
          <div class="relative aspect-[4/3] rounded-xl overflow-hidden" style="background: var(--color-bg-dark);">
            <canvas 
              id="game-canvas" 
              class="w-full h-full"
              style="image-rendering: crisp-edges;"
            ></canvas>
          </div>

          <div class="mt-4 flex gap-2 items-center justify-center">
            <button id="start-stop-btn" class="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white transition-colors">
              Start Game
            </button>
            <button id="restart-btn" class="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white transition-colors">
              Restart
            </button>
          </div>
        </div>
      </div>
    `;
  }

  onMount(): void {
    this.canvas = this.element!.querySelector('#game-canvas') as HTMLCanvasElement;
    this.renderer = new GameRenderer(this.canvas);
    
    this.resizeCanvas();
    
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
      if (!this.state.isGameRunning) {
        this.renderer.render(this.state.ball, this.state.player1, this.state.player2);
      }
    });
    
    const container = this.canvas.parentElement;
    if (container) {
      this.resizeObserver.observe(container);
    }
    
    this.renderer.render(this.state.ball, this.state.player1, this.state.player2);
  }

  protected attachEventListeners(): void {
    const startStopBtn = this.element!.querySelector('#start-stop-btn') as HTMLButtonElement;
    const restartBtn = this.element!.querySelector('#restart-btn') as HTMLButtonElement;

    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleY = this.BASE_HEIGHT / rect.height;
      this.mouseY = (e.clientY - rect.top) * scaleY;
    });

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keys[e.key] = true;
    });

    document.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys[e.key] = false;
    });

    startStopBtn.addEventListener('click', () => this.toggleGame(startStopBtn));
    restartBtn.addEventListener('click', () => this.resetGame());
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
    
    this.canvas.style.imageRendering = 'crisp-edges';
  }

  private toggleGame(button: HTMLButtonElement): void {
    this.setState({ isGameRunning: !this.state.isGameRunning });
    
    if (this.state.isGameRunning) {
      button.textContent = 'Stop Game';
      button.classList.remove('bg-green-600', 'hover:bg-green-700');
      button.classList.add('bg-red-600', 'hover:bg-red-700');
      this.gameLoop();
    } else {
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
    this.setState({
      ball: {
        ...this.state.ball,
        x: this.BASE_WIDTH / 2,
        y: this.BASE_HEIGHT / 2,
        velocityX: -this.state.ball.velocityX,
        speed: 7
      }
    });
  }

  private resetGame(): void {
    this.setState({
      player1: { ...this.state.player1, score: 0 },
      player2: { ...this.state.player2, score: 0 }
    });
    this.resetBall();
  }

  private updateGame(): void {
    if (!this.state.isGameRunning) return;
    
    const { ball, player1, player2 } = this.state;
    
    player1.y = this.mouseY - player1.height / 2;
    
    if (this.keys['ArrowUp']) player2.y -= 8;
    if (this.keys['ArrowDown']) player2.y += 8;
    
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
      this.setState({ player2 });
      this.resetBall();
    } else if (ball.x + ball.radius > this.BASE_WIDTH) {
      player1.score++;
      this.setState({ player1 });
      this.resetBall();
    }
  }

  private gameLoop(): void {
    if (!this.state.isGameRunning) return;
    
    this.updateGame();
    this.renderer.render(this.state.ball, this.state.player1, this.state.player2);
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  onUnmount(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    this.keys = {};
  }
}
