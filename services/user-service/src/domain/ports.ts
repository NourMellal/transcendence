import { User, Session } from './entities/user.entity.js';
import type { Friendship, FriendshipStatus } from './entities/friendship.entity.js';
import type { UserPresence, PresenceStatus } from './entities/presence.entity.js';

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

export interface FriendshipRepository {
    findById(id: string): Promise<Friendship | null>;
    findBetweenUsers(userId: string, otherUserId: string): Promise<Friendship | null>;
    listForUser(userId: string, statuses?: FriendshipStatus[]): Promise<Friendship[]>;
    listPendingForUser(userId: string): Promise<Friendship[]>;
    save(friendship: Friendship): Promise<void>;
    update(id: string, updates: Partial<Friendship>): Promise<void>;
    delete(id: string): Promise<void>;
    deleteAllForUser(userId: string): Promise<void>;
}

export interface UnitOfWork {
    withTransaction<T>(handler: () => Promise<T>): Promise<T>;
}

export interface UserPresenceRepository {
    upsert(userId: string, status: PresenceStatus, lastSeenAt: Date): Promise<void>;
    findByUserId(userId: string): Promise<UserPresence | null>;
    markOffline(userId: string, lastSeenAt: Date): Promise<void>;
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
        qrCode: string;
    }>;
}

export interface Enable2FAUseCase {
    execute(userId: string, token: string): Promise<void>;
}

export interface Disable2FAUseCase {
    execute(userId: string, token: string): Promise<void>;
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
