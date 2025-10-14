/**
 * Production-Ready Vault Client Implementation
 * 
 * Comprehensive Vault client with authentication, caching, retry logic,
 * and production-grade error handling for Transcendence microservices
 */

import {
    VaultConfig,
    VaultSecret,
    VaultAuthResponse,
    VaultListResponse,
    CacheEntry,
    VaultMetrics,
    IVaultClient
} from './types.js';

export class VaultClient implements IVaultClient {
    private config: Required<VaultConfig>;
    private currentToken?: string;
    private tokenExpiresAt?: Date;
    private cache = new Map<string, CacheEntry>();
    private metrics: VaultMetrics = {
        totalRequests: 0,
        cacheHitRate: 0,
        avgResponseTime: 0,
        authRenewals: 0,
        errorRate: 0,
    };
    private tokenRenewalTimer?: NodeJS.Timeout;
    private initialized = false;

    constructor(config: VaultConfig) {
        // Apply defaults
        this.config = {
            address: config.address,
            authMethod: config.authMethod,
            token: config.token || '',
            appRole: config.appRole || { roleId: '', secretId: '', mountPath: 'approle' },
            timeout: config.timeout ?? 5000,
            maxRetries: config.maxRetries ?? 3,
            retryDelay: config.retryDelay ?? 1000,
            enableCache: config.enableCache ?? true,
            cacheTtl: config.cacheTtl ?? 300,
            tls: {
                skipVerify: config.tls?.skipVerify ?? false,
                caCert: config.tls?.caCert,
                clientCert: config.tls?.clientCert,
                clientKey: config.tls?.clientKey,
            },
            namespace: config.namespace || '',
            debug: config.debug ?? false,
        };

        this.validateConfig();
    }

    private validateConfig(): void {
        if (!this.config.address) {
            throw new Error('Vault address is required');
        }

        if (!this.config.address.startsWith('http')) {
            throw new Error('Vault address must include protocol (http/https)');
        }

        switch (this.config.authMethod) {
            case 'token':
                if (!this.config.token) {
                    throw new Error('Token is required for token authentication');
                }
                break;
            case 'approle':
                if (!this.config.appRole?.roleId || !this.config.appRole?.secretId) {
                    throw new Error('roleId and secretId are required for AppRole authentication');
                }
                break;
        }
    }

    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        this.log('Initializing Vault client...');

        try {
            await this.authenticate();
            await this.setupTokenRenewal();
            this.initialized = true;
            this.log('Vault client initialized successfully');
        } catch (error) {
            this.log('Failed to initialize Vault client:', error);
            throw error;
        }
    }

    private async authenticate(): Promise<void> {
        this.log(`Authenticating with method: ${this.config.authMethod}`);

        switch (this.config.authMethod) {
            case 'token':
                await this.authenticateWithToken();
                break;
            case 'approle':
                await this.authenticateWithAppRole();
                break;
        }

        this.metrics.lastAuthTime = new Date();
        this.metrics.authRenewals++;
    }

    private async authenticateWithToken(): Promise<void> {
        this.currentToken = this.config.token!;

        // Verify token and get metadata
        try {
            const response = await this.makeRequest('GET', '/v1/auth/token/lookup-self');
            const data = response.data;

            this.tokenExpiresAt = data.expire_time ? new Date(data.expire_time) : undefined;
            this.metrics.tokenExpiresAt = this.tokenExpiresAt;

            this.log('Token authentication successful');
        } catch (error) {
            throw new VaultError('Token authentication failed', { cause: error as Error });
        }
    }

    private async authenticateWithAppRole(): Promise<void> {
        const { roleId, secretId, mountPath = 'approle' } = this.config.appRole!;

        try {
            const response = await this.makeRequest('POST', `/v1/auth/${mountPath}/login`, {
                role_id: roleId,
                secret_id: secretId,
            });

            const authData: VaultAuthResponse = response.auth;
            this.currentToken = authData.clientToken;

            if (authData.leaseDuration) {
                this.tokenExpiresAt = new Date(Date.now() + authData.leaseDuration * 1000);
                this.metrics.tokenExpiresAt = this.tokenExpiresAt;
            }

            this.log('AppRole authentication successful');
        } catch (error) {
            throw new VaultError('AppRole authentication failed', { cause: error as Error });
        }
    }

    private async setupTokenRenewal(): Promise<void> {
        if (!this.tokenExpiresAt) {
            this.log('Token has no expiration, skipping renewal setup');
            return;
        }

        // Renew token when 80% of TTL has passed
        const renewAt = this.tokenExpiresAt.getTime() - Date.now();
        const renewalTime = Math.max(renewAt * 0.8, 60000); // At least 1 minute

        this.log(`Setting up token renewal in ${Math.round(renewalTime / 1000)} seconds`);

        this.tokenRenewalTimer = setTimeout(async () => {
            try {
                await this.renewToken();
                await this.setupTokenRenewal(); // Setup next renewal
            } catch (error) {
                this.log('Token renewal failed, attempting re-authentication:', error);
                try {
                    await this.authenticate();
                    await this.setupTokenRenewal();
                } catch (authError) {
                    this.log('Re-authentication failed:', authError);
                    // Let the error propagate to the application
                }
            }
        }, renewalTime);
    }

    async renewToken(): Promise<void> {
        if (!this.currentToken) {
            throw new VaultError('No token to renew');
        }

        try {
            const response = await this.makeRequest('POST', '/v1/auth/token/renew-self');
            const authData = response.auth;

            if (authData.leaseDuration) {
                this.tokenExpiresAt = new Date(Date.now() + authData.leaseDuration * 1000);
                this.metrics.tokenExpiresAt = this.tokenExpiresAt;
            }

            this.metrics.authRenewals++;
            this.log('Token renewed successfully');
        } catch (error) {
            throw new VaultError('Token renewal failed', { cause: error as Error });
        }
    }

    async getSecret(path: string, version?: number): Promise<VaultSecret> {
        await this.ensureInitialized();

        const cacheKey = `${path}:${version || 'latest'}`;

        // Check cache first
        if (this.config.enableCache) {
            const cached = this.getCachedValue<VaultSecret>(cacheKey);
            if (cached) {
                this.updateCacheMetrics(true);
                return cached;
            }
        }

        const secretPath = this.buildSecretPath(path, version);

        try {
            const response = await this.makeRequest('GET', secretPath);
            const secret: VaultSecret = {
                data: response.data.data || response.data,
                metadata: response.data.metadata || {},
                lease: response.lease_id ? {
                    id: response.lease_id,
                    duration: response.lease_duration,
                    renewable: response.renewable,
                } : undefined,
            };

            // Cache the result
            if (this.config.enableCache) {
                this.setCachedValue(cacheKey, secret);
            }

            this.updateCacheMetrics(false);
            return secret;
        } catch (error) {
            throw new VaultError(`Failed to get secret at path: ${path}`, { cause: error as Error });
        }
    }

    async getSecretValue<T = string>(
        path: string,
        key: string,
        defaultValue?: T
    ): Promise<T> {
        try {
            const secret = await this.getSecret(path);
            const value = secret.data[key];

            if (value === undefined || value === null) {
                if (defaultValue !== undefined) {
                    return defaultValue;
                }
                throw new VaultError(`Key '${key}' not found in secret at path: ${path}`);
            }

            return value as T;
        } catch (error) {
            if (defaultValue !== undefined) {
                this.log(`Failed to get secret value, using default: ${error}`);
                return defaultValue;
            }
            throw error;
        }
    }

    async putSecret(path: string, data: Record<string, any>): Promise<void> {
        await this.ensureInitialized();

        const secretPath = this.buildSecretPath(path);

        try {
            await this.makeRequest('POST', secretPath, { data });

            // Invalidate cache for this path
            if (this.config.enableCache) {
                this.invalidateCache(path);
            }
        } catch (error) {
            throw new VaultError(`Failed to put secret at path: ${path}`, { cause: error as Error });
        }
    }

    async deleteSecret(path: string, versions?: number[]): Promise<void> {
        await this.ensureInitialized();

        const secretPath = versions
            ? this.buildSecretPath(path, 'delete')
            : this.buildSecretPath(path, 'metadata');

        const body = versions ? { versions } : undefined;

        try {
            await this.makeRequest('DELETE', secretPath, body);

            // Invalidate cache for this path
            if (this.config.enableCache) {
                this.invalidateCache(path);
            }
        } catch (error) {
            throw new VaultError(`Failed to delete secret at path: ${path}`, { cause: error as Error });
        }
    }

    async listSecrets(path: string): Promise<VaultListResponse> {
        await this.ensureInitialized();

        const listPath = `/v1/${path}?list=true`;

        try {
            const response = await this.makeRequest('GET', listPath);
            return {
                keys: response.data.keys || [],
            };
        } catch (error) {
            throw new VaultError(`Failed to list secrets at path: ${path}`, { cause: error as Error });
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            await this.makeRequest('GET', '/v1/sys/health');
            return true;
        } catch (error) {
            this.log('Health check failed:', error);
            return false;
        }
    }

    getMetrics(): VaultMetrics {
        return { ...this.metrics };
    }

    clearCache(): void {
        this.cache.clear();
        this.log('Cache cleared');
    }

    async shutdown(): Promise<void> {
        if (this.tokenRenewalTimer) {
            clearTimeout(this.tokenRenewalTimer);
            this.tokenRenewalTimer = undefined;
        }

        this.clearCache();
        this.initialized = false;
        this.log('Vault client shutdown complete');
    }

    // Private helper methods

    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    private buildSecretPath(path: string, operation?: string | number): string {
        // Handle KV v2 secrets engine paths
        if (path.startsWith('secret/')) {
            const basePath = path.replace('secret/', '');

            if (typeof operation === 'number') {
                return `/v1/secret/data/${basePath}?version=${operation}`;
            } else if (operation === 'metadata') {
                return `/v1/secret/metadata/${basePath}`;
            } else if (operation === 'delete') {
                return `/v1/secret/delete/${basePath}`;
            } else {
                return `/v1/secret/data/${basePath}`;
            }
        }

        return `/v1/${path}`;
    }

    private async makeRequest(
        method: string,
        path: string,
        body?: any
    ): Promise<any> {
        const startTime = Date.now();
        this.metrics.totalRequests++;

        const url = `${this.config.address}${path}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (this.currentToken) {
            headers['X-Vault-Token'] = this.currentToken;
        }

        if (this.config.namespace) {
            headers['X-Vault-Namespace'] = this.config.namespace;
        }

        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), this.config.timeout);

        const requestOptions: RequestInit = {
            method,
            headers,
            signal: abortController.signal,
        };

        if (body) {
            requestOptions.body = JSON.stringify(body);
        }

        let lastError: Error;

        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                this.log(`${method} ${path} (attempt ${attempt + 1})`);

                const response = await fetch(url, requestOptions);
                clearTimeout(timeoutId);
                const responseTime = Date.now() - startTime;

                this.updateResponseTimeMetrics(responseTime);

                if (!response.ok) {
                    const errorBody = await response.text();
                    let errorData;

                    try {
                        errorData = JSON.parse(errorBody);
                    } catch {
                        errorData = { errors: [errorBody] };
                    }

                    const vaultError = new VaultError(
                        `Vault request failed: ${response.status} ${response.statusText}`,
                        {
                            status: response.status,
                            errors: errorData.errors,
                            url,
                            retryable: this.isRetryableStatus(response.status),
                        }
                    );

                    if (!vaultError.retryable || attempt === this.config.maxRetries) {
                        this.metrics.errorRate =
                            (this.metrics.errorRate * this.metrics.totalRequests + 1) /
                            (this.metrics.totalRequests + 1);
                        throw vaultError;
                    }

                    lastError = vaultError;
                } else {
                    const responseData = await response.json();
                    this.log(`Request successful in ${responseTime}ms`);
                    return responseData;
                }
            } catch (error) {
                clearTimeout(timeoutId);
                lastError = error as Error;

                if (attempt === this.config.maxRetries) {
                    this.metrics.errorRate =
                        (this.metrics.errorRate * this.metrics.totalRequests + 1) /
                        (this.metrics.totalRequests + 1);
                    throw lastError;
                }
            }

            // Wait before retry
            if (attempt < this.config.maxRetries) {
                const delay = this.config.retryDelay * Math.pow(2, attempt);
                this.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError!;
    }

    private isRetryableStatus(status: number): boolean {
        return status >= 500 || status === 429; // Server errors and rate limiting
    }

    private getCachedValue<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    private setCachedValue<T>(key: string, data: T): void {
        const expiresAt = Date.now() + (this.config.cacheTtl * 1000);
        const entry: CacheEntry<T> = {
            data,
            expiresAt,
            createdAt: Date.now(),
        };
        this.cache.set(key, entry);
    }

    private invalidateCache(pathPrefix: string): void {
        for (const [key] of this.cache) {
            if (key.startsWith(pathPrefix)) {
                this.cache.delete(key);
            }
        }
    }

    private updateCacheMetrics(hit: boolean): void {
        const requests = this.metrics.totalRequests;
        const currentHitRate = this.metrics.cacheHitRate;

        this.metrics.cacheHitRate =
            (currentHitRate * requests + (hit ? 1 : 0)) / (requests + 1);
    }

    private updateResponseTimeMetrics(responseTime: number): void {
        const requests = this.metrics.totalRequests;
        const currentAvg = this.metrics.avgResponseTime;

        this.metrics.avgResponseTime =
            (currentAvg * requests + responseTime) / (requests + 1);
    }

    private log(message: string, ...args: any[]): void {
        if (this.config.debug) {
            console.log(`[VaultClient] ${message}`, ...args);
        }
    }
}

/**
 * Create a VaultError with enhanced properties
 */
class VaultError extends Error implements VaultError {
    status?: number;
    errors?: string[];
    url?: string;
    retryable?: boolean;

    constructor(
        message: string,
        options?: {
            status?: number;
            errors?: string[];
            url?: string;
            retryable?: boolean;
            cause?: Error;
        }
    ) {
        super(message, { cause: options?.cause });
        this.name = 'VaultError';
        this.status = options?.status;
        this.errors = options?.errors;
        this.url = options?.url;
        this.retryable = options?.retryable;
    }
}