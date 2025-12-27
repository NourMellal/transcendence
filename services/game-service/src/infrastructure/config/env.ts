import dotenv from 'dotenv';
import { join } from 'path';
import { createGameServiceVault, getEnvVarAsNumber } from '@transcendence/shared-utils';
import { createMessagingConfig, MessagingConfig } from '../messaging/config/messaging.config';

dotenv.config({ path: join(__dirname, '../../../.env') });

export interface GameServiceConfig {
    readonly port: number;
    readonly scoreLimit: number;
    readonly ballSpeed: number;
    readonly paddleSpeed: number;
    readonly gameRoomCapacity: number;
    readonly gameTimeoutMinutes: number;
    readonly redis: {
        readonly host: string;
        readonly port: number;
        readonly password?: string;
    };
    readonly databaseFile: string;
    readonly internalApiKey?: string;
    readonly userServiceBaseUrl: string;
    readonly messaging: MessagingConfig;
}

function resolveDatabaseFilePath(): string {
    return process.env.GAME_SERVICE_DB_PATH || process.env.GAME_DB_PATH || join(process.cwd(), 'var', 'game-service.db');
}

export async function loadGameServiceConfig(): Promise<GameServiceConfig> {
    try {
        const vault = createGameServiceVault();
        await vault.initialize();
        const [gameConfig, redisConfig, internalApiKey] = await Promise.all([
            vault.getServiceConfig(),
            vault.getDatabaseConfig(),
            vault.getInternalApiKey()
        ]);

        if (!internalApiKey) {
            throw new Error('INTERNAL_API_KEY not found in Vault. Run: pnpm vault:setup');
        }

        return {
            port: getEnvVarAsNumber('GAME_SERVICE_PORT', 3002),
            scoreLimit: gameConfig.scoreLimit ?? 11,
            ballSpeed: gameConfig.ballSpeed ?? 5,
            paddleSpeed: gameConfig.paddleSpeed ?? 8,
            gameRoomCapacity: gameConfig.roomCapacity ?? 2,
            gameTimeoutMinutes: gameConfig.timeoutMinutes ?? 30,
            redis: {
                host: redisConfig.host ?? 'redis',
                port: redisConfig.port ?? 6379,
                password: redisConfig.password
            },
            databaseFile: resolveDatabaseFilePath(),
            internalApiKey,
            userServiceBaseUrl: process.env.USER_SERVICE_URL || 'http://user-service:3001',
            messaging: createMessagingConfig()
        };
    } catch (error) {
        const err = error as Error;
        console.error('[game-service] CRITICAL: Failed to load config from Vault:', err.message);
        console.error('Run: pnpm vault:setup');
        throw error;
    }
}
