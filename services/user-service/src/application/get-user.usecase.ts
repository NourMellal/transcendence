import { GetUserUseCase, UserRepository } from '../domain/ports.js';
import { User } from '../domain/entities.js';
import { NotFoundError } from '@transcendence/shared-utils';

export class GetUserUseCaseImpl implements GetUserUseCase {
    constructor(private readonly userRepository: UserRepository) { }

    async execute(userId: string): Promise<User | null> {
        if (!userId) {
            throw new NotFoundError('User');
        }

        const user = await this.userRepository.findById(userId);
        return user;
    }
}
