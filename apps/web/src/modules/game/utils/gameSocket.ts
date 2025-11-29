import { io, Socket } from 'socket.io-client';
import { appState } from '@/state';

/**
 * WebSocket Events from/to Game Service
 */
export interface GameSocketEvents {
  // Client → Server
  'game:join': { gameId: string };
  'game:ready': { gameId: string };
  'game:paddle_move': { direction: 'up' | 'down' | 'stop' };
  'game:leave': { gameId: string };

  // Server → Client
  'game:player_joined': { playerId: string; username: string; players: any[] };
  'game:player_ready': { playerId: string; isReady: boolean };
  'game:started': { gameId: string; startedAt: string };
  'game:state_update': GameStateUpdate;
  'game:finished': { winnerId: string; finalScore: any };
  'game:error': { message: string; code?: string };
  'game:player_left': { playerId: string; reason?: string };
  
  // Connection events
  'connect': void;
  'disconnect': string;
  'connect_error': Error;
  'reconnect': number;
  'reconnect_attempt': number;
  'reconnect_error': Error;
  'reconnect_failed': void;
}

export interface GameStateUpdate {
  ball: {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
  };
  leftPaddle: {
    y: number;
  };
  rightPaddle: {
    y: number;
  };
  score: {
    left: number;
    right: number;
  };
  timestamp: number;
}

/**
 * Connection Status for UI feedback
 */
export type ConnectionStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

/**
 * GameSocketClient - WebSocket client for real-time game communication
 * 
 * Connects to game-service via API Gateway's WebSocket proxy
 * Handles reconnection logic, authentication, and event subscriptions
 * 
 * Architecture (from AGENTS.md):
 * - WebSocket for real-time game updates
 * - Connects through API Gateway (/api/games/ws/socket.io)
 * - JWT token in query params for auth
 */
class GameSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private statusCallbacks: Array<(status: ConnectionStatus) => void> = [];

  /**
   * Connect to game WebSocket server
   * @param gameId - The game session to join
   */
  connect(gameId: string): void {
    if (this.socket?.connected) {
      console.warn('[GameSocket] Already connected, disconnecting first');
      this.disconnect();
    }

    const auth = appState.auth.get();
    const token = auth?.token;

    if (!token) {
      console.error('[GameSocket] ❌ No auth token available');
      this.updateConnectionStatus('failed');
      throw new Error('Authentication required to connect to game');
    }

    // Get WebSocket config from environment variables
    const baseUrl = import.meta.env.VITE_WS_GAME_URL || window.location.origin;
    const path = import.meta.env.VITE_WS_GAME_PATH || '/api/games/ws/socket.io';

    console.log(`[GameSocket] 🔌 Connecting to ${baseUrl}${path}`);
    console.log(`[GameSocket] 🎮 Game ID: ${gameId}`);

    this.updateConnectionStatus('connecting');

    // Create Socket.IO connection
    this.socket = io(baseUrl, {
      path,
      query: {
        token,
        gameId,
      },
      transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      autoConnect: true,
    });

    this.setupConnectionHandlers();
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(): void {
    if (!this.socket) return;

    // Connection successful
    this.socket.on('connect', () => {
      console.log('[GameSocket] ✅ Connected successfully');
      console.log('[GameSocket] 🆔 Socket ID:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('connected');
    });

    // Connection lost
    this.socket.on('disconnect', (reason) => {
      console.log(`[GameSocket] 🔌 Disconnected: ${reason}`);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect (kicked/banned)
        console.warn('[GameSocket] ⚠️ Server disconnected client');
        this.updateConnectionStatus('failed');
      } else {
        // Client-side disconnect or network issue
        this.updateConnectionStatus('reconnecting');
      }
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('[GameSocket] ❌ Connection error:', error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[GameSocket] 💀 Max reconnection attempts reached');
        this.updateConnectionStatus('failed');
      } else {
        console.log(`[GameSocket] 🔄 Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        this.updateConnectionStatus('reconnecting');
      }
    });

    // Reconnection attempt
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[GameSocket] 🔄 Reconnection attempt #${attemptNumber}`);
      this.updateConnectionStatus('reconnecting');
    });

    // Reconnection successful
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`[GameSocket] ✅ Reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('connected');
    });

    // Reconnection failed
    this.socket.on('reconnect_failed', () => {
      console.error('[GameSocket] 💀 Reconnection failed permanently');
      this.updateConnectionStatus('failed');
    });

    // Generic error
    this.socket.on('error', (error) => {
      console.error('[GameSocket] ⚠️ Socket error:', error);
    });
  }

  /**
   * Subscribe to a game event
   */
  on<K extends keyof GameSocketEvents>(
    event: K,
    handler: (data: GameSocketEvents[K]) => void
  ): void {
    if (!this.socket) {
      console.warn(`[GameSocket] ⚠️ Cannot subscribe to ${event}, not connected`);
      return;
    }
    this.socket.on(event, handler);
  }

  /**
   * Unsubscribe from a game event
   */
  off<K extends keyof GameSocketEvents>(
    event: K,
    handler?: (data: GameSocketEvents[K]) => void
  ): void {
    if (!this.socket) return;
    if (handler) {
      this.socket.off(event, handler);
    } else {
      this.socket.off(event);
    }
  }

  /**
   * Emit a game event to server
   */
  emit<K extends keyof GameSocketEvents>(
    event: K,
    data: GameSocketEvents[K]
  ): void {
    if (!this.socket?.connected) {
      console.warn(`[GameSocket] ⚠️ Cannot emit ${event}, not connected`);
      return;
    }
    
    console.log(`[GameSocket] 📤 Emitting ${event}:`, data);
    this.socket.emit(event, data);
  }

  /**
   * Disconnect from game server
   */
  disconnect(): void {
    if (!this.socket) {
      console.warn('[GameSocket] Already disconnected');
      return;
    }

    console.log('[GameSocket] 🔌 Disconnecting...');
    this.socket.disconnect();
    this.socket = null;
    this.reconnectAttempts = 0;
    this.updateConnectionStatus('disconnected');
  }

  /**
   * Check if socket is currently connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Update connection status and notify subscribers
   */
  private updateConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus === status) return;
    
    this.connectionStatus = status;
    console.log(`[GameSocket] 📊 Status: ${status}`);
    
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('[GameSocket] Error in status callback:', error);
      }
    });
  }

  /**
   * Get socket instance (for advanced usage)
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

/**
 * Export singleton instance
 * Usage: gameSocket.connect(gameId), gameSocket.on('game:state_update', handler)
 */
export const gameSocket = new GameSocketClient();
