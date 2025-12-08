export interface UpdateProfileRequestDTO {
    readonly displayName?: string;
    readonly avatar?: string;
    readonly email?: string;
    readonly password?: string;
    readonly username?: string;
}

export interface UserProfileDTO {
    readonly id: string;
    readonly email: string;
    readonly username: string;
    readonly displayName?: string;
    readonly avatar?: string;
    readonly is2FAEnabled: boolean;
    readonly oauthProvider?: 'local' | '42';
    readonly status?: 'ONLINE' | 'OFFLINE' | 'INGAME';
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface UpdateProfileResponseDTO {
    readonly id: string;
    readonly email: string;
    readonly username: string;
    readonly displayName?: string;
    readonly avatar?: string;
    readonly is2FAEnabled: boolean;
    readonly oauthProvider?: 'local' | '42';
    readonly updatedAt: string;
    readonly message: string;
}

export interface UpdateProfileInputDTO extends UpdateProfileRequestDTO {
    readonly userId: string;
}

export interface GetUserInputDTO {
    readonly userId: string;
}

export interface DeleteUserInputDTO {
    readonly userId: string;
    readonly reason?: string;
    readonly initiatedBy: string;
}

export interface DeleteUserResponseDTO {
    readonly success: boolean;
}
