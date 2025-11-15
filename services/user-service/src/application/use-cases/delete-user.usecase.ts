import {
    FriendshipRepository,
    SessionRepository,
    UserRepository,
    UnitOfWork,
} from '../../domain/ports.js';

interface DeleteUserOptions {
    reason?: string;
    initiatedBy?: string;
}

export class DeleteUserUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly sessionRepository: SessionRepository,
        private readonly friendshipRepository: FriendshipRepository,
        private readonly unitOfWork: UnitOfWork
    ) {}

    async execute(userId: string, options: DeleteUserOptions = {}): Promise<void> {
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

            await this.userRepository.delete(userId);

        });
    }
}
