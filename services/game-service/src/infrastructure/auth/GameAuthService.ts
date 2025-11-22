import jwt, { JwtPayload } from 'jsonwebtoken';
import { createGameServiceVault, JWTConfig } from '@transcendence/shared-utils';

export interface AuthContext {
    readonly playerId: string;
    readonly claims: JwtPayload;
}

export class GameAuthService {
    private readonly vault = createGameServiceVault();
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
                expirationHours: Number(process.env.JWT_EXPIRATION_HOURS ?? '24'),
            };
        }

        return this.jwtConfig;
    }

    async verifyToken(token: string): Promise<AuthContext> {
        const config = await this.loadConfig();

        const claims = jwt.verify(token, config.secretKey, { issuer: config.issuer }) as JwtPayload;
        const playerId = (claims.sub ?? claims.userId) as string | undefined;

        if (!playerId) {
            throw new Error('Token payload missing player identifier');
        }

        return {
            playerId,
            claims,
        };
    }
}
