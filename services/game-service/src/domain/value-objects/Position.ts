export class Position {
    private constructor(
        public readonly x: number,
        public readonly y: number
    ) {}

    static create(x: number, y: number): Position {
        return new Position(x, y);
    }

    moveBy(dx: number, dy: number): Position {
        return new Position(this.x + dx, this.y + dy);
    }
}
