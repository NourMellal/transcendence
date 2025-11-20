import { Socket } from 'socket.io';
import { HandlePaddleMoveUseCase } from '../../../application/use-cases';
import { PaddleMoveInput } from '../../../application/dto';

export class PaddleMoveHandler {
    constructor(private readonly handlePaddleMoveUseCase: HandlePaddleMoveUseCase) {}

    register(socket: Socket): void {
        socket.on('paddle-move', async (payload: PaddleMoveInput) => {
            try {
                await this.handlePaddleMoveUseCase.execute(payload);
            } catch (error) {
                socket.emit('error', { message: (error as Error).message });
            }
        });
    }
}
