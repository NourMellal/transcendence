import { Position } from '../value-objects';

export interface PaddleProps {
    readonly position: Position;
    readonly height: number;
    readonly width: number;
}

export class Paddle {
    private constructor(private props: PaddleProps) {}

    static create(position: Position, height: number, width: number): Paddle {
        return new Paddle({ position, height, width });
    }

    get position(): Position {
        return this.props.position;
    }

    get height(): number {
        return this.props.height;
    }

    get width(): number {
        return this.props.width;
    }

    move(deltaY: number): Paddle {
        return new Paddle({
            position: Position.create(this.position.x, this.position.y + deltaY),
            height: this.height,
            width: this.width
        });
    }

    toJSON(): PaddleProps {
        return {
            position: Position.create(this.position.x, this.position.y),
            height: this.height,
            width: this.width
        };
    }
}
