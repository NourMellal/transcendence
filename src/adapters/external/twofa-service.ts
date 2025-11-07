import { TwoFAService } from '../../domain/user/ports';

// MOCK IMPLEMENTATION - Replace with real otplib integration for production
export class OtpTwoFAService implements TwoFAService {
  constructor(private otplib: any) {
    // TODO: Install and use real otplib package
    // For now, otplib is null in mock mode
  }

  generateSecret(): string {
    // MOCK: In production, use otplib.authenticator.generateSecret()
    console.log('MOCK: Generating 2FA secret');
    return 'MOCK_SECRET_' + Math.random().toString(36).substring(2, 15);
  }

  async generateQRCode(secret: string, username: string): Promise<string> {
    // MOCK: In production, generate real QR code with otplib and qrcode library
    console.log(`MOCK: Generating QR code for user ${username} with secret ${secret}`);
    // In production: const otpauth = this.otplib.authenticator.keyuri(username, 'Transcendence', secret);
    return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==`; // Mock base64 QR code
  }

  verifyToken(secret: string, token: string): boolean {
    // MOCK: In production, use otplib.authenticator.verify({ token, secret })
    console.log(`MOCK: Verifying token ${token} with secret ${secret}`);
    return token === '123456'; // Mock verification - always accept '123456' for testing
  }
}
