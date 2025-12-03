import { getEnvVar, getEnvVarAsNumber, createAPIGatewayVault } from '@transcendence/shared-utils';

const DEFAULT_SERVICE_URLS = {
    user: 'http://localhost:3001',
    game: 'http://localhost:3003',
    chat: 'http://localhost:3004',
    tournament: 'http://localhost:3005'
} as const;

const DEFAULT_CORS = ['http://localhost:3000', 'http://localhost:3002'];
const DEFAULT_RATE_LIMIT_MAX = 100;
const DEFAULT_RATE_LIMIT_WINDOW = '1 minute';

interface NormalizedGatewaySecrets {
    internalApiKey?: string;
    rateLimitMax?: number;
    rateLimitWindow?: string;
    corsOrigins?: string[];
}

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
    let secrets: NormalizedGatewaySecrets = {};
    let internalApiKeyFromVault: string | null = null;

    try {
        await vault.initialize();
        const [serviceConfig, sharedInternalKey] = await Promise.all([
            vault.getServiceConfig(),
            vault.getInternalApiKey()
        ]);
        secrets = normalizeGatewaySecrets(serviceConfig);
        internalApiKeyFromVault = sharedInternalKey;
        usingVault = true;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`⚠️  API Gateway falling back to environment variables (Vault unavailable): ${message}`);
    }

    const internalApiKey = ensureInternalApiKey(
        internalApiKeyFromVault ?? secrets.internalApiKey,
        process.env.INTERNAL_API_KEY
    );
    const corsOrigins =
        secrets.corsOrigins ??
        parseOriginsInput(process.env.CORS_ORIGINS) ??
        DEFAULT_CORS;

    return {
        port: getEnvVarAsNumber('GATEWAY_PORT', 3002),
        userServiceUrl: getEnvVar('USER_SERVICE_URL', DEFAULT_SERVICE_URLS.user),
        gameServiceUrl: getEnvVar('GAME_SERVICE_URL', DEFAULT_SERVICE_URLS.game),
        chatServiceUrl: getEnvVar('CHAT_SERVICE_URL', DEFAULT_SERVICE_URLS.chat),
        tournamentServiceUrl: getEnvVar('TOURNAMENT_SERVICE_URL', DEFAULT_SERVICE_URLS.tournament),
        rateLimitMax: secrets.rateLimitMax ?? getEnvVarAsNumber('RATE_LIMIT_MAX', DEFAULT_RATE_LIMIT_MAX),
        rateLimitWindow: secrets.rateLimitWindow ?? getEnvVar('RATE_LIMIT_WINDOW', DEFAULT_RATE_LIMIT_WINDOW),
        corsOrigins,
        internalApiKey,
        usingVault
    };
}

function normalizeGatewaySecrets(raw: Record<string, unknown> | null | undefined): NormalizedGatewaySecrets {
    if (!raw) {
        return {};
    }

    const pickString = (...keys: string[]): string | undefined => {
        for (const key of keys) {
            const value = raw[key];
            if (typeof value === 'string' && value.trim().length > 0) {
                return value.trim();
            }
        }
        return undefined;
    };

    const pickNumber = (...keys: string[]): number | undefined => {
        for (const key of keys) {
            const numeric = toNumber(raw[key]);
            if (numeric !== undefined) {
                return numeric;
            }
        }
        return undefined;
    };

    return {
        internalApiKey: pickString('internal_api_key', 'internalApiKey'),
        rateLimitMax: pickNumber('rate_limit_max', 'rateLimitMax'),
        rateLimitWindow: pickString('rate_limit_window', 'rateLimitWindow'),
        corsOrigins: parseOriginsInput(raw['cors_origins'] ?? raw['corsOrigins'])
    };
}

function ensureInternalApiKey(fromVault?: string, fromEnv?: string): string {
    const key = (fromVault || fromEnv || '').trim();
    if (!key) {
        throw new Error(
            'INTERNAL_API_KEY is missing. Run `bash infrastructure/vault/simple-setup.sh` or export INTERNAL_API_KEY before starting the gateway.'
        );
    }
    return key;
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

function toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }

    return undefined;
}
