// User domain types
export interface User {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    avatar?: string;
    is2FAEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Session {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
}

// Authentication types
export interface OAuth42Profile {
    id: number;
    email: string;
    login: string;
    first_name: string;
    last_name: string;
    image: {
        link: string;
    };
}

export interface TwoFASecret {
    secret: string;
    qrCodeUrl: string;
}

// API Response types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Game types (placeholder for future use)
export interface Game {
    id: string;
    player1Id: string;
    player2Id?: string;
    status: 'waiting' | 'playing' | 'finished';
    score: {
        player1: number;
        player2: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

// Chat types (placeholder for future use)
export interface ChatMessage {
    id: string;
    senderId: string;
    content: string;
    timestamp: Date;
    type: 'text' | 'system';
}

// Tournament types (placeholder for future use)
export interface Tournament {
    id: string;
    name: string;
    maxParticipants: number;
    currentParticipants: number;
    status: 'upcoming' | 'active' | 'completed';
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}
