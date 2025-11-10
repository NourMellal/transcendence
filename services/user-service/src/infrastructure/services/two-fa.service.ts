import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import type { TwoFAService } from '../../domain/ports.js';

export class TotpTwoFAService implements TwoFAService {
    constructor(private readonly issuer = 'Transcendence') {
        authenticator.options = {
            step: 30,
            digits: 6,
        };
    }

    generateSecret(): string {
        return authenticator.generateSecret(32);
    }

    async generateQRCode(secret: string, label: string): Promise<string> {
        const otpauth = authenticator.keyuri(label, this.issuer, secret);
        return QRCode.toDataURL(otpauth);
    }

    verifyToken(secret: string, token: string): boolean {
        return authenticator.verify({ secret, token });
    }
}

export const createTwoFAService = () => new TotpTwoFAService();
