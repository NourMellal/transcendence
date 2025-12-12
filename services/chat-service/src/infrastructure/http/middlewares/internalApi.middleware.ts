import { FastifyReply, FastifyRequest } from 'fastify';

export function createInternalApiMiddleware(expectedApiKey?: string) {
    return async function internalApiMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        if (request.url === '/health') {
            return;
        }

        if (!expectedApiKey) {
            return;
        }

        const headerKey = request.headers['x-internal-api-key'];
        if (headerKey !== expectedApiKey) {
            reply.code(401);
            throw new Error('Unauthorized');
        }
    };
}
