import { Socket } from 'socket.io';
import { HandlePaddleMoveUseCase } from '../../../application/use-cases';
import { PaddleMoveInput } from '../../../application/dto';

interface PaddleMovePayload {
    readonly gameId?: string;
    readonly direction?: 'up' | 'down';
    readonly deltaTime?: number;
    readonly y?: number;
}

export class PaddleMoveHandler {
    constructor(private readonly handlePaddleMoveUseCase: HandlePaddleMoveUseCase) {}

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
        if (typeof payload.deltaTime === 'number') {
            return payload.deltaTime;
        }

        if (typeof payload.y === 'number') {
            return Math.abs(payload.y) || 0.016;
        }

        return 0.016;
    }

    private getActiveGameId(socket: Socket): string | undefined {
        return [...socket.rooms].find((room) => room !== socket.id);
    }
}
