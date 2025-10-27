import jwt from 'jsonwebtoken';

export interface JWTService {
    generateToken(payload: any): string;
    verifyToken(token: string): any;
}

export class JWTServiceImpl implements JWTService {
    constructor(
        private readonly secretKey: string,
        private readonly issuer: string,
        private readonly expirationHours: number
    ) {}

    /**
     * Generate JWT token
     */
    generateToken(payload: { userId: string; email: string; username: string }): string {
        return jwt.sign(
            {
                ...payload,
                iss: this.issuer,
                iat: Math.floor(Date.now() / 1000),
            },
            this.secretKey,
            {
                expiresIn: `${this.expirationHours}h`,
            }
        );
    }

    /**
     * Verify and decode JWT token
     */
    verifyToken(token: string): any {
        try {
            return jwt.verify(token, this.secretKey);
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }
}
