import { Socket } from 'socket.io';
import { GameRoomManager } from '../GameRoomManager';
import { UpdateGameStateUseCase, toWireBallState } from '../../../application/use-cases/gameplay/UpdateGameStateUseCase';
import type { GameSnapshot } from '../../../domain/entities/Game';

interface PaddleSetPayload {
    readonly gameId?: string;
    readonly y?: number;
}

export class PaddleSetHandler {
    constructor(
        private readonly updateGameStateUseCase: UpdateGameStateUseCase,
        private readonly roomManager: GameRoomManager
    ) {}

    register(socket: Socket): void {
        socket.on('paddle_set', async (payload: PaddleSetPayload) => {
            const playerId = socket.data.playerId as string | undefined;
            const gameId = payload?.gameId ?? this.getActiveGameId(socket);
            const y = typeof payload?.y === 'number' ? payload.y : undefined;

            if (!playerId || !gameId || y === undefined) {
                socket.emit('error', { message: 'Missing gameId, y, or authenticated player' });
                return;
            }

            try {
                const snapshot = await this.updateGameStateUseCase.applyExternalUpdate(gameId, (game) => {
                    game.setPaddlePosition(playerId, y);
                });
                const paddleUpdate = toWirePaddleUpdate(snapshot, playerId);
                this.roomManager.emitToGame(gameId, 'paddle_update', paddleUpdate);

                // Also echo latest ball to keep clients in sync if loop is between ticks
                this.roomManager.emitToGame(gameId, 'ball_state', toWireBallState(snapshot));
            } catch (error) {
                socket.emit('error', { message: (error as Error).message });
            }
        });
    }

    private getActiveGameId(socket: Socket): string | undefined {
        return [...socket.rooms].find((room) => room !== socket.id);
    }
}

function toWirePaddleUpdate(snapshot: GameSnapshot, playerId: string) {
    const players = snapshot.players ?? [];
    const idx = players.findIndex((p) => p.id === playerId);
    const side: 'left' | 'right' = idx === 1 ? 'right' : 'left';
    const player = players[idx] ?? players[0];
    return {
        gameId: snapshot.id,
        playerId,
        side,
        y: player?.paddle?.position?.y ?? 0
    };
}
