import { createGameSocket, GameSocket } from '@/modules/shared/services/game-socket.factory';
import type { ChatMessage, TypingIndicator } from '@/models';

type EventHandler<T = unknown> = (data: T) => void;
type Unsubscribe = () => void;

/**
 * Chat WebSocket Service
 * Manages real-time chat communication via WebSocket
 * Based on Socket.IO client pattern from game-socket.factory
 */
export class ChatWebSocketService {
  private socket: GameSocket | null = null;
  private token: string | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelays = [1000, 2000, 4000, 8000, 16000]; // exponential backoff
  private lastTypingSentAt = 0;

  /**
   * Connect to chat WebSocket
   * @param token - JWT authentication token
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      console.log('[ChatWS] Already connected');
      return;
    }

    this.token = token;
    const wsUrl = this.getWebSocketUrl();
    
    console.log('[ChatWS] Connecting to:', wsUrl);
    
    // Gateway proxy uses /api/chat/ws -> service /socket.io
    this.socket = createGameSocket(wsUrl, token, '/api/chat/ws/socket.io');
    
    // Setup connection event handlers
    this.socket.on('connect', () => {
      console.log('[ChatWS] Connected');
      this.lastTypingSentAt = 0;
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    this.socket.on('disconnect', (reason: unknown) => {
      console.log('[ChatWS] Disconnected:', reason);
      this.scheduleReconnect();
    });

    this.socket.on('connect_error', (error: unknown) => {
      console.error('[ChatWS] Connection error:', error);
      this.scheduleReconnect();
    });

    this.socket.connect();
  }

  /**
   * Disconnect from chat WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.socket.disconnect('User initiated disconnect');
      this.socket = null;
    }
    
    this.lastTypingSentAt = 0;
    this.reconnectAttempts = 0;
    console.log('[ChatWS] Disconnected');
  }

  /**
   * Join a game chat room
   * @param gameId - Game ID to join
   */
  joinGameChat(gameId: string): void {
    if (!this.socket?.connected) {
      console.warn('[ChatWS] Cannot join game chat: not connected');
      return;
    }
    
    console.log('[ChatWS] Joining game chat:', gameId);
    this.socket.emit('join_game_chat', { gameId });
  }

  /**
   * Leave a game chat room
   * @param gameId - Game ID to leave
   */
  leaveGameChat(gameId: string): void {
    if (!this.socket?.connected) {
      return;
    }
    
    console.log('[ChatWS] Leaving game chat:', gameId);
    this.socket.emit('leave_game_chat', { gameId });
  }

  /**
   * Send a message via WebSocket
   * @param content - Message content
   * @param recipientId - Recipient user ID (for DIRECT messages)
   * @param gameId - Game ID (for GAME messages)
   */
  sendMessage(content: string, recipientId?: string, gameId?: string): void {
    if (!this.socket?.connected) {
      console.warn('[ChatWS] Cannot send message: not connected');
      return;
    }

    const payload: {
      type: 'DIRECT' | 'GAME';
      content: string;
      recipientId?: string;
      gameId?: string;
    } = {
      type: recipientId ? 'DIRECT' : 'GAME',
      content,
    };

    if (recipientId) {
      payload.recipientId = recipientId;
    }

    if (gameId) {
      payload.gameId = gameId;
    }

    console.log('[ChatWS] Sending message:', payload);
    this.socket.emit('send_message', payload);
  }

  /**
   * Send typing indicator
   * @param recipientId - Recipient user ID (for DIRECT)
   * @param gameId - Game ID (for GAME)
   */
  sendTyping(recipientId?: string, gameId?: string): void {
    if (!this.socket?.connected) {
      return;
    }

    const now = Date.now();
    // throttle typing emits to avoid flooding (one every 500ms)
    if (now - this.lastTypingSentAt < 500) {
      return;
    }
    this.lastTypingSentAt = now;

    const payload: { recipientId?: string; gameId?: string } = {};
    
    if (recipientId) {
      payload.recipientId = recipientId;
    }
    
    if (gameId) {
      payload.gameId = gameId;
    }

    this.socket.emit('typing', payload);
  }

  /**
   * Listen for new messages
   * @param callback - Handler for new messages
   * @returns Unsubscribe function
   */
  onMessage(callback: EventHandler<ChatMessage>): Unsubscribe {
    if (!this.socket) {
      console.warn('[ChatWS] Cannot subscribe to messages: not initialized');
      return () => {};
    }

    const handler = (data: unknown) => {
      console.log('[ChatWS] Received message:', data);
      callback(data as ChatMessage);
    };

    this.socket.on('new_message', handler);
    
    return () => {
      this.socket?.off('new_message', handler);
    };
  }

  /**
   * Listen for message sent acknowledgments
   * @param callback - Handler for message sent events
   * @returns Unsubscribe function
   */
  onMessageSent(callback: EventHandler<{ messageId: string; tempId?: string }>): Unsubscribe {
    if (!this.socket) {
      return () => {};
    }

    const handler = (data: unknown) => {
      console.log('[ChatWS] Message sent ack:', data);
      callback(data as { messageId: string; tempId?: string });
    };

    this.socket.on('message_sent', handler);
    
    return () => {
      this.socket?.off('message_sent', handler);
    };
  }

  /**
   * Listen for message errors
   * @param callback - Handler for message errors
   * @returns Unsubscribe function
   */
  onMessageError(callback: EventHandler<{ error: string; tempId?: string }>): Unsubscribe {
    if (!this.socket) {
      return () => {};
    }

    const handler = (data: unknown) => {
      console.error('[ChatWS] Message error:', data);
      callback(data as { error: string; tempId?: string });
    };

    this.socket.on('message_error', handler);
    
    return () => {
      this.socket?.off('message_error', handler);
    };
  }

  /**
   * Listen for typing indicators
   * @param callback - Handler for typing events
   * @returns Unsubscribe function
   */
  onTyping(callback: EventHandler<TypingIndicator>): Unsubscribe {
    if (!this.socket) {
      return () => {};
    }

    const handler = (data: unknown) => {
      callback(data as TypingIndicator);
    };

    this.socket.on('user_typing', handler);
    
    return () => {
      this.socket?.off('user_typing', handler);
    };
  }

  /**
   * Listen for user online status
   * @param callback - Handler for user online events
   * @returns Unsubscribe function
   */
  onUserOnline(callback: EventHandler<{ userId: string }>): Unsubscribe {
    if (!this.socket) {
      return () => {};
    }

    const handler = (data: unknown) => {
      console.log('[ChatWS] User online:', data);
      callback(data as { userId: string });
    };

    this.socket.on('user_online', handler);
    
    return () => {
      this.socket?.off('user_online', handler);
    };
  }

  /**
   * Listen for user offline status
   * @param callback - Handler for user offline events
   * @returns Unsubscribe function
   */
  onUserOffline(callback: EventHandler<{ userId: string }>): Unsubscribe {
    if (!this.socket) {
      return () => {};
    }

    const handler = (data: unknown) => {
      console.log('[ChatWS] User offline:', data);
      callback(data as { userId: string });
    };

    this.socket.on('user_offline', handler);
    
    return () => {
      this.socket?.off('user_offline', handler);
    };
  }

  /**
   * Listen for errors
   * @param callback - Handler for error events
   * @returns Unsubscribe function
   */
  onError(callback: EventHandler<{ message: string }>): Unsubscribe {
    if (!this.socket) {
      return () => {};
    }

    const handler = (data: unknown) => {
      console.error('[ChatWS] Error:', data);
      callback(data as { message: string });
    };

    this.socket.on('error', handler);
    
    return () => {
      this.socket?.off('error', handler);
    };
  }

  /**
   * Listen for connection events
   * @param callback - Handler for connect events
   * @returns Unsubscribe function
   */
  onConnect(callback: EventHandler<void>): Unsubscribe {
    if (!this.socket) {
      return () => {};
    }

    const handler = () => {
      console.log('[ChatWS] Connection event handler triggered');
      callback();
    };

    this.socket.on('connect', handler);
    
    return () => {
      this.socket?.off('connect', handler);
    };
  }

  /**
   * Listen for disconnection events
   * @param callback - Handler for disconnect events
   * @returns Unsubscribe function
   */
  onDisconnect(callback: EventHandler<string>): Unsubscribe {
    if (!this.socket) {
      return () => {};
    }

    const handler = (reason: unknown) => {
      console.log('[ChatWS] Disconnection event handler triggered:', reason);
      callback(reason as string);
    };

    this.socket.on('disconnect', handler);
    
    return () => {
      this.socket?.off('disconnect', handler);
    };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Update authentication token
   * @param token - New JWT token
   */
  updateToken(token: string): void {
    this.token = token;
    if (this.socket) {
      this.socket.updateToken(token);
    }
  }

  /**
   * Get WebSocket URL from environment
   */
  private getWebSocketUrl(): string {
    // Use the API base URL for WebSocket connection (gateway handles routing)
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
    if (/^https?:\/\//i.test(apiBase)) {
      return apiBase.replace(/\/api\/?$/, '') || apiBase;
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return 'http://api-gateway:3000';
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[ChatWS] Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    const delay = this.reconnectDelays[Math.min(this.reconnectAttempts, this.reconnectDelays.length - 1)];
    console.log(`[ChatWS] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      
      if (this.token) {
        this.connect(this.token);
      }
    }, delay);
  }
}

// Export singleton instance
export const chatWebSocketService = new ChatWebSocketService();
