import { UserRepository, UserPresenceRepository } from '../../../domain/ports';
import type { IGetUserUseCase } from '../../../domain/ports';
import type { GetUserInputDTO, UserProfileDTO } from '../../dto/user.dto';
import { UserMapper } from '../../mappers/user.mapper';
import { PresenceStatus } from '../../../domain/entities/presence.entity';

export class GetUserUseCase implements IGetUserUseCase {
    constructor(
        private userRepository: UserRepository,
        private presenceRepository?: UserPresenceRepository
    ) { }

    async execute(input: GetUserInputDTO): Promise<UserProfileDTO | null> {
        const user = await this.userRepository.findById(input.userId);
        if (!user) {
            return null;
        }
        
        // Fetch presence status if repository is available
        let status: 'online' | 'offline' = 'offline';
        if (this.presenceRepository) {
            const presence = await this.presenceRepository.findByUserId(input.userId);
            if (presence && presence.status === PresenceStatus.ONLINE) {
                status = 'online';
            }
        }
        
        return UserMapper.toProfileDTO(user, status);
    }
}
