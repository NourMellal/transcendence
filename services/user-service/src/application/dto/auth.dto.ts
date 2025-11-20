export interface SignupRequestDTO {
    readonly email: string;
    readonly username: string;
    readonly password: string;
    readonly displayName?: string;
}

export type SignupUseCaseInputDTO = SignupRequestDTO;

export interface SignupResponseDTO {
    readonly id: string;
    readonly email: string;
    readonly username: string;
    readonly displayName: string;
    readonly avatar?: string;
    readonly is2FAEnabled: boolean;
    readonly createdAt: string;
}

export interface LoginRequestDTO {
    readonly email: string;
    readonly password: string;
    readonly totpCode?: string;
}

export type LoginUseCaseInputDTO = LoginRequestDTO;

export interface UserInfoDTO {
    readonly id: string;
    readonly email: string;
    readonly username: string;
    readonly displayName?: string;
    readonly avatar?: string;
    readonly is2FAEnabled: boolean;
}

export interface AuthResponseDTO {
    readonly user: UserInfoDTO;
    readonly accessToken: string;
    readonly refreshToken: string;
    readonly message: string;
}

export type LoginUseCaseOutputDTO = AuthResponseDTO;

export interface AuthStatusResponseDTO {
    readonly authenticated: boolean;
    readonly user?: UserInfoDTO;
}

export interface LogoutResponseDTO {
    readonly message: string;
}

export interface LogoutInputDTO {
    readonly userId: string;
    readonly refreshToken?: string;
}

export interface AuthStatusInputDTO {
    readonly userId: string;
}

export interface Enable2FARequestDTO {
    readonly token: string;
}

export interface Enable2FAInputDTO extends Enable2FARequestDTO {
    readonly userId: string;
}

export interface Disable2FARequestDTO {
    readonly token: string;
}

export interface Disable2FAInputDTO extends Disable2FARequestDTO {
    readonly userId: string;
}

export interface Generate2FAInputDTO {
    readonly userId: string;
}

export interface OAuthLoginResponseDTO {
    readonly authorizationUrl: string;
}

export interface OAuthCallbackRequestDTO {
    readonly code: string;
    readonly state: string;
}

export interface OAuthCallbackResponseDTO {
    readonly sessionToken: string;
    readonly userId: string;
}

export interface RefreshTokenRequestDTO {
    readonly refreshToken: string;
}

export type RefreshTokenResponseDTO = AuthResponseDTO;
