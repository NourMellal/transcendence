import { Ball, Game, Paddle } from '../entities';

export type ScoreSide = 'player1' | 'player2';

export interface CollisionOutcome {
    reflectsX?: boolean;
    reflectsY?: boolean;
    scoredBy?: ScoreSide;
}

export class CollisionDetector {
    constructor(private readonly ballRadius = 8) {}

    detect(ball: Ball, game: Game): CollisionOutcome {
        const { arenaWidth, arenaHeight } = game.config;
        const outcome: CollisionOutcome = {};
        const { x, y } = ball.position;

        if (y - this.ballRadius <= 0 || y + this.ballRadius >= arenaHeight) {
            outcome.reflectsY = true;
        }

        if (x - this.ballRadius <= 0) {
            outcome.scoredBy = 'player2';
            return outcome;
        }

        if (x + this.ballRadius >= arenaWidth) {
            outcome.scoredBy = 'player1';
            return outcome;
        }

        const [player1, player2] = game.players;
        if (player1 && this.isCollidingWithPaddle(ball, player1.paddle)) {
            outcome.reflectsX = true;
        }

        if (player2 && this.isCollidingWithPaddle(ball, player2.paddle)) {
            outcome.reflectsX = true;
        }

        return outcome;
    }

    private isCollidingWithPaddle(ball: Ball, paddle: Paddle): boolean {
        const box = paddleToBox(paddle);
        const { x, y } = ball.position;
        return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
    }
}

function paddleToBox(paddle: Paddle) {
    const top = paddle.position.y;
    const bottom = paddle.position.y + paddle.height;
    const left = paddle.position.x;
    const right = paddle.position.x + paddle.width;
    return { top, bottom, left, right };
}
