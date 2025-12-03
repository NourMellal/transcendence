import Component from '../../../core/Component';
import { navigate } from '../../../routes';

type State = {
  leftScore: number;
  rightScore: number;
  isRunning: boolean;
};

/**
 * LocalGamePage - lightweight placeholder for local two-player mode.
 * Shows controls, mock scoreboard, and CTA to jump into real multiplayer once ready.
 */
export default class LocalGamePage extends Component<Record<string, never>, State> {
  getInitialState(): State {
    return {
      leftScore: 0,
      rightScore: 0,
      isRunning: false,
    };
  }

  render(): string {
    return `
      <div class="relative min-h-screen" style="background: var(--color-bg-dark);">
        <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] via-[var(--color-bg-darker)] to-[#050b1a]">
          <div class="absolute inset-0 opacity-50 cyberpunk-radial-bg"></div>
        </div>
        <div class="relative max-w-5xl mx-auto px-4 lg:px-0 py-10 space-y-8">
          <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p class="text-sm text-white/60">Arcade</p>
              <h1 class="text-3xl font-semibold tracking-tight">Local Match</h1>
              <p class="text-sm text-white/50 mt-2">
                Two players, one keyboard. Perfect for couch duels or quick warm-ups.
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
                data-action="start-local"
                style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white;"
              >
                ${this.state.isRunning ? 'Reset' : 'Start'}
              </button>
            </div>
          </header>

          <section class="glass-panel p-6">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p class="text-sm text-white/60 uppercase tracking-wide">Controls</p>
                <ul class="mt-3 space-y-2 text-sm text-white/80">
                  <li>Player 1 (Left paddle): <strong>W</strong> / <strong>S</strong></li>
                  <li>Player 2 (Right paddle): <strong>Arrow Up</strong> / <strong>Arrow Down</strong></li>
                  <li>Pause / Resume: <strong>Space</strong></li>
                </ul>
              </div>
              <div class="text-sm text-white/60">
                <p>Score to beat? First to 11 takes the win.</p>
                <p class="mt-1">Want the full online experience? Jump into a <button class="underline" data-action="go-create">multiplayer lobby</button>.</p>
              </div>
            </div>

            <div class="mt-6 rounded-2xl p-6" style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05);">
              <div class="flex items-center justify-between text-center">
                <div>
                  <p class="text-xs text-white/60 uppercase">Player 1</p>
                  <p class="text-4xl font-semibold">${this.state.leftScore}</p>
                </div>
                <div class="text-sm text-white/60">Friendly duel in progress</div>
                <div>
                  <p class="text-xs text-white/60 uppercase">Player 2</p>
                  <p class="text-4xl font-semibold">${this.state.rightScore}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    `;
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
    bind('[data-action="start-local"]', () => {
      this.setState({
        isRunning: !this.state.isRunning,
        leftScore: 0,
        rightScore: 0,
      });
    });
  }
}
