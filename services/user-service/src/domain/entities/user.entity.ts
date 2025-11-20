import { DisplayName, Email, UserId, Username } from '../value-objects';

export interface User {
    id: UserId;
    email: Email;
    username: Username;
    passwordHash?: string;
    displayName: DisplayName;
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

interface CreateUserProps {
    id: UserId;
    email: Email;
    username: Username;
    passwordHash?: string;
    displayName?: DisplayName;
    avatar?: string;
    twoFASecret?: string;
    is2FAEnabled?: boolean;
    oauthProvider?: 'local' | '42';
    oauthId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export function createUser(data: CreateUserProps): User {
    return {
        id: data.id,
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
        displayName: data.displayName ?? new DisplayName(data.username.toString()),
        avatar: data.avatar,
        twoFASecret: data.twoFASecret,
        is2FAEnabled: data.is2FAEnabled ?? false,
        oauthProvider: data.oauthProvider ?? 'local',
        oauthId: data.oauthId,
        createdAt: data.createdAt ?? new Date(),
        updatedAt: data.updatedAt ?? new Date(),
    };
}
