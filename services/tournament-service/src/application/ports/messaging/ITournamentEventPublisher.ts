import { Tournament, TournamentMatch, TournamentParticipant } from '../../../domain/entities';

export interface ITournamentEventPublisher {
    publishTournamentCreated?(tournament: Tournament): Promise<void>;
    publishPlayerRegistered?(tournamentId: string, participant: TournamentParticipant): Promise<void>;
    publishTournamentStarted(
        tournament: Tournament,
        matches: TournamentMatch[]
    ): Promise<void>;
    publishTournamentFinished(
        tournament: Tournament,
        winnerId: string,
        runnerUpId: string,
        participants: TournamentParticipant[]
    ): Promise<void>;
}
