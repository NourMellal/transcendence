/**
 * Auth Mapper
 * Maps between Domain Entities and Auth DTOs
 */

import { User } from '../../domain/entities/user.entity';
import { AuthResponseDTO, SignupResponseDTO, UserInfoDTO } from '../dto/auth.dto';

export class AuthMapper {
    /**
     * Convert User entity to UserInfoDTO
     * Used in signup responses and auth status
     */
    static toUserInfoDTO(user: User): UserInfoDTO {
        return {
            id: user.id.toString(),
            email: user.email.toString(),
            username: user.username.toString(),
            displayName: user.displayName.toString(),
            avatar: user.avatar,
            is2FAEnabled: user.is2FAEnabled,
        };
    }

    /**
     * Convert to signup response
     * Includes creation timestamp
     */
    static toSignupResponseDTO(user: User): SignupResponseDTO {
        return {
            id: user.id.toString(),
            email: user.email.toString(),
            username: user.username.toString(),
            displayName: user.displayName.toString(),
            avatar: user.avatar,
            is2FAEnabled: user.is2FAEnabled,
            createdAt: user.createdAt.toISOString(),
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
