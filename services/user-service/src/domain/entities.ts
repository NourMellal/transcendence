// Domain entity
export interface User {
    id: string;
    email: string;
    username: string;
    passwordHash?: string;
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

// Domain value objects
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
