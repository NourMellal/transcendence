import { TournamentParticipantStatus } from '../types';

export interface TournamentParticipant {
    id: string;
    tournamentId: string;
    userId: string;
    status: TournamentParticipantStatus;
    joinedAt: Date;
}
