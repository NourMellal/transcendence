import { Friendship } from '../../../domain/entities/user.entity.js';
import { 
    GetPendingFriendRequestsUseCase, 
    FriendshipRepository 
} from '../../../domain/ports.js';

export class GetPendingFriendRequestsUseCaseImpl implements GetPendingFriendRequestsUseCase {
    constructor(private friendshipRepository: FriendshipRepository) {}

    async execute(userId: string): Promise<Friendship[]> {
        return await this.friendshipRepository.findPendingRequestsByUserId(userId);
    }
}