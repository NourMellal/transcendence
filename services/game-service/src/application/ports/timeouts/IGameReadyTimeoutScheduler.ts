export interface IGameReadyTimeoutScheduler {
    schedule(gameId: string): void;
    cancel(gameId: string): void;
}
