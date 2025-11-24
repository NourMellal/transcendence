import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Channel, ConsumeMessage } from 'amqplib';
import {
    createTournamentStartedEvent,
    createUserDeletedEvent,
    EventType,
    IntegrationEvent,
} from '@transcendence/shared-messaging';
import { UserEventHandler } from '../../../src/infrastructure/messaging/subscribers/UserEventHandler';
import { TournamentEventHandler } from '../../../src/infrastructure/messaging/subscribers/TournamentEventHandler';
import { EventSerializer } from '../../../src/infrastructure/messaging/serialization/EventSerializer';
import { IGameRepository, ListGamesParams } from '../../../src/application/ports/repositories/IGameRepository';
import { Game } from '../../../src/domain/entities';
import { GameStatus } from '../../../src/domain/value-objects';

class InMemoryChannel implements Partial<Channel> {
    ack = vi.fn();
    nack = vi.fn();
    assertQueue = vi.fn();
    bindQueue = vi.fn();
    consume = vi.fn();
}

class InMemoryGameRepository implements IGameRepository {
    constructor(public games: Game[] = []) {}

    async create(game: Game): Promise<void> {
        this.games.push(game);
    }

    async update(game: Game): Promise<void> {
        const index = this.games.findIndex((stored) => stored.id === game.id);
        if (index >= 0) {
            this.games[index] = game;
        }
    }

    async findById(id: string): Promise<Game | null> {
        return this.games.find((game) => game.id === id) ?? null;
    }

    async list(params?: ListGamesParams): Promise<Game[]> {
        let results = [...this.games];

        if (params?.status) {
            results = results.filter((game) => game.status === params.status);
        }

        if (params?.mode) {
            results = results.filter((game) => game.mode === params.mode);
        }

        if (params?.playerId) {
            results = results.filter((game) => game.players.some((player) => player.id === params.playerId));
        }

        if (typeof params?.offset === 'number' && params.offset > 0) {
            results = results.slice(params.offset);
        }

        if (typeof params?.limit === 'number' && params.limit > 0) {
            results = results.slice(0, params.limit);
        }

        return results;
    }

    async findActiveByPlayer(playerId: string): Promise<Game | null> {
        return (
            this.games.find(
                (game) =>
                    game.players.some((player) => player.id === playerId) &&
                    game.status !== GameStatus.FINISHED &&
                    game.status !== GameStatus.CANCELLED
            ) ?? null
        );
    }
}

function buildMessage(serializer: EventSerializer, event: IntegrationEvent<any>): ConsumeMessage {
    return {
        content: serializer.serialize(event),
        fields: {} as any,
        properties: {} as any,
    } as ConsumeMessage;
}

describe('UserEventHandler', () => {
    const serializer = new EventSerializer();
    let channel: InMemoryChannel;
    let repository: InMemoryGameRepository;

    beforeEach(() => {
        channel = new InMemoryChannel();
        repository = new InMemoryGameRepository();
    });

    it('cancels active games for deleted users and acknowledges the message', async () => {
        const game = Game.create({ playerId: 'user-1', opponentId: 'user-2', mode: 'CLASSIC', config: {} });
        repository.games.push(game);

        const handler = new UserEventHandler(channel as Channel, serializer, repository);
        const event = createUserDeletedEvent({ userId: 'user-1', deletedAt: new Date('2024-01-01T00:00:00Z') });
        const message = buildMessage(serializer, event);

        // @ts-expect-error accessing private handler for test coverage
        await handler.handle(message);

        expect(repository.games[0].status).toBe(GameStatus.CANCELLED);
        expect(channel.ack).toHaveBeenCalledWith(message);
        expect(channel.nack).not.toHaveBeenCalled();
    });

    it('nacks when the payload does not validate', async () => {
        const handler = new UserEventHandler(channel as Channel, serializer, repository);
        const invalidEvent = {
            metadata: {
                eventId: '1',
                eventType: EventType.USER_DELETED,
                version: '1.0.0',
                timestamp: new Date(),
                source: 'test-suite',
            },
            payload: {
                deletedAt: 'not-a-date',
            },
        } as IntegrationEvent<any>;
        const message = buildMessage(serializer, invalidEvent);

        // @ts-expect-error accessing private handler for test coverage
        await handler.handle(message);

        expect(channel.nack).toHaveBeenCalledWith(message, false, false);
        expect(channel.ack).not.toHaveBeenCalled();
    });
});

describe('TournamentEventHandler', () => {
    const serializer = new EventSerializer();
    let channel: InMemoryChannel;
    let repository: InMemoryGameRepository;

    beforeEach(() => {
        channel = new InMemoryChannel();
        repository = new InMemoryGameRepository();
    });

    it('creates waiting games for seeded matches on tournament start', async () => {
        const handler = new TournamentEventHandler(channel as Channel, serializer, repository);
        const event = createTournamentStartedEvent({
            tournamentId: 'tournament-1',
            startedAt: new Date('2024-02-01T00:00:00Z'),
            matches: [
                {
                    matchId: 'match-1',
                    player1Id: 'p1',
                    player2Id: 'p2',
                    round: 1,
                },
            ],
        });
        const message = buildMessage(serializer, event);

        // @ts-expect-error accessing private handler for test coverage
        await handler.handle(message);

        const games = await repository.list();
        expect(games).toHaveLength(1);
        expect(games[0].tournamentId).toBe('tournament-1');
        expect(games[0].status).toBe(GameStatus.WAITING);
        expect(channel.ack).toHaveBeenCalledWith(message);
    });
});
