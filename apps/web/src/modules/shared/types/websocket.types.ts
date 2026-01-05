export type WSConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'failed';

export interface WSMessage<T = unknown> {
  type: string;
  payload: T;
}

export type WSEventHandler<T = unknown> = (payload: T) => void;
