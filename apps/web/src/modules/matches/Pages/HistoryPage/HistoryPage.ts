import Component from '@/core/Component';
import { navigate } from '@/routes';
import type { Match } from '@/models';
import { userService } from '@/services/api/UserService';
import { appState } from '@/state';

type State = {
  matches: Match[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error?: string;
  page: number;
  hasNext: boolean;
};

export default class MatchHistoryPage extends Component<Record<string, never>, State> {
  constructor(props: Record<string, never> = {}) {
    super(props);
  }

  getInitialState(): State {
    return {
      matches: [],
      isLoading: true,
      isLoadingMore: false,
      error: undefined,
      page: 1,
      hasNext: true,
    };
  }

  onMount(): void {
    void this.loadMatches();
  }

  private async loadMatches(loadMore = false): Promise<void> {
    if (loadMore && (!this.state.hasNext || this.state.isLoadingMore)) {
      return;
    }

    this.setState({
      error: undefined,
      ...(loadMore ? { isLoadingMore: true } : { isLoading: true }),
    });

    const nextPage = loadMore ? this.state.page + 1 : 1;

    try {
      const response = await userService.getMatchHistory(undefined, nextPage, 10);
      const matches = loadMore
        ? [...this.state.matches, ...(response.data ?? [])]
        : response.data ?? [];

      this.setState({
        matches,
        page: nextPage,
        hasNext: Boolean(response.pagination?.hasNext),
        isLoading: false,
        isLoadingMore: false,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load matches.';
      this.setState({
        error: message,
        isLoading: false,
        isLoadingMore: false,
      });
    }
  }

  private renderMatchCard(match: Match): string {
    const currentUserId = appState.auth.get().user?.id;
    let you = match.players.find((p) => p.id === currentUserId);
    if (!you) {
      you = match.players.find((p) => p.isWinner) ?? match.players[0];
    }
    const opponent = match.players.find((p) => p.id !== you?.id) ?? match.players[0];
    const opponentName = this.formatPlayerName(opponent);
    const youScore = you?.score ?? 0;
    const oppScore = opponent?.score ?? 0;
    const youWon = you ? match.winner.id === you.id : match.winner.id === match.players[0]?.id;
    const durationMinutes = match.duration ? (match.duration / 60).toFixed(1) : '—';

    return `
      <article class="glass-card p-5 rounded-2xl flex flex-col gap-3">
        <div class="flex items-center justify-between text-sm text-white/60">
          <span>${new Date(match.playedAt).toLocaleString()}</span>
          <span>${match.gameType === 'tournament' ? 'Tournament' : '1v1'}</span>
        </div>
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-wide text-white/50">Opponent</p>
            <p class="text-lg font-semibold">${opponentName}</p>
          </div>
          <div class="text-right">
            <p class="text-xs uppercase tracking-wide text-white/50">Result</p>
            <p class="text-lg font-semibold" style="color: ${
              youWon ? 'var(--color-success)' : 'var(--color-error)'
            };">
              ${youWon ? 'Won' : 'Lost'}
            </p>
          </div>
        </div>
        <div class="flex items-center justify-between text-2xl font-bold">
          <span>${youScore}</span>
          <span class="text-white/50">-</span>
          <span>${oppScore}</span>
        </div>
        <div class="text-xs text-white/50 flex items-center justify-between">
          <span>Duration: ${durationMinutes} min</span>
          ${match.tournamentId ? `<span>Tournament #${match.tournamentId}</span>` : ''}
        </div>
      </article>
    `;
  }

  private formatPlayerName(player?: Match['players'][number]): string {
    if (!player) return 'Unknown opponent';
    if (player.username && player.username !== player.id) {
      return player.username;
    }
    return `Player ${player.id.slice(0, 6)}`;
  }

  private renderContent(): string {
    const { matches, isLoading, error } = this.state;

    if (isLoading) {
      return `<div class="glass-panel p-6 text-white/60">Loading match history...</div>`;
    }

    if (error) {
      return `
        <div class="glass-panel p-6 space-y-3">
          <p class="text-white/70">${error}</p>
        </div>
      `;
    }

    if (!matches.length) {
      return `
        <div class="glass-panel p-6 text-white/60">
          No matches yet. Play a game to populate your history.
        </div>
      `;
    }

    return `
      <div class="space-y-4">
        ${matches.map((match) => this.renderMatchCard(match)).join('')}
        ${
          this.state.hasNext
            ? `
              <button
                data-action="load-more"
                class="btn-touch w-full py-3 rounded-xl touch-feedback text-sm"
                style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: white;"
              >
                ${this.state.isLoadingMore ? 'Loading...' : 'Load More'}
              </button>
            `
            : ''
        }
      </div>
    `;
  }

  render(): string {
    return `
      <div class="relative min-h-screen" style="background: var(--color-bg-dark);">
        <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] via-[var(--color-bg-darker)] to-[#0b0b1e]">
          <div class="absolute inset-0 opacity-50 cyberpunk-radial-bg"></div>
        </div>
        <div class="relative max-w-4xl mx-auto px-4 lg:px-0 py-10 space-y-6">
          <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p class="text-sm text-white/60">Matches</p>
              <h1 class="text-3xl font-semibold">History</h1>
              <p class="text-sm text-white/50 mt-2">
                Track your recent matches, results, and performance trends.
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
            </div>
          </header>
          ${this.renderContent()}
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
    bind('[data-action="load-more"]', () => void this.loadMatches(true));
  }
}
