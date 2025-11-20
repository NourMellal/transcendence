import crypto from 'crypto';
import type { IPasswordHasher } from '../../../domain/ports';

export class PasswordHasherAdapter implements IPasswordHasher {
    private static readonly SALT_LENGTH = 16;
    private static readonly KEY_LENGTH = 64;

    async hash(password: string): Promise<string> {
        const salt = crypto.randomBytes(PasswordHasherAdapter.SALT_LENGTH).toString('hex');
        const derivedKey = await this.scrypt(password, salt);
        return `${salt}:${derivedKey}`;
    }

    async verify(password: string, hash: string): Promise<boolean> {
        const [salt, key] = hash.split(':');
        if (!salt || !key) {
            return false;
        }
        const derivedKey = await this.scrypt(password, salt);
        return key === derivedKey;
    }

    private scrypt(password: string, salt: string): Promise<string> {
        return new Promise((resolve, reject) => {
            crypto.scrypt(password, salt, PasswordHasherAdapter.KEY_LENGTH, (err, derivedKey) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(derivedKey.toString('hex'));
            });
        });
    }
}
