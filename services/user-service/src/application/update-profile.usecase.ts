import { UpdateProfileUseCase, UserRepository, ImageStorageService } from '../domain/ports.js';
import { User } from '../domain/entities.js';
import { NotFoundError, ValidationError } from '@transcendence/shared-utils';
import { generateId } from '@transcendence/shared-utils';

export class UpdateProfileUseCaseImpl implements UpdateProfileUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly imageStorageService: ImageStorageService
    ) { }

    async execute(userId: string, updates: {
        username?: string;
        displayName?: string;
        avatar?: Buffer;
    }): Promise<User> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User');
        }

        const updateData: Partial<User> = {
            updatedAt: new Date()
        };

        // Validate and update username
        if (updates.username !== undefined) {
            if (updates.username !== user.username) {
                const existingUser = await this.userRepository.findByUsername(updates.username);
                if (existingUser) {
                    throw new ValidationError('Username already exists', 'username');
                }
            }
            updateData.username = updates.username;
        }

        // Update display name
        if (updates.displayName !== undefined) {
            updateData.displayName = updates.displayName;
        }

        // Handle avatar upload
        if (updates.avatar) {
            // Delete old avatar if exists
            if (user.avatar) {
                try {
                    await this.imageStorageService.deleteImage(user.avatar);
                } catch (error) {
                    // Log error but don't fail the update
                    console.warn('Failed to delete old avatar:', error);
                }
            }

            // Save new avatar
            const filename = `avatar-${userId}-${generateId()}.jpg`;
            const avatarPath = await this.imageStorageService.saveImage(updates.avatar, filename);
            updateData.avatar = avatarPath;
        }

        await this.userRepository.update(userId, updateData);

        return {
            ...user,
            ...updateData
        };
    }
}
