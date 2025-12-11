import crypto from 'crypto';

/**
 * Friendship domain model
 * Represents any social relationship between two users
 */
export enum FriendshipStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected',
    BLOCKED = 'blocked',
}

export interface Friendship {
    id: string;
    requesterId: string;
    addresseeId: string;
    status: FriendshipStatus;
    createdAt: Date;
    updatedAt: Date;
    respondedAt?: Date;
    blockedBy?: string;
    note?: string;
}

export type FriendshipTransition =
    | { type: 'ACCEPT' }
    | { type: 'REJECT' }
    | { type: 'CANCEL' }
    | { type: 'BLOCK'; blockedBy: string }
    | { type: 'UNBLOCK' };

export class FriendshipDomain {
    static createRequest(requesterId: string, addresseeId: string): Friendship {
        if (requesterId === addresseeId) {
            throw new Error('Cannot send friend request to yourself');
        }

        const now = new Date();
        return {
            id: crypto.randomUUID(),
            requesterId,
            addresseeId,
            status: FriendshipStatus.PENDING,
            createdAt: now,
            updatedAt: now,
        };
    }

    static createBlocked(requesterId: string, addresseeId: string, blockedBy: string): Friendship {
        if (blockedBy !== requesterId && blockedBy !== addresseeId) {
            throw new Error('BlockedBy must be part of the friendship');
        }
        const now = new Date();
        return {
            id: crypto.randomUUID(),
            requesterId,
            addresseeId,
            status: FriendshipStatus.BLOCKED,
            blockedBy,
            createdAt: now,
            updatedAt: now,
        };
    }

    static transition(friendship: Friendship, transition: FriendshipTransition): Friendship {
        switch (transition.type) {
            case 'ACCEPT':
                this.ensureStatus(friendship, FriendshipStatus.PENDING);
                return {
                    ...friendship,
                    status: FriendshipStatus.ACCEPTED,
                    respondedAt: new Date(),
                    updatedAt: new Date(),
                    blockedBy: undefined,
                };
            case 'REJECT':
                this.ensureStatus(friendship, FriendshipStatus.PENDING);
                return {
                    ...friendship,
                    status: FriendshipStatus.REJECTED,
                    respondedAt: new Date(),
                    updatedAt: new Date(),
                    blockedBy: undefined,
                };
            case 'CANCEL':
                this.ensureStatus(friendship, FriendshipStatus.PENDING);
                return {
                    ...friendship,
                    status: FriendshipStatus.REJECTED,
                    respondedAt: new Date(),
                    updatedAt: new Date(),
                };
            case 'BLOCK':
                if (!transition.blockedBy) {
                    throw new Error('BlockedBy user must be provided');
                }
                if (
                    transition.blockedBy !== friendship.requesterId &&
                    transition.blockedBy !== friendship.addresseeId
                ) {
                    throw new Error('Only participants can block the friendship');
                }
                return {
                    ...friendship,
                    status: FriendshipStatus.BLOCKED,
                    blockedBy: transition.blockedBy,
                    updatedAt: new Date(),
                };
            case 'UNBLOCK':
                if (friendship.status !== FriendshipStatus.BLOCKED) {
                    throw new Error('Friendship is not blocked');
                }
                return {
                    ...friendship,
                    status: FriendshipStatus.REJECTED,
                    blockedBy: undefined,
                    updatedAt: new Date(),
                };
            default:
                return friendship;
        }
    }

    private static ensureStatus(friendship: Friendship, status: FriendshipStatus): void {
        if (friendship.status !== status) {
            throw new Error(`Invalid friendship status transition from ${friendship.status} to ${status}`);
        }
    }
}
