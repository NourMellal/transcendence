import { FastifyInstance } from 'fastify';
import { GameNotFoundError, InvalidGameStateError } from '../../../domain/errors';

export function registerErrorHandler(app: FastifyInstance): void {
    app.setErrorHandler((error, _request, reply) => {
        if (error instanceof GameNotFoundError) {
            return reply.status(404).send({ error: error.message });
        }

        if (error instanceof InvalidGameStateError) {
            return reply.status(409).send({ error: error.message });
        }

        app.log.error(error, 'Unhandled error');
        return reply.status(500).send({ error: 'Internal Server Error' });
    });
}
