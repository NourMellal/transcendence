export class Score {
    private constructor(
        public readonly player1: number,
        public readonly player2: number
    ) {}

    static create(initialPlayer1 = 0, initialPlayer2 = 0): Score {
        return new Score(initialPlayer1, initialPlayer2);
    }

    incrementPlayer1(): Score {
        return new Score(this.player1 + 1, this.player2);
    }

    incrementPlayer2(): Score {
        return new Score(this.player1, this.player2 + 1);
    }
}
