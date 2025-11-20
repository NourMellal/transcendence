import { Position, Velocity } from '../value-objects';

export interface BallProps {
    readonly position: Position;
    readonly velocity: Velocity;
}

export class Ball {
    private constructor(private props: BallProps) {}

    static create(position: Position, velocity: Velocity): Ball {
        return new Ball({ position, velocity });
    }

    get position(): Position {
        return this.props.position;
    }

    get velocity(): Velocity {
        return this.props.velocity;
    }

    move(deltaTime: number): Ball {
        const dx = this.velocity.dx * deltaTime;
        const dy = this.velocity.dy * deltaTime;
        return new Ball({
            position: this.position.moveBy(dx, dy),
            velocity: this.velocity
        });
    }

    updateVelocity(velocity: Velocity): Ball {
        return new Ball({ position: this.position, velocity });
    }

    toJSON(): BallProps {
        return {
            position: Position.create(this.position.x, this.position.y),
            velocity: Velocity.create(this.velocity.dx, this.velocity.dy)
        };
    }
}
