import Component from '@/core/Component';
import { appState } from '@/state';
import type { GameStateOutput, PlayerInfo } from '../types/game.types';

interface GameLobbyProps {
  gameId: string;
}

interface GameLobbyState {
  game: GameStateOutput | null;
  currentUserId: string | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  timeRemaining: number; // seconds until timeout
}

/**
 * GameLobby Component
 * 
 * Displays the pre-game lobby where players wait for an opponent,
 * see game settings, and prepare to start a match.
 * 
 * Features:
 * - Real-time opponent status tracking
 * - Ready/Leave actions
 * - Glass morphism design with cyberpunk theme
 * - Mobile-responsive layout
 * - 2-minute timeout for opponent wait
 */
export class GameLobby extends Component<GameLobbyProps, GameLobbyState> {
  private unsubscribeGame?: () => void;
  private timeoutInterval?: number;

  constructor(props: GameLobbyProps) {
    super(props);
  }

  getInitialState(): GameLobbyState {
    return {
      game: null,
      currentUserId: null,
      isReady: false,
      isLoading: true,
      error: null,
      timeRemaining: 120, // 2 minutes
    };
  }

  async onMount(): Promise<void> {
    try {
      // Get current user ID from localStorage or auth context
      this.state.currentUserId = localStorage.getItem('userId') || null;

      // Fetch initial lobby state
      const game = await this.fetchGame(this.props.gameId);
      this.state.game = game;
      this.state.isLoading = false;
      
      // Update global app state
      appState.game.set({
        current: game,
        isLoading: false,
        error: null,
      });
      
      this.update({});

      // Subscribe to global game state updates for real-time sync
      this.unsubscribeGame = appState.game.subscribe((gameState) => {
        if (!gameState.current || gameState.current.id !== this.props.gameId) return;

        this.state.game = gameState.current;

        // Auto-navigate when game starts
        if (gameState.current.status === 'IN_PROGRESS') {
          this.navigateTo(`/game/play/${gameState.current.id}`);
        }

        this.update({});
      });

      // Start timeout countdown
      this.startTimeout();

    } catch (error) {
      console.error('[GameLobby] Failed to mount:', error);
      this.state.error = 'Failed to load lobby';
      this.state.isLoading = false;
      
      appState.game.set({
        current: null,
        isLoading: false,
        error: 'Failed to load lobby',
      });
      
      this.update({});
    }
  }

  render(): string {
    const { game, isReady, isLoading, error, timeRemaining, currentUserId } = this.state;

    if (isLoading) {
      return this.renderLoading();
    }

    if (error || !game) {
      return this.renderError(error || 'Lobby not found');
    }

    if (!currentUserId) {
      return this.renderError('You must be logged in to join a game lobby.');
    }

    const currentPlayer = game.players.find((p) => p.id === currentUserId);
    const opponent = game.players.find((p) => p.id !== currentUserId);
    const hasOpponent = opponent !== undefined;

    return `
      <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--color-brand-dark);">
        <div class="w-full max-w-2xl">
          <!-- Header -->
          <div class="text-center mb-8">
            <h1 class="text-3xl sm:text-4xl font-bold mb-2" style="color: var(--color-text-primary);">
              Game Lobby
            </h1>
            <p class="text-sm" style="color: var(--color-text-secondary);">
              ${hasOpponent ? '🎮 Opponent found! Get ready.' : `⏳ Waiting for opponent... ${this.formatTime(timeRemaining)}`}
            </p>
          </div>

          <!-- Players Grid -->
          <div class="p-6 sm:p-8 mb-6 rounded-xl" style="background: var(--color-panel-bg); border: 1px solid var(--color-panel-border); backdrop-filter: var(--backdrop-blur);">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Current Player -->
              ${currentPlayer ? this.renderPlayerCard(currentPlayer, 'You', isReady) : ''}

              <!-- Opponent Slot -->
              ${hasOpponent 
                ? this.renderPlayerCard(opponent, 'Opponent', opponent?.ready === true)
                : this.renderEmptySlot()
              }
            </div>
          </div>

          <!-- Game Settings -->
          <div class="p-6 mb-6 rounded-xl" style="background: var(--color-panel-bg); border: 1px solid var(--color-panel-border); backdrop-filter: var(--backdrop-blur);">
            <h3 class="text-lg font-semibold mb-4" style="color: var(--color-text-primary);">⚙️ Game Settings</h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span style="color: var(--color-text-secondary);">Score Limit:</span>
                <span class="ml-2 font-medium" style="color: var(--color-text-primary);">11</span>
              </div>
              <div>
                <span style="color: var(--color-text-secondary);">Ball Speed:</span>
                <span class="ml-2 font-medium" style="color: var(--color-text-primary);">Normal</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row gap-4">
            <button
              data-action="ready"
              class="flex-1 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-300"
              style="
                background: ${isReady ? 'var(--color-success)' : 'var(--color-primary)'};
                color: white;
                opacity: ${!hasOpponent || isReady ? '0.5' : '1'};
                cursor: ${!hasOpponent || isReady ? 'not-allowed' : 'pointer'};
                transform: ${!hasOpponent || isReady ? 'scale(1)' : 'scale(1)'};
                box-shadow: 0 0 20px rgba(0, 217, 255, 0.5);
              "
              ${!hasOpponent || isReady ? 'disabled' : ''}
            >
              ${isReady ? '✓ Ready' : '🎮 Ready Up'}
            </button>

            <button
              data-action="leave"
              class="px-6 py-3 sm:py-4 rounded-xl font-semibold transition-all duration-300"
              style="background: var(--color-secondary); color: white; box-shadow: 0 0 20px rgba(255, 0, 110, 0.5);"
            >
              ❌ Leave Lobby
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderPlayerCard(player: PlayerInfo, label: string, ready: boolean): string {
    return `
      <div class="p-4 rounded-lg transition-all duration-300" style="background: var(--color-input-bg); border: 1px solid var(--color-panel-border);">
        <div class="flex items-center gap-3">
          <img 
            src="${player.avatar || '/default-avatar.png'}" 
            alt="${player.username}"
            class="w-12 h-12 rounded-full"
            style="border: 2px solid var(--color-primary);"
          >
          <div class="flex-1">
            <div class="font-medium" style="color: var(--color-text-primary);">
              ${player.username}
            </div>
            <div class="text-xs" style="color: var(--color-text-secondary);">
              ${label}
            </div>
          </div>
          ${ready ? `
            <div class="px-3 py-1 rounded-full text-xs font-semibold" style="background: var(--color-success); color: white;">
              ✓ Ready
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  private renderEmptySlot(): string {
    return `
      <div class="p-4 rounded-lg flex items-center justify-center" style="background: var(--color-input-bg); border: 1px dashed var(--color-panel-border);">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style="border-color: var(--color-primary);"></div>
          <div class="text-sm" style="color: var(--color-text-secondary);">
            Waiting for opponent...
          </div>
        </div>
      </div>
    `;
  }

  private renderLoading(): string {
    return `
      <div class="min-h-screen flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style="border-color: var(--color-primary);"></div>
          <div style="color: var(--color-text-secondary);">Loading lobby...</div>
        </div>
      </div>
    `;
  }

  private renderError(message: string): string {
    return `
      <div class="min-h-screen flex items-center justify-center p-4">
        <div class="p-8 max-w-md text-center rounded-xl" style="background: var(--color-panel-bg); border: 1px solid var(--color-panel-border);">
          <div class="text-4xl mb-4">❌</div>
          <h2 class="text-xl font-semibold mb-2" style="color: var(--color-error);">
            ${message}
          </h2>
          <button
            data-action="back"
            class="mt-4 px-6 py-2 rounded-lg font-semibold transition-all duration-300"
            style="background: var(--color-primary); color: white;"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    if (!this.element) return;

    const readyBtn = this.element.querySelector('[data-action="ready"]') as HTMLButtonElement;
    const leaveBtn = this.element.querySelector('[data-action="leave"]') as HTMLButtonElement;
    const backBtn = this.element.querySelector('[data-action="back"]') as HTMLButtonElement;

    readyBtn?.addEventListener('click', () => this.handleReady());
    leaveBtn?.addEventListener('click', () => this.handleLeave());
    backBtn?.addEventListener('click', () => this.navigateTo('/dashboard'));
  }

  private async handleReady(): Promise<void> {
    try {
      // TODO: Implement ready endpoint when backend is ready
      // For now, just update local state
      this.state.isReady = true;
      this.update({});
    } catch (error) {
      console.error('[GameLobby] Failed to mark ready:', error);
    }
  }

  private async handleLeave(): Promise<void> {
    try {
      await this.leaveGame(this.props.gameId);
      this.navigateTo('/dashboard');
    } catch (error) {
      console.error('[GameLobby] Failed to leave game:', error);
    }
  }

  private startTimeout(): void {
    this.timeoutInterval = window.setInterval(() => {
      this.state.timeRemaining--;

      if (this.state.timeRemaining <= 0) {
        this.handleTimeout();
      } else {
        this.update({});
      }
    }, 1000);
  }

  private handleTimeout(): void {
    if (this.timeoutInterval) {
      clearInterval(this.timeoutInterval);
    }
    this.state.error = '⏱️ Lobby timeout - no opponent found';
    this.update({});
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private async fetchGame(gameId: string): Promise<GameStateOutput> {
    try {
      const response = await fetch(`http://localhost:3000/api/games/${gameId}`);
      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      console.warn('[GameLobby] API call failed, using mock data for development');
    }

    // Fallback mock data for development/testing
    const now = new Date();
    return {
      id: gameId,
      players: [
        {
          id: localStorage.getItem('userId') || 'user-1',
          username: localStorage.getItem('username') || 'You',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=you',
          ready: false,
        },
        {
          id: 'opponent-1',
          username: 'Opponent',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=opponent',
          ready: false,
        },
      ],
      status: 'WAITING' as const,
      score: {
        player1: 0,
        player2: 0,
      },
      createdAt: now,
      finishedAt: undefined,
    };
  }

  private async leaveGame(gameId: string): Promise<void> {
    const userId = localStorage.getItem('userId');
    if (!userId) throw new Error('User ID not found');

    const response = await fetch(`http://localhost:3000/api/games/${gameId}/leave`, {
      method: 'POST',
      headers: {
        'x-user-id': userId,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to leave game: ${response.statusText}`);
    }
  }

  private navigateTo(path: string): void {
    window.location.href = path;
  }

  onUnmount(): void {
    this.unsubscribeGame?.();

    if (this.timeoutInterval) {
      clearInterval(this.timeoutInterval);
    }
  }
}
