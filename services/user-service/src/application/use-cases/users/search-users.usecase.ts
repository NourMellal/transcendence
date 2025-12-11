import { UserRepository } from '../../../domain/ports/outbound/repositories';
import type { UserProfileDTO } from '../../dto/user.dto';
import { UserMapper } from '../../mappers/user.mapper';

export interface SearchUsersInput {
    query: string;
    limit?: number;
}

export interface ISearchUsersUseCase {
    execute(input: SearchUsersInput): Promise<UserProfileDTO[]>;
}

export class SearchUsersUseCase implements ISearchUsersUseCase {
    constructor(private userRepository: UserRepository) {}

    async execute(input: SearchUsersInput): Promise<UserProfileDTO[]> {
        const { query, limit = 10 } = input;

        if (!query || query.trim().length === 0) {
            return [];
        }

        const users = await this.userRepository.search(query.trim(), limit);
        return users.map(user => UserMapper.toProfileDTO(user));
    }
}
