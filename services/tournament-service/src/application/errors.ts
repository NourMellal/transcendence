export class AppError extends Error {
    constructor(public readonly message: string, public readonly statusCode: number) {
        super(message);
        this.name = 'AppError';
    }
}

export const Errors = {
    notFound: (message: string) => new AppError(message, 404),
    badRequest: (message: string) => new AppError(message, 400),
    forbidden: (message: string) => new AppError(message, 403),
    conflict: (message: string) => new AppError(message, 409),
    unauthorized: (message: string) => new AppError(message, 401)
};
