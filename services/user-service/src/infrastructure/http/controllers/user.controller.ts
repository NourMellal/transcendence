import type { FastifyReply, FastifyRequest } from 'fastify';
import { UpdateProfileUseCase } from '../../../application/use-cases/update-profile.usecase';
import { GetUserUseCase } from '../../../application/use-cases/get-user.usecase';
import { UpdateProfileRequestDTO } from '../../../application/dto/user.dto.js';

interface GetUserParams {
    id: string;
}

export class UserController {
    constructor(
        private updateProfileUseCase: UpdateProfileUseCase,
        private getUserUseCase: GetUserUseCase
    ) { }

    async getUser(
        request: FastifyRequest<{ Params: GetUserParams }>,
        reply: FastifyReply
    ): Promise<void> {
        try {
            const { id } = request.params;
            const user = await this.getUserUseCase.execute(id);

            if (!user) {
                reply.code(404).send({
                    error: 'Not Found',
                    message: 'User not found'
                });
                return;
            }

            // Don't send sensitive data
            reply.code(200).send({
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatar,
                is2FAEnabled: user.is2FAEnabled,
                oauthProvider: user.oauthProvider,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            });
        } catch (error: any) {
            request.log.error(error);
            reply.code(500).send({
                error: 'Internal Server Error',
                message: 'An error occurred while fetching user'
            });
        }
    }

    async getMe(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        try {
            // Get authenticated user ID from API Gateway header
            const userId = request.headers['x-user-id'] as string;

            if (!userId) {
                reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'User ID not found in request headers'
                });
                return;
            }

            const user = await this.getUserUseCase.execute(userId);

            if (!user) {
                reply.code(404).send({
                    error: 'Not Found',
                    message: 'User not found'
                });
                return;
            }

            // Don't send sensitive data
            reply.code(200).send({
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatar,
                is2FAEnabled: user.is2FAEnabled,
                oauthProvider: user.oauthProvider,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            });
        } catch (error: any) {
            request.log.error(error);
            reply.code(500).send({
                error: 'Internal Server Error',
                message: 'An error occurred while fetching user'
            });
        }
    }

    async updateMe(
        request: FastifyRequest<{ Body: UpdateProfileRequestDTO }>,
        reply: FastifyReply
    ): Promise<void> {
        try {
            // Get authenticated user ID from API Gateway header
            const userId = request.headers['x-user-id'] as string;

            if (!userId) {
                reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'User ID not found in request headers'
                });
                return;
            }

            const updates = request.body;
            const updatedUser = await this.updateProfileUseCase.execute(userId, updates);

            reply.code(200).send({
                id: updatedUser.id,
                email: updatedUser.email,
                username: updatedUser.username,
                displayName: updatedUser.displayName,
                avatar: updatedUser.avatar,
                is2FAEnabled: updatedUser.is2FAEnabled,
                oauthProvider: updatedUser.oauthProvider,
                updatedAt: updatedUser.updatedAt,
                message: 'Profile updated successfully',
            });
        } catch (error: any) {
            request.log.error({ err: error }, 'Update profile failed');

            if (error.message.includes('not found')) {
                reply.code(404).send({
                    error: 'Not Found',
                    message: error.message
                });
            } else if (
                error.message.includes('already exists') ||
                error.message.includes('already taken')
            ) {
                reply.code(409).send({
                    error: 'Conflict',
                    message: error.message
                });
            } else if (
                error.message.includes('Invalid') ||
                error.message.includes('must be') ||
                error.message.includes('must contain') ||
                error.message.includes('Cannot update')
            ) {
                reply.code(400).send({
                    error: 'Bad Request',
                    message: error.message
                });
            } else {
                reply.code(500).send({
                    error: 'Internal Server Error',
                    message: process.env.NODE_ENV === 'development'
                        ? error.message
                        : 'An error occurred while updating profile'
                });
            }
        }
    }

    async updateProfile(
        request: FastifyRequest<{ Params: GetUserParams; Body: UpdateProfileRequestDTO }>,
        reply: FastifyReply
    ): Promise<void> {
        try {
            const { id } = request.params;
            const updates = request.body;

            // Get authenticated user ID from API Gateway header
            const authenticatedUserId = request.headers['x-user-id'] as string;

            // Security: Verify the user can only update their own profile
            if (authenticatedUserId && id !== authenticatedUserId) {
                reply.code(403).send({
                    error: 'Forbidden',
                    message: 'You can only update your own profile'
                });
                return;
            }

            const updatedUser = await this.updateProfileUseCase.execute(id, updates);

            reply.code(200).send({
                id: updatedUser.id,
                email: updatedUser.email,
                username: updatedUser.username,
                displayName: updatedUser.displayName,
                avatar: updatedUser.avatar,
                is2FAEnabled: updatedUser.is2FAEnabled,
                oauthProvider: updatedUser.oauthProvider,
                updatedAt: updatedUser.updatedAt,
                message: 'Profile updated successfully',
            });
        } catch (error: any) {
            request.log.error({ err: error }, 'Update profile failed');

            if (error.message.includes('not found')) {
                reply.code(404).send({
                    error: 'Not Found',
                    message: error.message
                });
            } else if (
                error.message.includes('already exists') ||
                error.message.includes('already taken')
            ) {
                reply.code(409).send({
                    error: 'Conflict',
                    message: error.message
                });
            } else if (
                error.message.includes('Invalid') ||
                error.message.includes('must be') ||
                error.message.includes('must contain') ||
                error.message.includes('Cannot update')
            ) {
                reply.code(400).send({
                    error: 'Bad Request',
                    message: error.message
                });
            } else {
                reply.code(500).send({
                    error: 'Internal Server Error',
                    message: process.env.NODE_ENV === 'development'
                        ? error.message
                        : 'An error occurred while updating profile'
                });
            }
        }
    }
}
