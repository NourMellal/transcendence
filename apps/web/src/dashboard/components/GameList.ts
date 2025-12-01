import { Component } from '../../components/base/Component';
import { gameService } from '../../services/api/GameService';
import { navigate } from '../../routes';
import { GameCreateModal } from './GameCreateModal';
import type { Game } from '../../models';

/**
 * GameList Component
 * Displays all available games in a responsive grid with auto-refresh
 */
export class GameList extends Component {
  private games: Game[] = [];
  private isLoading = true;
  private error: string | null = null;
  private refreshInterval: number | null = null;
  private isRefreshing = false;

  constructor() {
    super('div', 'game-list w-full');
  }

  protected render(): void {
    this.element.innerHTML = this.renderContent();
    this.attachEventListeners();
  }

  private renderContent(): string {
    return `
      <div class="game-list-container space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 class="text-2xl sm:text-3xl font-bold" style="color: var(--color-text);">
              🎮 Live Games
            </h2>
            <p class="text-sm mt-1" style="color: var(--color-text-secondary);">
              Join an open game or create your own
            </p>
          </div>
          <button 
            data-action="create-game" 
            class="btn-primary btn-touch px-6 py-3 rounded-xl font-medium whitespace-nowrap"
            style="background: var(--color-brand-secondary); color: var(--color-text-primary);"
          >
            ➕ Create Game
          </button>
        </div>

        <!-- Error State -->
        ${this.error ? `
          <div class="error-banner p-4 rounded-lg" style="background: rgba(255, 7, 58, 0.1); border: 1px solid rgba(255, 7, 58, 0.2); color: var(--color-error);">
            <div class="flex items-start gap-3">
              <span class="text-lg">⚠️</span>
              <div>
                <p class="font-medium">Failed to Load Games</p>
                <p class="text-sm mt-1">${this.error}</p>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Loading State (initial) -->
        ${this.isLoading && this.games.length === 0 ? `
          <div class="flex flex-col items-center justify-center py-12">
            <div class="animate-spin h-10 w-10 border-4 border-transparent rounded-full mb-4" style="border-right-color: var(--color-brand-secondary);"></div>
            <p style="color: var(--color-text-secondary);">Loading available games...</p>
          </div>
        ` : ''}

        <!-- Games Grid -->
        ${this.games.length > 0 ? `
          <div class="games-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${this.games.map(game => this.renderGameCard(game)).join('')}
          </div>
          ${this.isRefreshing ? `
            <div class="refresh-indicator text-xs text-center" style="color: var(--color-text-muted);">
              <span class="inline-flex items-center gap-1">
                <div class="animate-spin h-3 w-3 border-b-2" style="border-color: var(--color-brand-secondary);"></div>
                Refreshing...
              </span>
            </div>
          ` : ''}
        ` : ''}

        <!-- Empty State -->
        ${!this.isLoading && this.games.length === 0 && !this.error ? `
          <div class="glass-panel p-12 text-center rounded-2xl" style="border: 1px solid var(--color-panel-border);">
            <div class="text-5xl mb-4">🎮</div>
            <h3 class="text-xl font-semibold mb-2" style="color: var(--color-text);">
              No Games Available
            </h3>
            <p class="mb-6" style="color: var(--color-text-secondary);">
              Be the first to create a game and start playing!
            </p>
            <button 
              data-action="create-game" 
              class="btn-primary btn-touch px-6 py-3 rounded-xl font-medium"
              style="background: var(--color-brand-secondary); color: var(--color-text-primary);"
            >
              ➕ Create New Game
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderGameCard(game: Game): string {
    const playerCount = game.players.length;
    const maxPlayers = 2;
    const isFull = playerCount >= maxPlayers;
    const creatorUsername = game.players[0]?.username || 'Unknown';
    const creatorAvatar = game.players[0]?.avatar || '/default-avatar.png';

    return `
      <div class="game-card glass-panel p-4 rounded-2xl transition-all hover:scale-[1.02] cursor-pointer" style="border: 1px solid var(--color-panel-border); ${isFull ? 'opacity-60;' : ''}">
        <!-- Creator Info -->
        <div class="flex items-center gap-3 mb-4 pb-4" style="border-bottom: 1px solid var(--color-panel-border);">
          <img 
            src="${creatorAvatar}" 
            alt="${creatorUsername}"
            class="w-10 h-10 rounded-full object-cover"
            onerror="this.src='/default-avatar.png'"
          />
          <div>
            <p class="text-sm font-medium" style="color: var(--color-text);">${creatorUsername}</p>
            <p class="text-xs" style="color: var(--color-text-muted);">Game Creator</p>
          </div>
        </div>

        <!-- Game Info -->
        <div class="space-y-3 mb-4">
          <div class="flex justify-between items-center">
            <span class="text-sm" style="color: var(--color-text-secondary);">Players</span>
            <span class="text-sm font-semibold" style="color: var(--color-brand-secondary);">
              ${playerCount}/${maxPlayers}
              ${isFull ? ' (Full)' : ''}
            </span>
          </div>
          
          <div class="flex justify-between items-center">
            <span class="text-sm" style="color: var(--color-text-secondary);">Score Limit</span>
            <span class="text-sm font-semibold" style="color: var(--color-text);">${game.settings.maxScore} points</span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-sm" style="color: var(--color-text-secondary);">Ball Speed</span>
            <span class="text-sm font-semibold capitalize" style="color: var(--color-text);">
              ${this.getBallSpeedLabel(game.settings.ballSpeed)}
            </span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-sm" style="color: var(--color-text-secondary);">Created</span>
            <span class="text-sm font-semibold" style="color: var(--color-text);">${this.formatTime(game.createdAt)}</span>
          </div>
        </div>

        <!-- Join Button -->
        <button 
          data-action="join-game" 
          data-game-id="${game.id}"
          class="btn-touch w-full py-3 px-4 rounded-xl font-medium transition-all ${isFull ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}"
          style="background: ${isFull ? 'var(--color-text-muted)' : 'var(--color-brand-secondary)'}; color: var(--color-text-primary);"
          ${isFull ? 'disabled' : ''}
        >
          ${isFull ? '🚫 Game Full' : '▶️ Join Game'}
        </button>
      </div>
    `;
  }

  private getBallSpeedLabel(speed: number): string {
    if (speed <= 3) return 'Slow';
    if (speed >= 7) return 'Fast';
    return 'Normal';
  }

  private formatTime(isoString: string): string {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      
      if (diffSec < 60) return 'just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      const diffDay = Math.floor(diffHour / 24);
      return `${diffDay}d ago`;
    } catch {
      return 'Recently';
    }
  }

  private attachEventListeners(): void {
    // Create game buttons
    const createButtons = this.element.querySelectorAll('[data-action="create-game"]');
    createButtons.forEach(btn => {
      this.addEventListener(btn as HTMLElement, 'click', () => this.handleCreateGame());
    });

    // Join game buttons
    const joinButtons = this.element.querySelectorAll('[data-action="join-game"]');
    joinButtons.forEach(btn => {
      const gameId = (btn as HTMLElement).dataset.gameId;
      this.addEventListener(btn as HTMLElement, 'click', () => {
        if (gameId) this.handleJoinGame(gameId);
      });
    });
  }

  private handleCreateGame(): void {
    // Show create game modal
    const modal = new GameCreateModal();
    
    modal.onGameCreated = (gameId: string) => {
      // Navigate to lobby when game is created
      navigate(`/game/lobby/${gameId}`);
    };

    // Mount modal to body
    const modalContainer = document.createElement('div');
    document.body.appendChild(modalContainer);
    modal.mount(modalContainer);
  }

  private async handleJoinGame(gameId: string): Promise<void> {
    try {
      // Call join game API
      await gameService.joinGame({ gameId });
      // Navigate to lobby
      navigate(`/game/lobby/${gameId}`);
    } catch (error: any) {
      const errorMsg = error?.response?.message || error?.message || 'Failed to join game';
      this.showErrorBanner(errorMsg);
    }
  }

  private showErrorBanner(message: string): void {
    this.error = message;
    this.render();
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (this.error === message) {
        this.error = null;
        this.render();
      }
    }, 5000);
  }

  private async refreshGames(silent = false): Promise<void> {
    if (silent) {
      this.isRefreshing = true;
    } else {
      this.isLoading = true;
      this.error = null;
    }

    try {
      // Fetch available games with WAITING status
      const response = await gameService.getAvailableGames(1, 20);
      
      // Handle the response safely
      if (response && response.games) {
        this.games = response.games;
      } else {
        this.games = [];
      }
      
      this.error = null;
    } catch (error: any) {
      console.error('Failed to load games:', error);
      this.error = error?.message || 'Failed to load games. Retrying...';
      this.games = [];
    } finally {
      this.isLoading = false;
      this.isRefreshing = false;
      this.render();
    }
  }

  mount(parent: HTMLElement): void {
    super.mount(parent);
    
    // Initial load
    this.refreshGames();

    // Auto-refresh every 10 seconds
    this.refreshInterval = window.setInterval(() => {
      this.refreshGames(true); // Silent refresh
    }, 10000);
  }

  unmount(): void {
    // Clean up interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    super.unmount();
  }
}