import { Server as SocketIOServer } from 'socket.io';

export class RoomManager {
    private userRooms = new Map<string, Set<string>>();

    attachServer(io: SocketIOServer): void {
    }

    joinGlobalRoom(socketId: string, userId: string): void {
        if (!this.userRooms.has(userId)) {
            this.userRooms.set(userId, new Set());
        }
        this.userRooms.get(userId)!.add('global');
    }

    joinUserRoom(socketId: string, userId: string): void {
        if (!this.userRooms.has(userId)) {
            this.userRooms.set(userId, new Set());
        }
        this.userRooms.get(userId)!.add(`user:${userId}`);
    }

    joinGameRoom(socketId: string, userId: string, gameId: string): void {
        if (!this.userRooms.has(userId)) {
            this.userRooms.set(userId, new Set());
        }
        this.userRooms.get(userId)!.add(`game:${gameId}`);
    }

    leaveAllRooms(userId: string): void {
        this.userRooms.delete(userId);
    }

    getUserRooms(userId: string): string[] {
        return Array.from(this.userRooms.get(userId) || []);
    }
}
