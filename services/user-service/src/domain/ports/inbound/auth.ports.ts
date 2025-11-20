import type {
    AuthResponseDTO,
    AuthStatusInputDTO,
    AuthStatusResponseDTO,
    Disable2FAInputDTO,
    Enable2FAInputDTO,
    Generate2FAInputDTO,
    LoginUseCaseInputDTO,
    LoginUseCaseOutputDTO,
    LogoutInputDTO,
    LogoutResponseDTO,
    OAuthCallbackRequestDTO,
    OAuthCallbackResponseDTO,
    OAuthLoginResponseDTO,
    RefreshTokenRequestDTO,
    RefreshTokenResponseDTO,
    SignupResponseDTO,
    SignupUseCaseInputDTO
} from '../../../application/dto/auth.dto';

export interface ISignupUseCase {
    execute(input: SignupUseCaseInputDTO): Promise<SignupResponseDTO>;
}

export interface ILoginUseCase {
    execute(input: LoginUseCaseInputDTO): Promise<LoginUseCaseOutputDTO>;
}

export interface ILogoutUseCase {
    execute(input: LogoutInputDTO): Promise<LogoutResponseDTO>;
}

export interface IRefreshTokenUseCase {
    execute(input: RefreshTokenRequestDTO): Promise<RefreshTokenResponseDTO>;
}

export interface IAuthStatusUseCase {
    execute(input: AuthStatusInputDTO): Promise<AuthStatusResponseDTO>;
}

export interface IOAuth42LoginUseCase {
    execute(): Promise<OAuthLoginResponseDTO>;
}

export interface IOAuth42CallbackUseCase {
    execute(input: OAuthCallbackRequestDTO): Promise<OAuthCallbackResponseDTO>;
}

export interface IGenerate2FAUseCase {
    execute(input: Generate2FAInputDTO): Promise<{
        readonly secret: string;
        readonly qrCode: string;
    }>;
}

export interface IEnable2FAUseCase {
    execute(input: Enable2FAInputDTO): Promise<void>;
}

export interface IDisable2FAUseCase {
    execute(input: Disable2FAInputDTO): Promise<void>;
}
