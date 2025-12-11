import crypto from 'crypto';

/**
 * Simple in-memory OAuth state manager with TTL support.
 * Keeps track of OAuth `state` values between login and callback.
 */
export class OAuthStateManager {
    private readonly states = new Map<string, number>();
    private readonly ttlMs: number;

    constructor(ttlMinutes = 10) {
        this.ttlMs = ttlMinutes * 60 * 1000;
    }

    /**
     * Generate and store a short-lived state token.
     */
    createState(): string {
        const state = crypto.randomBytes(16).toString('hex');
        this.states.set(state, Date.now() + this.ttlMs);
        this.cleanupExpired();
        return state;
    }

    /**
     * Validate and consume a state token.
     */
    consumeState(state: string | undefined): boolean {
        if (!state) {
            return false;
        }

        const expiresAt = this.states.get(state);
        if (!expiresAt) {
            return false;
        }

        this.states.delete(state);
        if (Date.now() > expiresAt) {
            return false;
        }

        return true;
    }

    private cleanupExpired(): void {
        const now = Date.now();
        for (const [state, expiresAt] of this.states.entries()) {
            if (expiresAt <= now) {
                this.states.delete(state);
            }
        }
    }
}
