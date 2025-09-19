import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GetUserUseCase, UpdateProfileUseCase, Generate2FAUseCase } from '../../domain/ports.js';
import { createSuccessResponse, createErrorResponse, AppError } from '@transcendence/shared-utils';
import { updateUserSchema, enable2FASchema } from '@transcendence/shared-validation';

export class UserController {
    constructor(
        private readonly getUserUseCase: GetUserUseCase,
        private readonly updateProfileUseCase: UpdateProfileUseCase,
        private readonly generate2FAUseCase: Generate2FAUseCase
    ) { }

    async registerRoutes(fastify: FastifyInstance): Promise<void> {
        // Get current user profile
        fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = this.getUserIdFromRequest(request);
                const user = await this.getUserUseCase.execute(userId);

                if (!user) {
                    return reply.code(404).send(createErrorResponse('User not found'));
                }

                // Remove sensitive data
                const { twoFASecret, ...safeUser } = user;
                return reply.send(createSuccessResponse(safeUser));
            } catch (error) {
                return this.handleError(error, reply);
            }
        });

        // Update user profile
        fastify.patch('/me', async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = this.getUserIdFromRequest(request);
                const validatedData = updateUserSchema.parse(request.body);

                // Prepare update data - exclude avatar for this endpoint
                // Avatar uploads should use the dedicated /me/avatar endpoint
                const { avatar, ...updateData } = validatedData;

                const updatedUser = await this.updateProfileUseCase.execute(userId, updateData);

                // Remove sensitive data
                const { twoFASecret, ...safeUser } = updatedUser;
                return reply.send(createSuccessResponse(safeUser, 'Profile updated successfully'));
            } catch (error) {
                return this.handleError(error, reply);
            }
        });

        // Generate 2FA secret
        fastify.post('/me/2fa/generate', async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = this.getUserIdFromRequest(request);
                const result = await this.generate2FAUseCase.execute(userId);

                return reply.send(createSuccessResponse(result));
            } catch (error) {
                return this.handleError(error, reply);
            }
        });

        // Upload avatar (file)
        fastify.post('/me/avatar', async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = this.getUserIdFromRequest(request);

                // Handle multipart file upload
                const data = await (request as any).file();
                if (!data) {
                    return reply.code(400).send(createErrorResponse('No file uploaded'));
                }

                const buffer = await data.file.toBuffer();
                const updatedUser = await this.updateProfileUseCase.execute(userId, {
                    avatar: buffer
                });

                const { twoFASecret, ...safeUser } = updatedUser;
                return reply.send(createSuccessResponse(safeUser, 'Avatar updated successfully'));
            } catch (error) {
                return this.handleError(error, reply);
            }
        });

        // Set avatar URL
        fastify.patch('/me/avatar-url', async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const userId = this.getUserIdFromRequest(request);
                const { avatar } = updateUserSchema.pick({ avatar: true }).parse(request.body);

                if (!avatar) {
                    return reply.code(400).send(createErrorResponse('Avatar URL is required'));
                }

                // For URL avatars, we could store the URL directly or download and convert to Buffer
                // For now, let's just store the URL as-is by converting it to a simple update
                const user = await this.getUserUseCase.execute(userId);
                if (!user) {
                    return reply.code(404).send(createErrorResponse('User not found'));
                }

                // Update user with avatar URL (this would need adjustment in the use case)
                // For now, we'll just return an informative message
                return reply.send(createSuccessResponse(
                    { message: 'Avatar URL received', avatarUrl: avatar },
                    'Avatar URL will be processed'
                ));
            } catch (error) {
                return this.handleError(error, reply);
            }
        });
    }

    private getUserIdFromRequest(request: FastifyRequest): string {
        // Extract user ID from session/JWT token
        // This should be implemented based on your authentication strategy
        const userId = (request as any).user?.id;
        if (!userId) {
            throw new AppError('Authentication required', 401);
        }
        return userId;
    }

    private handleError(error: unknown, reply: FastifyReply): FastifyReply {
        if (error instanceof AppError) {
            return reply.code(error.statusCode).send(createErrorResponse(error.message));
        }

        // Log unexpected errors
        console.error('Unexpected error:', error);
        return reply.code(500).send(createErrorResponse('Internal server error'));
    }
}
