import { FastifyInstance } from 'fastify';

export function registerErrorHandler(app: FastifyInstance): void {
    app.setErrorHandler((error, _request, reply) => {
        if (error instanceof Error && (error.message.includes('x-user-id') || error.message === 'Unauthorized')) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        app.log.error(error, 'Unhandled error');
        return reply.status(500).send({ error: 'Internal Server Error' });
    });
}
