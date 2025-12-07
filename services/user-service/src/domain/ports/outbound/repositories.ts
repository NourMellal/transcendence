import type { User, Session } from '../../entities/user.entity';
import type { Friendship, FriendshipStatus } from '../../entities/friendship.entity';
import type { UserPresence, PresenceStatus } from '../../entities/presence.entity';

export interface UserRepository {
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findByUsername(username: string): Promise<User | null>;
    findByDisplayName(displayName: string): Promise<User | null>;
    search(query: string, limit?: number): Promise<User[]>;
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

export interface UserPresenceRepository {
    upsert(userId: string, status: PresenceStatus, lastSeenAt: Date): Promise<void>;
    findByUserId(userId: string): Promise<UserPresence | null>;
    markOffline(userId: string, lastSeenAt: Date): Promise<void>;
}

export interface UnitOfWork {
    withTransaction<T>(handler: () => Promise<T>): Promise<T>;
}
