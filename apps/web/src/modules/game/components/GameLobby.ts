import Component from '@/core/Component';
import { appState } from '@/state';
import type { GameStateOutput, PlayerInfo } from '../types/game.types';
import { gameService } from '../services/GameService';
import { gameWS } from '@/modules/shared/services/WebSocketClient';
import { userService } from '@/services/api/UserService';
import { navigate } from '@/routes';
import { LobbyChatPanel } from './LobbyChatPanel';
import { lobbyChatService } from '../services/LobbyChatService';

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
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'error';
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
  // Inline avatar to avoid repeated 404s when backend does not provide one
  private static readonly defaultAvatar = '/assets/images/ape.png';
  private playerCache = new Map<string, PlayerInfo>();
  private unsubscribeGame?: () => void;
  private timeoutInterval?: number;
  private wsUnsubscribes: Array<() => void> = [];
  private lobbyChat?: LobbyChatPanel;
  private refreshDebounceTimer?: number;

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
      this.state.currentUserId = (auth?.user as any)?.id ?? null;

      // Fetch initial lobby state via GameService
      let game = await gameService.getGame(this.props.gameId);
      console.log('[GameLobby] Raw game data from API:', JSON.stringify(game, null, 2));
      game = await this.enrichPlayers(game);
      console.log('[GameLobby] Enriched game:', {
        id: game.id,
        status: game.status,
        playerCount: game.players?.length,
        players: game.players
      });

      // Check if game is already finished or cancelled
      if (game.status === 'FINISHED' || game.status === 'CANCELLED') {
        console.log('[GameLobby] Game is already finished or cancelled:', game.status);
        this.state.error = 'This game has ended.';
        this.state.isLoading = false;
        this.update({});
        return;
      }

      const isParticipant = !!this.state.currentUserId && game.players?.some((p) => p.id === this.state.currentUserId);
      if (!isParticipant && this.state.currentUserId) {
        try {
          game = await gameService.joinGame(this.props.gameId);
          game = await this.enrichPlayers(game);
        } catch (error) {
          const isConflict = error instanceof Error && error.message === 'GAME_JOIN_CONFLICT';
          if (!isConflict) {
            console.error('[GameLobby] Failed to auto-join game:', error);
          }
          this.state.error = isConflict
            ? 'This lobby is no longer available.'
            : 'Unable to join this lobby.';
          this.state.isLoading = false;
          this.update({});
          return;
        }
      }

      this.state.game = game;
      this.state.isLoading = false;

      // Update global app state
      appState.game.set({
        current: game,
        isLoading: false,
        error: null,
      });

      // Connect WebSocket for real-time updates
      await this.setupWebSocket();

      this.update({});

      // Subscribe to global game state updates for real-time sync
        this.unsubscribeGame = appState.game.subscribe((gameState) => {
        if (!gameState.current || gameState.current.id !== this.props.gameId) {
          return;
        }

        this.state.game = gameState.current;

        // If game was cancelled or finished, show error and stop
        if (gameState.current.status === 'CANCELLED' || gameState.current.status === 'FINISHED') {
          console.log('[GameLobby] Game ended:', gameState.current.status);
          this.stopTimeout();
          this.state.error = gameState.current.status === 'CANCELLED' 
            ? 'This game was cancelled.' 
            : 'This game has ended.';
          this.update({});
          return;
        }

        this.stopTimeoutIfOpponentJoined(gameState.current);

        // Restart timeout if opponent left
        if (!gameState.current.players || gameState.current.players.length < 2) {
          this.resetTimeout();
        }

        // Auto-navigate when game starts
        const hasTwoPlayers = Array.isArray(gameState.current.players) && gameState.current.players.length >= 2;
        if (hasTwoPlayers && (gameState.current.status === 'IN_PROGRESS' || gameState.current.status === 'PLAYING')) {
          console.log('[GameLobby] Game started with two players. Navigating to play screen...');
          this.teardownLobbyChat();
          this.navigateTo(`/game/play/${gameState.current.id}`);
        }

        this.update({});
      });

      // Start timeout countdown
      this.startTimeout();

      // If game already in progress, go to play screen
      const hasTwoPlayersInitial = Array.isArray(game.players) && game.players.length >= 2;
      if (hasTwoPlayersInitial && (game.status === 'IN_PROGRESS' || game.status === 'PLAYING')) {
        this.navigateTo(`/game/play/${game.id}`);
        return;
      }

      // Mount lobby chat overlay once lobby is ready
      this.mountLobbyChat();

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
    try {
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

      const players = game.players ?? [];
      const currentPlayer = players.find((p) => p.id === currentUserId);
      const opponent = players.find((p) => p.id !== currentUserId);
    const hasOpponent = opponent !== undefined;
    const config = game.config;
    const scoreLimit = config?.scoreLimit;
    const ballSpeed = config?.ballSpeed;
    const paddleSpeed = config?.paddleSpeed;

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
              ${hasOpponent ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><path d="M9 21a1 1 0 0 0 1-1v-1a2 2 0 0 1 4 0v.78A1.223 1.223 0 0 0 15.228 21 7.7 7.7 0 0 0 23 13.73 7.5 7.5 0 0 0 15.5 6H13V4a1 1 0 0 0-2 0v2H8.772A7.7 7.7 0 0 0 1 13.27a7.447 7.447 0 0 0 2.114 5.453A7.81 7.81 0 0 0 9 21zM8.772 8H15.5a5.5 5.5 0 0 1 5.5 5.67 5.643 5.643 0 0 1-5 5.279 4 4 0 0 0-8 .029 5.5 5.5 0 0 1-5-5.648A5.684 5.684 0 0 1 8.772 8zM5 12.5a1 1 0 0 1 1-1h1v-1a1 1 0 0 1 2 0v1h1a1 1 0 0 1 0 2H9v1a1 1 0 0 1-2 0v-1H6a1 1 0 0 1-1-1zM17 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm-2 3a1 1 0 1 1 1 1 1 1 0 0 1-1-1z"/></svg>Opponent found! Get ready.' : `⏳ Waiting for opponent... ${this.formatTime(timeRemaining)}`}
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
                <span class="ml-2 font-medium" style="color: var(--color-text-primary);">${this.formatSetting(scoreLimit)}</span>
              </div>
              <div>
                <span style="color: var(--color-text-secondary);">Ball Speed:</span>
                <span class="ml-2 font-medium" style="color: var(--color-text-primary);">${this.formatSetting(ballSpeed)}</span>
              </div>
              <div>
                <span style="color: var(--color-text-secondary);">Paddle Speed:</span>
                <span class="ml-2 font-medium" style="color: var(--color-text-primary);">${this.formatSetting(paddleSpeed)}</span>
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
              ${isReady ? '✓ Ready' : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><path d="M9 21a1 1 0 0 0 1-1v-1a2 2 0 0 1 4 0v.78A1.223 1.223 0 0 0 15.228 21 7.7 7.7 0 0 0 23 13.73 7.5 7.5 0 0 0 15.5 6H13V4a1 1 0 0 0-2 0v2H8.772A7.7 7.7 0 0 0 1 13.27a7.447 7.447 0 0 0 2.114 5.453A7.81 7.81 0 0 0 9 21zM8.772 8H15.5a5.5 5.5 0 0 1 5.5 5.67 5.643 5.643 0 0 1-5 5.279 4 4 0 0 0-8 .029 5.5 5.5 0 0 1-5-5.648A5.684 5.684 0 0 1 8.772 8zM5 12.5a1 1 0 0 1 1-1h1v-1a1 1 0 0 1 2 0v1h1a1 1 0 0 1 0 2H9v1a1 1 0 0 1-2 0v-1H6a1 1 0 0 1-1-1zM17 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm-2 3a1 1 0 1 1 1 1 1 1 0 0 1-1-1z"/></svg>Ready Up'}
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
    } catch (err) {
      console.error('[GameLobby] Render error:', err);
      return this.renderError('An error occurred while rendering the lobby');
    }
  }

  private renderPlayerCard(player: PlayerInfo, label: string, ready: boolean): string {
    const auth = appState.auth.get();
    const displayName =
      label === 'You'
        ? player.username || (auth?.user as any)?.username || 'You'
        : player.username || 'Opponent';
    const avatar =
      label === 'You'
        ? player.avatar || GameLobby.defaultAvatar
        : player.avatar || GameLobby.defaultAvatar;

    return `
      <div class="p-4 rounded-lg transition-all duration-300" style="background: var(--color-input-bg); border: 1px solid var(--color-panel-border);">
        <div class="flex items-center gap-3">
          <img
            src="${avatar}"
            alt="${displayName}"
            class="w-12 h-12 rounded-full"
            style="border: 2px solid var(--color-primary);"
          />
          <div class="flex-1">
            <div class="font-medium" style="color: var(--color-text-primary);">
              ${displayName}
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
      error: { icon: '🔴', text: 'Connection Error', color: 'var(--color-error)' },
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
    backBtn?.addEventListener('click', () => this.handleBack());
  }

  private async handleReady(): Promise<void> {
    try {
      console.log('[GameLobby] Marking player as ready...');
      if (gameWS.getState() === 'disconnected') {
        await gameWS.connect();
      }
      gameWS.send('ready', { gameId: this.props.gameId });

      this.state.isReady = true;
      this.refreshGameState();

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
      gameWS.disconnect();
      this.teardownLobbyChat();
      this.navigateTo('/dashboard');
    } catch (error) {
      console.error('[GameLobby] ❌ Failed to leave game:', error);
      // Still navigate away even if leave fails
      gameWS.disconnect();
      this.teardownLobbyChat();
      this.navigateTo('/dashboard');
    }
  }

  private handleBack(): void {
    this.teardownLobbyChat();
    this.navigateTo('/dashboard');
  }

  private startTimeout(): void {
    this.stopTimeout();
    this.timeoutInterval = window.setInterval(() => {
      if (this.state.game?.players && this.state.game.players.length >= 2) {
        this.stopTimeout();
        return;
      }

      this.state.timeRemaining--;

      if (this.state.timeRemaining <= 0) {
        this.handleTimeout();
      } else {
        // Check if component is still mounted before updating
        if (!this.element || !document.body.contains(this.element)) {
          this.stopTimeout();
          return;
        }
        this.update({});
      }
    }, 1000);
  }

  private stopTimeoutIfOpponentJoined(game?: GameStateOutput): void {
    const g = game ?? this.state.game;
    if (g?.players && g.players.length >= 2) {
      this.stopTimeout();
    }
  }

  private stopTimeout(): void {
    if (this.timeoutInterval) {
      clearInterval(this.timeoutInterval);
      this.timeoutInterval = undefined;
    }
  }

  private resetTimeout(): void {
    this.state.timeRemaining = 120;
    this.startTimeout();
  }

  private handleTimeout(): void {
    this.stopTimeout();
    this.state.error = '⏱️ Lobby timeout - no opponent found';
    this.update({});
  }

  private mountLobbyChat(): void {
    if (this.lobbyChat) return;
    
    // Safety check: ensure we're still mounted
    if (!this.element || !document.body.contains(this.element)) {
      return;
    }
    
    // Create a container for the chat panel to avoid clearing document.body
    let chatContainer = document.getElementById('lobby-chat-container');
    if (!chatContainer) {
      chatContainer = document.createElement('div');
      chatContainer.id = 'lobby-chat-container';
      document.body.appendChild(chatContainer);
    }
    
    this.lobbyChat = new LobbyChatPanel({ gameId: this.props.gameId });
    this.lobbyChat.mount(chatContainer);
  }

  private teardownLobbyChat(): void {
    if (!this.lobbyChat) return;
    
    try {
      if (typeof (this.lobbyChat as any).dispose === 'function') {
        (this.lobbyChat as any).dispose();
      } else {
        this.lobbyChat?.unmount();
      }
    } catch (error) {
      console.error('[GameLobby] Error tearing down lobby chat:', error);
    }
    
    this.lobbyChat = undefined;
    
    try {
      lobbyChatService.disconnect();
    } catch (error) {
      console.error('[GameLobby] Error disconnecting lobby chat service:', error);
    }
    
    // Remove the container
    const chatContainer = document.getElementById('lobby-chat-container');
    if (chatContainer) {
      chatContainer.remove();
    }
  }

  private async setupWebSocket(): Promise<void> {
    const updateConnectionStatus = (status: GameLobbyState['connectionStatus']) => {
      this.state.connectionStatus = status;
      this.update({});
    };

    this.wsUnsubscribes.push(
      gameWS.on('connect', () => {
        updateConnectionStatus('connected');
        gameWS.send('join_game', { gameId: this.props.gameId });
      }),
      gameWS.on('disconnect', () => {
        updateConnectionStatus('disconnected');
      }),
      gameWS.on('connect_error', (error) => {
        console.error('[GameLobby] Connection error:', error);
        updateConnectionStatus('error');
      }),
      gameWS.on('player_joined', () => {
        this.handlePlayerEvent();
      }),
      gameWS.on('player_left', () => {
        this.handlePlayerEvent();
      }),
      gameWS.on('player_ready', (data: any) => {
        this.handlePlayerReady(data);
      }),
      gameWS.on('game_start', (data: any) => {
        const targetGameId = data?.gameId ?? this.props.gameId;
        if (!targetGameId) return;
        this.handleGameStart(targetGameId);
      }),
      gameWS.on('error', (data: any) => {
        console.error('[GameLobby] Game error:', data);
        const message = typeof data === 'object' && data && 'message' in data ? (data as any).message : undefined;
        this.state.error = message || 'An error occurred in the game';
        this.update({});
      })
    );

    updateConnectionStatus('connecting');

    await gameWS.connect().catch((error) => {
      console.error('[GameLobby] Failed to connect socket:', error);
      updateConnectionStatus('failed');
    });
  }

  private refreshGameState(): void {
    // Debounce refresh calls to prevent excessive re-renders
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
    }
    
    this.refreshDebounceTimer = window.setTimeout(() => {
      this.refreshDebounceTimer = undefined;
      
      gameService
        .getGame(this.props.gameId)
        .then((game) => {
          this.enrichPlayers(game).then((enriched) => {
            // Update appState only - the subscription will handle the local state and render
            appState.game.set({
              current: enriched,
              isLoading: false,
              error: null,
            });
            // Don't call this.update({}) here - let the subscription handle it to avoid double renders
          }).catch(() => {});
        })
        .catch((error) => {
          console.error('[GameLobby] Failed to refresh game state:', error);
        });
    }, 300); // 300ms debounce
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private formatSetting(value?: number): string {
    return typeof value === 'number' ? String(value) : '—';
  }

  private async enrichPlayers(game: GameStateOutput): Promise<GameStateOutput> {
    if (!game.players || game.players.length === 0) return game;

    const updated = await Promise.all(
      game.players.map(async (player) => {
        if ((player.username && player.avatar) || this.playerCache.has(player.id)) {
          return this.playerCache.get(player.id) ?? player;
        }
        try {
          const profile = await userService.getProfile(player.id);
          const enriched: PlayerInfo = {
            ...player,
            username: profile.username ?? player.username,
            avatar: (profile as any).avatar ?? player.avatar
          };
          this.playerCache.set(player.id, enriched);
          return enriched;
        } catch {
          return player;
        }
      })
    );

    return { ...game, players: updated };
  }

  private handlePlayerEvent(): void {
    // Refresh from API to get the full accurate state
    this.refreshGameState();
  }

  private handlePlayerReady(data?: { playerId?: string }): void {
    if (!data?.playerId || !this.state.game || !this.state.game.players) {
      return;
    }

    const updatedPlayers = this.state.game.players.map((p) =>
      p.id === data.playerId ? { ...p, ready: true } : p
    );

    this.state.game = { ...this.state.game, players: updatedPlayers };
    appState.game.set({
      current: this.state.game,
      isLoading: false,
      error: null,
    });
    this.update({});
  }

  private handleGameStart(gameId: string): void {
    if (!gameId) {
      console.error('[GameLobby] handleGameStart called without gameId');
      return;
    }

    // Teardown chat before navigation
    this.teardownLobbyChat();

    // Update state
    if (this.state.game) {
      this.state.game = { ...this.state.game, status: 'IN_PROGRESS' };
      appState.game.set({
        current: this.state.game,
        isLoading: false,
        error: null,
      });
    }

    // Navigate to game play
    const targetPath = `/game/play/${gameId}`;
    if (window.location.pathname !== targetPath) {
      this.navigateTo(targetPath);
    }
  }

  private navigateTo(path: string): void {
    navigate(path);
  }



  onUnmount(): void {
    // Clean up subscriptions
    this.unsubscribeGame?.();
    this.teardownLobbyChat();
    this.stopTimeout();
    
    // Clear refresh debounce timer
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
      this.refreshDebounceTimer = undefined;
    }

    // Clean up WebSocket listeners
    this.wsUnsubscribes.forEach((unsubscribe) => unsubscribe());
    this.wsUnsubscribes = [];

    // Disconnect WebSocket
    gameWS.disconnect();
  }
}
