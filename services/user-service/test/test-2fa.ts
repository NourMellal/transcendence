import { TotpTwoFAService } from '../src/infrastructure/services/two-fa.service';
import { authenticator } from 'otplib';

(async function run() {
    const svc = new TotpTwoFAService();

    const secret = svc.generateSecret();
    console.log('Secret:', secret);

    // Use otplib to generate a token for the secret
    const token = authenticator.generate(secret);
    console.log('Generated token (should verify):', token);

    const ok = svc.verifyToken(secret, token);
    console.log('Verify valid token:', ok);

    const bad = svc.verifyToken(secret, '000000');
    console.log('Verify invalid token (should be false):', bad);

    // Test trimming/format handling
    const spaced = ` ${token} `;
    console.log('Verify token with spaces:', svc.verifyToken(secret, spaced));

    // Test wrong secret
    const otherSecret = svc.generateSecret();
    console.log('Verify token with other secret (should be false):', svc.verifyToken(otherSecret, token));

    process.exit(ok ? 0 : 2);
})();
