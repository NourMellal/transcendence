import { User, Session } from './entities';

// Repository ports (outbound)
export interface UserRepository {
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findByUsername(username: string): Promise<User | null>;
    save(user: User): Promise<void>;
    update(id: string, updates: Partial<User>): Promise<void>;
    delete(id: string): Promise<void>;
}

export interface SessionRepository {
    findByToken(token: string): Promise<Session | null>;
    findByUserId(userId: string): Promise<Session[]>;
    save(session: Session): Promise<void>;
    delete(token: string): Promise<void>;
    deleteAllForUser(userId: string): Promise<void>;
}

// External service ports (outbound)
export interface TwoFAService {
    generateSecret(): string;
    generateQRCode(secret: string, label: string): Promise<string>;
    verifyToken(secret: string, token: string): boolean;
}

export interface ImageStorageService {
    saveImage(buffer: Buffer, filename: string): Promise<string>;
    deleteImage(path: string): Promise<void>;
    getImageUrl(path: string): string;
}

export interface OAuthService {
    getAuthorizationUrl(state: string): string;
    exchangeCodeForProfile(code: string): Promise<OAuth42Profile>;
}

export interface OAuth42Profile {
    id: number;
    email: string;
    login: string;
    first_name: string;
    last_name: string;
    image: {
        link: string;
    };
}

// Use case ports (inbound)
export interface GetUserUseCase {
    execute(userId: string): Promise<User | null>;
}

export interface UpdateProfileUseCase {
    execute(userId: string, updates: {
        username?: string;
        displayName?: string;
        avatar?: Buffer;
    }): Promise<User>;
}

export interface Generate2FAUseCase {
    execute(userId: string): Promise<{
        secret: string;
        qrCodeUrl: string;
    }>;
}

export interface Enable2FAUseCase {
    execute(userId: string, token: string): Promise<void>;
}

export interface Disable2FAUseCase {
    execute(userId: string, token: string): Promise<void>;
}

export interface Verify2FAUseCase {
    execute(userId: string, token: string): Promise<boolean>;
}

export interface AuthenticateUserUseCase {
    execute(sessionToken: string): Promise<User | null>;
}

export interface OAuth42LoginUseCase {
    execute(): Promise<string>; // Returns authorization URL
}

export interface OAuth42CallbackUseCase {
    execute(code: string, state: string): Promise<{
        user: User;
        sessionToken: string;
    }>;
}
