import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { StateManager } from '../state-manager';
import { Logger } from '../logger';
import { join } from 'path';
import { tmpdir } from 'os';

describe('StateManager', () => {
  let tempFilePath: string;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger('info');
    tempFilePath = join(tmpdir(), `test-state-${Date.now()}.json`);
  });

  afterEach(() => {
    if (existsSync(tempFilePath)) {
      unlinkSync(tempFilePath);
    }
  });

  it('should create initial empty state when file does not exist', () => {
    const stateManager = new StateManager(tempFilePath, logger);

    expect(stateManager.getProcessedCount()).toBe(0);
    expect(stateManager.getFailedCount()).toBe(0);
  });

  it('should mark a file as processed', () => {
    const stateManager = new StateManager(tempFilePath, logger);

    stateManager.markProcessed('/path/to/file.epub', 'abc123hash', 'book-123');

    expect(stateManager.isProcessed('/path/to/file.epub')).toBe(true);
    expect(stateManager.getProcessedCount()).toBe(1);
  });

  it('should check if a file is processed', () => {
    const stateManager = new StateManager(tempFilePath, logger);

    expect(stateManager.isProcessed('/path/to/file.epub')).toBe(false);

    stateManager.markProcessed('/path/to/file.epub', 'hash');

    expect(stateManager.isProcessed('/path/to/file.epub')).toBe(true);
  });

  it('should persist state to file and reload it', () => {
    const stateManager = new StateManager(tempFilePath, logger);

    stateManager.markProcessed('/path/to/file1.epub', 'hash1', 'book-1');
    stateManager.markProcessed('/path/to/file2.pdf', 'hash2');

    // Create new instance to load from file
    const stateManager2 = new StateManager(tempFilePath, logger);

    expect(stateManager2.isProcessed('/path/to/file1.epub')).toBe(true);
    expect(stateManager2.isProcessed('/path/to/file2.pdf')).toBe(true);
    expect(stateManager2.getProcessedCount()).toBe(2);
  });

  it('should get stats (processed count)', () => {
    const stateManager = new StateManager(tempFilePath, logger);

    expect(stateManager.getProcessedCount()).toBe(0);

    stateManager.markProcessed('/path/to/file1.epub', 'hash1');
    stateManager.markProcessed('/path/to/file2.pdf', 'hash2');
    stateManager.markProcessed('/path/to/file3.epub', 'hash3');

    expect(stateManager.getProcessedCount()).toBe(3);
  });

  it('should get stats (failed count)', () => {
    const stateManager = new StateManager(tempFilePath, logger);

    expect(stateManager.getFailedCount()).toBe(0);

    stateManager.markFailed('/path/to/file1.epub', 'Error message');
    stateManager.markFailed('/path/to/file2.pdf', 'Another error');

    expect(stateManager.getFailedCount()).toBe(2);
  });

  it('should handle corrupted state file gracefully', async () => {
    // Create a corrupted state file
    const fs = await import('fs');
    fs.writeFileSync(tempFilePath, 'invalid json {]', 'utf-8');

    // Should not throw, just create new state
    const stateManager = new StateManager(tempFilePath, logger);

    expect(stateManager.getProcessedCount()).toBe(0);
    expect(stateManager.getFailedCount()).toBe(0);
  });

  it('should increment failed attempts when marking a file as failed multiple times', () => {
    const stateManager = new StateManager(tempFilePath, logger);

    stateManager.markFailed('/path/to/file.epub', 'Error 1');
    stateManager.markFailed('/path/to/file.epub', 'Error 2');
    stateManager.markFailed('/path/to/file.epub', 'Error 3');

    expect(stateManager.getFailedAttempts('/path/to/file.epub')).toBe(3);
  });

  it('should remove file from failed list when marking as processed', () => {
    const stateManager = new StateManager(tempFilePath, logger);

    stateManager.markFailed('/path/to/file.epub', 'Error');
    expect(stateManager.getFailedCount()).toBe(1);

    stateManager.markProcessed('/path/to/file.epub', 'hash');

    expect(stateManager.getFailedCount()).toBe(0);
    expect(stateManager.isProcessed('/path/to/file.epub')).toBe(true);
  });

  it('should clear failed entry for a specific file', () => {
    const stateManager = new StateManager(tempFilePath, logger);

    stateManager.markFailed('/path/to/file1.epub', 'Error');
    stateManager.markFailed('/path/to/file2.pdf', 'Error');

    expect(stateManager.getFailedCount()).toBe(2);

    stateManager.clearFailed('/path/to/file1.epub');

    expect(stateManager.getFailedCount()).toBe(1);
    expect(stateManager.getFailedAttempts('/path/to/file1.epub')).toBe(0);
  });

  it('should have correct state structure', () => {
    const stateManager = new StateManager(tempFilePath, logger);

    stateManager.markProcessed('/path/to/file.epub', 'hash123', 'book-456');
    stateManager.markFailed('/path/to/failed.pdf', 'Upload error');

    const state = stateManager.getState();

    expect(state.version).toBe(1);
    expect(state.lastSync).toBeDefined();
    expect(state.processedFiles).toBeDefined();
    expect(state.failedFiles).toBeDefined();
    expect(state.processedFiles['/path/to/file.epub']).toBeDefined();
    expect(state.processedFiles['/path/to/file.epub'].hash).toBe('hash123');
    expect(state.processedFiles['/path/to/file.epub'].bookId).toBe('book-456');
    expect(state.processedFiles['/path/to/file.epub'].sourceType).toBe('agent');
  });

  it('should persist state with valid JSON structure', () => {
    const stateManager = new StateManager(tempFilePath, logger);

    stateManager.markProcessed('/path/to/file.epub', 'hash123');
    stateManager.markFailed('/path/to/failed.pdf', 'Error');

    // Read the file and verify JSON validity
    const content = readFileSync(tempFilePath, 'utf-8');
    const parsed = JSON.parse(content);

    expect(parsed.version).toBe(1);
    expect(parsed.processedFiles['/path/to/file.epub']).toBeDefined();
    expect(parsed.failedFiles['/path/to/failed.pdf']).toBeDefined();
  });

  it('should update lastSync on each save', async () => {
    const stateManager = new StateManager(tempFilePath, logger);

    const state1 = stateManager.getState();
    const firstSync = state1.lastSync;

    // Wait a bit and then make another change
    await new Promise((resolve) => setTimeout(resolve, 10));
    stateManager.markProcessed('/path/to/file.epub', 'hash');

    const state2 = stateManager.getState();
    const secondSync = state2.lastSync;

    expect(firstSync).not.toBe(secondSync);
  });
});
