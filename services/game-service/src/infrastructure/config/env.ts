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

function buildEnvFallback(): GameServiceConfig {
    return {
        port: getEnvVarAsNumber('GAME_SERVICE_PORT', 3002),
        scoreLimit: getEnvVarAsNumber('SCORE_LIMIT', 11),
        ballSpeed: getEnvVarAsNumber('BALL_SPEED', 5),
        paddleSpeed: getEnvVarAsNumber('PADDLE_SPEED', 8),
        gameRoomCapacity: getEnvVarAsNumber('GAME_ROOM_CAPACITY', 2),
        gameTimeoutMinutes: getEnvVarAsNumber('GAME_TIMEOUT_MINUTES', 30),
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: getEnvVarAsNumber('REDIS_PORT', 6379),
            password: process.env.REDIS_PASSWORD
        },
        databaseFile: resolveDatabaseFilePath(),
        internalApiKey: process.env.INTERNAL_API_KEY,
        userServiceBaseUrl: process.env.USER_SERVICE_URL || 'http://user-service:3001',
        messaging: createMessagingConfig()
    };
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
            console.warn('[game-service] INTERNAL_API_KEY not found in Vault or environment.');
        }

        return {
            port: getEnvVarAsNumber('GAME_SERVICE_PORT', 3002),
            scoreLimit: gameConfig.scoreLimit ?? 11,
            ballSpeed: gameConfig.ballSpeed ?? 5,
            paddleSpeed: gameConfig.paddleSpeed ?? 8,
            gameRoomCapacity: gameConfig.roomCapacity ?? 2,
            gameTimeoutMinutes: gameConfig.timeoutMinutes ?? 30,
            redis: {
                host: redisConfig.host ?? 'localhost',
                port: redisConfig.port ?? 6379,
                password: redisConfig.password
            },
            databaseFile: resolveDatabaseFilePath(),
            internalApiKey: internalApiKey ?? undefined,
            userServiceBaseUrl: process.env.USER_SERVICE_URL || 'http://user-service:3001',
            messaging: createMessagingConfig()
        };
    } catch (error) {
        const err = error as Error;
        console.warn('Vault not available, falling back to environment variables:', err.message);
        return buildEnvFallback();
    }
}
