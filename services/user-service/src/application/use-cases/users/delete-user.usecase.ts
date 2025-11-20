import {
    FriendshipRepository,
    SessionRepository,
    UserRepository,
    UnitOfWork,
    UserPresenceRepository,
} from '../../../domain/ports';
import type { IDeleteUserUseCase } from '../../../domain/ports';
import type { DeleteUserInputDTO, DeleteUserResponseDTO } from '../../dto/user.dto';

export class DeleteUserUseCase implements IDeleteUserUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly sessionRepository: SessionRepository,
        private readonly friendshipRepository: FriendshipRepository,
        private readonly presenceRepository: UserPresenceRepository,
        private readonly unitOfWork: UnitOfWork
    ) {}

    async execute(input: DeleteUserInputDTO): Promise<DeleteUserResponseDTO> {
        const { userId } = input;
        if (!userId) {
            throw new Error('User ID is required');
        }

        await this.unitOfWork.withTransaction(async () => {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Cleanup sessions and friendships first to avoid orphaned references
            await this.sessionRepository.deleteAllForUser(userId);
            await this.friendshipRepository.deleteAllForUser(userId);
            await this.presenceRepository.markOffline(userId, new Date());

            await this.userRepository.delete(userId);

        });

        return { success: true };
    }
}
