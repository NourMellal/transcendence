import { DomainError } from '../errors/domain.error';

export class Password {
    private readonly value: string;

    constructor(password: string) {
        if (!password) {
            throw new DomainError('Password is required');
        }

        if (password.length < 8) {
            throw new DomainError('Password must be at least 8 characters long');
        }

        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
            throw new DomainError('Password must include uppercase, lowercase, number, and special character');
        }

        this.value = password;
    }

    toString(): string {
        return this.value;
    }
}
