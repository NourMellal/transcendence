/**
 * Error Handler Utility
 * Centralizes error handling logic for HTTP controllers
 */

import type { FastifyReply } from 'fastify';

export class ErrorHandler {
    /**
     * Handle profile update errors
     * Determines appropriate HTTP status code and error message
     */
    static handleUpdateProfileError(error: any, reply: FastifyReply): void {
        if (error.message.includes('not found')) {
            reply.code(404).send({
                error: 'Not Found',
                message: error.message
            });
        } else if (
            error.message.includes('already exists') ||
            error.message.includes('already taken')
        ) {
            reply.code(409).send({
                error: 'Conflict',
                message: error.message
            });
        } else if (
            error.message.includes('Invalid') ||
            error.message.includes('must be') ||
            error.message.includes('must contain') ||
            error.message.includes('Cannot update')
        ) {
            reply.code(400).send({
                error: 'Bad Request',
                message: error.message
            });
        } else {
            reply.code(500).send({
                error: 'Internal Server Error',
                message: process.env.NODE_ENV === 'development'
                    ? error.message
                    : 'An error occurred while updating profile'
            });
        }
    }
}
