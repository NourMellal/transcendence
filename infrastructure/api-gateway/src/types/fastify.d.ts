/**
 * Fastify Type Augmentation
 * Extends Fastify types with custom properties
 */

import 'fastify';
import type { JWTPayload } from '../utils/vault-jwt.service';

declare module 'fastify' {
    interface FastifyRequest {
        jwtPayload?: JWTPayload;
    }
}
