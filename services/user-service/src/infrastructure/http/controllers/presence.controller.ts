import type { FastifyReply, FastifyRequest } from 'fastify';
import { PresenceStatus } from '../../../domain/entities/presence.entity';
import { UpdatePresenceUseCase } from '../../../application/use-cases/presence/update-presence.usecase';
import { GetPresenceUseCase } from '../../../application/use-cases/presence/get-presence.usecase';

interface UpdatePresenceBody {
    status: PresenceStatus;
}

interface PresenceParams {
    userId: string;
}

export class PresenceController {
    constructor(
        private readonly updatePresenceUseCase: UpdatePresenceUseCase,
        private readonly getPresenceUseCase: GetPresenceUseCase
    ) {}

    async updatePresence(
        request: FastifyRequest<{ Body: UpdatePresenceBody }>,
        reply: FastifyReply
    ): Promise<void> {
        const userId = request.headers['x-user-id'] as string;

        if (!userId) {
            reply.code(401).send({ error: 'Unauthorized', message: 'User not authenticated' });
            return;
        }

        const body = request.body;
        if (!body || !body.status || !Object.values(PresenceStatus).includes(body.status)) {
            reply.code(400).send({ error: 'Bad Request', message: 'Invalid presence status' });
            return;
        }

        await this.updatePresenceUseCase.execute({ userId, status: body.status });
        reply.code(204).send();
    }

    async getPresence(
        request: FastifyRequest<{ Params: PresenceParams }>,
        reply: FastifyReply
    ): Promise<void> {
        const { userId } = request.params;

        if (!userId) {
            reply.code(400).send({ error: 'Bad Request', message: 'User ID is required' });
            return;
        }

        const presence = await this.getPresenceUseCase.execute(userId);

        if (!presence) {
            reply.code(404).send({ error: 'Not Found', message: 'Presence not found' });
            return;
        }

        reply.code(200).send({
            userId: presence.userId,
            status: presence.status,
            lastSeenAt: presence.lastSeenAt,
        });
    }
}
