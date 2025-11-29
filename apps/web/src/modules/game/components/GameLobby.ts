import Component from '@/core/Component';
import { appState } from '@/state';
import type { GameStateOutput, PlayerInfo } from '../types/game.types';
import { gameService } from '../services/GameService';
import { gameSocket } from '../utils/gameSocket';

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
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
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
      connectionStatus: 'disconnected',
    };
  }

  async onMount(): Promise<void> {
    try {
      // Get current user ID from auth state
      const auth = appState.auth.get();
      this.state.currentUserId = auth?.userId || localStorage.getItem('userId') || null;

      if (!this.state.currentUserId) {
        throw new Error('Authentication required to join game lobby');
      }

      // Fetch initial lobby state via GameService
      console.log('[GameLobby] Fetching game via GameService...');
      const game = await gameService.getGame(this.props.gameId);
      
      this.state.game = game;
      this.state.isLoading = false;

      // Update global app state
      appState.game.set({
        current: game,
        isLoading: false,
        error: null,
      });

      // Connect WebSocket for real-time updates
      console.log('[GameLobby] Connecting WebSocket for real-time updates...');
      this.setupWebSocket();

      this.update({});

      // Subscribe to global game state updates for real-time sync
      this.unsubscribeGame = appState.game.subscribe((gameState) => {
        if (!gameState.current || gameState.current.id !== this.props.gameId) return;

        this.state.game = gameState.current;

        // Auto-navigate when game starts
        if (gameState.current.status === 'IN_PROGRESS') {
          console.log('[GameLobby] Game started! Navigating to play screen...');
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
    const { game, isReady, isLoading, error, timeRemaining, currentUserId, connectionStatus } = this.state;

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

    // Connection status indicator
    const connectionIndicator = this.renderConnectionStatus(connectionStatus);

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
            ${connectionIndicator}
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

  private renderConnectionStatus(status: GameLobbyState['connectionStatus']): string {
    const statusConfig = {
      connected: { icon: '🟢', text: 'Connected', color: 'var(--color-success)' },
      connecting: { icon: '🟡', text: 'Connecting...', color: 'var(--color-warning)' },
      reconnecting: { icon: '🟠', text: 'Reconnecting...', color: 'var(--color-warning)' },
      failed: { icon: '🔴', text: 'Connection Failed', color: 'var(--color-error)' },
      disconnected: { icon: '⚪', text: 'Disconnected', color: 'var(--color-text-secondary)' },
    };

    const config = statusConfig[status];

    return `
      <div class="mt-2 flex items-center justify-center gap-2 text-xs" style="color: ${config.color};">
        <span>${config.icon}</span>
        <span>${config.text}</span>
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
      console.log('[GameLobby] Marking player as ready...');
      const updatedGame = await gameService.setReady(this.props.gameId);
      
      this.state.isReady = true;
      this.state.game = updatedGame;
      
      // Update global state
      appState.game.set({
        current: updatedGame,
        isLoading: false,
        error: null,
      });
      
      this.update({});
      console.log('[GameLobby] ✅ Player marked as ready');
    } catch (error) {
      console.error('[GameLobby] ❌ Failed to mark ready:', error);
      this.state.error = error instanceof Error ? error.message : 'Failed to mark as ready';
      this.update({});
    }
  }

  private async handleLeave(): Promise<void> {
    try {
      console.log('[GameLobby] Leaving game...');
      await gameService.leaveGame(this.props.gameId);
      console.log('[GameLobby] ✅ Successfully left game');
      this.navigateTo('/dashboard');
    } catch (error) {
      console.error('[GameLobby] ❌ Failed to leave game:', error);
      // Still navigate away even if leave fails
      this.navigateTo('/dashboard');
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

  private setupWebSocket(): void {
    console.log('[GameLobby] Setting up WebSocket connection...');

    // Track connection status changes
    gameSocket.onConnectionStatusChange((status) => {
      console.log('[GameLobby] Connection status:', status);
      this.state.connectionStatus = status;
      this.update({});
    });

    // Subscribe to player joined event
    gameSocket.on('game:player_joined', (data) => {
      console.log('[GameLobby] Player joined:', data);
      if (this.state.game && data.gameId === this.state.game.id) {
        // Refresh game state to get updated player list
        gameService.getGame(data.gameId).then((game) => {
          this.state.game = game;
          this.update({});
        }).catch((error) => {
          console.error('[GameLobby] Failed to refresh game after player joined:', error);
        });
      }
    });

    // Subscribe to player ready event
    gameSocket.on('game:player_ready', (data) => {
      console.log('[GameLobby] Player ready:', data);
      if (this.state.game && data.gameId === this.state.game.id) {
        // Update the specific player's ready status
        const player = this.state.game.players.find((p) => p.id === data.playerId);
        if (player) {
          player.ready = true;
          this.update({});
        }
      }
    });

    // Subscribe to game started event
    gameSocket.on('game:started', (data) => {
      console.log('[GameLobby] Game started:', data);
      if (this.state.game && data.gameId === this.state.game.id) {
        this.state.game.status = 'IN_PROGRESS';
        this.update({});
        // Auto-navigate to game canvas
        setTimeout(() => {
          this.navigateTo(`/game/play/${data.gameId}`);
        }, 500);
      }
    });

    // Subscribe to player left event
    gameSocket.on('game:player_left', (data) => {
      console.log('[GameLobby] Player left:', data);
      if (this.state.game && data.gameId === this.state.game.id) {
        // Refresh game state
        gameService.getGame(data.gameId).then((game) => {
          this.state.game = game;
          this.update({});
        }).catch((error) => {
          console.error('[GameLobby] Failed to refresh game after player left:', error);
        });
      }
    });

    // Subscribe to game errors
    gameSocket.on('game:error', (data) => {
      console.error('[GameLobby] Game error:', data);
      this.state.error = data.message || 'An error occurred in the game';
      this.update({});
    });

    // Connect to the game room
    gameSocket.connect(this.props.gameId);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private navigateTo(path: string): void {
    window.location.href = path;
  }

  onUnmount(): void {
    this.unsubscribeGame?.();

    if (this.timeoutInterval) {
      clearInterval(this.timeoutInterval);
    }

    // Disconnect WebSocket
    console.log('[GameLobby] Disconnecting WebSocket...');
    gameSocket.disconnect();
  }
}
