import Component from '../../../core/Component';
import { navigate } from '../../../routes';
import { GameCanvas } from '../components/GameCanvas';
import { appState } from '../../../state';

/**
 * LocalGamePage - Full local two-player game mode.
 * Includes the actual game canvas for playable local matches.
 */
type LocalGameState = {
  guestAlias: string | null;
};

export default class LocalGamePage extends Component<Record<string, never>, LocalGameState> {
  private gameCanvas: GameCanvas | null = null;
  private guestUnsubscribe: (() => void) | null = null;

  getInitialState(): LocalGameState {
    return {
      guestAlias: appState.guest.get().alias,
    };
  }

  render(): string {
    const aliasLabel = this.state.guestAlias
      ? `Playing as <span class="font-semibold">${this.state.guestAlias}</span>`
      : 'Set an alias from the home screen for a personalized scoreboard.';

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
            <h1 class="text-3xl sm:text-4xl font-bold tracking-tight flex items-center justify-center gap-3" style="color: var(--color-text-primary);">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M9 21a1 1 0 0 0 1-1v-1a2 2 0 0 1 4 0v.78A1.223 1.223 0 0 0 15.228 21 7.7 7.7 0 0 0 23 13.73 7.5 7.5 0 0 0 15.5 6H13V4a1 1 0 0 0-2 0v2H8.772A7.7 7.7 0 0 0 1 13.27a7.447 7.447 0 0 0 2.114 5.453A7.81 7.81 0 0 0 9 21zM8.772 8H15.5a5.5 5.5 0 0 1 5.5 5.67 5.643 5.643 0 0 1-5 5.279 4 4 0 0 0-8 .029 5.5 5.5 0 0 1-5-5.648A5.684 5.684 0 0 1 8.772 8zM5 12.5a1 1 0 0 1 1-1h1v-1a1 1 0 0 1 2 0v1h1a1 1 0 0 1 0 2H9v1a1 1 0 0 1-2 0v-1H6a1 1 0 0 1-1-1zM17 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm-2 3a1 1 0 1 1 1 1 1 1 0 0 1-1-1z"/></svg>
              Local Match
            </h1>
            <p class="text-sm sm:text-base mt-2" style="color: var(--color-text-secondary);">
              Two players, one keyboard. First to 11 wins!
            </p>
            <p class="text-xs mt-1" style="color: rgba(255,255,255,0.6);">
              ${aliasLabel}
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
      const leftLabel = this.state.guestAlias ?? 'Player 1';
      this.gameCanvas = new GameCanvas({
        playerLabels: {
          left: leftLabel,
          right: 'Player 2',
        },
      });
      this.gameCanvas.mount(container);
    }

    this.guestUnsubscribe = appState.guest.subscribe(() => {
      const guest = appState.guest.get();
      this.setState({ guestAlias: guest.alias });
      if (this.gameCanvas) {
        this.gameCanvas.setPlayerLabels({ left: guest.alias ?? 'Player 1' });
      }
    });
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
    if (this.guestUnsubscribe) {
      this.guestUnsubscribe();
      this.guestUnsubscribe = null;
    }
  }
}
