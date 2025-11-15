/**
 * Auth Mapper
 * Maps between Domain Entities and Auth DTOs
 */

import { User } from '../../domain/entities/user.entity.js';
import { AuthResponseDTO, UserInfoDTO } from '../dto/auth.dto.js';

export class AuthMapper {
    /**
     * Convert User entity to UserInfoDTO
     * Used in signup responses and auth status
     */
    static toUserInfoDTO(user: User): UserInfoDTO {
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            is2FAEnabled: user.is2FAEnabled,
        };
    }

    /**
     * Convert to signup response
     * Includes creation timestamp
     */
    static toSignupResponseDTO(user: User) {
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            is2FAEnabled: user.is2FAEnabled,
            createdAt: user.createdAt,
        };
    }

    /**
     * Convert to login response
     */
    static toLoginResponseDTO(user: User, accessToken: string, refreshToken: string, message = 'Login successful'): AuthResponseDTO {
        return {
            user: this.toUserInfoDTO(user),
            accessToken,
            refreshToken,
            message,
        };
    }
}
