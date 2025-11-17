import { UserRepository } from '../../../domain/ports';
import { User } from '../../../domain/entities/user.entity';
import { PasswordHelper } from '../../../domain/entities/user.entity';
import { UpdateProfileInput } from '../../dto/user.dto';

export class UpdateProfileUseCase {
    constructor(
        private userRepository: UserRepository
    ) { }

    async execute(userId: string, input: UpdateProfileInput): Promise<User> {
        // Find the user
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Validate and prepare updates
        const updates: Partial<User> = {
            updatedAt: new Date()
        };

        // Update display name
        if (input.displayName !== undefined) {
            if (input.displayName.trim().length < 1 || input.displayName.length > 50) {
                throw new Error('Display name must be between 1 and 50 characters');
            }
            updates.displayName = input.displayName.trim();
        }

        // Update avatar
        if (input.avatar !== undefined) {
            // For now, just store the URL/path
            // In the future, this could validate the URL or handle file upload
            updates.avatar = input.avatar;
        }

        // Update email
        if (input.email !== undefined) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input.email)) {
                throw new Error('Invalid email format');
            }

            // Check if email is already taken by another user
            const existingUser = await this.userRepository.findByEmail(input.email);
            if (existingUser && existingUser.id !== userId) {
                throw new Error('Email already exists');
            }

            updates.email = input.email.toLowerCase();
        }

        // Update username
        if (input.username !== undefined) {
            if (input.username.length < 3 || input.username.length > 20) {
                throw new Error('Username must be between 3 and 20 characters');
            }

            const usernameRegex = /^[a-zA-Z0-9_-]+$/;
            if (!usernameRegex.test(input.username)) {
                throw new Error('Username can only contain letters, numbers, hyphens, and underscores');
            }

            // Check if username is already taken by another user
            const existingUser = await this.userRepository.findByUsername(input.username);
            if (existingUser && existingUser.id !== userId) {
                throw new Error('Username already exists');
            }

            updates.username = input.username;
        }

        // Update password
        if (input.password !== undefined) {
            // Only allow password updates for local auth users
            if (user.oauthProvider !== 'local') {
                throw new Error('Cannot update password for OAuth accounts');
            }

            // Validate password strength
            if (input.password.length < 8) {
                throw new Error('Password must be at least 8 characters');
            }

            const hasUpperCase = /[A-Z]/.test(input.password);
            const hasLowerCase = /[a-z]/.test(input.password);
            const hasNumber = /[0-9]/.test(input.password);
            const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(input.password);

            if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
                throw new Error(
                    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
                );
            }

            updates.passwordHash = await PasswordHelper.hash(input.password);
        }

        // Apply updates
        await this.userRepository.update(userId, updates);

        // Return updated user
        const updatedUser = await this.userRepository.findById(userId);
        if (!updatedUser) {
            throw new Error('Failed to retrieve updated user');
        }

        return updatedUser;
    }
}
