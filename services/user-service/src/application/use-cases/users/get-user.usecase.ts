import { UserRepository } from '../../../domain/ports';
import { User } from '../../../domain/entities/user.entity';

export class GetUserUseCase {
    constructor(private userRepository: UserRepository) { }

    async execute(userId: string): Promise<User | null> {
        return await this.userRepository.findById(userId);
    }
}
