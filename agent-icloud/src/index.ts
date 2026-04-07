import { watch } from 'chokidar';
import { readdirSync } from 'fs';
import { join } from 'path';
import { Logger } from './logger';
import { loadConfig, Config } from './config';
import { ApiClient } from './api-client';
import { StateManager } from './state-manager';
import { FileProcessor } from './processor';
import { ProcessingQueue } from './queue';

const VERSION = '0.1.0';

function printBanner(config: Config, processedCount: number): void {
  const line = '╔════════════════════════════════════╗';
  const space = '║                                    ║';
  const title = `║   iCloud Agent v${VERSION}             ║`;
  const watchPath = config.watchPath.length > 20
    ? config.watchPath.substring(config.watchPath.length - 20)
    : config.watchPath;
  const watching = `║   Watching: ${watchPath.padEnd(21)}║`;
  const backendUrl = config.backendUrl.length > 23
    ? config.backendUrl.substring(config.backendUrl.length - 23)
    : config.backendUrl;
  const backend = `║   Backend: ${backendUrl.padEnd(23)}║`;
  const tracked = `║   Files tracked: ${processedCount.toString().padEnd(17)}║`;
  const bottom = '╚════════════════════════════════════╝';

  console.log(line);
  console.log(space);
  console.log(title);
  console.log(watching);
  console.log(backend);
  console.log(tracked);
  console.log(space);
  console.log(bottom);
}

async function main() {
  // 1. Load config from environment
  const baseLogger = new Logger('info');
  const config = loadConfig(baseLogger);

  // 2. Create logger with configured level
  const logger = new Logger(config.logLevel);

  // 3. Create state manager and load existing state
  const stateManager = new StateManager(config.stateFile, logger);

  // 4. Create API client
  const apiClient = new ApiClient(config.backendUrl, config.agentToken, logger);

  // 5. Health check backend
  logger.info('Performing initial health check...');
  const health = await apiClient.healthCheck();
  if (!health.healthy) {
    logger.error(`Backend health check failed: ${health.message}`);
    process.exit(1);
  }
  logger.info('Backend health check passed');

  // 6. Create file processor
  const processor = new FileProcessor(
    {
      maxRetries: config.maxRetries,
      retryDelayMs: config.retryDelayMs,
      maxFileSizeBytes: config.maxFileSizeBytes,
      minFileAgeSeconds: config.minFileAgeSeconds,
      allowedExtensions: config.allowedExtensions,
    },
    apiClient,
    stateManager,
    logger
  );

  // 7. Create processing queue
  const queue = new ProcessingQueue(logger, config.queueConcurrency);

  // 8. Print startup banner
  printBanner(config, stateManager.getProcessedCount());

  // 9. Create folder watcher
  logger.info(`Starting file watcher on: ${config.watchPath}`);

  const watcher = watch(config.watchPath, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
    ignored: /(^|[\/\\])\.|\.icloud$/,
    cwd: config.watchPath,
  });

  // 10. Watcher callbacks
  watcher.on('add', (filePath: string) => {
    const fullPath = join(config.watchPath, filePath);
    logger.debug(`File added: ${fullPath}`);
    queue.enqueue(fullPath, () => processor.processWithRetry(fullPath));
  });

  watcher.on('change', (filePath: string) => {
    const fullPath = join(config.watchPath, filePath);
    logger.debug(`File changed: ${fullPath}`);
    // Don't re-process if already processed
    if (!stateManager.isProcessed(fullPath)) {
      queue.enqueue(fullPath, () => processor.processWithRetry(fullPath));
    }
  });

  watcher.on('error', (error) => {
    logger.error(`Watcher error: ${error}`);
  });

  watcher.on('ready', () => {
    logger.info('Initial file scan complete, watching for changes');
  });

  // 11. Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`\nReceived ${signal}, shutting down gracefully...`);

    // Stop watching
    await watcher.close();
    logger.info('File watcher stopped');

    // Wait for queue to drain
    await queue.drain();
    logger.info('Processing queue drained');

    // Save state
    stateManager.saveState();
    logger.info('Agent state saved');

    logger.info('Goodbye!');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Log startup info
  logger.info('Agent started successfully');
  logger.info(`Watched path: ${config.watchPath}`);
  logger.info(`Backend URL: ${config.backendUrl}`);
  logger.info(`Files already tracked: ${stateManager.getProcessedCount()}`);
  logger.info(`Failed files: ${stateManager.getFailedCount()}`);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  const logger = new Logger('error');
  logger.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const logger = new Logger('error');
  logger.error(`Unhandled rejection: ${reason}`);
  process.exit(1);
});

// Start the agent
main().catch((error) => {
  const logger = new Logger('error');
  logger.error(`Failed to start agent: ${error.message}`);
  process.exit(1);
});
