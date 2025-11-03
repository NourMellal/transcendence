/**
 * Centralized event type constants
 * Using dot notation for hierarchical naming: domain.action
 */
export enum EventType {
    // User Events
    USER_REGISTERED = 'user.registered',
    USER_PROFILE_UPDATED = 'user.profile.updated',
    USER_DELETED = 'user.deleted',
    USER_STATUS_CHANGED = 'user.status.changed',

    // Game Events
    GAME_STARTED = 'game.started',
    GAME_FINISHED = 'game.finished',
    GAME_ABORTED = 'game.aborted',
    PLAYER_JOINED = 'game.player.joined',
    PLAYER_LEFT = 'game.player.left',

    // Tournament Events
    TOURNAMENT_CREATED = 'tournament.created',
    TOURNAMENT_STARTED = 'tournament.started',
    TOURNAMENT_FINISHED = 'tournament.finished',
    TOURNAMENT_CANCELLED = 'tournament.cancelled',
    PLAYER_REGISTERED_FOR_TOURNAMENT = 'tournament.player.registered',
    MATCH_COMPLETED = 'tournament.match.completed',
}
