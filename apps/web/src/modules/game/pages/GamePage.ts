import Component from '../../../core/Component';
import { GameCanvas } from '../components/GameCanvas';

type Props = {};
type State = {};

export default class GamePage extends Component<Props, State> {
  private gameCanvas: GameCanvas | null = null;

  constructor(props: Props = {}) {
    super(props);
  }

  getInitialState(): State {
    return {};
  }

  render(): string {
    return `
      <div class="relative min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-12 safe-area-inset" style="background: var(--color-bg-dark);">
        <!-- Cyberpunk background effect -->
        <div class="absolute inset-0 cyberpunk-radial-bg"></div>
        
        <div class="relative w-full max-w-5xl">
          <!-- Header -->
          <div class="text-center mb-8 sm:mb-12">
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 tracking-tight" style="color: var(--color-text-primary);">
              🎮 Pong Arena
            </h1>
            <p class="text-base sm:text-lg" style="color: var(--color-text-secondary);">
              Master the digital battleground
            </p>
          </div>

          <!-- Game Container with Glass Effect -->
          <div class="glass-panel p-4 sm:p-6 mb-6" style="border: 2px solid var(--color-panel-border); box-shadow: var(--shadow-glass), var(--shadow-glow-primary);">
            <div id="game-canvas-container" class="rounded-lg overflow-hidden"></div>
          </div>

          <!-- Controls Info -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Player 1 Info -->
            <div class="glass-card p-4 rounded-lg" style="border: 1px solid var(--color-panel-border);">
              <div class="text-sm" style="color: var(--color-text-secondary);">Player 1 (Left)</div>
              <div class="text-lg font-semibold mt-2" style="color: var(--color-brand-primary);">🖱️ Mouse Movement</div>
              <div class="text-xs mt-1" style="color: var(--color-text-muted);">Move your paddle up/down</div>
            </div>

            <!-- Player 2 Info -->
            <div class="glass-card p-4 rounded-lg" style="border: 1px solid var(--color-panel-border);">
              <div class="text-sm" style="color: var(--color-text-secondary);">Player 2 (Right)</div>
              <div class="text-lg font-semibold mt-2" style="color: var(--color-brand-secondary);">⬆️ Arrow Keys</div>
              <div class="text-xs mt-1" style="color: var(--color-text-muted);">Press ↑ and ↓ to move</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  onMount(): void {
    const container = this.element!.querySelector('#game-canvas-container') as HTMLElement;
    
    if (container) {
      this.gameCanvas = new GameCanvas({});
      this.gameCanvas.mount(container);
    }
  }

  protected attachEventListeners(): void {
    // No additional event listeners needed - GameCanvas handles its own
  }

  onUnmount(): void {
    if (this.gameCanvas) {
      this.gameCanvas.unmount();
      this.gameCanvas = null;
    }
  }
}
