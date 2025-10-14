export interface User {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    avatar?: string;
    is2FAEnabled: boolean;
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