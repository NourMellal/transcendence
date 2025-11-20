import type {
    BlockUserInputDTO,
    CancelFriendRequestInputDTO,
    FriendListResponseDTO,
    FriendshipDTO,
    ListFriendsInputDTO,
    RemoveFriendInputDTO,
    RespondFriendRequestInputDTO,
    SendFriendRequestInputDTO,
    UnblockUserInputDTO
} from '../../../application/dto/friend.dto';

export interface ISendFriendRequestUseCase {
    execute(input: SendFriendRequestInputDTO): Promise<FriendshipDTO>;
}

export interface IRespondFriendRequestUseCase {
    execute(input: RespondFriendRequestInputDTO): Promise<FriendshipDTO>;
}

export interface IListFriendsUseCase {
    execute(input: ListFriendsInputDTO): Promise<FriendListResponseDTO>;
}

export interface IBlockUserUseCase {
    execute(input: BlockUserInputDTO): Promise<FriendshipDTO>;
}

export interface IUnblockUserUseCase {
    execute(input: UnblockUserInputDTO): Promise<FriendshipDTO>;
}

export interface IRemoveFriendUseCase {
    execute(input: RemoveFriendInputDTO): Promise<void>;
}

export interface ICancelFriendRequestUseCase {
    execute(input: CancelFriendRequestInputDTO): Promise<void>;
}
