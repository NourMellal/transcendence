import { IntegrationEvent } from '../../base/IntegrationEvent';
import { EventType } from '../../enums/EventType';

export interface TournamentMatchSeed {
    readonly matchId: string;
    readonly player1Id: string;
    readonly player2Id: string;
    readonly round: number;
    readonly scheduledAt?: Date;
}

export interface TournamentStartedPayload {
    readonly tournamentId: string;
    readonly startedAt: Date;
    readonly matches: TournamentMatchSeed[];
}

export type TournamentStartedIntegrationEvent = IntegrationEvent<TournamentStartedPayload>;

export function createTournamentStartedEvent(
    payload: TournamentStartedPayload,
    correlationId?: string
): TournamentStartedIntegrationEvent {
    return {
        metadata: {
            eventId: crypto.randomUUID(),
            eventType: EventType.TOURNAMENT_STARTED,
            version: '1.0.0',
            timestamp: new Date(),
            source: 'tournament-service',
            correlationId
        },
        payload
    };
}
