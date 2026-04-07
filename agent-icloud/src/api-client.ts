import { createHash } from 'crypto';
import { Logger } from './logger';

export interface UploadResult {
  success: boolean;
  bookId?: string;
  title?: string;
  error?: string;
  isDuplicate?: boolean;
}

export interface HealthCheckResult {
  healthy: boolean;
  message?: string;
}

export class ApiClient {
  private backendUrl: string;
  private agentToken: string;
  private logger: Logger;

  constructor(backendUrl: string, agentToken: string, logger: Logger) {
    this.backendUrl = backendUrl.replace(/\/$/, ''); // Remove trailing slash
    this.agentToken = agentToken;
    this.logger = logger;
  }

  /**
   * Upload a file to the backend
   */
  async uploadFile(
    filePath: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<UploadResult> {
    try {
      this.logger.debug(`Uploading file: ${filePath} (${buffer.length} bytes)`);

      // Create FormData with file and sourceType
      const formData = new FormData();

      // Add file as Blob
      const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
      const fileName = filePath.split('/').pop() || 'ebook';
      formData.append('file', blob, fileName);

      // Add sourceType as 'agent'
      formData.append('sourceType', 'agent');

      // Make request with Bearer token
      const response = await fetch(`${this.backendUrl}/api/ebooks/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.agentToken}`,
        },
        body: formData,
      });

      // Handle response
      if (response.status === 201) {
        const data = (await response.json()) as { id?: string; title?: string };
        this.logger.info(`File uploaded successfully: ${filePath} (ID: ${data.id || 'unknown'})`);
        return {
          success: true,
          bookId: data.id,
          title: data.title,
        };
      }

      if (response.status === 409) {
        this.logger.warn(`File is duplicate: ${filePath}`);
        return {
          success: false,
          isDuplicate: true,
          error: 'File hash already exists in backend',
        };
      }

      if (response.status === 401) {
        const errorMsg = 'Unauthorized: Invalid or expired agent token';
        this.logger.error(errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      }

      // Other error status
      const errorText = await response.text();
      const errorMsg = `Backend error ${response.status}: ${errorText || response.statusText}`;
      this.logger.error(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    } catch (error) {
      const errorMsg = `Upload failed: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Check if a file hash already exists in the backend
   */
  async checkDuplicate(hash: string): Promise<boolean> {
    try {
      this.logger.debug(`Checking duplicate for hash: ${hash}`);

      const response = await fetch(
        `${this.backendUrl}/api/ebooks?hash=${encodeURIComponent(hash)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.agentToken}`,
          },
        }
      );

      if (response.status === 200) {
        const data = (await response.json()) as { id?: string } | unknown[];
        // If we got a book back, it's a duplicate
        const isDuplicate = data && (Array.isArray(data) ? data.length > 0 : (data as any).id);
        if (isDuplicate) {
          this.logger.debug(`Hash ${hash} is a duplicate`);
        }
        return isDuplicate;
      }

      // Any other status, assume not a duplicate
      return false;
    } catch (error) {
      this.logger.warn(
        `Duplicate check failed for hash ${hash}: ${error instanceof Error ? error.message : String(error)}`
      );
      // On error, assume not a duplicate to allow upload attempt
      return false;
    }
  }

  /**
   * Check backend health
   */
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      this.logger.debug('Performing health check...');

      const response = await fetch(`${this.backendUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.agentToken}`,
        },
      });

      if (response.status === 200) {
        this.logger.info('Backend health check passed');
        return {
          healthy: true,
          message: 'Backend is healthy',
        };
      }

      const errorMsg = `Health check failed with status ${response.status}`;
      this.logger.error(errorMsg);
      return {
        healthy: false,
        message: errorMsg,
      };
    } catch (error) {
      const errorMsg = `Health check failed: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMsg);
      return {
        healthy: false,
        message: errorMsg,
      };
    }
  }

  /**
   * Utility: Calculate SHA-256 hash of a buffer
   * (used by processor to match backend hashing)
   */
  static calculateHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}
