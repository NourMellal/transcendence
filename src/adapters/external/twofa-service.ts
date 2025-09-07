import { TwoFAService } from '../../domain/user/ports';

export class OtpTwoFAService implements TwoFAService {
  constructor(private otplib: any) {} // TODO: proper type

  generateSecret(): string {
    return this.otplib.authenticator.generateSecret();
  }

  async generateQRCode(secret: string, username: string): Promise<string> {
    const otpauth = this.otplib.authenticator.keyuri(username, 'Transcendence', secret);
    // Generate QR code from otpauth URL
    return ''; // TODO: implement QR code generation
  }

  verifyToken(secret: string, token: string): boolean {
    return this.otplib.authenticator.verify({ token, secret });
  }
}
