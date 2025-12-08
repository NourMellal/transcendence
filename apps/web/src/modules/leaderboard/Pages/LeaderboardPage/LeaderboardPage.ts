import Component from '@/core/Component';
import { navigate } from '@/routes';
import { userService } from '@/services/api/UserService';
import type { DashboardLeaderboardEntry } from '@/models';

type State = {
  entries: DashboardLeaderboardEntry[];
  isLoading: boolean;
  error?: string;
  lastUpdated?: string;
};

export default class LeaderboardPage extends Component<Record<string, never>, State> {
  private refreshInterval?: number;

  constructor(props: Record<string, never> = {}) {
    super(props);
  }

  getInitialState(): State {
    return {
      entries: [],
      isLoading: true,
      error: undefined,
      lastUpdated: undefined,
    };
  }

  onMount(): void {
    void this.loadLeaderboard();
    this.refreshInterval = window.setInterval(() => {
      void this.loadLeaderboard(true);
    }, 30_000);
  }

  onUnmount(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }

  private async loadLeaderboard(silent = false): Promise<void> {
    if (!silent) {
      this.setState({ isLoading: true, error: undefined });
    }

    try {
      const entries = await userService.getLeaderboard(20);
      this.setState({
        entries,
        isLoading: false,
        error: undefined,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load leaderboard.';
      this.setState({
        error: message,
        isLoading: false,
      });
    }
  }

  private formatWinRate(winRate?: number): string {
    if (typeof winRate !== 'number') return '0%';
    const value = winRate <= 1 ? winRate * 100 : winRate;
    return `${Math.round(value)}%`;
  }

  private renderTable(): string {
    const { entries, isLoading, error } = this.state;

    if (isLoading) {
      return `<div class="glass-panel p-6 text-white/60">Loading leaderboard...</div>`;
    }

    if (error) {
      return `
        <div class="glass-panel p-6 space-y-3">
          <p class="text-white/70">${error}</p>
          <button
            data-action="retry"
            class="btn-touch px-4 py-2 rounded-xl touch-feedback"
            style="background: rgba(255,255,255,0.08); color: white;"
          >
            Retry
          </button>
        </div>
      `;
    }

    if (!entries.length) {
      return `<div class="glass-panel p-6 text-white/60">No leaderboard data yet.</div>`;
    }

    return `
      <div class="glass-panel overflow-hidden">
        <table class="w-full text-left">
          <thead>
            <tr class="text-xs uppercase tracking-wide text-white/60">
              <th class="px-4 py-3">Rank</th>
              <th class="px-4 py-3">Player</th>
              <th class="px-4 py-3">Win Rate</th>
            </tr>
          </thead>
          <tbody>
            ${entries
              .map(
                (entry, index) => `
                  <tr class="${index % 2 === 0 ? 'bg-white/5' : ''}">
                    <td class="px-4 py-3 font-semibold">${entry.rank}</td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-lg">
                          ${entry.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p class="font-semibold">${entry.username}</p>
                          <p class="text-xs text-white/50">${entry.userId}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 font-semibold">${this.formatWinRate(entry.winRate)}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  render(): string {
    return `
      <div class="relative min-h-screen" style="background: var(--color-bg-dark);">
        <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] via-[var(--color-bg-darker)] to-[#090922]">
          <div class="absolute inset-0 opacity-50 cyberpunk-radial-bg"></div>
        </div>
        <div class="relative max-w-5xl mx-auto px-4 lg:px-0 py-10 space-y-6">
          <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p class="text-sm text-white/60">Community</p>
              <h1 class="text-3xl font-semibold">Global Leaderboard</h1>
              <p class="text-sm text-white/50 mt-2">
                Track the top players across Transcendence. Updated every 30 seconds.
              </p>
            </div>
            <div class="flex gap-3">
              <button
                data-action="go-dashboard"
                class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
                style="background: rgba(255,255,255,0.08); color: white;"
              >
                ← Dashboard
              </button>
              <button
                data-action="refresh"
                class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
                style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white;"
              >
                Refresh
              </button>
            </div>
          </header>
          ${this.state.lastUpdated ? `
            <p class="text-xs text-white/50">
              Last updated: ${new Date(this.state.lastUpdated).toLocaleTimeString()}
            </p>
          ` : ''}
          ${this.renderTable()}
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

    bind('[data-action="refresh"]', () => void this.loadLeaderboard());
    bind('[data-action="retry"]', () => void this.loadLeaderboard());
    bind('[data-action="go-dashboard"]', () => navigate('/dashboard'));
  }
}
