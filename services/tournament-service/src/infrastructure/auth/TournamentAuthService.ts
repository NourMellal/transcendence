import jwt, { JwtPayload } from 'jsonwebtoken';
import { createTournamentServiceVault, JWTConfig } from '@transcendence/shared-utils';

export interface AuthContext {
    readonly userId: string;
    readonly claims: JwtPayload;
}

export class TournamentAuthService {
    private readonly vault = createTournamentServiceVault();
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

    async verifyToken(token: string): Promise<AuthContext> {
        const config = await this.loadConfig();

        const claims = jwt.verify(token, config.secretKey, { issuer: config.issuer }) as JwtPayload;
        const userId = (claims.sub ?? claims.userId) as string | undefined;

        if (!userId) {
            throw new Error('Token payload missing user identifier');
        }

        return {
            userId,
            claims,
        };
    }
}
