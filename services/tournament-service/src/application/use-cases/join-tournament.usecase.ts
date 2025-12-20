import { JoinTournamentCommand } from '../dto/join-tournament.dto';
import {
    TournamentParticipantRepository,
    TournamentRepository,
    UnitOfWork
} from '../../domain/repositories';

export class JoinTournamentUseCase {
    constructor(
        private readonly tournaments: TournamentRepository,
        private readonly participants: TournamentParticipantRepository,
        private readonly unitOfWork: UnitOfWork
    ) {}

    async execute(_command: JoinTournamentCommand) {
        // TODO: implement join flow (passcode validation, capacity checks, ready/timeout logic)
        throw new Error('JoinTournamentUseCase not implemented yet');
    }
}
