import { ImageStorageService } from '../../domain/ports.js';
import { promises as fs } from 'fs';
import path from 'path';

export class LocalImageStorageService implements ImageStorageService {
    constructor(private readonly uploadDir: string) { }

    async saveImage(buffer: Buffer, filename: string): Promise<string> {
        // Ensure upload directory exists
        await fs.mkdir(this.uploadDir, { recursive: true });

        const filePath = path.join(this.uploadDir, filename);
        await fs.writeFile(filePath, buffer);

        return filename; // Return relative path
    }

    async deleteImage(imagePath: string): Promise<void> {
        const fullPath = imagePath.startsWith('/') ? imagePath : path.join(this.uploadDir, imagePath);
        try {
            await fs.unlink(fullPath);
        } catch (error) {
            // File might not exist, ignore error
        }
    }

    getImageUrl(imagePath: string): string {
        return `/uploads/${imagePath}`;
    }
}
