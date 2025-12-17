import { vi, type Mocked } from 'vitest';
import type {
    FriendshipRepository,
    SessionRepository,
    UserPresenceRepository,
    UserRepository,
} from '../../src/domain/ports';

export function createMockUserRepository(): Mocked<UserRepository> {
    return {
        findById: vi.fn(),
        findByEmail: vi.fn(),
        findByUsername: vi.fn(),
        findByDisplayName: vi.fn(),
        save: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    } as Mocked<UserRepository>;
}

export function createMockFriendshipRepository(): Mocked<FriendshipRepository> {
    return {
        findById: vi.fn(),
        findBetweenUsers: vi.fn(),
        listForUser: vi.fn(),
        listPendingForUser: vi.fn(),
        save: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteAllForUser: vi.fn(),
    } as Mocked<FriendshipRepository>;
}

export function createMockSessionRepository(): Mocked<SessionRepository> {
    return {
        findByToken: vi.fn(),
        findByUserId: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
        deleteAllForUser: vi.fn(),
    } as Mocked<SessionRepository>;
}

export function createMockPresenceRepository(): Mocked<UserPresenceRepository> {
    return {
        upsert: vi.fn(),
        findByUserId: vi.fn(),
        markOffline: vi.fn(),
    } as Mocked<UserPresenceRepository>;
}
