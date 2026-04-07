import { Logger } from './logger';
import { ProcessResult } from './processor';

interface QueuedTask {
  filePath: string;
  processor: () => Promise<ProcessResult>;
}

interface QueueStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
}

export class ProcessingQueue {
  private queue: QueuedTask[] = [];
  private processing: Set<string> = new Set();
  private completed: Set<string> = new Set();
  private failed: Set<string> = new Set();
  private logger: Logger;
  private concurrency: number;
  private activeProcessing: number = 0;

  constructor(logger: Logger, concurrency: number = 2) {
    this.logger = logger;
    this.concurrency = concurrency;
  }

  /**
   * Add a file to the queue
   */
  enqueue(filePath: string, processor: () => Promise<ProcessResult>): void {
    if (this.isQueued(filePath)) {
      this.logger.debug(`File already queued: ${filePath}`);
      return;
    }

    this.queue.push({ filePath, processor });
    this.logger.debug(`Enqueued: ${filePath} (queue size: ${this.queue.length})`);
    this.processQueue();
  }

  /**
   * Check if file is already queued or processing
   */
  isQueued(filePath: string): boolean {
    return (
      this.processing.has(filePath) ||
      this.queue.some((task) => task.filePath === filePath)
    );
  }

  /**
   * Get queue stats
   */
  getStats(): QueueStats {
    return {
      queued: this.queue.length,
      processing: this.processing.size,
      completed: this.completed.size,
      failed: this.failed.size,
    };
  }

  /**
   * Wait for queue to drain
   */
  async drain(): Promise<void> {
    while (this.queue.length > 0 || this.activeProcessing > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.logger.info('Queue drained');
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.activeProcessing < this.concurrency) {
      const task = this.queue.shift();
      if (!task) break;

      this.activeProcessing++;
      this.processing.add(task.filePath);

      this.processTask(task).finally(() => {
        this.activeProcessing--;
        this.processing.delete(task.filePath);
        this.processQueue();
      });
    }
  }

  private async processTask(task: QueuedTask): Promise<void> {
    try {
      const result = await task.processor();

      if (result.status === 'error') {
        this.failed.add(task.filePath);
        this.logger.warn(`Task failed: ${task.filePath} - ${result.error}`);
      } else {
        this.completed.add(task.filePath);
        this.logger.debug(`Task completed: ${task.filePath} (status: ${result.status})`);
      }
    } catch (error) {
      this.failed.add(task.filePath);
      this.logger.error(
        `Task threw error: ${task.filePath} - ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
