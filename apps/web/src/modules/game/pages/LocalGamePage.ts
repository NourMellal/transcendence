import Component from '../../../core/Component';
import { navigate } from '../../../routes';
import { GameCanvas } from '../components/GameCanvas';

type State = {
  leftScore: number;
  rightScore: number;
  isRunning: boolean;
  winner: 'left' | 'right' | null;
};

const WINNING_SCORE = 11;

/**
 * LocalGamePage - Full local two-player game mode.
 * Includes the actual game canvas for playable local matches.
 */
export default class LocalGamePage extends Component<Record<string, never>, State> {
  private gameCanvas: GameCanvas | null = null;

  getInitialState(): State {
    return {
      leftScore: 0,
      rightScore: 0,
      isRunning: false,
      winner: null,
    };
  }

  render(): string {
    const { leftScore, rightScore, winner } = this.state;

    return `
      <div class="relative min-h-screen" style="background: var(--color-bg-dark);">
        <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] via-[var(--color-bg-darker)] to-[#050b1a]">
          <div class="absolute inset-0 opacity-50 cyberpunk-radial-bg"></div>
        </div>
        <div class="relative max-w-6xl mx-auto px-4 lg:px-0 py-6 space-y-6">
          <!-- Header -->
          <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p class="text-sm text-white/60">Arcade</p>
              <h1 class="text-2xl md:text-3xl font-semibold tracking-tight">Local Match</h1>
              <p class="text-sm text-white/50 mt-1">
                Two players, one keyboard. First to ${WINNING_SCORE} wins!
              </p>
            </div>
            <div class="flex gap-3">
              <button
                class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
                data-action="go-dashboard"
                style="background: rgba(255,255,255,0.08); color: white;"
              >
                ← Dashboard
              </button>
              <button
                class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
                data-action="go-create"
                style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white;"
              >
                Play Online
              </button>
            </div>
          </header>

          <!-- Scoreboard -->
          <section class="glass-panel p-4 md:p-6">
            <div class="flex items-center justify-between text-center mb-4">
              <div class="flex-1">
                <p class="text-xs text-white/60 uppercase tracking-wide">Player 1</p>
                <p class="text-3xl md:text-5xl font-bold" style="color: var(--color-brand-primary);">${leftScore}</p>
                <p class="text-xs text-white/40 mt-1">W / S</p>
              </div>
              <div class="px-4">
                <div class="text-2xl text-white/30">VS</div>
                ${winner ? `
                  <div class="mt-2 px-4 py-2 rounded-lg text-sm font-semibold" 
                       style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white;">
                    🏆 Player ${winner === 'left' ? '1' : '2'} Wins!
                  </div>
                ` : `
                  <p class="text-xs text-white/40 mt-2">First to ${WINNING_SCORE}</p>
                `}
              </div>
              <div class="flex-1">
                <p class="text-xs text-white/60 uppercase tracking-wide">Player 2</p>
                <p class="text-3xl md:text-5xl font-bold" style="color: var(--color-brand-secondary);">${rightScore}</p>
                <p class="text-xs text-white/40 mt-1">↑ / ↓</p>
              </div>
            </div>
          </section>

          <!-- Game Canvas Container -->
          <section class="glass-panel p-4">
            <div id="local-game-canvas-container" class="w-full aspect-video rounded-lg overflow-hidden" 
                 style="background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1);"></div>
          </section>

          <!-- Controls Info -->
          <section class="glass-panel p-4 md:p-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p class="text-white/60 uppercase tracking-wide text-xs mb-2">Player 1 Controls</p>
                <ul class="space-y-1 text-white/80">
                  <li><strong class="text-white">W</strong> - Move Up</li>
                  <li><strong class="text-white">S</strong> - Move Down</li>
                </ul>
              </div>
              <div>
                <p class="text-white/60 uppercase tracking-wide text-xs mb-2">Player 2 Controls</p>
                <ul class="space-y-1 text-white/80">
                  <li><strong class="text-white">↑</strong> - Move Up</li>
                  <li><strong class="text-white">↓</strong> - Move Down</li>
                </ul>
              </div>
              <div>
                <p class="text-white/60 uppercase tracking-wide text-xs mb-2">Game Controls</p>
                <ul class="space-y-1 text-white/80">
                  <li><strong class="text-white">Space</strong> - Start / Pause</li>
                  <li><strong class="text-white">R</strong> - Reset Game</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  onMount(): void {
    const container = this.element?.querySelector('#local-game-canvas-container') as HTMLElement;
    
    if (container) {
      // Mount game canvas in local mode (no gameId = local play)
      this.gameCanvas = new GameCanvas({ onScoreUpdate: this.handleScoreUpdate });
      this.gameCanvas.mount(container);
    }
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions = [];
    if (!this.element) return;

    const bind = (selector: string, handler: (el: HTMLElement) => void) => {
      const elements = this.element!.querySelectorAll<HTMLElement>(selector);
      elements.forEach((element) => {
        const wrapped = (event: Event) => {
          event.preventDefault();
          handler(element);
        };
        element.addEventListener('click', wrapped);
        this.subscriptions.push(() => element.removeEventListener('click', wrapped));
      });
    };

    bind('[data-action="go-dashboard"]', () => navigate('/dashboard'));
    bind('[data-action="go-create"]', () => navigate('/game/create'));
  }

  onUnmount(): void {
    if (this.gameCanvas) {
      this.gameCanvas.unmount();
      this.gameCanvas = null;
    }
  }

  private handleScoreUpdate = ({ left, right }: { left: number; right: number }): void => {
    const winner = left >= WINNING_SCORE ? 'left' : right >= WINNING_SCORE ? 'right' : null;
    this.setState({
      leftScore: left,
      rightScore: right,
      winner,
    });
  };
}
