import { Server, Socket } from 'socket.io';

export class GameRoomManager {
    private readonly roomPlayers = new Map<string, Set<string>>();
    private io?: Server;

    constructor(io?: Server) {
        this.io = io;
    }

    attachServer(io: Server): void {
        this.io = io;
    }

    join(gameId: string, playerId: string, socket: Socket): void {
        const players = this.roomPlayers.get(gameId) ?? new Set<string>();
        players.add(playerId);
        this.roomPlayers.set(gameId, players);
        socket.join(gameId);
        this.io?.to(gameId).emit('player_joined', {
            playerId,
            players: Array.from(players).map((id) => ({
                id,
                isConnected: true
            }))
        });
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

        this.io?.to(gameId).emit('player_left', {
            playerId,
            players: Array.from(players).map((id) => ({
                id,
                isConnected: true
            }))
        });
    }

    emitToGame(gameId: string, event: string, payload: unknown): void {
        this.io?.to(gameId).emit(event, payload);
    }

    getPlayerCount(gameId: string): number {
        return this.roomPlayers.get(gameId)?.size ?? 0;
    }
}
