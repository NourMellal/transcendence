export interface TwoFAService {
    generateSecret(): string;
    generateQRCode(secret: string, label: string): Promise<string>;
    verifyToken(secret: string, token: string): boolean;
}

export interface ImageStorageService {
    saveImage(buffer: Buffer, filename: string): Promise<string>;
    deleteImage(path: string): Promise<void>;
    getImageUrl(path: string): string;
}

export interface IPasswordHasher {
    hash(password: string): Promise<string>;
    verify(password: string, hash: string): Promise<boolean>;
}

export interface OAuth42Profile {
    id: number;
    email: string;
    login: string;
    first_name: string;
    last_name: string;
    image: {
        link: string;
    };
}

export interface OAuthService {
    getAuthorizationUrl(state: string): string;
    exchangeCodeForProfile(code: string): Promise<OAuth42Profile>;
}
