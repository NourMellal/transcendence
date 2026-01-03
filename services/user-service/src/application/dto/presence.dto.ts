export type PresenceStatusDTO = 'ONLINE' | 'OFFLINE' | 'INGAME';

export interface UpdatePresenceInputDTO {
    readonly userId: string;
    readonly status: PresenceStatusDTO;
}

export interface GetPresenceInputDTO {
    readonly userId: string;
}

export interface PresenceResponseDTO {
    readonly userId: string;
    readonly status: PresenceStatusDTO;
    readonly lastSeenAt: string;
}
