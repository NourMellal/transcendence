export class Velocity {
    private constructor(
        public readonly dx: number,
        public readonly dy: number
    ) {}

    static create(dx: number, dy: number): Velocity {
        return new Velocity(dx, dy);
    }

    invertX(): Velocity {
        return new Velocity(-this.dx, this.dy);
    }

    invertY(): Velocity {
        return new Velocity(this.dx, -this.dy);
    }
}
