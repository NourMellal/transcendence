import crypto from 'crypto';

// Domain Entities
export interface User {
    id: string;
    email: string;
    username: string;
    passwordHash?: string; // Optional for OAuth users
    displayName?: string;
    avatar?: string;
    twoFASecret?: string;
    is2FAEnabled: boolean;
    oauthProvider?: 'local' | '42';
    oauthId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Session {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
}

// Friends System Entities
export interface Friendship {
    id: string;
    requesterId: string;  // User who sent the friend request
    addresseeId: string;  // User who received the friend request
    status: FriendshipStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface FriendRequest {
    id: string;
    fromUserId: string;
    toUserId: string;
    message?: string;
    status: FriendRequestStatus;
    createdAt: Date;
    updatedAt: Date;
}

export enum FriendshipStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    BLOCKED = 'BLOCKED',
    DECLINED = 'DECLINED'
}

export enum FriendRequestStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    DECLINED = 'DECLINED',
    CANCELLED = 'CANCELLED'
}

// Domain Value Objects
export class UserId {
    constructor(public readonly value: string) {
        if (!value || value.trim().length === 0) {
            throw new Error('User ID cannot be empty');
        }
    }
}

export class Email {
    constructor(public readonly value: string) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            throw new Error('Invalid email format');
        }
    }
}

export class Username {
    constructor(public readonly value: string) {
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(value)) {
            throw new Error('Username must be 3-20 characters, alphanumeric and underscores only');
        }
    }
}

/**
 * Simple password hashing using Node.js crypto (scrypt)
 */
export class PasswordHelper {
    private static readonly SALT_LENGTH = 16;
    private static readonly KEY_LENGTH = 64;

    static async hash(password: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const salt = crypto.randomBytes(this.SALT_LENGTH).toString('hex');

            crypto.scrypt(password, salt, this.KEY_LENGTH, (err, derivedKey) => {
                if (err) reject(err);
                resolve(salt + ':' + derivedKey.toString('hex'));
            });
        });
    }

    static async verify(password: string, hash: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const [salt, key] = hash.split(':');

            crypto.scrypt(password, salt, this.KEY_LENGTH, (err, derivedKey) => {
                if (err) reject(err);
                resolve(key === derivedKey.toString('hex'));
            });
        });
    }
}

/**
 * Simple user factory
 */
export function createUser(data: {
    email: string;
    username: string;
    passwordHash?: string;
    displayName?: string;
    oauthProvider?: 'local' | '42';
    oauthId?: string;
}): User {
    return {
        id: crypto.randomUUID(),
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
        displayName: data.displayName || data.username,
        avatar: undefined,
        twoFASecret: undefined,
        is2FAEnabled: false,
        oauthProvider: data.oauthProvider || 'local',
        oauthId: data.oauthId,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
