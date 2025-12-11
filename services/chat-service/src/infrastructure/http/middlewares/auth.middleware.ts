import { FastifyRequest, FastifyReply } from 'fastify';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { createChatServiceVault, JWTConfig } from '@transcendence/shared-utils';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      username: string;
      email: string;
    };
  }
}

class ChatAuthService {
  private readonly vault = createChatServiceVault();
  private jwtConfig: JWTConfig | null = null;

  private async loadConfig(): Promise<JWTConfig> {
    if (this.jwtConfig) {
      return this.jwtConfig;
    }

    try {
      await this.vault.initialize();
      this.jwtConfig = await this.vault.getJWTConfig();
    } catch (error) {
      console.warn('Vault unavailable for JWT config, using environment fallback:', (error as Error).message);
      this.jwtConfig = {
        secretKey: process.env.JWT_SECRET || 'fallback-jwt-secret-for-development',
        issuer: process.env.JWT_ISSUER || 'transcendence',
        expirationHours: Number(process.env.JWT_EXPIRATION_HOURS ?? '0.25'),
      };
    }

    return this.jwtConfig;
  }

  async verifyToken(token: string): Promise<{ userId: string; username: string; email: string; claims: JwtPayload }> {
    const config = await this.loadConfig();

    const claims = jwt.verify(token, config.secretKey, { issuer: config.issuer }) as JwtPayload;
    const userId = (claims.sub ?? claims.userId) as string | undefined;
    const username = claims.username as string | undefined;
    const email = claims.email as string | undefined;

    if (!userId) {
      throw new Error('Token payload missing user identifier');
    }

    return {
      userId,
      username: username || '',
      email: email || '',
      claims,
    };
  }
}

const authService = new ChatAuthService();

export async function createAuthMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const { userId, username, email } = await authService.verifyToken(token);
    
    request.user = {
      id: userId,
      username: username,
      email: email
    };

  } catch (error) {
    const err = error as Error;
    if (err.name === 'TokenExpiredError') {
      return reply.code(401).send({ error: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return reply.code(401).send({ error: 'Invalid token' });
    }
    return reply.code(401).send({ error: 'Authentication failed' });
  }
}
