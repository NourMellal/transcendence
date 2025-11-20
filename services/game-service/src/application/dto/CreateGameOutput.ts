import { GameStatus } from '../../domain/value-objects';

export interface CreateGameOutput {
    readonly id: string;
    readonly status: GameStatus;
    readonly players: Array<{ id: string; isConnected: boolean }>;
    readonly createdAt: Date;
}
