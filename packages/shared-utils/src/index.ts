// Inline ApiResponse type (removed shared-types dependency)
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Export constants
export * from './constants';

// Response builders
export const createSuccessResponse = <T>(data: T, message?: string): ApiResponse<T> => ({
    success: true,
    data,
    message
});

export const createErrorResponse = (error: string, message?: string): ApiResponse => ({
    success: false,
    error,
    message
});

// ID generators
export const generateId = (): string => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const generateSessionToken = (): string => {
    return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
};

// Date utilities
export const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

export const addHours = (date: Date, hours: number): Date => {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
};

// Validation utilities
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const isValidUsername = (username: string): boolean => {
    // Username should be 3-20 characters, alphanumeric and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
};

// Environment utilities
export const getEnvVar = (name: string, defaultValue?: string): string => {
    const value = process.env[name];
    if (!value && !defaultValue) {
        throw new Error(`Environment variable ${name} is required`);
    }
    return value || defaultValue!;
};

export const getEnvVarAsNumber = (name: string, defaultValue?: number): number => {
    const value = process.env[name];
    if (!value && defaultValue === undefined) {
        throw new Error(`Environment variable ${name} is required`);
    }
    const parsed = value ? parseInt(value, 10) : defaultValue!;
    if (isNaN(parsed)) {
        throw new Error(`Environment variable ${name} must be a valid number`);
    }
    return parsed;
};

// Error handling
export class AppError extends Error {
    constructor(
        message: string,
        public statusCode: number = 500,
        public code?: string
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string, public field?: string) {
        super(message, 400, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string) {
        super(`${resource} not found`, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}

// Vault integration exports
export * from './vault/index';
