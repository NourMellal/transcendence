export enum PresenceStatus {
    ONLINE = 'ONLINE',
    OFFLINE = 'OFFLINE',
    INGAME = 'INGAME',
}

export interface UserPresence {
    userId: string;
    status: PresenceStatus;
    lastSeenAt: Date;
}
