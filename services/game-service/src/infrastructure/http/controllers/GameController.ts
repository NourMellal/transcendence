import { FastifyInstance } from 'fastify';
import {
    CreateGameUseCase,
    GetGameUseCase,
  JoinGameUseCase,
  LeaveGameUseCase,
  ListGamesUseCase
} from '../../../application/use-cases';
import {GameStatus} from '../../../domain/value-objects';
import {GameStateOutput} from '../../../application/dto';
import { createGameValidator } from '../validators/createGameValidator';

interface GameControllerDeps {
    readonly createGameUseCase: CreateGameUseCase;
    readonly listGamesUseCase: ListGamesUseCase;
    readonly getGameUseCase: GetGameUseCase;
  readonly joinGameUseCase: JoinGameUseCase;
  readonly leaveGameUseCase: LeaveGameUseCase;
}

export class GameController {
    constructor(private readonly deps: GameControllerDeps) {}

    register(app: FastifyInstance): void {
      app.get('/games', async (request, reply) => {
        const {status, limit, offset} = request.query as Partial<{
          status: string;
          limit: string;
          offset: string;
        }>;

        const parsedLimit = parseNumber(limit);
        const parsedOffset = parseNumber(offset);
        const effectiveLimit = parsedLimit && parsedLimit > 0 ? parsedLimit : 20;
        const limitValue = Math.min(effectiveLimit, 100);
        const offsetValue = parsedOffset ?? 0;

        const listResult = await this.deps.listGamesUseCase.execute({
          status: mapQueryStatus(status),
          limit: limitValue,
          offset: offsetValue
        });

        return reply.send({
          games: listResult.games.map(toApiGame),
          total: listResult.total
        });
        });

      app.get('/games/:gameId', async (request, reply) => {
        const {gameId} = request.params as { gameId: string };
        const game = await this.deps.getGameUseCase.execute(gameId);
        return reply.send(toApiGame(game));
      });

      app.post('/games', async (request, reply) => {
        const userId = getUserId(request.headers['x-user-id']);
        const payload = createGameValidator(request.body, userId);
            const game = await this.deps.createGameUseCase.execute(payload);
        return reply.code(201).send(toApiGame(game));
      });

      app.post('/games/:gameId/join', async (request, reply) => {
        const {gameId} = request.params as { gameId: string };
        const userId = getUserId(request.headers['x-user-id']);
        await this.deps.joinGameUseCase.execute(gameId, userId);
        const game = await this.deps.getGameUseCase.execute(gameId);
        return reply.send(toApiGame(game));
        });

      app.post('/games/:gameId/leave', async (request, reply) => {
        const {gameId} = request.params as { gameId: string };
        const userId = getUserId(request.headers['x-user-id']);
        await this.deps.leaveGameUseCase.execute(gameId, userId);
            return reply.code(204).send();
        });

      app.get('/games/my-games', async (request, reply) => {
        const userId = getUserId(request.headers['x-user-id']);
        const listResult = await this.deps.listGamesUseCase.execute({playerId: userId});
        return reply.send(listResult.games.map(toApiGame));
        });
    }
}

function mapQueryStatus(status?: string): GameStatus | undefined {
  if (!status) {
    return undefined;
  }

  switch (status.toUpperCase()) {
    case GameStatus.WAITING:
      return GameStatus.WAITING;
    case 'PLAYING':
    case GameStatus.IN_PROGRESS:
      return GameStatus.IN_PROGRESS;
    case GameStatus.FINISHED:
      return GameStatus.FINISHED;
    case GameStatus.CANCELLED:
      return GameStatus.CANCELLED;
    default:
      return undefined;
  }
}

function toApiStatus(status: GameStatus): 'WAITING' | 'PLAYING' | 'FINISHED' | 'CANCELLED' {
  return status === GameStatus.IN_PROGRESS ? 'PLAYING' : status;
}

function resolveWinner(game: GameStateOutput): string | null {
  if (game.status !== GameStatus.FINISHED) {
    return null;
  }

  if (game.score.player1 === game.score.player2) {
    return null;
  }

  return game.score.player1 > game.score.player2 ? game.players[0]?.id ?? null : game.players[1]?.id ?? null;
}

function toApiGame(game: GameStateOutput) {
  return {
    id: game.id,
    player1: game.players[0]?.id ?? null,
    player2: game.players[1]?.id ?? null,
    status: toApiStatus(game.status),
    score: {
      player1: game.score.player1,
      player2: game.score.player2
    },
    winner: resolveWinner(game),
    createdAt: game.createdAt.toISOString(),
    finishedAt: game.finishedAt?.toISOString() ?? null
  };
}

function getUserId(header: string | string[] | undefined): string {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) {
    throw new Error('Missing x-user-id header');
  }
  return value;
}

function parseNumber(value?: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}
