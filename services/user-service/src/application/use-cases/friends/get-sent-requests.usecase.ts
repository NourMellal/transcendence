import { Friendship } from '../../../domain/entities/user.entity.js';
import { 
    GetSentFriendRequestsUseCase, 
    FriendshipRepository 
} from '../../../domain/ports.js';

export class GetSentFriendRequestsUseCaseImpl implements GetSentFriendRequestsUseCase {
    constructor(private friendshipRepository: FriendshipRepository) {}

    async execute(userId: string): Promise<Friendship[]> {
        return await this.friendshipRepository.findSentRequestsByUserId(userId);
    }
}