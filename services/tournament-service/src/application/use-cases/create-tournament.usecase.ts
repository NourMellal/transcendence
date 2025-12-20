import { CreateTournamentCommand } from '../dto/create-tournament.dto';
import { TournamentRepository, UnitOfWork } from '../../domain/repositories';

export class CreateTournamentUseCase {
    constructor(
        private readonly tournaments: TournamentRepository,
        private readonly unitOfWork: UnitOfWork
    ) {}

    async execute(_command: CreateTournamentCommand) {
        // TODO: implement tournament creation (generate access code, hash passcode, persist)
        throw new Error('CreateTournamentUseCase not implemented yet');
    }
}
