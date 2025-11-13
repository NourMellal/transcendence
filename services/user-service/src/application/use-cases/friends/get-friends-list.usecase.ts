import { User } from '../../../domain/entities/user.entity.js';
import { 
    GetFriendsListUseCase, 
    FriendshipRepository 
} from '../../../domain/ports.js';

export class GetFriendsListUseCaseImpl implements GetFriendsListUseCase {
    constructor(private friendshipRepository: FriendshipRepository) {}

    async execute(userId: string): Promise<User[]> {
        return await this.friendshipRepository.findFriendsByUserId(userId);
    }
}