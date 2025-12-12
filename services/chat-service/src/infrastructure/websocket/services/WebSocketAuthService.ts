import jwt from 'jsonwebtoken';

interface AuthContext {
    userId: string;
    username: string;
}

export class WebSocketAuthService {
    constructor(private readonly jwtSecret: string) {}

    async verifyToken(token: string): Promise<AuthContext> {
        try {
            const decoded = jwt.verify(token, this.jwtSecret) as any;
            
            return {
                userId: decoded.sub || decoded.userId || decoded.id,
                username: decoded.username || decoded.name || 'anonymous'
            };
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }
}
