export interface BaseMessage<T = unknown> {
    id: string;
    timestamp: Date;
    correlationId?: string;

    payload: T;
}

export interface MessageOptions {
    persistent?: boolean;
    expiration?: string; // in seconds
    priority?: number; // 0-9
    headers?: Record<string, any>;
}
