import { ImageStore } from '../../domain/user/ports';
import { promises as fs } from 'fs';
import { join } from 'path';

export class LocalImageStore implements ImageStore {
  constructor(private uploadDir: string) {}

  async save(image: Buffer, filename: string): Promise<string> {
    const path = join(this.uploadDir, filename);
    await fs.writeFile(path, image);
    return path;
  }

  async delete(path: string): Promise<void> {
    await fs.unlink(path);
  }
}
