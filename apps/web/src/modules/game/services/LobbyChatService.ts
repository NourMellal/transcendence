import { createGameSocket, type GameSocket } from '@/modules/shared/services/game-socket.factory';
import { chatService } from '@/services/api/ChatService';
import type { ChatMessage } from '@/models';
import { appState } from '@/state';
import { lobbyChatHelpers, lobbyChatState } from '@/state/lobbyChat.state';

type Unsubscribe = () => void;

class LobbyChatService {
  private socket: GameSocket | null = null;
  private gameId?: string;
  private currentUserId?: string;
  private currentUsername?: string;
  private typingTimeouts = new Map<string, number>();
  private readonly typingThrottleMs = 500;
  private lastTypingAt = 0;
  private unsubscribes: Unsubscribe[] = [];

  async connect(gameId: string): Promise<void> {
    const token = localStorage.getItem('token');
    const auth = appState.auth.get();
    this.currentUserId = (auth.user as any)?.id ?? (auth.user as any)?.userId;
    this.currentUsername = (auth.user as any)?.username ?? (auth.user as any)?.displayName;
    this.gameId = gameId;

    lobbyChatHelpers.setGame(gameId);
    lobbyChatHelpers.setConnecting(true);

    if (!token) {
      lobbyChatHelpers.setError('Authentication required to join lobby chat');
      return;
    }

    if (this.socket) {
      this.disconnect();
    }

    const wsUrl = this.getWebSocketUrl();
    this.socket = createGameSocket(wsUrl, token, '/api/chat/ws/socket.io');

    this.addSocketListener('connect', () => {
      lobbyChatHelpers.setConnected(true);
      this.joinGameRoom();
      this.loadHistory();
    });

    this.addSocketListener('disconnect', () => {
      lobbyChatHelpers.setConnected(false);
    });

    this.addSocketListener('connect_error', (err: unknown) => {
      console.error('[LobbyChat] connect_error', err);
      lobbyChatHelpers.setError('Unable to connect to chat');
    });

    this.addSocketListener('new_message', (payload: any) => this.handleIncomingMessage(payload));
    this.addSocketListener('user_typing', (payload: any) => this.handleTyping(payload));
    this.addSocketListener('message_error', (payload: any) => {
      const msg = typeof payload === 'object' && (payload as any)?.error ? (payload as any).error : 'Chat error';
      lobbyChatHelpers.setError(msg as string);
    });

    this.socket.connect();
  }

  disconnect(): void {
    this.unsubscribes.forEach((u) => u());
    this.unsubscribes = [];
    this.typingTimeouts.forEach((t) => clearTimeout(t));
    this.typingTimeouts.clear();
    if (this.socket) {
      this.socket.disconnect('lobby chat closed');
      this.socket = null;
    }
    this.gameId = undefined;
    lobbyChatHelpers.reset();
  }

  sendMessage(content: string): void {
    if (!content.trim() || !this.socket?.connected || !this.gameId) {
      return;
    }

    this.socket.emit('send_message', {
      type: 'GAME',
      content,
      gameId: this.gameId,
    });
  }

  sendTyping(): void {
    if (!this.socket?.connected || !this.gameId) {
      return;
    }
    const now = Date.now();
    if (now - this.lastTypingAt < this.typingThrottleMs) {
      return;
    }
    this.lastTypingAt = now;
    this.socket.emit('typing', { gameId: this.gameId });
  }

  private async loadHistory(): Promise<void> {
    if (!this.gameId) return;
    try {
      const response = await chatService.getMessages({
        type: 'GAME',
        gameId: this.gameId,
        limit: 50,
      });

      const enriched = (response.messages || []).map((msg) => this.enrichMessage(msg));
      lobbyChatHelpers.setMessages(enriched);
    } catch (error) {
      console.warn('[LobbyChat] Failed to load history', error);
    }
  }

  private handleIncomingMessage(payload: any): void {
    if (!payload) return;
    if (payload.gameId && this.gameId && payload.gameId !== this.gameId) {
      return; // ignore messages for other rooms
    }

    const message = this.enrichMessage(payload as ChatMessage);
    lobbyChatHelpers.addMessage(message);
    lobbyChatHelpers.pruneTyping();
  }

  private handleTyping(payload: { userId?: string; username?: string; gameId?: string }): void {
    if (!payload?.userId || (payload.gameId && this.gameId && payload.gameId !== this.gameId)) {
      return;
    }
    const userId = payload.userId;
    const username = payload.username ?? 'Player';

    lobbyChatHelpers.setTyping(userId, username, true);

    // Clear typing after inactivity (per user)
    const existing = this.typingTimeouts.get(userId);
    if (existing) {
      clearTimeout(existing);
    }
    const timeout = window.setTimeout(() => {
      lobbyChatHelpers.setTyping(userId, username, false);
      this.typingTimeouts.delete(userId);
    }, 3000);
    this.typingTimeouts.set(userId, timeout);
  }

  private enrichMessage(message: ChatMessage): ChatMessage {
    const createdAt =
      (message as any).createdAt || (message as any).timestamp || new Date().toISOString();
    return {
      ...message,
      createdAt,
      timestamp: createdAt,
      isOwn: this.currentUserId ? message.senderId === this.currentUserId : false,
    };
  }

  private joinGameRoom(): void {
    if (!this.socket?.connected || !this.gameId) return;
    this.socket.emit('join_game_chat', { gameId: this.gameId });
  }

  private addSocketListener(event: string, handler: (payload: any) => void): void {
    if (!this.socket) return;
    this.socket.on(event, handler);
    this.unsubscribes.push(() => {
      try {
        this.socket?.off(event, handler);
      } catch {
        // ignore
      }
    });
  }

  private getWebSocketUrl(): string {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
    return apiBase.replace(/\/api\/?$/, '') || 'http://localhost:3000';
  }
}

export const lobbyChatService = new LobbyChatService();
