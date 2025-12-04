import { UserRepository, UserPresenceRepository } from '../../../domain/ports';
import type { UserProfileDTO } from '../../dto/user.dto';
import { UserMapper } from '../../mappers/user.mapper';
import { PresenceStatus } from '../../../domain/entities/presence.entity';

export interface GetUserByUsernameInput {
    username: string;
}

export interface IGetUserByUsernameUseCase {
    execute(input: GetUserByUsernameInput): Promise<UserProfileDTO | null>;
}

export class GetUserByUsernameUseCase implements IGetUserByUsernameUseCase {
    constructor(
        private userRepository: UserRepository,
        private presenceRepository?: UserPresenceRepository
    ) {}

    async execute(input: GetUserByUsernameInput): Promise<UserProfileDTO | null> {
        const user = await this.userRepository.findByUsername(input.username);
        if (!user) {
            return null;
        }
        
        // Fetch presence status if repository is available
        let status: 'online' | 'offline' = 'offline';
        if (this.presenceRepository) {
            const presence = await this.presenceRepository.findByUserId(user.id.toString());
            if (presence && presence.status === PresenceStatus.ONLINE) {
                status = 'online';
            }
        }
        
        return UserMapper.toProfileDTO(user, status);
    }
}
