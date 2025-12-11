import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserController } from '../controllers/user.controller';
import { validateInternalApiKey } from '../middlewares/internal-api.middleware';
import { UpdateProfileRequestDTO } from '../../../application/dto/user.dto';

interface GetUserParams {
    userId: string;
}

interface GetUserByUsernameParams {
    username: string;
}

interface DeleteUserRequestBody {
    reason?: string;
}

export function registerUserRoutes(
    fastify: FastifyInstance,
    userController: UserController
) {
    // GET /users/me - Get current authenticated user (from API Gateway)
    fastify.get('/users/me', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        return userController.getMe(request, reply);
    });

    // PATCH /users/me - Update current authenticated user (from API Gateway)
    fastify.patch<{ Body: UpdateProfileRequestDTO }>('/users/me', {
        preHandler: [validateInternalApiKey]
    }, async (
        request: FastifyRequest<{ Body: UpdateProfileRequestDTO }>,
        reply: FastifyReply
    ) => {
        return userController.updateMe(request, reply);
    });

    // PUT /users/me - Update current authenticated user (alias for PATCH)
    fastify.put<{ Body: UpdateProfileRequestDTO }>('/users/me', {
        preHandler: [validateInternalApiKey]
    }, async (
        request: FastifyRequest<{ Body: UpdateProfileRequestDTO }>,
        reply: FastifyReply
    ) => {
        return userController.updateMe(request, reply);
    });

    // GET /users/:id - Get user by ID (public profile view or admin)
    fastify.get<{ Params: GetUserParams }>('/users/:userId', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest<{ Params: GetUserParams }>, reply: FastifyReply) => {
        return userController.getUser(request, reply);
    });

    // PATCH /users/:id - Update user profile by ID (with authorization check)
    fastify.patch<{ Params: GetUserParams; Body: UpdateProfileRequestDTO }>('/users/:userId', {
        preHandler: [validateInternalApiKey]
    }, async (
        request: FastifyRequest<{ Params: GetUserParams; Body: UpdateProfileRequestDTO }>,
        reply: FastifyReply
    ) => {
        return userController.updateProfile(request, reply);
    });

    // PUT /users/:id - Update user profile by ID (alias for PATCH)
    fastify.put<{ Params: GetUserParams; Body: UpdateProfileRequestDTO }>('/users/:userId', {
        preHandler: [validateInternalApiKey]
    }, async (
        request: FastifyRequest<{ Params: GetUserParams; Body: UpdateProfileRequestDTO }>,
        reply: FastifyReply
    ) => {
        return userController.updateProfile(request, reply);
    });

    // DELETE /users/:id - Delete user by ID (admin/internal)
    fastify.delete<{ Params: GetUserParams; Body: DeleteUserRequestBody }>('/users/:userId', {
        preHandler: [validateInternalApiKey]
    }, async (
        request: FastifyRequest<{ Params: GetUserParams; Body: DeleteUserRequestBody }>,
        reply: FastifyReply
    ) => {
        return userController.deleteUser(request, reply);
    });

    // GET /users/by-username/:username - Get user by username
    fastify.get<{ Params: GetUserByUsernameParams }>('/users/by-username/:username', {
        preHandler: [validateInternalApiKey]
    }, async (request: FastifyRequest<{ Params: GetUserByUsernameParams }>, reply: FastifyReply) => {
        return userController.getUserByUsername(request, reply);
    });

    fastify.log.info('✅ User routes registered');
}
