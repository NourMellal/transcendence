import crypto from 'crypto';

export interface User {
    id: string;
    email: string;
    username: string;
    passwordHash?: string; // Optional for OAuth users
    displayName?: string;
    avatar?: string;
    twoFASecret?: string;
    is2FAEnabled: boolean;
    oauthProvider?: 'local' | '42';
    oauthId?: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Simple password hashing using Node.js crypto (scrypt)
 */
export class PasswordHelper {
    private static readonly SALT_LENGTH = 16;
    private static readonly KEY_LENGTH = 64;

    static async hash(password: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const salt = crypto.randomBytes(this.SALT_LENGTH).toString('hex');

            crypto.scrypt(password, salt, this.KEY_LENGTH, (err, derivedKey) => {
                if (err) reject(err);
                resolve(salt + ':' + derivedKey.toString('hex'));
            });
        });
    }

    static async verify(password: string, hash: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const [salt, key] = hash.split(':');

            crypto.scrypt(password, salt, this.KEY_LENGTH, (err, derivedKey) => {
                if (err) reject(err);
                resolve(key === derivedKey.toString('hex'));
            });
        });
    }
}

/**
 * Simple user factory
 */
export function createUser(data: {
    email: string;
    username: string;
    passwordHash?: string;
    displayName?: string;
    oauthProvider?: 'local' | '42';
    oauthId?: string;
}): User {
    return {
        id: crypto.randomUUID(),
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
        displayName: data.displayName || data.username,
        avatar: undefined,
        twoFASecret: undefined,
        is2FAEnabled: false,
        oauthProvider: data.oauthProvider || 'local',
        oauthId: data.oauthId,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
