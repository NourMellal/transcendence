import { UserRepository } from '../../../domain/ports';
import type { IUpdateProfileUseCase, IPasswordHasher } from '../../../domain/ports';
import { DisplayName, Email, Password, Username } from '../../../domain/value-objects';
import type { UpdateProfileInputDTO, UpdateProfileResponseDTO } from '../../dto/user.dto';
import { UserMapper } from '../../mappers/user.mapper';
import type { User } from '../../../domain/entities/user.entity';

export class UpdateProfileUseCase implements IUpdateProfileUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly passwordHasher: IPasswordHasher
    ) { }

    async execute(input: UpdateProfileInputDTO): Promise<UpdateProfileResponseDTO> {
        const { userId, ...payload } = input;
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
        if (payload.displayName !== undefined) {
            const displayName = new DisplayName(payload.displayName);
            const nextDisplayName = displayName.toString();
            if (nextDisplayName !== user.displayName.toString()) {
                const existingDisplayName = await this.userRepository.findByDisplayName(nextDisplayName);
                if (existingDisplayName && existingDisplayName.id.toString() !== userId) {
                    throw new Error('Display name already exists');
                }
            }
            updates.displayName = displayName;
        }

        // Update avatar
        if (payload.avatar !== undefined) {
            // For now, just store the URL/path
            // In the future, this could validate the URL or handle file upload
            updates.avatar = payload.avatar;
        }

        // Update email
        if (payload.email !== undefined) {
            const email = new Email(payload.email);

            // Check if email is already taken by another user
            const existingUser = await this.userRepository.findByEmail(email.toString());
            if (existingUser && existingUser.id.toString() !== userId) {
                throw new Error('Email already exists');
            }

            updates.email = email;
        }

        // Update username
        if (payload.username !== undefined) {
            const username = new Username(payload.username);

            // Check if username is already taken by another user
            const existingUser = await this.userRepository.findByUsername(username.toString());
            if (existingUser && existingUser.id.toString() !== userId) {
                throw new Error('Username already exists');
            }

            updates.username = username;
        }

        // Update password
        if (payload.password !== undefined) {
            // Only allow password updates for local auth users
            if (user.oauthProvider !== 'local') {
                throw new Error('Cannot update password for OAuth accounts');
            }

            const password = new Password(payload.password);
            updates.passwordHash = await this.passwordHasher.hash(password.toString());
        }

        // Apply updates
        await this.userRepository.update(userId, updates);

        // Return updated user
        const updatedUser = await this.userRepository.findById(userId);
        if (!updatedUser) {
            throw new Error('Failed to retrieve updated user');
        }

        return UserMapper.toUpdateResponseDTO(updatedUser);
    }
}
