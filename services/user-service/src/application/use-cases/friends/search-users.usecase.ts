import { User } from '../../../domain/entities/user.entity.js';
import { 
    SearchUsersUseCase, 
    UserRepository 
} from '../../../domain/ports.js';

export class SearchUsersUseCaseImpl implements SearchUsersUseCase {
    constructor(private userRepository: UserRepository) {}

    async execute(query: string, currentUserId: string): Promise<User[]> {
        if (!query || query.trim().length < 2) {
            throw new Error('Search query must be at least 2 characters long');
        }

        // Search for users, excluding the current user from results
        const users = await this.userRepository.search(query.trim(), currentUserId);
        
        // Filter out sensitive information (password hash, 2FA secret, etc.)
        return users.map(user => ({
            ...user,
            passwordHash: undefined,
            twoFASecret: undefined
        }));
    }
}