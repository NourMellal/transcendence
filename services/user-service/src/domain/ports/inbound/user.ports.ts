import type {
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
