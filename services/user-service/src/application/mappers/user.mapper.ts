/**
 * User Mapper
 * Maps between Domain Entities and DTOs
 * Ensures sensitive data is filtered out when converting to DTOs
 */

import { User } from '../../domain/entities/user.entity';
import { UserProfileDTO, UpdateProfileResponseDTO } from '../dto/user.dto';

export class UserMapper {
    /**
     * Convert User entity to UserProfileDTO
     * Filters out sensitive data (passwordHash, twoFASecret)
     */
    static toProfileDTO(user: User): UserProfileDTO {
        return {
            id: user.id.toString(),
            email: user.email.toString(),
            username: user.username.toString(),
            displayName: user.displayName.toString(),
            avatar: user.avatar,
            is2FAEnabled: user.is2FAEnabled,
            oauthProvider: user.oauthProvider,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        };
    }

    /**
     * Convert User entity to UpdateProfileResponseDTO
     * Includes success message
     */
    static toUpdateResponseDTO(user: User, message: string = 'Profile updated successfully'): UpdateProfileResponseDTO {
        return {
            id: user.id.toString(),
            email: user.email.toString(),
            username: user.username.toString(),
            displayName: user.displayName.toString(),
            avatar: user.avatar,
            is2FAEnabled: user.is2FAEnabled,
            oauthProvider: user.oauthProvider,
            updatedAt: user.updatedAt.toISOString(),
            message,
        };
    }
}
