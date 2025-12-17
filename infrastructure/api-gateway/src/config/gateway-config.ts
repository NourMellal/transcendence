import { getEnvVar, getEnvVarAsNumber, createAPIGatewayVault } from '@transcendence/shared-utils';

const DEFAULT_SERVICE_URLS = {
    user: 'http://localhost:3001',
    game: 'http://localhost:3002',
    chat: 'http://localhost:3003',
    tournament: 'http://localhost:3004'
} as const;

const DEFAULT_CORS = ['http://localhost:5173'];
const DEFAULT_RATE_LIMIT_MAX = 100;
const DEFAULT_RATE_LIMIT_WINDOW = '1 minute';

export interface GatewayConfig {
    port: number;
    userServiceUrl: string;
    gameServiceUrl: string;
    chatServiceUrl: string;
    tournamentServiceUrl: string;
    rateLimitMax: number;
    rateLimitWindow: string;
    corsOrigins: string[];
    internalApiKey: string;
    usingVault: boolean;
}

export async function loadGatewayConfig(): Promise<GatewayConfig> {
    const vault = createAPIGatewayVault();
    let usingVault = false;
    let internalApiKeyFromVault: string | null = null;

    try {
        await vault.initialize();
        internalApiKeyFromVault = await vault.getInternalApiKey();
        
        if (!internalApiKeyFromVault) {
            throw new Error('INTERNAL_API_KEY not found in Vault');
        }
        
        usingVault = true;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ CRITICAL: API Gateway cannot start without Vault: ${message}`);
        console.error('Run: pnpm vault:setup');
        throw error;
    }

    const corsOrigins =
        parseOriginsInput(process.env.CORS_ORIGINS) ??
        DEFAULT_CORS;

    return {
        port: getEnvVarAsNumber('GATEWAY_PORT', 3000),
        userServiceUrl: getEnvVar('USER_SERVICE_URL', DEFAULT_SERVICE_URLS.user),
        gameServiceUrl: getEnvVar('GAME_SERVICE_URL', DEFAULT_SERVICE_URLS.game),
        chatServiceUrl: getEnvVar('CHAT_SERVICE_URL', DEFAULT_SERVICE_URLS.chat),
        tournamentServiceUrl: getEnvVar('TOURNAMENT_SERVICE_URL', DEFAULT_SERVICE_URLS.tournament),
        rateLimitMax: getEnvVarAsNumber('RATE_LIMIT_MAX', DEFAULT_RATE_LIMIT_MAX),
        rateLimitWindow: getEnvVar('RATE_LIMIT_WINDOW', DEFAULT_RATE_LIMIT_WINDOW),
        corsOrigins,
        internalApiKey: internalApiKeyFromVault,
        usingVault
    };
}

function parseOriginsInput(value: unknown): string[] | undefined {
    if (!value) return undefined;

    if (Array.isArray(value)) {
        const parsed = value
            .map(String)
            .map((origin) => origin.trim())
            .filter(Boolean);
        return parsed.length ? parsed : undefined;
    }

    if (typeof value === 'string') {
        const parsed = value
            .split(/[,;\s]+/)
            .map((origin) => origin.trim())
            .filter(Boolean);
        return parsed.length ? parsed : undefined;
    }

    return undefined;
}
