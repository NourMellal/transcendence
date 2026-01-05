import { FastifyReply, FastifyRequest } from 'fastify';

export function createInternalApiMiddleware(expectedKey?: string) {
    return async function internalApiMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        if (request.url === '/health') {
            return;
        }

        if (!expectedKey) {
            return;
        }

        const provided = request.headers['x-internal-api-key'] as string | undefined;
        if (!provided || provided !== expectedKey) {
            reply.code(401).send({ message: 'Unauthorized' });
            return;
        }
    };
}
