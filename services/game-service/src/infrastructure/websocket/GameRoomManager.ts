import { Server, Socket } from 'socket.io';

export interface JoinPayload {
    readonly gameId: string;
    readonly playerId: string;
}

export class GameRoomManager {
    private readonly roomPlayers = new Map<string, Set<string>>();
    private io?: Server;

    constructor(io?: Server) {
        this.io = io;
    }

    attachServer(io: Server): void {
        this.io = io;
    }

    join(payload: JoinPayload, socket: Socket): void {
        const players = this.roomPlayers.get(payload.gameId) ?? new Set<string>();
        players.add(payload.playerId);
        this.roomPlayers.set(payload.gameId, players);
        socket.join(payload.gameId);
        this.io?.to(payload.gameId).emit('player-joined', { playerId: payload.playerId });
    }

    leave(gameId: string, playerId: string): void {
        const players = this.roomPlayers.get(gameId);
        if (!players) {
            return;
        }

        players.delete(playerId);
        if (players.size === 0) {
            this.roomPlayers.delete(gameId);
        }
    }
}
