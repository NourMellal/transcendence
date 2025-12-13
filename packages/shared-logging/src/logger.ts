import fs from 'fs';
import path from 'path';
import pino, { Logger as PinoLogger, LoggerOptions } from 'pino';

export type Logger = PinoLogger;

export interface CreateLoggerOptions {
    level?: string;
    pretty?: boolean;
    logDir?: string;
    logToFile?: boolean;
    serializers?: LoggerOptions['serializers'];
}

/**
 * Creates a pino logger configured for both console output and JSON file output.
 * File logs are designed to be scraped by Filebeat/Logstash for ELK ingestion.
 */
export function createLogger(serviceName: string, options: CreateLoggerOptions = {}): PinoLogger {
    const level = options.level ?? process.env.LOG_LEVEL ?? 'info';
    const pretty = options.pretty ?? process.env.LOG_PRETTY === 'true';
    const resolvedLogDir = resolveLogDir(options.logDir ?? process.env.LOG_DIR ?? resolveDefaultLogDir());
    const logToFile = options.logToFile ?? true;
    const env = process.env.NODE_ENV ?? 'development';

    let fileLoggingEnabled = logToFile;
    if (fileLoggingEnabled) {
        try {
            const stats = fs.statSync(resolvedLogDir);
            if (!stats.isDirectory()) {
                throw new Error(`${resolvedLogDir} is not a directory`);
            }
            fs.accessSync(resolvedLogDir, fs.constants.W_OK);
        } catch (error) {
            const err = error as Error;
            console.warn(
                `[logger] File logging disabled for ${serviceName}: ${err.message}. Create the directory or set LOG_DIR to a writable path.`
            );
            fileLoggingEnabled = false;
        }
    }

    // SonicBoom returned by pino.destination is not assignable to NodeJS.WritableStream
    // so we keep the stream typed as unknown and let pino handle it.
    const streams: Array<{ level: string; stream: any }> = [];

    // Console output (pretty or raw JSON)
    if (pretty) {
        try {
            const prettyTransport = pino.transport({
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname'
                }
            });
            streams.push({ level, stream: prettyTransport });
        } catch (error) {
            console.warn('[logger] Failed to initialize pretty logging, falling back to JSON.');
            streams.push({ level, stream: pino.destination(1) });
        }
    } else {
        streams.push({ level, stream: pino.destination(1) });
    }

    // JSON file output for log shipping
    if (fileLoggingEnabled) {
        const logFile = path.join(resolvedLogDir, `${serviceName}.log`);
        try {
            if (fs.existsSync(logFile)) {
                fs.accessSync(logFile, fs.constants.W_OK);
            }
            streams.push({ level, stream: pino.destination(logFile) });
        } catch (error) {
            const err = error as Error;
            console.warn(
                `[logger] File logging disabled for ${serviceName}: ${err.message}.`
            );
        }
    }

    const multistream = pino.multistream(streams);

    const loggerOptions: LoggerOptions = {
        level,
        messageKey: 'message',
        base: {
            service: serviceName,
            env
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
            level(label) {
                return { level: label };
            }
        },
        serializers: options.serializers
    };

    return pino(loggerOptions, multistream);
}

function resolveDefaultLogDir(): string {
    const cwd = process.cwd();
    const inServiceDir = cwd.includes(`${path.sep}services${path.sep}`);
    if (inServiceDir) {
        return path.resolve(cwd, '../../data/logs');
    }
    return path.resolve(cwd, 'data/logs');
}

function resolveLogDir(logDir: string): string {
    if (path.isAbsolute(logDir)) {
        return logDir;
    }
    const repoRoot = findRepoRoot(process.cwd());
    return path.resolve(repoRoot, logDir);
}

function findRepoRoot(startDir: string): string {
    let current = startDir;
    while (true) {
        if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml')) || fs.existsSync(path.join(current, '.git'))) {
            return current;
        }
        const parent = path.dirname(current);
        if (parent === current) {
            return startDir;
        }
        current = parent;
    }
}
