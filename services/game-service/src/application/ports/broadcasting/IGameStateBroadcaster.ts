export interface IGameStateBroadcaster {
    broadcastGameState(gameId: string, payload: unknown): void;
}
