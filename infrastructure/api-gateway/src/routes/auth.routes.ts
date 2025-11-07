/**
 * Authentication Routes
 * Handles user registration, login, OAuth, 2FA
 */

import type { FastifyInstance } from 'fastify';
import { signUpSchema, loginSchema, enable2FASchema } from '@transcendence/shared-validation';
import { validateRequestBody } from '../middleware/validation.middleware.js';
import { requireAuth, publicEndpoint, getUser } from '../middleware/auth.middleware.js';

export async function registerAuthRoutes(
    fastify: FastifyInstance,
    userServiceUrl: string,
    internalApiKey: string
) {
    /**
     * POST /api/auth/signup
     * Public endpoint - Register new user
     */
    fastify.post('/api/auth/signup', {
        preHandler: [
            publicEndpoint,
            validateRequestBody(signUpSchema)
        ]
    }, async (request, reply) => {
        const response = await fetch(`${userServiceUrl}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
            },
            body: JSON.stringify(request.body),
        });

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    /**
     * POST /api/auth/login
     * Public endpoint - Email/password login
     */
    fastify.post('/api/auth/login', {
        preHandler: [
            publicEndpoint,
            validateRequestBody(loginSchema)
        ]
    }, async (request, reply) => {
        const response = await fetch(`${userServiceUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
            },
            body: JSON.stringify(request.body),
        });

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    /**
     * GET /api/auth/42/login
     * Public endpoint - Initiate OAuth 42 login
     */
    fastify.get('/api/auth/42/login', {
        preHandler: [publicEndpoint]
    }, async (request, reply) => {
        const response = await fetch(`${userServiceUrl}/auth/42/login`, {
            method: 'GET',
            headers: {
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
            },
        });

        // Handle redirects
        if (response.status === 302) {
            const location = response.headers.get('location');
            return reply.redirect(302, location || '/');
        }

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    /**
     * GET /api/auth/42/callback
     * Public endpoint - OAuth 42 callback handler
     */
    fastify.get('/api/auth/42/callback', {
        preHandler: [publicEndpoint]
    }, async (request, reply) => {
        const queryString = new URL(request.url, `http://${request.headers.host}`).search;

        const response = await fetch(`${userServiceUrl}/auth/42/callback${queryString}`, {
            method: 'GET',
            headers: {
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
            },
        });

        // Handle redirects
        if (response.status === 302) {
            const location = response.headers.get('location');
            return reply.redirect(302, location || '/');
        }

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    /**
     * GET /api/auth/status
     * Protected - Check authentication status
     */
    fastify.get('/api/auth/status', {
        preHandler: [requireAuth]
    }, async (request, reply) => {
        const user = getUser(request);
        const response = await fetch(`${userServiceUrl}/auth/status`, {
            method: 'GET',
            headers: {
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
                'x-user-id': user?.userId || user?.sub || '',
                'x-user-email': user?.email || '',
                'x-username': user?.username || '',
                'Authorization': request.headers.authorization || '',
            },
        });

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    /**
     * POST /api/auth/logout
     * Protected - Logout user
     */
    fastify.post('/api/auth/logout', {
        preHandler: [requireAuth]
    }, async (request, reply) => {
        const user = getUser(request);
        const response = await fetch(`${userServiceUrl}/auth/logout`, {
            method: 'POST',
            headers: {
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
                'x-user-id': user?.userId || user?.sub || '',
                'Authorization': request.headers.authorization || '',
            },
        });

        if (response.status === 204) {
            return reply.code(response.status).send();
        }

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    /**
     * POST /api/auth/2fa/generate
     * Protected - Generate 2FA QR code
     */
    fastify.post('/api/auth/2fa/generate', {
        preHandler: [requireAuth]
    }, async (request, reply) => {
        const user = getUser(request);
        const response = await fetch(`${userServiceUrl}/auth/2fa/generate`, {
            method: 'POST',
            headers: {
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
                'x-user-id': user?.userId || user?.sub || '',
                'Authorization': request.headers.authorization || '',
            },
        });

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    /**
     * POST /api/auth/2fa/enable
     * Protected - Enable 2FA with verification code
     */
    fastify.post('/api/auth/2fa/enable', {
        preHandler: [
            requireAuth,
            validateRequestBody(enable2FASchema)
        ]
    }, async (request, reply) => {
        const user = getUser(request);
        const response = await fetch(`${userServiceUrl}/auth/2fa/enable`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': internalApiKey,
                'x-request-id': request.id,
                'x-user-id': user?.userId || user?.sub || '',
                'Authorization': request.headers.authorization || '',
            },
            body: JSON.stringify(request.body),
        });

        const data = await response.json();
        return reply.code(response.status).send(data);
    });

    fastify.log.info('✅ Auth routes registered');
}
