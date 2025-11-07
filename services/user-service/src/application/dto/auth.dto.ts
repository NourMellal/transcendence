import type { User } from '../../domain/entities/user.entity.js';

/**
 * Authentication DTOs
 * Data Transfer Objects for auth-related operations
 */

// Request DTOs
export interface SignupRequestDTO {
    email: string;
    username: string;
    password: string;
    displayName?: string;
}

export interface LoginRequestDTO {
    email: string;
    password: string;
    totpCode?: string;
}

export interface Enable2FARequestDTO {
    token: string;
}

export interface Disable2FARequestDTO {
    token: string;
}

// Response DTOs
export interface AuthResponseDTO {
    user: UserInfoDTO;
    accessToken: string;
    message: string;
}

export interface UserInfoDTO {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    avatar?: string;
    is2FAEnabled: boolean;
}

export interface AuthStatusResponseDTO {
    authenticated: boolean;
    user: UserInfoDTO;
}

export interface LogoutResponseDTO {
    message: string;
}

// Use Case Input/Output DTOs
export interface SignupUseCaseInput {
    email: string;
    username: string;
    password: string;
    displayName?: string;
}

export interface LoginUseCaseInput {
    email: string;
    password: string;
    totpCode?: string;
}

export interface LoginUseCaseOutput {
    user: User;
    accessToken: string;
}
