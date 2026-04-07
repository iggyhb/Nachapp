import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileProcessor } from '../processor';
import { ApiClient } from '../api-client';
import { StateManager } from '../state-manager';
import { Logger } from '../logger';
import * as fs from 'fs';

vi.mock('fs');

describe('FileProcessor', () => {
  let processor: FileProcessor;
  let mockApiClient: any;
  let mockStateManager: any;
  let mockLogger: any;
  let config: any;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      maxRetries: 3,
      retryDelayMs: 100,
      maxFileSizeBytes: 100 * 1024 * 1024, // 100MB
      minFileAgeSeconds: 5,
      allowedExtensions: ['.epub', '.pdf'],
    };

    mockLogger = new Logger('debug');

    mockStateManager = {
      isProcessed: vi.fn().mockReturnValue(false),
      markProcessed: vi.fn(),
      markFailed: vi.fn(),
      getFailedAttempts: vi.fn().mockReturnValue(0),
    };

    mockApiClient = {
      uploadFile: vi.fn(),
      checkDuplicate: vi.fn(),
    };

    processor = new FileProcessor(config, mockApiClient, mockStateManager, mockLogger);
  });

  describe('file validation and filtering', () => {
    it('should skip files with wrong extension', async () => {
      (fs.statSync as any).mockReturnValue({
        size: 1000,
        mtimeMs: Date.now() - 10000,
      });

      const result = await processor.processFile('/path/to/file.txt');

      expect(result.status).toBe('skipped');
      expect(result.error).toContain('Unsupported file extension');
      expect(mockApiClient.uploadFile).not.toHaveBeenCalled();
    });

    it('should skip files too large', async () => {
      (fs.statSync as any).mockReturnValue({
        size: 200 * 1024 * 1024, // 200MB
        mtimeMs: Date.now() - 10000,
      });

      const result = await processor.processFile('/path/to/file.epub');

      expect(result.status).toBe('skipped');
      expect(result.error).toContain('File too large');
      expect(mockApiClient.uploadFile).not.toHaveBeenCalled();
    });

    it('should skip dot-files', async () => {
      (fs.statSync as any).mockReturnValue({
        size: 1000,
        mtimeMs: Date.now() - 10000,
      });

      const result = await processor.processFile('/path/to/.hidden.epub');

      expect(result.status).toBe('skipped');
      expect(result.error).toContain('Hidden or temp file');
    });

    it('should skip temp files starting with tilde', async () => {
      (fs.statSync as any).mockReturnValue({
        size: 1000,
        mtimeMs: Date.now() - 10000,
      });

      const result = await processor.processFile('/path/to/~tempfile.epub');

      expect(result.status).toBe('skipped');
      expect(result.error).toContain('Hidden or temp file');
    });

    it('should skip icloud placeholder files', async () => {
      (fs.statSync as any).mockReturnValue({
        size: 1000,
        mtimeMs: Date.now() - 10000,
      });

      // iCloud files have .icloud extension which is not allowed, so they're caught by extension check
      const result = await processor.processFile('/path/to/file.icloud');

      expect(result.status).toBe('skipped');
      expect(result.error).toContain('Unsupported file extension');
    });

    it('should skip files younger than minFileAgeSeconds', async () => {
      (fs.statSync as any).mockReturnValue({
        size: 1000,
        mtimeMs: Date.now() - 1000, // Only 1 second old
      });

      const result = await processor.processFile('/path/to/file.epub');

      expect(result.status).toBe('skipped');
      expect(result.error).toContain('File too young');
    });
  });

  describe('duplicate detection', () => {
    it('should skip files that are already processed', async () => {
      mockStateManager.isProcessed.mockReturnValue(true);

      (fs.statSync as any).mockReturnValue({
        size: 1000,
        mtimeMs: Date.now() - 10000,
      });

      (fs.readFileSync as any).mockReturnValue(Buffer.from('fake epub content'));

      const result = await processor.processFile('/path/to/file.epub');

      expect(result.status).toBe('skipped');
      expect(result.error).toContain('already processed');
    });

    it('should detect duplicate hashes from backend', async () => {
      mockStateManager.isProcessed.mockReturnValue(false);
      mockApiClient.checkDuplicate.mockResolvedValue(true);

      (fs.statSync as any).mockReturnValue({
        size: 1000,
        mtimeMs: Date.now() - 10000,
      });

      (fs.readFileSync as any).mockReturnValue(Buffer.from('fake epub content'));

      const result = await processor.processFile('/path/to/file.epub');

      expect(result.status).toBe('duplicate');
      expect(mockStateManager.markProcessed).toHaveBeenCalled();
      expect(mockApiClient.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('processing a valid file', () => {
    it('should process a valid EPUB file', async () => {
      mockStateManager.isProcessed.mockReturnValue(false);
      mockApiClient.checkDuplicate.mockResolvedValue(false);
      mockApiClient.uploadFile.mockResolvedValue({
        success: true,
        bookId: 'book-123',
      });

      (fs.statSync as any).mockReturnValue({
        size: 5000,
        mtimeMs: Date.now() - 10000,
      });

      (fs.readFileSync as any).mockReturnValue(Buffer.from('fake epub content'));

      const result = await processor.processFile('/path/to/file.epub');

      expect(result.status).toBe('uploaded');
      expect(result.bookId).toBe('book-123');
      expect(mockStateManager.markProcessed).toHaveBeenCalledWith(
        '/path/to/file.epub',
        expect.any(String),
        'book-123'
      );
    });

    it('should use correct MIME type for EPUB files', async () => {
      mockStateManager.isProcessed.mockReturnValue(false);
      mockApiClient.checkDuplicate.mockResolvedValue(false);
      mockApiClient.uploadFile.mockResolvedValue({
        success: true,
        bookId: 'book-123',
      });

      (fs.statSync as any).mockReturnValue({
        size: 5000,
        mtimeMs: Date.now() - 10000,
      });

      (fs.readFileSync as any).mockReturnValue(Buffer.from('fake epub'));

      await processor.processFile('/path/to/file.epub');

      expect(mockApiClient.uploadFile).toHaveBeenCalledWith(
        '/path/to/file.epub',
        expect.any(Buffer),
        'application/epub+zip'
      );
    });

    it('should use correct MIME type for PDF files', async () => {
      mockStateManager.isProcessed.mockReturnValue(false);
      mockApiClient.checkDuplicate.mockResolvedValue(false);
      mockApiClient.uploadFile.mockResolvedValue({
        success: true,
        bookId: 'book-123',
      });

      (fs.statSync as any).mockReturnValue({
        size: 5000,
        mtimeMs: Date.now() - 10000,
      });

      (fs.readFileSync as any).mockReturnValue(Buffer.from('fake pdf'));

      await processor.processFile('/path/to/file.pdf');

      expect(mockApiClient.uploadFile).toHaveBeenCalledWith(
        '/path/to/file.pdf',
        expect.any(Buffer),
        'application/pdf'
      );
    });
  });

  describe('retry logic', () => {
    it('should retry on upload failure', async () => {
      mockStateManager.isProcessed.mockReturnValue(false);
      mockApiClient.checkDuplicate.mockResolvedValue(false);

      // First call fails, second succeeds
      mockApiClient.uploadFile
        .mockResolvedValueOnce({
          success: false,
          error: 'Network error',
        })
        .mockResolvedValueOnce({
          success: true,
          bookId: 'book-123',
        });

      (fs.statSync as any).mockReturnValue({
        size: 5000,
        mtimeMs: Date.now() - 10000,
      });

      (fs.readFileSync as any).mockReturnValue(Buffer.from('fake epub'));

      const result = await processor.processWithRetry('/path/to/file.epub');

      expect(result.status).toBe('uploaded');
      expect(mockApiClient.uploadFile).toHaveBeenCalledTimes(2);
    });

    it('should not retry on skipped files', async () => {
      (fs.statSync as any).mockReturnValue({
        size: 1000,
        mtimeMs: Date.now() - 1000, // Too young
      });

      const result = await processor.processWithRetry('/path/to/file.epub');

      expect(result.status).toBe('skipped');
      expect(result.retries).toBe(0);
    });

    it('should not retry on duplicate files', async () => {
      mockStateManager.isProcessed.mockReturnValue(false);
      mockApiClient.checkDuplicate.mockResolvedValue(true);

      (fs.statSync as any).mockReturnValue({
        size: 5000,
        mtimeMs: Date.now() - 10000,
      });

      (fs.readFileSync as any).mockReturnValue(Buffer.from('fake epub'));

      const result = await processor.processWithRetry('/path/to/file.epub');

      expect(result.status).toBe('duplicate');
      expect(result.retries).toBe(0);
    });

    it('should respect maxRetries limit', async () => {
      mockStateManager.isProcessed.mockReturnValue(false);
      mockApiClient.checkDuplicate.mockResolvedValue(false);

      // Always fail
      mockApiClient.uploadFile.mockResolvedValue({
        success: false,
        error: 'Persistent error',
      });

      (fs.statSync as any).mockReturnValue({
        size: 5000,
        mtimeMs: Date.now() - 10000,
      });

      (fs.readFileSync as any).mockReturnValue(Buffer.from('fake epub'));

      const result = await processor.processWithRetry('/path/to/file.epub');

      expect(result.status).toBe('error');
      // Retries should be exhausted
      expect(mockApiClient.uploadFile.mock.calls.length).toBeGreaterThan(1);
    });
  });

  describe('error handling', () => {
    it('should handle file read errors', async () => {
      mockStateManager.isProcessed.mockReturnValue(false);

      (fs.statSync as any).mockReturnValue({
        size: 5000,
        mtimeMs: Date.now() - 10000,
      });

      (fs.readFileSync as any).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await processor.processFile('/path/to/file.epub');

      expect(result.status).toBe('error');
      expect(result.error).toContain('Failed to read file');
      expect(mockStateManager.markFailed).toHaveBeenCalled();
    });

    it('should mark failed files in state', async () => {
      mockStateManager.isProcessed.mockReturnValue(false);
      mockApiClient.checkDuplicate.mockResolvedValue(false);
      mockApiClient.uploadFile.mockResolvedValue({
        success: false,
        error: 'Upload failed',
      });

      (fs.statSync as any).mockReturnValue({
        size: 5000,
        mtimeMs: Date.now() - 10000,
      });

      (fs.readFileSync as any).mockReturnValue(Buffer.from('fake epub'));

      await processor.processFile('/path/to/file.epub');

      expect(mockStateManager.markFailed).toHaveBeenCalledWith(
        '/path/to/file.epub',
        'Upload failed'
      );
    });
  });

  describe('hash calculation', () => {
    it('should calculate and include file hash in result', async () => {
      mockStateManager.isProcessed.mockReturnValue(false);
      mockApiClient.checkDuplicate.mockResolvedValue(false);
      mockApiClient.uploadFile.mockResolvedValue({
        success: true,
        bookId: 'book-123',
      });

      (fs.statSync as any).mockReturnValue({
        size: 5000,
        mtimeMs: Date.now() - 10000,
      });

      const buffer = Buffer.from('test content');
      (fs.readFileSync as any).mockReturnValue(buffer);

      const result = await processor.processFile('/path/to/file.epub');

      expect(result.hash).toBeDefined();
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex format
    });
  });
});
