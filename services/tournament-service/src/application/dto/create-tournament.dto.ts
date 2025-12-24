import { TournamentBracketType } from '../../domain/types';

export interface CreateTournamentCommand {
    name: string;
    creatorId: string;
    isPublic: boolean;
    privatePasscode?: string;
    bracketType: TournamentBracketType;
}
