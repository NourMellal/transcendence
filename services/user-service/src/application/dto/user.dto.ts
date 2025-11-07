/**
 * User Profile DTOs
 * Data Transfer Objects for user profile operations
 */

// Request DTOs
export interface UpdateProfileRequestDTO {
    displayName?: string;
    avatar?: string;
    email?: string;
    password?: string;
    username?: string;
}

// Response DTOs
export interface UserProfileDTO {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    avatar?: string;
    is2FAEnabled: boolean;
    oauthProvider?: 'local' | '42';
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateProfileResponseDTO {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    avatar?: string;
    is2FAEnabled: boolean;
    oauthProvider?: 'local' | '42';
    updatedAt: Date;
    message: string;
}

// Use Case DTOs
export interface UpdateProfileInput {
    displayName?: string;
    avatar?: string;
    email?: string;
    password?: string;
    username?: string;
}
