export interface IGameStateBroadcaster {
    broadcastGameState(gameId: string, payload: unknown): void;
    broadcastBallState?(gameId: string, payload: unknown): void;
    broadcastPaddleUpdate?(gameId: string, payload: unknown): void;
    broadcastGameFinished?(gameId: string, payload: unknown): void;
}
