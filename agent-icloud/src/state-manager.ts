import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname } from 'path';
import { mkdirSync } from 'fs';
import { Logger } from './logger';

export interface ProcessedFile {
  filePath: string;
  hash: string;
  bookId?: string;
  processedAt: string;
  sourceType: 'agent';
}

export interface AgentState {
  version: number;
  lastSync: string;
  processedFiles: Record<string, ProcessedFile>;
  failedFiles: Record<string, { error: string; attempts: number; lastAttempt: string }>;
}

export class StateManager {
  private stateFilePath: string;
  private state: AgentState;
  private logger: Logger;

  constructor(stateFilePath: string, logger: Logger) {
    this.stateFilePath = stateFilePath;
    this.logger = logger;
    this.state = this.loadState();
  }

  private loadState(): AgentState {
    if (existsSync(this.stateFilePath)) {
      try {
        const data = readFileSync(this.stateFilePath, 'utf-8');
        const parsed = JSON.parse(data);
        this.logger.info(`Loaded state from ${this.stateFilePath}`);
        return parsed;
      } catch (error) {
        this.logger.warn(
          `Failed to load state: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    this.logger.info('Creating new agent state');
    return {
      version: 1,
      lastSync: new Date().toISOString(),
      processedFiles: {},
      failedFiles: {},
    };
  }

  saveState(): void {
    try {
      // Ensure directory exists
      const dir = dirname(this.stateFilePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      this.state.lastSync = new Date().toISOString();
      writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf-8');
      this.logger.debug(`State saved to ${this.stateFilePath}`);
    } catch (error) {
      this.logger.error(
        `Failed to save state: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  isProcessed(filePath: string): boolean {
    return filePath in this.state.processedFiles;
  }

  markProcessed(filePath: string, hash: string, bookId?: string): void {
    this.state.processedFiles[filePath] = {
      filePath,
      hash,
      bookId,
      processedAt: new Date().toISOString(),
      sourceType: 'agent',
    };

    // Remove from failed if it was there
    delete this.state.failedFiles[filePath];

    this.saveState();
  }

  getFailedAttempts(filePath: string): number {
    return this.state.failedFiles[filePath]?.attempts || 0;
  }

  markFailed(filePath: string, error: string): void {
    const current = this.state.failedFiles[filePath] || { attempts: 0 };
    this.state.failedFiles[filePath] = {
      error,
      attempts: current.attempts + 1,
      lastAttempt: new Date().toISOString(),
    };

    this.saveState();
  }

  clearFailed(filePath: string): void {
    delete this.state.failedFiles[filePath];
    this.saveState();
  }

  getProcessedCount(): number {
    return Object.keys(this.state.processedFiles).length;
  }

  getFailedCount(): number {
    return Object.keys(this.state.failedFiles).length;
  }

  getState(): AgentState {
    return this.state;
  }
}
