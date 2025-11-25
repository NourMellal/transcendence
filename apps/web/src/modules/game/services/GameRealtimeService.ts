import { gameWS } from '@/modules/shared/services/WebSocketClient';
import type {
  ChatMessagePayload,
  GameJoinedPayload,
  GameStateUpdatePayload,
  PresenceUpdatePayload,
} from '@/modules/shared/types/websocket.types';

type Subscription = () => void;

const WS_EVENTS = {
  JOIN_GAME: 'join_game',
  LEAVE_GAME: 'leave_game',
  GAME_JOINED: 'game_joined',
  GAME_STATE_UPDATE: 'game_state_update',
  PADDLE_MOVE: 'paddle_move',
  CHAT_MESSAGE: 'game_chat_message',
  CHAT_SEND: 'chat_message_send',
  PRESENCE_UPDATE: 'presence_update',
  PRESENCE_HEARTBEAT: 'presence_heartbeat',
} as const;

export class GameRealtimeService {
  private activeSubscriptions = 0;
  private currentGameId: string | null = null;
  private joinAckUnsub?: Subscription;
  private reconnectUnsub?: Subscription;
  private skipNextReconnectReplay = false;
  private lastJoinMetadata?: Record<string, unknown>;

  async connect(): Promise<void> {
    const state = gameWS.getState();
    if (state === 'connected' || state === 'connecting') {
      return;
    }
    await gameWS.connect();
  }

  getCurrentGameId(): string | null {
    return this.currentGameId;
  }

  async joinGame(gameId: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.connect();
    this.ensureReconnectReplay();
    if (this.currentGameId === gameId) {
      return;
    }
    this.currentGameId = gameId;
    this.lastJoinMetadata = metadata ? { ...metadata } : undefined;

    this.joinAckUnsub?.();
    this.joinAckUnsub = gameWS.on(WS_EVENTS.GAME_JOINED, (payload) => {
      if (payload.gameId === gameId) {
        console.log(`[WS] Joined game ${gameId} as ${payload.side}`);
      }
    });

    this.emitJoinEvent(metadata);
  }

  leaveGame(): void {
    if (!this.currentGameId) {
      return;
    }
    gameWS.send(WS_EVENTS.LEAVE_GAME, { gameId: this.currentGameId });
    this.currentGameId = null;
    this.lastJoinMetadata = undefined;
    this.joinAckUnsub?.();
    this.joinAckUnsub = undefined;
  }

  subscribeToGameState(handler: (payload: GameStateUpdatePayload) => void): Subscription {
    const unsub = gameWS.on(WS_EVENTS.GAME_STATE_UPDATE, handler);
    return this.trackSubscription(unsub);
  }

  subscribeToChat(handler: (payload: ChatMessagePayload) => void): Subscription {
    const unsub = gameWS.on(WS_EVENTS.CHAT_MESSAGE, handler);
    return this.trackSubscription(unsub);
  }

  subscribeToPresence(handler: (payload: PresenceUpdatePayload) => void): Subscription {
    const unsub = gameWS.on(WS_EVENTS.PRESENCE_UPDATE, handler);
    return this.trackSubscription(unsub);
  }

  sendPaddleMove(direction: 'up' | 'down' | 'stop'): void {
    if (!this.currentGameId) {
      console.warn('[WS] Cannot send paddle move before joining a game');
      return;
    }
    gameWS.send(WS_EVENTS.PADDLE_MOVE, {
      gameId: this.currentGameId,
      direction,
      timestamp: Date.now(),
    });
  }

  sendChatMessage(content: string): void {
    if (!this.currentGameId) {
      console.warn('[WS] Cannot send chat message without an active game');
      return;
    }
    gameWS.send(WS_EVENTS.CHAT_SEND, {
      gameId: this.currentGameId,
      content,
      sentAt: Date.now(),
    });
  }

  sendPresenceHeartbeat(status: PresenceUpdatePayload['status']): void {
    gameWS.send(WS_EVENTS.PRESENCE_HEARTBEAT, {
      status,
      gameId: this.currentGameId,
      timestamp: Date.now(),
    });
  }

  disconnect(): void {
    this.leaveGame();
    gameWS.disconnect();
    this.activeSubscriptions = 0;
  }

  private trackSubscription(unsub: Subscription): Subscription {
    this.activeSubscriptions += 1;
    return () => {
      unsub();
      this.activeSubscriptions = Math.max(0, this.activeSubscriptions - 1);
      if (this.activeSubscriptions === 0 && !this.currentGameId) {
        this.disconnect();
      }
    };
  }

  private ensureReconnectReplay(): void {
    if (this.reconnectUnsub) {
      return;
    }
    this.skipNextReconnectReplay = gameWS.getState() === 'connected';
    this.reconnectUnsub = gameWS.on('connect', () => {
      if (this.skipNextReconnectReplay) {
        this.skipNextReconnectReplay = false;
        return;
      }
      this.handleReconnect();
    });
  }

  private handleReconnect(): void {
    if (!this.currentGameId) {
      return;
    }
    console.log(`[WS] Rejoining active game ${this.currentGameId} after reconnect`);
    this.emitJoinEvent();
  }

  private emitJoinEvent(metadata?: Record<string, unknown>): void {
    if (!this.currentGameId) {
      return;
    }
    gameWS.send(WS_EVENTS.JOIN_GAME, {
      gameId: this.currentGameId,
      ...(metadata ?? this.lastJoinMetadata ?? {}),
    });
  }
}

export const gameRealtimeService = new GameRealtimeService();
