import { Socket } from 'socket.io';
import { HandlePaddleMoveUseCase } from '../../../application/use-cases';
import { PaddleMoveInput } from '../../../application/dto';
import { IGameRepository } from '../../../application/ports/repositories/IGameRepository';
import { GameRoomManager } from '../GameRoomManager';
import { toWireGameState } from '../../../application/use-cases/gameplay/UpdateGameStateUseCase';

interface PaddleMovePayload {
    readonly gameId?: string;
    readonly direction?: 'up' | 'down';
    readonly deltaTime?: number;
    readonly y?: number;
}

export class PaddleMoveHandler {
    constructor(
        private readonly handlePaddleMoveUseCase: HandlePaddleMoveUseCase,
        private readonly gameRepository: IGameRepository,
        private readonly roomManager: GameRoomManager
    ) {}

    register(socket: Socket): void {
        socket.on('paddle_move', async (payload: PaddleMovePayload) => {
            const playerId = socket.data.playerId as string | undefined;
            const gameId = payload?.gameId ?? this.getActiveGameId(socket);
            const direction = this.resolveDirection(payload);
            const deltaTime = this.resolveDeltaTime(payload);

            if (!playerId || !gameId || !direction) {
                socket.emit('error', { message: 'Missing gameId, direction, or authenticated player' });
                return;
            }

            const input: PaddleMoveInput = {
                gameId,
                playerId,
                direction,
                deltaTime,
            };

            try {
                await this.handlePaddleMoveUseCase.execute(input);
                const game = await this.gameRepository.findById(gameId);
                if (game && game.status !== 'FINISHED' && game.status !== 'CANCELLED') {
                    this.roomManager.emitToGame(gameId, 'game_state', toWireGameState(game.toSnapshot()));
                }
            } catch (error) {
                socket.emit('error', { message: (error as Error).message });
            }
        });
    }

    private resolveDirection(payload: PaddleMovePayload): 'up' | 'down' | undefined {
        if (payload.direction) {
            return payload.direction;
        }

        if (typeof payload.y === 'number') {
            return payload.y >= 0 ? 'down' : 'up';
        }

        return undefined;
    }

    private resolveDeltaTime(payload: PaddleMovePayload): number {
        // Ignore client delta; use a fixed server-side tick for smoother control
        return 1 / 60;
    }

    private getActiveGameId(socket: Socket): string | undefined {
        return [...socket.rooms].find((room) => room !== socket.id);
    }
}
