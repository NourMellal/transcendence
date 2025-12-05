import { randomUUID } from 'crypto';
import { Ball } from './Ball';
import { Paddle } from './Paddle';
import { GameStatus, Position, Score, Velocity } from '../value-objects';

export type GameMode = 'CLASSIC' | 'TOURNAMENT' | 'RANKED' | 'CUSTOM';

export interface GameConfig {
    readonly arenaWidth: number;
    readonly arenaHeight: number;
    readonly scoreLimit: number;
    readonly paddleSpeed: number;
    readonly ballSpeed: number;
}

export interface GamePlayerState {
    id: string;
    paddle: Paddle;
    isConnected: boolean;
    ready: boolean;
}

export interface GameSnapshot {
    readonly id: string;
    readonly status: GameStatus;
    readonly mode: GameMode;
    readonly tournamentId?: string;
    readonly ball: {
        position: { x: number; y: number };
        velocity: { dx: number; dy: number };
    };
    readonly players: Array<{
        id: string;
        paddle: {
            position: { x: number; y: number };
            height: number;
            width: number;
        };
        isConnected: boolean;
        ready?: boolean;
    }>;
    readonly score: { player1: number; player2: number };
    readonly config: GameConfig;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly startedAt?: string;
    readonly finishedAt?: string;
}

interface GameProps {
    id: string;
    status: GameStatus;
    mode: GameMode;
    tournamentId?: string;
    ball: Ball;
    players: GamePlayerState[];
    score: Score;
    config: GameConfig;
    createdAt: Date;
    updatedAt: Date;
    startedAt?: Date;
    finishedAt?: Date;
}

interface CreateGameProps {
    playerId: string;
    opponentId?: string;
    mode: GameMode;
    tournamentId?: string;
    config: Partial<GameConfig>;
}

const DEFAULT_CONFIG: GameConfig = {
    arenaWidth: 800,
    arenaHeight: 600,
    scoreLimit: 11,
    paddleSpeed: 720, // units per second; ~12px per frame at 60fps
    ballSpeed: 900 // units per second; ~15px per frame at 60fps
};

export class Game {
    private constructor(private props: GameProps) {}

    static defaultConfig(): GameConfig {
        return { ...DEFAULT_CONFIG };
    }

    static create(props: CreateGameProps): Game {
        const merged = { ...DEFAULT_CONFIG, ...props.config };
        const config: GameConfig = {
            arenaWidth: merged.arenaWidth,
            arenaHeight: merged.arenaHeight,
            scoreLimit: merged.scoreLimit,
            paddleSpeed: resolveSpeed(merged.paddleSpeed, DEFAULT_CONFIG.paddleSpeed),
            ballSpeed: resolveSpeed(merged.ballSpeed, DEFAULT_CONFIG.ballSpeed)
        };
        const initialBall = Ball.create(
            Position.create(config.arenaWidth / 2, config.arenaHeight / 2),
            Velocity.create(config.ballSpeed, config.ballSpeed)
        );
        const paddleHeight = 80;
        const paddleWidth = 12;
        const players: GamePlayerState[] = [
            {
                id: props.playerId,
                isConnected: true,
                ready: false,
                paddle: Paddle.create(
                    Position.create(24, (config.arenaHeight - paddleHeight) / 2),
                    paddleHeight,
                    paddleWidth
                )
            }
        ];

        if (props.opponentId) {
            players.push({
                id: props.opponentId,
                isConnected: true,
                ready: false,
                paddle: Paddle.create(
                    Position.create(config.arenaWidth - 24 - paddleWidth, (config.arenaHeight - paddleHeight) / 2),
                    paddleHeight,
                    paddleWidth
                )
            });
        }

        return new Game({
            id: randomUUID(),
            status: props.opponentId ? GameStatus.WAITING : GameStatus.WAITING,
            mode: props.mode,
            tournamentId: props.tournamentId,
            ball: initialBall,
            players,
            score: Score.create(),
            config,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    static fromSnapshot(snapshot: GameSnapshot): Game {
        const ball = Ball.create(
            Position.create(snapshot.ball.position.x, snapshot.ball.position.y),
            Velocity.create(snapshot.ball.velocity.dx, snapshot.ball.velocity.dy)
        );

        const players = snapshot.players.map((player) => ({
            id: player.id,
            isConnected: player.isConnected,
            ready: player.ready ?? false,
            paddle: Paddle.create(
                Position.create(player.paddle.position.x, player.paddle.position.y),
                player.paddle.height,
                player.paddle.width
            )
        }));

        return new Game({
            id: snapshot.id,
            status: snapshot.status,
            mode: snapshot.mode,
            tournamentId: snapshot.tournamentId,
            ball,
            players,
            score: Score.create(snapshot.score.player1, snapshot.score.player2),
            config: snapshot.config,
            createdAt: new Date(snapshot.createdAt),
            updatedAt: new Date(snapshot.updatedAt),
            startedAt: snapshot.startedAt ? new Date(snapshot.startedAt) : undefined,
            finishedAt: snapshot.finishedAt ? new Date(snapshot.finishedAt) : undefined
        });
    }

    get id(): string {
        return this.props.id;
    }

    get status(): GameStatus {
        return this.props.status;
    }

    get players(): GamePlayerState[] {
        return [...this.props.players];
    }

    get ball(): Ball {
        return this.props.ball;
    }

    get score(): Score {
        return this.props.score;
    }

    get config(): GameConfig {
        return this.props.config;
    }

    get mode(): GameMode {
        return this.props.mode;
    }

    get tournamentId(): string | undefined {
        return this.props.tournamentId;
    }

    get createdAt(): Date {
        return this.props.createdAt;
    }

    get updatedAt(): Date {
        return this.props.updatedAt;
    }

    get startedAt(): Date | undefined {
        return this.props.startedAt;
    }

    get finishedAt(): Date | undefined {
        return this.props.finishedAt;
    }

    start(): void {
        if (this.props.status !== GameStatus.WAITING) {
            return;
        }

        if (this.props.players.length < 2) {
            throw new Error('Cannot start a game without two players');
        }

        this.resetForStart();
        this.props.status = GameStatus.IN_PROGRESS;
        this.props.startedAt = new Date();
        this.touch();
    }

    finish(): void {
        this.props.status = GameStatus.FINISHED;
        this.props.finishedAt = new Date();
        this.touch();
    }

  cancel(): void {
    this.props.status = GameStatus.CANCELLED;
    this.props.finishedAt = new Date();
    this.touch();
  }

    updateBall(nextBall: Ball): void {
        this.props.ball = nextBall;
        this.touch();
    }

    updateScore(score: Score): void {
        this.props.score = score;
        this.touch();
    }

    movePaddle(playerId: string, direction: 'up' | 'down', deltaTime: number): void {
        const player = this.findPlayer(playerId);
        if (!player) {
            throw new Error(`Player ${playerId} not in game`);
        }

        const distance = this.props.config.paddleSpeed * deltaTime * (direction === 'up' ? -1 : 1);
        const newPaddle = player.paddle.move(distance);
        player.paddle = this.clampPaddle(newPaddle);
        this.touch();
    }

    setPaddlePosition(playerId: string, y: number): void {
        const player = this.findPlayer(playerId);
        if (!player) {
            throw new Error(`Player ${playerId} not in game`);
        }

        const next = Paddle.create(
            Position.create(player.paddle.position.x, y),
            player.paddle.height,
            player.paddle.width
        );
        player.paddle = this.clampPaddle(next);
        this.touch();
    }

    disconnectPlayer(playerId: string): void {
        const player = this.findPlayer(playerId);
        if (!player) {
            return;
        }

        player.isConnected = false;
        this.touch();
    }

    reconnectPlayer(playerId: string): void {
        const player = this.findPlayer(playerId);
        if (!player) {
            return;
        }

        player.isConnected = true;
        this.touch();
    }

    markPlayerReady(playerId: string): boolean {
        const player = this.findPlayer(playerId);
        if (!player) {
            throw new Error(`Player ${playerId} not in game`);
        }

        player.ready = true;
        this.touch();
        return this.arePlayersReady();
    }

    arePlayersReady(): boolean {
        return this.props.players.length >= 2 && this.props.players.every((player) => player.ready);
    }

    addOpponent(playerId: string): void {
        if (this.props.players.length >= 2) {
            return;
        }

        const paddleHeight = 80;
        const paddleWidth = 12;
        this.props.players.push({
            id: playerId,
            isConnected: true,
            paddle: Paddle.create(
                Position.create(this.props.config.arenaWidth - 24 - paddleWidth, (this.props.config.arenaHeight - paddleHeight) / 2),
                paddleHeight,
                paddleWidth
            ),
            ready: false,
        });
      this.touch();
    }

  removePlayer(playerId: string): void {
    this.props.players = this.props.players.filter((player) => player.id !== playerId);
        this.touch();
    }

    toSnapshot(): GameSnapshot {
        return {
            id: this.props.id,
            status: this.props.status,
            mode: this.props.mode,
            tournamentId: this.props.tournamentId,
            ball: {
                position: { x: this.props.ball.position.x, y: this.props.ball.position.y },
                velocity: { dx: this.props.ball.velocity.dx, dy: this.props.ball.velocity.dy }
            },
            players: this.props.players.map((player) => ({
                id: player.id,
                isConnected: player.isConnected,
                ready: player.ready,
                paddle: {
                    position: {
                        x: player.paddle.position.x,
                        y: player.paddle.position.y
                    },
                    height: player.paddle.height,
                    width: player.paddle.width
                }
            })),
            score: { player1: this.props.score.player1, player2: this.props.score.player2 },
            config: this.props.config,
            createdAt: this.props.createdAt.toISOString(),
            updatedAt: this.props.updatedAt.toISOString(),
            startedAt: this.props.startedAt?.toISOString(),
            finishedAt: this.props.finishedAt?.toISOString()
        };
    }

    private clampPaddle(paddle: Paddle): Paddle {
        const topBoundary = 0;
        const bottomBoundary = this.props.config.arenaHeight - paddle.height;
        const nextY = Math.min(Math.max(paddle.position.y, topBoundary), bottomBoundary);
        return Paddle.create(
            Position.create(paddle.position.x, nextY),
            paddle.height,
            paddle.width
        );
    }

    private findPlayer(playerId: string): GamePlayerState | undefined {
        return this.props.players.find((player) => player.id === playerId);
    }

    private touch(): void {
        this.props.updatedAt = new Date();
    }

    private resetForStart(): void {
        // Center ball and paddles; reset score to zero
        const centerX = this.props.config.arenaWidth / 2;
        const centerY = this.props.config.arenaHeight / 2;
        const direction = Math.random() > 0.5 ? 1 : -1;
        const resetVelocity = Velocity.create(this.props.config.ballSpeed * direction, this.props.config.ballSpeed);
        const resetPosition = Position.create(centerX, centerY);
        this.props.ball = Ball.create(resetPosition, resetVelocity);
        this.props.score = Score.create(0, 0);

        const paddleHeight = this.props.players[0]?.paddle.height ?? 80;
        const paddleWidth = this.props.players[0]?.paddle.width ?? 12;
        this.props.players = this.props.players.map((player, idx) => {
            const x = idx === 0 ? 24 : this.props.config.arenaWidth - 24 - paddleWidth;
            const y = (this.props.config.arenaHeight - paddleHeight) / 2;
            return {
                ...player,
                paddle: Paddle.create(Position.create(x, y), paddleHeight, paddleWidth),
            };
        });
    }
}

export function resolveSpeed(value: unknown, fallback: number): number {
    const num = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    if (num <= 0) return fallback;
    // Treat small values as "per frame" legacy inputs; convert to units/second.
    if (num <= 30) {
        return num * 60;
    }
    return num;
}
