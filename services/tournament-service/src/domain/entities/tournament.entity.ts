import {
    TournamentBracketType,
    TournamentStatus
} from '../types';

export interface Tournament {
    id: string;
    name: string;
    creatorId: string;
    status: TournamentStatus;
    bracketType: TournamentBracketType;
    maxParticipants: number;
    minParticipants: number;
    currentParticipants: number;
    isPublic: boolean;
    accessCode?: string | null;
    passcodeHash?: string | null;
    readyToStart: boolean;
    readyAt?: Date | null;
    startTimeoutAt?: Date | null;
    createdAt: Date;
    startedAt?: Date | null;
    finishedAt?: Date | null;
    updatedAt: Date;
}
