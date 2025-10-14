export function serialize<T>(data: T): Buffer {
    try {
        return Buffer.from(JSON.stringify(data));
    } catch (e) {
        console.error(e);
    }
}

export function deserialize<T>(buffer: Buffer): T {
    try {
        return JSON.parse(buffer.toString()) as T;
    } catch (e) {
        console.error(e);
    }
}