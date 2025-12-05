import Component from '@/core/Component';
import type { GameStateOutput } from '../types/game.types';
import { gameService } from '../services/GameService';
import { navigate } from '@/routes';

interface BrowseGamesState {
  games: GameStateOutput[];
  filter: 'ALL' | 'CLASSIC' | 'TOURNAMENT';
  isLoading: boolean;
  error: string | null;
}

/**
 * BrowseGamesPage - Discover and join available games
 * 
 * Shows list of public games waiting for players
 * Allows filtering by game mode
 * Provides quick join functionality
 */
export class BrowseGamesPage extends Component<{}, BrowseGamesState> {
  private refreshInterval?: number;

  getInitialState(): BrowseGamesState {
    return {
      games: [],
      filter: 'ALL',
      isLoading: true,
      error: null,
    };
  }

  async onMount(): Promise<void> {
    await this.loadGames();
    
    // Refresh every 5 seconds
    this.refreshInterval = window.setInterval(() => {
      void this.loadGames();
    }, 5000);
  }

  private async loadGames(): Promise<void> {
    try {
      // For now, fetch all games and filter client-side
      // TODO: Add backend endpoint GET /games/available with filters
      const allGames = await gameService.listGames();
      
      // Filter for waiting games only
      const waiting = allGames.filter(g => 
        g.status === 'WAITING' && 
        (!g.config?.isPrivate) &&
        (g.players?.length ?? 0) < 2
      );

      this.state.games = waiting;
      this.state.isLoading = false;
      this.state.error = null;
      this.update({});
    } catch (error) {
      console.error('[BrowseGames] Failed to load games:', error);
      this.state.error = 'Failed to load available games';
      this.state.isLoading = false;
      this.update({});
    }
  }

  render(): string {
    const { games, filter, isLoading, error } = this.state;

    const filteredGames = filter === 'ALL' 
      ? games 
      : games.filter(g => g.mode === filter);

    if (isLoading) {
      return this.renderLoading();
    }

    return `
      <div class="min-h-screen p-4 sm:p-8" style="background: var(--color-bg-dark);">
        <!-- Header -->
        <div class="max-w-6xl mx-auto mb-8">
          <div class="flex items-center justify-between mb-4">
            <h1 class="text-3xl sm:text-4xl font-bold" style="color: var(--color-text-primary);">
              🎮 Available Games
            </h1>
            <button 
              data-action="back"
              class="px-4 py-2 rounded-lg transition-all"
              style="background: rgba(47, 54, 61, 0.8); color: var(--color-text-primary);"
            >
              ← Back
            </button>
          </div>

          <!-- Filters -->
          <div class="flex gap-3 mb-6">
            <button 
              data-action="filter" 
              data-filter="ALL"
              class="px-4 py-2 rounded-lg font-semibold transition-all"
              style="background: ${filter === 'ALL' ? 'var(--color-brand-primary)' : 'rgba(47, 54, 61, 0.5)'}; color: white;"
            >
              All (${games.length})
            </button>
            <button 
              data-action="filter" 
              data-filter="CLASSIC"
              class="px-4 py-2 rounded-lg font-semibold transition-all"
              style="background: ${filter === 'CLASSIC' ? 'var(--color-brand-primary)' : 'rgba(47, 54, 61, 0.5)'}; color: white;"
            >
              ⚡ Classic (${games.filter(g => g.mode === 'CLASSIC').length})
            </button>
            <button 
              data-action="filter" 
              data-filter="TOURNAMENT"
              class="px-4 py-2 rounded-lg font-semibold transition-all"
              style="background: ${filter === 'TOURNAMENT' ? 'var(--color-brand-secondary)' : 'rgba(47, 54, 61, 0.5)'}; color: white;"
            >
              🏆 Tournament (${games.filter(g => g.mode === 'TOURNAMENT').length})
            </button>
          </div>

          ${error ? `
            <div class="p-4 rounded-lg mb-6" style="background: rgba(255, 7, 58, 0.1); border: 1px solid var(--color-error);">
              <span style="color: var(--color-error);">${error}</span>
            </div>
          ` : ''}
        </div>

        <!-- Games List -->
        <div class="max-w-6xl mx-auto">
          ${filteredGames.length === 0 ? this.renderEmptyState() : `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              ${filteredGames.map(game => this.renderGameCard(game)).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  private renderGameCard(game: GameStateOutput): string {
    const owner = game.players?.[0];
    const config = game.config;
    
    return `
      <div class="p-6 rounded-xl transition-all duration-300 hover:scale-105"
           style="background: var(--color-panel-bg); border: 1px solid var(--color-panel-border); cursor: pointer;"
           data-action="join"
           data-game-id="${game.id}">
        
        <!-- Game Mode Badge -->
        <div class="flex items-center justify-between mb-4">
          <span class="px-3 py-1 rounded-full text-xs font-semibold"
                style="background: ${game.mode === 'TOURNAMENT' ? 'var(--color-brand-secondary)' : 'var(--color-brand-primary)'}; color: white;">
            ${game.mode === 'TOURNAMENT' ? '🏆 Tournament' : '⚡ Classic'}
          </span>
          <span class="text-xs" style="color: var(--color-text-secondary);">
            1/2 Players
          </span>
        </div>

        <!-- Owner Info -->
        <div class="flex items-center gap-3 mb-4 pb-4" style="border-bottom: 1px solid var(--color-panel-border);">
          <img 
            src="${owner?.avatar || '/assets/images/ape.png'}"
            alt="${owner?.username || 'Player'}"
            class="w-10 h-10 rounded-full"
            style="border: 2px solid var(--color-primary);"
          />
          <div>
            <div class="font-medium" style="color: var(--color-text-primary);">
              ${owner?.username || 'Anonymous'}
            </div>
            <div class="text-xs" style="color: var(--color-text-secondary);">
              Host
            </div>
          </div>
        </div>

        <!-- Settings -->
        <div class="space-y-2 mb-4 text-sm">
          <div class="flex justify-between">
            <span style="color: var(--color-text-secondary);">Score Limit:</span>
            <span style="color: var(--color-text-primary);">${config?.scoreLimit ?? '—'}</span>
          </div>
          <div class="flex justify-between">
            <span style="color: var(--color-text-secondary);">Ball Speed:</span>
            <span style="color: var(--color-text-primary);">${config?.ballSpeed ?? '—'}</span>
          </div>
          <div class="flex justify-between">
            <span style="color: var(--color-text-secondary);">Paddle Speed:</span>
            <span style="color: var(--color-text-primary);">${config?.paddleSpeed ?? '—'}</span>
          </div>
        </div>

        <!-- Join Button -->
        <button 
          class="w-full py-3 rounded-lg font-semibold transition-all"
          style="background: var(--color-success); color: white;"
        >
          🚀 Join Game
        </button>
      </div>
    `;
  }

  private renderEmptyState(): string {
    return `
      <div class="text-center py-16">
        <div class="text-6xl mb-4">🎮</div>
        <h3 class="text-xl font-semibold mb-2" style="color: var(--color-text-primary);">
          No Games Available
        </h3>
        <p class="mb-6" style="color: var(--color-text-secondary);">
          Be the first to create a game!
        </p>
        <button 
          data-action="create"
          class="px-6 py-3 rounded-lg font-semibold transition-all"
          style="background: var(--color-primary); color: white;"
        >
          ➕ Create Game
        </button>
      </div>
    `;
  }

  private renderLoading(): string {
    return `
      <div class="min-h-screen flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style="border-color: var(--color-primary);"></div>
          <div style="color: var(--color-text-secondary);">Loading games...</div>
        </div>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    this.element?.addEventListener('click', async (e: Event) => {
      const target = e.target as HTMLElement;
      const actionEl = target.closest('[data-action]') as HTMLElement | null;
      
      if (!actionEl) return;

      const action = actionEl.dataset.action;

      switch (action) {
        case 'filter':
          const filter = actionEl.dataset.filter as BrowseGamesState['filter'];
          if (filter) {
            this.setState({ filter });
          }
          break;

        case 'join':
          const gameId = actionEl.dataset.gameId;
          if (gameId) {
            navigate(`/game/lobby/${gameId}`);
          }
          break;

        case 'create':
          navigate('/game/create');
          break;

        case 'back':
          navigate('/');
          break;
      }
    });
  }

  onUnmount(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }
}
