import Component from '../../../core/Component';
import { navigate } from '../../../routes';
import { GameCanvas } from '../components/GameCanvas';

/**
 * LocalGamePage - Full local two-player game mode.
 * Includes the actual game canvas for playable local matches.
 */
export default class LocalGamePage extends Component<Record<string, never>, Record<string, never>> {
  private gameCanvas: GameCanvas | null = null;

  getInitialState(): Record<string, never> {
    return {};
  }

  render(): string {
    return `
      <div class="relative min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-12 safe-area-inset" style="background: var(--color-bg-dark);">
        <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] via-[var(--color-bg-darker)] to-[#050b1a]">
          <div class="absolute inset-0 opacity-50 cyberpunk-radial-bg"></div>
        </div>
        <div class="relative w-full max-w-5xl">
          <!-- Header -->
          <div class="text-center mb-6 sm:mb-8">
            <div class="flex justify-center gap-3 mb-4">
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
            <h1 class="text-3xl sm:text-4xl font-bold tracking-tight" style="color: var(--color-text-primary);">
              🎮 Local Match
            </h1>
            <p class="text-sm sm:text-base mt-2" style="color: var(--color-text-secondary);">
              Two players, one keyboard. First to 11 wins!
            </p>
            <p class="text-xs mt-1" style="color: rgba(255,255,255,0.4);">
              Player 1: W/S keys • Player 2: ↑/↓ arrows
            </p>
          </div>

          <!-- Game Canvas Container -->
          <div class="glass-panel p-4 sm:p-6" style="border: 2px solid var(--color-panel-border); box-shadow: var(--shadow-glass), var(--shadow-glow-primary);">
            <div id="local-game-canvas-container" class="rounded-lg overflow-hidden"></div>
          </div>
        </div>
      </div>
    `;
  }

  onMount(): void {
    const container = this.element?.querySelector('#local-game-canvas-container') as HTMLElement;

    if (container) {
      // Mount game canvas in local mode (no gameId = local play)
      // GameCanvas handles its own score display, so no callback needed
      this.gameCanvas = new GameCanvas({});
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
}
