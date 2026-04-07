import { Logger } from './logger';

export interface Config {
  // Agent settings
  watchPath: string;
  stateFile: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // Backend settings
  backendUrl: string;
  agentToken: string;

  // File processing
  allowedExtensions: string[];
  maxFileSizeBytes: number;
  minFileAgeSeconds: number;

  // Retry settings
  maxRetries: number;
  retryDelayMs: number;

  // Queue settings
  queueConcurrency: number;

  // Watcher settings
  pollingIntervalMs: number;
}

export function loadConfig(logger: Logger): Config {
  const required = ['ICLOUD_WATCH_PATH', 'BACKEND_URL', 'AGENT_TOKEN'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  return {
    watchPath: process.env.ICLOUD_WATCH_PATH!,
    stateFile: process.env.STATE_FILE || './agent-state.json',
    logLevel: (process.env.LOG_LEVEL as any) || 'info',

    backendUrl: process.env.BACKEND_URL!,
    agentToken: process.env.AGENT_TOKEN!,

    allowedExtensions: (process.env.ALLOWED_EXTENSIONS || '.epub,.pdf').split(','),
    maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10) * 1024 * 1024,
    minFileAgeSeconds: parseInt(process.env.MIN_FILE_AGE_SECONDS || '5', 10),

    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),

    queueConcurrency: parseInt(process.env.QUEUE_CONCURRENCY || '2', 10),

    pollingIntervalMs: parseInt(process.env.POLLING_INTERVAL_MS || '2000', 10),
  };
}
