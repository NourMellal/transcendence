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

export async function loadChatServiceConfig(): Promise<ChatServiceConfig> {
    try {
        const vault = createChatServiceVault();
        await vault.initialize();

        const [jwtConfig, internalApiKey] = await Promise.all([
            vault.getJWTConfig(),
            vault.getInternalApiKey()
        ]);

        if (!internalApiKey) {
            throw new Error('INTERNAL_API_KEY not found in Vault. Run: pnpm vault:setup');
        }

        return {
            port: getEnvVarAsNumber('CHAT_SERVICE_PORT', 3003),
            databasePath: resolveDatabaseFilePath(),
            internalApiKey,
            jwtSecret: jwtConfig.secretKey,
            userServiceBaseUrl: process.env.USER_SERVICE_URL || 'http://user-service:3001',
            gameServiceBaseUrl: process.env.GAME_SERVICE_URL || 'http://game-service:3002'
        };
    } catch (error) {
        const err = error as Error;
        console.error('[chat-service] CRITICAL: Failed to load config from Vault:', err.message);
        console.error('Run: pnpm vault:setup');
        throw error;
    }
}
