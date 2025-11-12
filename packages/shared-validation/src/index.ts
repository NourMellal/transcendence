import { z } from 'zod';

// User validation schemas
export const signUpSchema = z.object({
    email: z.string().email('Invalid email format'),
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must not exceed 20 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password must not exceed 100 characters'),
    displayName: z.string()
        .min(1, 'Display name is required')
        .max(100, 'Display name must not exceed 100 characters')
        .optional()
});

export const createUserSchema = z.object({
    email: z.string().email('Invalid email format'),
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must not exceed 20 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    displayName: z.string()
        .min(1, 'Display name is required')
        .max(50, 'Display name must not exceed 50 characters')
        .optional()
});

export const updateUserSchema = z.object({
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must not exceed 20 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
        .optional(),
    displayName: z.string()
        .min(1, 'Display name is required')
        .max(50, 'Display name must not exceed 50 characters')
        .optional(),
    avatar: z.string().url('Invalid avatar URL').optional()
});

// Authentication validation schemas
export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters')
});

export const enable2FASchema = z.object({
    token: z.string()
        .length(6, '2FA token must be exactly 6 digits')
        .regex(/^\d{6}$/, '2FA token must contain only digits')
});

export const verify2FASchema = z.object({
    token: z.string()
        .length(6, '2FA token must be exactly 6 digits')
        .regex(/^\d{6}$/, '2FA token must contain only digits')
});

// Common validation utilities
export const idSchema = z.string().min(1, 'ID is required');

export const paginationSchema = z.object({
    page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
    limit: z.coerce.number().min(1).max(100, 'Limit must be between 1 and 100').default(10)
});

// File upload validation
export const imageUploadSchema = z.object({
    filename: z.string().min(1, 'Filename is required'),
    mimetype: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp'], {
        errorMap: () => ({ message: 'Only JPEG, PNG, GIF, and WebP images are allowed' })
    }),
    size: z.number().max(5 * 1024 * 1024, 'File size must not exceed 5MB')
});

// Game validation schemas (placeholder for future use)
export const createGameSchema = z.object({
    gameType: z.enum(['classic', 'tournament'], {
        errorMap: () => ({ message: 'Game type must be either classic or tournament' })
    }),
    maxScore: z.number().min(1).max(21).default(11)
});

// Chat validation schemas (placeholder for future use)
export const sendMessageSchema = z.object({
    content: z.string()
        .min(1, 'Message content is required')
        .max(1000, 'Message must not exceed 1000 characters'),
    type: z.enum(['text', 'system']).default('text')
});

// Friend validation schemas
export const sendFriendRequestSchema = z.object({
    friendId: z.string().uuid('Friend ID must be a valid UUID'),
});

export const respondFriendRequestSchema = z.object({
    status: z.enum(['accepted', 'rejected'], {
        errorMap: () => ({ message: 'Status must be accepted or rejected' })
    })
});

// Tournament validation schemas (placeholder for future use)
export const createTournamentSchema = z.object({
    name: z.string()
        .min(3, 'Tournament name must be at least 3 characters')
        .max(100, 'Tournament name must not exceed 100 characters'),
    maxParticipants: z.number()
        .min(4, 'Tournament must have at least 4 participants')
        .max(64, 'Tournament cannot exceed 64 participants')
});

// Param validation schemas
export const idParamSchema = z.object({
    id: z.string().min(1, 'ID is required'),
});

export const gameIdParamSchema = z.object({
    gameId: z.string().min(1, 'Game ID is required'),
});

export const tournamentIdParamSchema = z.object({
    tournamentId: z.string().min(1, 'Tournament ID is required'),
});

export const userIdParamSchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
});

export const friendshipIdParamSchema = z.object({
    friendshipId: z.string().uuid('friendshipId must be a valid UUID'),
});

// Export types inferred from schemas
export type SignUpInput = z.infer<typeof signUpSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type Enable2FAInput = z.infer<typeof enable2FASchema>;
export type Verify2FAInput = z.infer<typeof verify2FASchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type ImageUploadInput = z.infer<typeof imageUploadSchema>;
export type CreateGameInput = z.infer<typeof createGameSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
