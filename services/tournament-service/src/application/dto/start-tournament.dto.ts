export type StartTournamentReason = 'manual' | 'auto_full' | 'timeout';

export interface StartTournamentCommand {
    tournamentId: string;
    requestedBy?: string;
    reason?: StartTournamentReason;
}
