import { vi } from 'vitest';
import type { IPasswordHasher, TwoFAService } from '../../src/domain/ports';
import type { JWTService } from '../../src/application/use-cases/auth/login.usecase';

export function createMockPasswordHasher(): IPasswordHasher {
    return {
        hash: vi.fn(),
        verify: vi.fn(),
    };
}

export function createMockJWTService(): JWTService {
    return {
        getJWTConfig: vi.fn(),
    };
}

export function createMockTwoFAService(): TwoFAService {
    return {
        generateSecret: vi.fn(),
        generateQRCode: vi.fn(),
        verifyToken: vi.fn(),
    };
}
