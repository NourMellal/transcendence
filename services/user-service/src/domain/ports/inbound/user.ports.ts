import type {
    DeleteUserInputDTO,
    DeleteUserResponseDTO,
    GetUserInputDTO,
    UpdateProfileInputDTO,
    UpdateProfileResponseDTO,
    UserProfileDTO
} from '../../../application/dto/user.dto';

export interface IGetUserUseCase {
    execute(input: GetUserInputDTO): Promise<UserProfileDTO | null>;
}

export interface IUpdateProfileUseCase {
    execute(input: UpdateProfileInputDTO): Promise<UpdateProfileResponseDTO>;
}

export interface IDeleteUserUseCase {
    execute(input: DeleteUserInputDTO): Promise<DeleteUserResponseDTO>;
}
