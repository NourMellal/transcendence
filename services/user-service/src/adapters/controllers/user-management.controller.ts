import { FastifyRequest, FastifyReply } from 'fastify';
import { 
    GetUserUseCase,
    UpdateProfileUseCase,
    Generate2FAUseCase,
    Enable2FAUseCase,
    Disable2FAUseCase,
    AuthenticateUserUseCase
} from '../../domain/ports.js';
import { parseCookies } from '../../utils/cookie-parser';
interface AuthenticatedRequest extends FastifyRequest {
    userId?: string;
}

export class UserController {
    constructor(
        private readonly getUserUseCase: GetUserUseCase,
        private readonly updateProfileUseCase: UpdateProfileUseCase,
        private readonly generate2FAUseCase: Generate2FAUseCase,
        private readonly enable2FAUseCase: Enable2FAUseCase,
        private readonly disable2FAUseCase: Disable2FAUseCase,
        private readonly authenticateUserUseCase: AuthenticateUserUseCase
    ) {}

    /**
     * Middleware to extract user ID from JWT token
     */
      async authenticateUser(req: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
        // Manually parse cookies from Cookie header
        const cookies = parseCookies(req.headers.cookie);
        const token = cookies.token;
        
        if (!token) {
            reply.status(401).send({ error: 'Authentication required' });
            return;
        }

        try {
            const user = await this.authenticateUserUseCase.execute(token);
            if (!user) {
                reply.status(401).send({ error: 'Invalid token' });
                return;
            }
            req.userId = user.id;
        } catch (error) {
            reply.status(401).send({ error: 'Authentication failed' });
            return;
        }
    }
    /**
     * GET /api/users/me - Get current user profile
     */
    async getProfile(req: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
        try {
            if (!req.userId) {
                reply.status(401).send({ error: 'User not authenticated' });
                return;
            }

            const user = await this.getUserUseCase.execute(req.userId);
            
            if (!user) {
                reply.status(404).send({ error: 'User not found' });
                return;
            }

            reply.send({
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatar,
                is2FAEnabled: user.is2FAEnabled,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            });

        } catch (error) {
            req.log.error('Get profile failed:'+ error);
            reply.status(500).send({ error: 'Internal server error' });
        }
    }

    /**
     * PUT /api/users/me - Update user profile
     */
    async updateProfile(req: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
        const { username, displayName } = req.body as { 
            username?: string; 
            displayName?: string; 
        };

        try {
            if (!req.userId) {
                reply.status(401).send({ error: 'User not authenticated' });
                return;
            }

            const updatedUser = await this.updateProfileUseCase.execute(req.userId, {
                username,
                displayName
            });

            reply.send({
                id: updatedUser.id,
                email: updatedUser.email,
                username: updatedUser.username,
                displayName: updatedUser.displayName,
                avatar: updatedUser.avatar,
                is2FAEnabled: updatedUser.is2FAEnabled,
                updatedAt: updatedUser.updatedAt
            });

        } catch (error) {
            req.log.error('Update profile failed:'+ error);
            reply.status(500).send({ error: 'Internal server error' });
        }
    }

    /**
     * POST /api/users/me/2fa/generate - Generate 2FA secret and QR code
     */
    async generate2FA(req: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
        try {
            if (!req.userId) {
                reply.status(401).send({ error: 'User not authenticated' });
                return;
            }

            const { secret, qrCodeUrl } = await this.generate2FAUseCase.execute(req.userId);
            
            reply.send({
                secret,
                qrCodeUrl,
                message: 'Scan the QR code with your authenticator app, then verify to enable 2FA'
            });

        } catch (error) {
            req.log.error('Generate 2FA failed:' + error);
            reply.status(500).send({ error: 'Internal server error' });
        }
    }

    /**
     * POST /api/users/me/2fa/enable - Enable 2FA with verification
     */
    async enable2FA(req: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
        const { token } = req.body as { token: string };

        if (!token) {
            reply.status(400).send({ error: 'Verification token is required' });
            return;
        }

        try {
            if (!req.userId) {
                reply.status(401).send({ error: 'User not authenticated' });
                return;
            }

            await this.enable2FAUseCase.execute(req.userId, token);
            
            reply.send({
                success: true,
                message: '2FA has been enabled successfully'
            });

        } catch (error) {
            req.log.error('Enable 2FA failed:'+ error);
            reply.status(400).send({ 
                error: error instanceof Error ? error.message : 'Failed to enable 2FA' 
            });
        }
    }

    /**
     * POST /api/users/me/2fa/disable - Disable 2FA with verification
     */
    async disable2FA(req: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
        const { token } = req.body as { token: string };

        if (!token) {
            reply.status(400).send({ error: 'Verification token is required' });
            return;
        }

        try {
            if (!req.userId) {
                reply.status(401).send({ error: 'User not authenticated' });
                return;
            }

            await this.disable2FAUseCase.execute(req.userId, token);
            
            reply.send({
                success: true,
                message: '2FA has been disabled successfully'
            });

        } catch (error) {
            req.log.error('Disable 2FA failed:'+ error);
            reply.status(400).send({ 
                error: error instanceof Error ? error.message : 'Failed to disable 2FA' 
            });
        }
    }
}
