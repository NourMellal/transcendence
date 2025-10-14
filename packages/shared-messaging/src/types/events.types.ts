import { User, Game, ChatMessage, Tournament } from '@transcendence/shared-types';

export enum UserEvents {
    USER_CREATED = 'user.created',
    USER_UPDATED = 'user.updated',
    USER_DELETED = 'user.deleted',
    USER_2FA_ENABLED = 'user.2fa.enabled',
    USER_2FA_DISABLED = 'user.2fa.disabled',
    STATUS_UPDATED = 'user.status.updated',
}

export enum ChatEvents {
    MESSAGE_SENT = 'chat.message.sent',
    ROOM_CREATED = 'chat.room.created',
    USER_JOINED = 'chat.user.joined',
    USER_LEFT = 'chat.user.left',
}

export enum GameEvents {
    CREATED = 'game.created',
    STARTED = 'game.started',
    COMPLETED = 'game.completed',
    MOVE_MADE = 'game.move.made',
}

export enum TournamentEvents {
    CREATED = 'tournament.created',
    STARTED = 'tournament.started',
    COMPLETED = 'tournament.completed',
    PLAYER_JOINED = 'tournament.player.joined',
}

export type EventType =
    | UserEvents
    | ChatEvents
    | GameEvents
    | TournamentEvents;

export interface EventPayload<T = unknown> {
    eventId: string;
    timestamp: Date;
    data: T;
}
