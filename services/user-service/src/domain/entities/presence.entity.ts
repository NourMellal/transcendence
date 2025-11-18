export enum PresenceStatus {
    ONLINE = 'online',
    OFFLINE = 'offline',
}

export interface UserPresence {
    userId: string;
    status: PresenceStatus;
    lastSeenAt: Date;
}
