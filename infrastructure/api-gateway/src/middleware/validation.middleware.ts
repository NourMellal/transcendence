/**
 * Request Validation Middleware
 *
 * Provides schema validation for incoming requests using Zod schemas
 * Rejects malformed payloads early at the gateway layer
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ZodSchema } from 'zod';

/**
 * Validate request body against Zod schema
 */
export function validateRequestBody(schema: ZodSchema) {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        try {
            // Parse and validate request body
            const validated = schema.parse(request.body);

            // Replace request body with validated data
            request.body = validated;
        } catch (error: any) {
            const zodError = error as { errors?: Array<{ path: string[]; message: string }> };

            return reply.code(400).send({
                statusCode: 400,
                error: 'Validation Error',
                message: 'Invalid request format',
                errors: zodError.errors?.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                })) || [],
                timestamp: new Date().toISOString(),
            });
        }
    };
}

/**
 * Validate request query parameters against Zod schema
 */
export function validateRequestQuery(schema: ZodSchema) {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        try {
            // Parse and validate query parameters
            const validated = schema.parse(request.query);

            // Replace query with validated data
            request.query = validated;
        } catch (error: any) {
            const zodError = error as { errors?: Array<{ path: string[]; message: string }> };

            return reply.code(400).send({
                statusCode: 400,
                error: 'Validation Error',
                message: 'Invalid query parameters',
                errors: zodError.errors?.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                })) || [],
                timestamp: new Date().toISOString(),
            });
        }
    };
}

/**
 * Validate request params against Zod schema
 */
export function validateRequestParams(schema: ZodSchema) {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        try {
            // Parse and validate path parameters
            const validated = schema.parse(request.params);

            // Replace params with validated data
            request.params = validated;
        } catch (error: any) {
            const zodError = error as { errors?: Array<{ path: string[]; message: string }> };

            return reply.code(400).send({
                statusCode: 400,
                error: 'Validation Error',
                message: 'Invalid path parameters',
                errors: zodError.errors?.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                })) || [],
                timestamp: new Date().toISOString(),
            });
        }
    };
}

/**
 * Content-Type validation middleware
 * Ensures proper Content-Type header for requests with body
 */
export function validateContentType(allowedTypes: string[] = ['application/json']) {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        // Skip validation for GET/DELETE requests (no body expected)
        if (request.method === 'GET' || request.method === 'DELETE') {
            return;
        }

        const contentType = request.headers['content-type'];

        if (!contentType) {
            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Content-Type header is required',
                timestamp: new Date().toISOString(),
            });
        }

        // Check if Content-Type matches allowed types
        const isValid = allowedTypes.some((type) => contentType.includes(type));

        if (!isValid) {
            return reply.code(415).send({
                statusCode: 415,
                error: 'Unsupported Media Type',
                message: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
                received: contentType,
                timestamp: new Date().toISOString(),
            });
        }
    };
}

/**
 * Basic input sanitization middleware
 * Detects common XSS and SQL injection patterns
 */
export function sanitizeInput() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        const dangerousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i, // onload=, onclick=, etc.
            /eval\(/i,
            /--\s*$/,  // SQL comments
            /;\s*DROP/i,
            /UNION.*SELECT/i,
        ];

        const checkValue = (value: any): boolean => {
            if (typeof value === 'string') {
                return dangerousPatterns.some((pattern) => pattern.test(value));
            }
            if (typeof value === 'object' && value !== null) {
                return Object.values(value).some(checkValue);
            }
            return false;
        };

        // Check body, query, and params
        const hasInjection =
            checkValue(request.body) ||
            checkValue(request.query) ||
            checkValue(request.params);

        if (hasInjection) {
            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Potentially malicious input detected',
                timestamp: new Date().toISOString(),
            });
        }
    };
}
