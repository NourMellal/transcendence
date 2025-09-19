import { TwoFAService } from '../../domain/ports.js';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export class OtpTwoFAService implements TwoFAService {
    generateSecret(): string {
        return authenticator.generateSecret();
    }

    async generateQRCode(secret: string, label: string): Promise<string> {
        const otpauth = authenticator.keyuri(label, 'Transcendence', secret);
        return await QRCode.toDataURL(otpauth);
    }

    verifyToken(secret: string, token: string): boolean {
        try {
            return authenticator.verify({ token, secret });
        } catch (error) {
            return false;
        }
    }
}
