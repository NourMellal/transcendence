import { io } from 'socket.io-client';

import type {
  GameSocketIncomingEvents,
  GameSocketOutgoingEvents,
} from '../types/websocket.types';

type SocketLifecycleEvents = {
  connect: void;
  disconnect: string | undefined;
  connect_error: Error;
};

type InternalClientEvents = {
  client_disconnect: { reason: string };
};

type DefaultIncomingEvents = GameSocketIncomingEvents & SocketLifecycleEvents;
type DefaultOutgoingEvents = GameSocketOutgoingEvents & InternalClientEvents;

export type SocketEventHandler<T = unknown> = (payload: T) => void;

export interface GameSocket<
  IncomingEvents extends Record<string, unknown> = DefaultIncomingEvents,
  OutgoingEvents extends Record<string, unknown> = DefaultOutgoingEvents,
> {
  readonly connected: boolean;
  connect(): void;
  disconnect(reason?: string): void;
  emit<Event extends keyof OutgoingEvents>(event: Event, payload: OutgoingEvents[Event]): void;
  emit(event: string, payload?: unknown): void;
  on<Event extends keyof IncomingEvents>(event: Event, handler: SocketEventHandler<IncomingEvents[Event]>): void;
  on(event: string, handler: SocketEventHandler): void;
  off<Event extends keyof IncomingEvents>(event: Event, handler: SocketEventHandler<IncomingEvents[Event]>): void;
  off(event: string, handler: SocketEventHandler): void;
  updateToken(token: string | null): void;
}

class SocketIOGameSocket<
  IncomingEvents extends Record<string, unknown> = DefaultIncomingEvents,
  OutgoingEvents extends Record<string, unknown> = DefaultOutgoingEvents,
> implements GameSocket<IncomingEvents, OutgoingEvents> {
  private token: string | null = null;

  constructor(private readonly socket: ReturnType<typeof io>, token: string | null) {
    this.token = token;
    this.applyToken();
  }

  get connected(): boolean {
    return this.socket.connected;
  }

  connect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect(reason?: string): void {
    this.socket.disconnect();
    if (reason) {
      try {
        this.socket.emit('client_disconnect', { reason });
      } catch {
        // ignore
      }
    }
  }

  emit<Event extends keyof OutgoingEvents>(event: Event, payload: OutgoingEvents[Event]): void;
  emit(event: string, payload?: unknown): void {
    this.socket.emit(event, payload);
  }

  on<Event extends keyof IncomingEvents>(
    event: Event,
    handler: SocketEventHandler<IncomingEvents[Event]>
  ): void;
  on(event: string, handler: SocketEventHandler): void {
    this.socket.on(event, handler as (...args: any[]) => void);
  }

  off<Event extends keyof IncomingEvents>(
    event: Event,
    handler: SocketEventHandler<IncomingEvents[Event]>
  ): void;
  off(event: string, handler: SocketEventHandler): void {
    this.socket.off(event, handler as (...args: any[]) => void);
  }

  updateToken(token: string | null): void {
    this.token = token;
    this.applyToken();
  }

  private applyToken(): void {
    if (!this.socket?.io?.opts) {
      return;
    }
    const query = { ...(this.socket.io.opts.query ?? {}) };
    if (this.token) {
      query.token = this.token;
    } else {
      delete query.token;
    }
    this.socket.io.opts.query = query;
  }
}

export function createGameSocket(url: string, token: string | null): GameSocket {
  const socket = io(url, {
    transports: ['websocket'],
    autoConnect: false,
    forceNew: true,
    reconnection: false,
    query: token ? { token } : undefined,
  });

  return new SocketIOGameSocket(socket, token ?? null);
}
