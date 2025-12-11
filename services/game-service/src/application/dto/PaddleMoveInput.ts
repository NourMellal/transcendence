export interface PaddleMoveInput {
    readonly gameId: string;
    readonly playerId: string;
    readonly direction: 'up' | 'down';
    readonly deltaTime: number;
}
