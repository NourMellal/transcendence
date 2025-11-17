import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import type { TwoFAService } from '../../domain/ports';
import type { AuthenticatorOptions } from 'otplib/core';

export class TotpTwoFAService implements TwoFAService {
    constructor(private readonly issuer = 'Transcendence') {
        authenticator.options = {
            step: 30,
            digits: 6,
            window: 1,
        } as AuthenticatorOptions;
    }

    generateSecret(): string {
        // Let otplib choose the default secure length/encoding for the secret
        return authenticator.generateSecret();
    }

    async generateQRCode(secret: string, label: string): Promise<string> {
        const otpauth = authenticator.keyuri(label, this.issuer, secret);
        return QRCode.toDataURL(otpauth);
    }

    verifyToken(secret: string, token: string): boolean {
        if (!secret || !token) return false;

        // Normalize token: ensure it's a string and trim whitespace
        const t = String(token).trim();

        // Basic format check to avoid passing invalid values to otplib
        if (!/^\d{6}$/.test(t)) return false;

        try {
            return authenticator.verify({ secret, token: t });
        } catch (err) {
            // Any unexpected error should be treated as a failed verification
            return false;
        }
    }
}

export const createTwoFAService = () => new TotpTwoFAService();
