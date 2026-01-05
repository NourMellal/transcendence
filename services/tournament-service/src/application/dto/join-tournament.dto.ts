export interface JoinTournamentCommand {
    tournamentId: string;
    userId: string;
    passcode?: string;
}
