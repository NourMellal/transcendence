import { Ball, Game } from '../entities';
import { GameStatus, Position, Velocity } from '../value-objects';
import { CollisionDetector } from './CollisionDetector';

export class GamePhysics {
    constructor(private readonly collisionDetector: CollisionDetector) {}

    advance(game: Game, deltaTime: number): boolean {
        if (game.status === GameStatus.FINISHED || game.status === GameStatus.CANCELLED) {
            return false;
        }

        const movedBall = game.ball.move(deltaTime);
        const outcome = this.collisionDetector.detect(movedBall, game);
        let nextBall = movedBall;

        if (outcome.reflectsX) {
            nextBall = nextBall.updateVelocity(scaleVelocity(nextBall.velocity.invertX(), 1.05, game.config.ballSpeed * 2));
        }

        if (outcome.reflectsY) {
            nextBall = nextBall.updateVelocity(scaleVelocity(nextBall.velocity.invertY(), 1.05, game.config.ballSpeed * 2));
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
                return true;
            }

            this.resetBall(game);
        }

        return false;
    }

    private resetBall(game: Game): void {
        const centerX = game.config.arenaWidth / 2;
        const centerY = game.config.arenaHeight / 2;
        const directionX = Math.random() > 0.5 ? 1 : -1;
        const directionY = (Math.random() - 0.5) * 2; // Range: -1 to 1
        const resetVelocity = Velocity.create(
            game.config.ballSpeed * directionX,
            game.config.ballSpeed * directionY
        );
        const resetPosition = Position.create(centerX, centerY);
        const resetBall = Ball.create(resetPosition, resetVelocity);
        game.updateBall(resetBall);
    }
}

function scaleVelocity(velocity: import('../value-objects').Velocity, factor: number, maxSpeed: number) {
    const { dx, dy } = velocity;
    const speed = Math.sqrt(dx * dx + dy * dy);
    const nextSpeed = Math.min(speed * factor, maxSpeed);
    if (speed === 0) return velocity;
    const ratio = nextSpeed / speed;
    return Velocity.create(dx * ratio, dy * ratio);
}
