import { UserRepository } from '../../../domain/ports';
import type { IAuthStatusUseCase } from '../../../domain/ports';
import type { AuthStatusInputDTO, AuthStatusResponseDTO } from '../../dto/auth.dto';
import { AuthMapper } from '../../mappers/auth.mapper';

export class AuthStatusUseCase implements IAuthStatusUseCase {
    constructor(private userRepository: UserRepository) { }

    async execute(input: AuthStatusInputDTO): Promise<AuthStatusResponseDTO> {
        const { userId } = input;
        if (!userId) {
            return { authenticated: false };
        }

        const user = await this.userRepository.findById(userId);

        if (!user) {
            return { authenticated: false };
        }

        return {
            authenticated: true,
            user: AuthMapper.toUserInfoDTO(user),
        };
    }
}
