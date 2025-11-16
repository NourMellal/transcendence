import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { updateUserSchema, userIdParamSchema, idParamSchema } from '@transcendence/shared-validation';
import { UpdateProfileUseCase } from '../../../application/use-cases/users/update-profile.usecase';
import { GetUserUseCase } from '../../../application/use-cases/users/get-user.usecase';
import { DeleteUserUseCase } from '../../../application/use-cases/users/delete-user.usecase';
import { UpdateProfileRequestDTO } from '../../../application/dto/user.dto.js';
import { UserMapper } from '../../../application/mappers/user.mapper.js';
import { ErrorHandler } from '../utils/error-handler.js';

interface GetUserParams {
    id: string;
}

interface DeleteUserRequestBody {
    reason?: string;
}

export class UserController {
    constructor(
        private updateProfileUseCase: UpdateProfileUseCase,
        private getUserUseCase: GetUserUseCase,
        private deleteUserUseCase: DeleteUserUseCase
    ) { }

    async getUser(
        request: FastifyRequest<{ Params: GetUserParams }>,
        reply: FastifyReply
    ): Promise<void> {
        try {
            const params = userIdParamSchema.parse(request.params);
            const user = await this.getUserUseCase.execute(params.userId);

            if (!user) {
                reply.code(404).send({
                    error: 'Not Found',
                    message: 'User not found'
                });
                return;
            }

            reply.code(200).send(UserMapper.toProfileDTO(user));
        } catch (error: any) {
            request.log.error(error);
            reply.code(500).send({
                error: 'Internal Server Error',
                message: 'An error occurred while fetching user'
            });
        }
    }

    async deleteUser(
        request: FastifyRequest<{ Params: GetUserParams; Body?: DeleteUserRequestBody }>,
        reply: FastifyReply
    ): Promise<void> {
        try {
            const params = userIdParamSchema.parse(request.params);
            const body = (request.body ?? {}) as DeleteUserRequestBody;
            const userIdHeader = request.headers['x-user-id'] as string;

            if (!userIdHeader) {
                reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'User ID not found in request headers'
                });
                return;
            }

            const authenticatedUserId = idParamSchema.parse({ id: userIdHeader }).id;

            if (params.userId !== authenticatedUserId) {
                reply.code(403).send({
                    error: 'Forbidden',
                    message: 'You can only delete your own profile'
                });
                return;
            }

            request.log.info({ targetUserId: params.userId, initiatedBy: authenticatedUserId, reason: body?.reason }, 'Deleting user');

            await this.deleteUserUseCase.execute(params.userId, {
                reason: body?.reason,
                initiatedBy: authenticatedUserId,
            });

            reply.code(204).send();
        } catch (error: any) {
            request.log.error({ err: error }, 'Delete user failed');

            if (error.message === 'User not found') {
                reply.code(404).send({
                    error: 'Not Found',
                    message: error.message,
                });
                return;
            }

            if (error.message === 'User ID is required') {
                reply.code(400).send({
                    error: 'Bad Request',
                    message: error.message,
                });
                return;
            }

            reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to delete user',
            });
        }
    }

    async getMe(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        try {
            // Get authenticated user ID from API Gateway header
            const userIdHeader = request.headers['x-user-id'] as string;

            if (!userIdHeader) {
                reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'User ID not found in request headers'
                });
                return;
            }

            const userId = idParamSchema.parse({ id: userIdHeader }).id;

            const user = await this.getUserUseCase.execute(userId);

            if (!user) {
                reply.code(404).send({
                    error: 'Not Found',
                    message: 'User not found'
                });
                return;
            }

            reply.code(200).send(UserMapper.toProfileDTO(user));
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

            const updates = this.parseUpdatePayload(request.body, reply);
            if (!updates) {
                return;
            }
            const updatedUser = await this.updateProfileUseCase.execute(userId, updates);

            reply.code(200).send(UserMapper.toUpdateResponseDTO(updatedUser));
        } catch (error: any) {
            request.log.error({ err: error }, 'Update profile failed');
            ErrorHandler.handleUpdateProfileError(error, reply);
        }
    }

    async updateProfile(
        request: FastifyRequest<{ Params: GetUserParams; Body: UpdateProfileRequestDTO }>,
        reply: FastifyReply
    ): Promise<void> {
        try {
            const params = userIdParamSchema.parse(request.params);
            const updates = this.parseUpdatePayload(request.body, reply);
            if (!updates) {
                return;
            }

            // Get authenticated user ID from API Gateway header
            const authenticatedHeaderId = request.headers['x-user-id'] as string;
            const authenticatedUserId = authenticatedHeaderId
                ? idParamSchema.parse({ id: authenticatedHeaderId }).id
                : undefined;

            // Security: Verify the user can only update their own profile
            if (authenticatedUserId && params.userId !== authenticatedUserId) {
                reply.code(403).send({
                    error: 'Forbidden',
                    message: 'You can only update your own profile'
                });
                return;
            }

            const updatedUser = await this.updateProfileUseCase.execute(params.userId, updates);

            reply.code(200).send(UserMapper.toUpdateResponseDTO(updatedUser));
        } catch (error: any) {
            request.log.error({ err: error }, 'Update profile failed');
            ErrorHandler.handleUpdateProfileError(error, reply);
        }
    }

    private parseUpdatePayload(
        payload: UpdateProfileRequestDTO,
        reply: FastifyReply
    ): UpdateProfileRequestDTO | null {
        try {
            return updateUserSchema.parse(payload) as UpdateProfileRequestDTO;
        } catch (error) {
            this.handleValidationError(error, reply);
            return null;
        }
    }

    private handleValidationError(error: unknown, reply: FastifyReply): void {
        if (error instanceof ZodError) {
            reply.code(400).send({
                error: 'Bad Request',
                message: 'Validation failed',
                details: error.issues.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                })),
            });
            return;
        }

        reply.code(400).send({
            error: 'Bad Request',
            message: (error as Error)?.message || 'Invalid request payload',
        });
    }
}
