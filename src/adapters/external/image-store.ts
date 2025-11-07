import { ImageStore } from '../../domain/user/ports';
import { promises as fs } from 'fs';
import { join } from 'path';

// MOCK IMPLEMENTATION - Basic local file storage (enhance for production with cloud storage, validation, etc.)
export class LocalImageStore implements ImageStore {
  constructor(private uploadDir: string) {
    console.log(`MOCK: LocalImageStore initialized with upload directory: ${uploadDir}`);
  }

  async save(image: Buffer, filename: string): Promise<string> {
    const path = join(this.uploadDir, filename);
    await fs.writeFile(path, image);
    return path;
  }

  async delete(path: string): Promise<void> {
    await fs.unlink(path);
  }
}
