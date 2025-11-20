import { UserRepository } from '../../../domain/ports';
import type { IGetUserUseCase } from '../../../domain/ports';
import type { GetUserInputDTO, UserProfileDTO } from '../../dto/user.dto';
import { UserMapper } from '../../mappers/user.mapper';

export class GetUserUseCase implements IGetUserUseCase {
    constructor(private userRepository: UserRepository) { }

    async execute(input: GetUserInputDTO): Promise<UserProfileDTO | null> {
        const user = await this.userRepository.findById(input.userId);
        if (!user) {
            return null;
        }
        return UserMapper.toProfileDTO(user);
    }
}
