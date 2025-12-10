import dotenv from 'dotenv';
import { join } from 'path';
import { createChatServiceVault, getEnvVarAsNumber } from '@transcendence/shared-utils';

dotenv.config({ path: join(__dirname, '../../../.env') });

export interface ChatServiceConfig {
    readonly port: number;
    readonly databasePath: string;
    readonly internalApiKey?: string;
    readonly jwtSecret: string;
    readonly userServiceBaseUrl: string;
    readonly gameServiceBaseUrl: string;
}

function resolveDatabaseFilePath(): string {
    return process.env.CHAT_SERVICE_DB_PATH || process.env.CHAT_DB_PATH || join(process.cwd(), 'data', 'chat-service.db');
}

function buildEnvFallback(): ChatServiceConfig {
    return {
        port: getEnvVarAsNumber('CHAT_SERVICE_PORT', 3003),
        databasePath: resolveDatabaseFilePath(),
        internalApiKey: process.env.INTERNAL_API_KEY,
        jwtSecret: process.env.JWT_SECRET || 'fallback-jwt-secret-for-development',
        userServiceBaseUrl: process.env.USER_SERVICE_URL || 'http://user-service:3001',
        gameServiceBaseUrl: process.env.GAME_SERVICE_URL || 'http://game-service:3002'
    };
}

export async function loadChatServiceConfig(): Promise<ChatServiceConfig> {
    try {
        const vault = createChatServiceVault();
        await vault.initialize();

        const [jwtConfig, internalApiKey] = await Promise.all([
            vault.getJWTConfig(),
            vault.getInternalApiKey()
        ]);

        if (!internalApiKey) {
            console.warn('[chat-service] INTERNAL_API_KEY not found in Vault or environment.');
        }

        return {
            port: getEnvVarAsNumber('CHAT_SERVICE_PORT', 3003),
            databasePath: resolveDatabaseFilePath(),
            internalApiKey: internalApiKey ?? undefined,
            jwtSecret: jwtConfig.secretKey,
            userServiceBaseUrl: process.env.USER_SERVICE_URL || 'http://user-service:3001',
            gameServiceBaseUrl: process.env.GAME_SERVICE_URL || 'http://game-service:3002'
        };
    } catch (error) {
        const err = error as Error;
        console.warn('Vault not available, falling back to environment variables:', err.message);
        return buildEnvFallback();
    }
}
