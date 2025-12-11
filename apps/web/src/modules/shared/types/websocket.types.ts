/**
 * WebSocket connection state types
 * Used by WebSocketClient and GameCanvas
 */
export type WSConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'failed';

/**
 * Generic event handler type for WebSocket events
 */
export type WSEventHandler<T = unknown> = (payload: T) => void;
