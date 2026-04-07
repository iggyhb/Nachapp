import { readFileSync, statSync } from 'fs';
import { extname } from 'path';
import { ApiClient } from './api-client';
import { StateManager } from './state-manager';
import { Logger } from './logger';

export interface Config {
  maxRetries: number;
  retryDelayMs: number;
  maxFileSizeBytes: number;
  minFileAgeSeconds: number;
  allowedExtensions: string[];
}

export interface ProcessResult {
  filePath: string;
  status: 'uploaded' | 'duplicate' | 'skipped' | 'error';
  hash?: string;
  bookId?: string;
  error?: string;
  retries: number;
}

const MIME_TYPES: Record<string, string> = {
  '.epub': 'application/epub+zip',
  '.pdf': 'application/pdf',
};

export class FileProcessor {
  private config: Config;
  private apiClient: ApiClient;
  private stateManager: StateManager;
  private logger: Logger;
  private currentRetries: Map<string, number> = new Map();

  constructor(
    config: Config,
    apiClient: ApiClient,
    stateManager: StateManager,
    logger: Logger
  ) {
    this.config = config;
    this.apiClient = apiClient;
    this.stateManager = stateManager;
    this.logger = logger;
  }

  /**
   * Process a single file through the full pipeline
   */
  async processFile(filePath: string): Promise<ProcessResult> {
    this.logger.debug(`Processing file: ${filePath}`);

    // 1. Validate file exists and is readable
    const validationError = this.validateFileExists(filePath);
    if (validationError) {
      return {
        filePath,
        status: 'skipped',
        error: validationError,
        retries: 0,
      };
    }

    // 2. Check file extension is allowed
    const ext = extname(filePath).toLowerCase();
    if (!this.config.allowedExtensions.includes(ext)) {
      this.logger.debug(`Skipping file with unsupported extension: ${ext}`);
      return {
        filePath,
        status: 'skipped',
        error: `Unsupported file extension: ${ext}`,
        retries: 0,
      };
    }

    // Skip .icloud placeholder files
    if (filePath.endsWith('.icloud')) {
      this.logger.debug(`Skipping iCloud placeholder: ${filePath}`);
      return {
        filePath,
        status: 'skipped',
        error: 'iCloud placeholder file',
        retries: 0,
      };
    }

    // Skip dot-files and temp files
    const fileName = filePath.split('/').pop() || '';
    if (fileName.startsWith('.') || fileName.startsWith('~')) {
      this.logger.debug(`Skipping hidden or temp file: ${filePath}`);
      return {
        filePath,
        status: 'skipped',
        error: 'Hidden or temp file',
        retries: 0,
      };
    }

    // 3. Check file size
    const sizeError = this.validateFileSize(filePath);
    if (sizeError) {
      return {
        filePath,
        status: 'skipped',
        error: sizeError,
        retries: 0,
      };
    }

    // 4. Check file age (skip if too young, still syncing)
    const ageError = this.validateFileAge(filePath);
    if (ageError) {
      return {
        filePath,
        status: 'skipped',
        error: ageError,
        retries: 0,
      };
    }

    // 5. Read file into buffer and calculate hash
    let buffer: Buffer;
    try {
      buffer = readFileSync(filePath);
    } catch (error) {
      const errorMsg = `Failed to read file: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMsg);
      this.stateManager.markFailed(filePath, errorMsg);
      return {
        filePath,
        status: 'error',
        error: errorMsg,
        retries: 0,
      };
    }

    const hash = ApiClient.calculateHash(buffer);
    this.logger.debug(`File hash: ${hash}`);

    // 6. Check against local state (already processed?)
    if (this.stateManager.isProcessed(filePath)) {
      this.logger.debug(`File already processed: ${filePath}`);
      return {
        filePath,
        status: 'skipped',
        hash,
        error: 'File already processed',
        retries: 0,
      };
    }

    // 7. Check against backend (duplicate hash?)
    const isDuplicate = await this.apiClient.checkDuplicate(hash);
    if (isDuplicate) {
      this.logger.info(`File is duplicate (hash exists): ${filePath}`);
      this.stateManager.markProcessed(filePath, hash);
      return {
        filePath,
        status: 'duplicate',
        hash,
        retries: 0,
      };
    }

    // 8. Upload to backend
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
    const uploadResult = await this.apiClient.uploadFile(filePath, buffer, mimeType);

    if (uploadResult.success) {
      // 9. Mark as processed in local state
      this.stateManager.markProcessed(filePath, hash, uploadResult.bookId);
      this.currentRetries.delete(filePath);

      return {
        filePath,
        status: 'uploaded',
        hash,
        bookId: uploadResult.bookId,
        retries: this.currentRetries.get(filePath) || 0,
      };
    }

    if (uploadResult.isDuplicate) {
      this.stateManager.markProcessed(filePath, hash);
      return {
        filePath,
        status: 'duplicate',
        hash,
        retries: this.currentRetries.get(filePath) || 0,
      };
    }

    // Upload failed
    this.stateManager.markFailed(filePath, uploadResult.error || 'Unknown error');
    return {
      filePath,
      status: 'error',
      hash,
      error: uploadResult.error,
      retries: this.currentRetries.get(filePath) || 0,
    };
  }

  /**
   * Process with retries and exponential backoff
   */
  async processWithRetry(filePath: string): Promise<ProcessResult> {
    let retries = this.currentRetries.get(filePath) || 0;
    const maxRetries = this.config.maxRetries;

    while (retries <= maxRetries) {
      const result = await this.processFile(filePath);

      if (result.status === 'uploaded' || result.status === 'duplicate') {
        // Success or duplicate, stop retrying
        this.currentRetries.delete(filePath);
        return result;
      }

      if (result.status === 'skipped') {
        // Don't retry skipped files
        return result;
      }

      // Error - retry with backoff
      retries++;
      result.retries = retries;

      if (retries > maxRetries) {
        this.logger.error(`Max retries exceeded for ${filePath}`);
        return result;
      }

      // Exponential backoff with jitter
      const baseDelay = this.config.retryDelayMs;
      const exponentialDelay = baseDelay * Math.pow(2, retries - 1);
      const jitter = Math.random() * exponentialDelay * 0.1;
      const delay = exponentialDelay + jitter;

      this.logger.warn(
        `Retrying ${filePath} (attempt ${retries}/${maxRetries}) after ${Math.round(delay)}ms`
      );

      await this.sleep(delay);
      this.currentRetries.set(filePath, retries);
    }

    return {
      filePath,
      status: 'error',
      error: `Failed after ${maxRetries} retries`,
      retries: maxRetries,
    };
  }

  private validateFileExists(filePath: string): string | null {
    try {
      statSync(filePath);
      return null;
    } catch (error) {
      return `File not found or not readable: ${filePath}`;
    }
  }

  private validateFileSize(filePath: string): string | null {
    try {
      const stats = statSync(filePath);
      if (stats.size > this.config.maxFileSizeBytes) {
        return `File too large: ${stats.size} > ${this.config.maxFileSizeBytes}`;
      }
      return null;
    } catch (error) {
      return `Failed to check file size`;
    }
  }

  private validateFileAge(filePath: string): string | null {
    try {
      const stats = statSync(filePath);
      const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;

      if (ageSeconds < this.config.minFileAgeSeconds) {
        return `File too young: ${ageSeconds.toFixed(1)}s < ${this.config.minFileAgeSeconds}s (still syncing)`;
      }

      return null;
    } catch (error) {
      return `Failed to check file age`;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
