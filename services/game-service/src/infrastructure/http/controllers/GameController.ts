import { FastifyInstance } from 'fastify';
import {
    CreateGameUseCase,
    FinishGameUseCase,
    GetGameUseCase,
    ListGamesUseCase,
    StartGameUseCase
} from '../../../application/use-cases';
import { createGameValidator } from '../validators/createGameValidator';

interface GameControllerDeps {
    readonly createGameUseCase: CreateGameUseCase;
    readonly listGamesUseCase: ListGamesUseCase;
    readonly getGameUseCase: GetGameUseCase;
    readonly startGameUseCase: StartGameUseCase;
    readonly finishGameUseCase: FinishGameUseCase;
}

export class GameController {
    constructor(private readonly deps: GameControllerDeps) {}

    register(app: FastifyInstance): void {
        app.get('/api/games', async (request, reply) => {
            const games = await this.deps.listGamesUseCase.execute();
            return reply.send({ data: games });
        });

        app.get('/api/games/:id', async (request, reply) => {
            const { id } = request.params as { id: string };
            const game = await this.deps.getGameUseCase.execute(id);
            return reply.send({ data: game });
        });

        app.post('/api/games', async (request, reply) => {
            const payload = createGameValidator(request.body);
            const game = await this.deps.createGameUseCase.execute(payload);
            return reply.code(201).send({ data: game });
        });

        app.post('/api/games/:id/start', async (request, reply) => {
            const { id } = request.params as { id: string };
            await this.deps.startGameUseCase.execute(id);
            return reply.code(204).send();
        });

        app.post('/api/games/:id/finish', async (request, reply) => {
            const { id } = request.params as { id: string };
            const body = request.body as { winnerId: string };
            await this.deps.finishGameUseCase.execute({ gameId: id, winnerId: body.winnerId });
            return reply.code(204).send();
        });
    }
}
