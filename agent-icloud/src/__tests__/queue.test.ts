import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessingQueue } from '../queue';
import { Logger } from '../logger';

describe('ProcessingQueue', () => {
  let queue: ProcessingQueue;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger('info');
    queue = new ProcessingQueue(logger, 2);
  });

  it('should enqueue items', async () => {
    const processor = vi.fn().mockResolvedValue({
      filePath: '/path/to/file.epub',
      status: 'uploaded',
      retries: 0,
    });

    queue.enqueue('/path/to/file.epub', processor);

    await queue.drain();

    const stats = queue.getStats();
    expect(stats.completed).toBe(1);
  });

  it('should process items sequentially respecting concurrency', async () => {
    const processingTimes: number[] = [];
    const startTimes: Record<string, number> = {};
    const endTimes: Record<string, number> = {};

    const createProcessor = (filePath: string) => {
      return vi.fn(async () => {
        startTimes[filePath] = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 50));
        endTimes[filePath] = Date.now();

        return {
          filePath,
          status: 'uploaded',
          retries: 0,
        };
      });
    };

    queue.enqueue('/file1', createProcessor('/file1'));
    queue.enqueue('/file2', createProcessor('/file2'));
    queue.enqueue('/file3', createProcessor('/file3'));

    await queue.drain();

    // With concurrency of 2, we should have max 2 files processing simultaneously
    // File1 and File2 start together (concurrency 2)
    // File3 starts after one of them finishes
    expect(Object.keys(startTimes).length).toBe(3);
  });

  it('should prevent duplicate file paths in queue', async () => {
    const processor = vi.fn().mockResolvedValue({
      filePath: '/path/to/file.epub',
      status: 'uploaded',
    });

    queue.enqueue('/path/to/file.epub', processor);
    queue.enqueue('/path/to/file.epub', processor); // Duplicate

    const stats = queue.getStats();
    // Only one should be queued
    expect(stats.queued + stats.processing).toBe(1);

    await queue.drain();
    // Only called once
    expect(processor).toHaveBeenCalledTimes(1);
  });

  it('should track queued status', async () => {
    const processor = vi.fn().mockResolvedValue({
      filePath: '/path/to/file.epub',
      status: 'uploaded',
    });

    expect(queue.isQueued('/path/to/file.epub')).toBe(false);

    queue.enqueue('/path/to/file.epub', processor);

    expect(queue.isQueued('/path/to/file.epub')).toBe(true);

    await queue.drain();

    expect(queue.isQueued('/path/to/file.epub')).toBe(false);
  });

  it('should track completed items', async () => {
    const processor = vi.fn().mockResolvedValue({
      filePath: '/path/to/file.epub',
      status: 'uploaded',
      retries: 0,
    });

    queue.enqueue('/path/to/file.epub', processor);

    await queue.drain();

    const stats = queue.getStats();
    expect(stats.completed).toBe(1);
  });

  it('should track failed items', async () => {
    const processor = vi.fn().mockResolvedValue({
      filePath: '/path/to/file.epub',
      status: 'error',
      error: 'Upload failed',
      retries: 3,
    });

    queue.enqueue('/path/to/file.epub', processor);

    await queue.drain();

    const stats = queue.getStats();
    expect(stats.failed).toBe(1);
  });

  it('should handle processor exceptions', async () => {
    const processor = vi.fn().mockRejectedValue(new Error('Processor crashed'));

    queue.enqueue('/path/to/file.epub', processor);

    await queue.drain();

    const stats = queue.getStats();
    expect(stats.failed).toBe(1);
  });

  it('should drain queue waiting for all processing to complete', async () => {
    const delays = [50, 100, 75];
    const createProcessor = (delay: number) => {
      return vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return {
          filePath: '/path/to/file.epub',
          status: 'uploaded',
          retries: 0,
        };
      });
    };

    queue.enqueue('/file1', createProcessor(delays[0]));
    queue.enqueue('/file2', createProcessor(delays[1]));
    queue.enqueue('/file3', createProcessor(delays[2]));

    const startTime = Date.now();
    await queue.drain();
    const duration = Date.now() - startTime;

    // Should complete all items
    const stats = queue.getStats();
    expect(stats.queued).toBe(0);
    expect(stats.processing).toBe(0);
    expect(stats.completed).toBe(3);

    // Should take at least as long as the longest item plus concurrent batch
    expect(duration).toBeGreaterThanOrEqual(Math.max(...delays));
  });

  it('should maintain queue stats accurately', async () => {
    const slowProcessor = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        filePath: '/path/to/slow.epub',
        status: 'uploaded',
        retries: 0,
      };
    });

    const fastProcessor = vi.fn(async () => {
      return {
        filePath: '/path/to/fast.epub',
        status: 'uploaded',
        retries: 0,
      };
    });

    queue.enqueue('/slow1', slowProcessor);
    queue.enqueue('/slow2', slowProcessor);
    queue.enqueue('/fast1', fastProcessor);

    let stats = queue.getStats();
    expect(stats.queued + stats.processing).toBe(3);

    await queue.drain();

    stats = queue.getStats();
    expect(stats.queued).toBe(0);
    expect(stats.processing).toBe(0);
    expect(stats.completed).toBe(3);
  });

  it('should handle concurrency limit of 2', async () => {
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const createProcessor = () => {
      return vi.fn(async () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

        await new Promise((resolve) => setTimeout(resolve, 20));

        currentConcurrent--;

        return {
          filePath: '/path/to/file.epub',
          status: 'uploaded',
          retries: 0,
        };
      });
    };

    // Enqueue 5 items with concurrency of 2
    for (let i = 0; i < 5; i++) {
      queue.enqueue(`/file${i}`, createProcessor());
    }

    await queue.drain();

    // Max concurrent should not exceed concurrency limit
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it('should handle duplicate detection while processing', async () => {
    const processor = vi.fn().mockResolvedValue({
      filePath: '/path/to/file.epub',
      status: 'uploaded',
      retries: 0,
    });

    queue.enqueue('/path/to/file.epub', processor);

    // Try to add duplicate while first is still processing
    queue.enqueue('/path/to/file.epub', processor);

    await queue.drain();

    // Should only process once
    expect(processor).toHaveBeenCalledTimes(1);
  });

  it('should return initial stats when queue is empty', () => {
    const stats = queue.getStats();

    expect(stats.queued).toBe(0);
    expect(stats.processing).toBe(0);
    expect(stats.completed).toBe(0);
    expect(stats.failed).toBe(0);
  });

  it('should differentiate between queued and processing items', async () => {
    let releaseProcessor: () => void = () => {};

    const slowProcessor = vi.fn(async () => {
      await new Promise((resolve) => {
        releaseProcessor = resolve as () => void;
      });

      return {
        filePath: '/path/to/slow.epub',
        status: 'uploaded',
        retries: 0,
      };
    });

    queue.enqueue('/slow', slowProcessor);
    queue.enqueue('/file1', () =>
      Promise.resolve({
        filePath: '/file1',
        status: 'uploaded',
        retries: 0,
      })
    );
    queue.enqueue('/file2', () =>
      Promise.resolve({
        filePath: '/file2',
        status: 'uploaded',
        retries: 0,
      })
    );

    // Give queue a moment to start processing
    await new Promise((resolve) => setTimeout(resolve, 10));

    const stats = queue.getStats();

    // Some items should be queued, some processing
    expect(stats.processing).toBeGreaterThan(0);

    releaseProcessor();

    await queue.drain();

    const finalStats = queue.getStats();
    expect(finalStats.queued).toBe(0);
    expect(finalStats.processing).toBe(0);
  });
});
