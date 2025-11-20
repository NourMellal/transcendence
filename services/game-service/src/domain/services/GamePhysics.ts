import { Ball, Game } from '../entities';
import { GameStatus, Position, Velocity } from '../value-objects';
import { CollisionDetector } from './CollisionDetector';

export class GamePhysics {
    constructor(private readonly collisionDetector: CollisionDetector) {}

    advance(game: Game, deltaTime: number): void {
        if (game.status === GameStatus.FINISHED) {
            return;
        }

        const movedBall = game.ball.move(deltaTime);
        const outcome = this.collisionDetector.detect(movedBall, game);
        let nextBall = movedBall;

        if (outcome.reflectsX) {
            nextBall = nextBall.updateVelocity(nextBall.velocity.invertX());
        }

        if (outcome.reflectsY) {
            nextBall = nextBall.updateVelocity(nextBall.velocity.invertY());
        }

        game.updateBall(nextBall);

        if (outcome.scoredBy) {
            if (outcome.scoredBy === 'player1') {
                game.updateScore(game.score.incrementPlayer1());
            } else {
                game.updateScore(game.score.incrementPlayer2());
            }

            const limitReached =
                game.score.player1 >= game.config.scoreLimit ||
                game.score.player2 >= game.config.scoreLimit;

            if (limitReached) {
                game.finish();
            } else {
                this.resetBall(game);
            }
        }
    }

    private resetBall(game: Game): void {
        const centerX = game.config.arenaWidth / 2;
        const centerY = game.config.arenaHeight / 2;
        const direction = Math.random() > 0.5 ? 1 : -1 ;
        const resetVelocity = Velocity.create(game.config.ballSpeed * direction, game.config.ballSpeed);
        const resetPosition = Position.create(centerX, centerY);
        const resetBall = Ball.create(resetPosition, resetVelocity);
        game.updateBall(resetBall);
    }
}
