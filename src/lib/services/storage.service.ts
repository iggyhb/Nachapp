/**
 * Supabase Storage Service
 * Uses Supabase Storage REST API directly via fetch
 * No external dependencies required beyond Node.js built-ins
 */

export const EBOOK_BUCKET = 'ebooks';
export const COVERS_BUCKET = 'covers';

interface StorageConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
}

class StorageService {
  private config: StorageConfig;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required');
    }

    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    }

    this.config = {
      supabaseUrl: supabaseUrl.replace(/\/$/, ''), // Remove trailing slash
      serviceRoleKey,
    };
  }

  /**
   * Get authorization headers for Supabase API
   * Supabase Storage requires both Authorization and apikey headers
   */
  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.serviceRoleKey}`,
      apikey: this.config.serviceRoleKey,
    };
  }

  /**
   * Ensure a bucket exists, create it if not
   */
  private async ensureBucket(bucket: string): Promise<void> {
    const checkUrl = `${this.config.supabaseUrl}/storage/v1/bucket/${bucket}`;
    const checkRes = await fetch(checkUrl, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (checkRes.status === 404) {
      // Bucket doesn't exist, create it
      const createUrl = `${this.config.supabaseUrl}/storage/v1/bucket`;
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: bucket, name: bucket, public: false }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        throw new Error(`Failed to create bucket '${bucket}': ${err}`);
      }
    }
  }

  /**
   * Upload file to Supabase Storage
   * @param bucket Bucket name
   * @param path Storage path (including filename)
   * @param file File buffer
   * @param contentType MIME type
   * @returns Public URL of the uploaded file
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<string> {
    // Ensure bucket exists before uploading
    await this.ensureBucket(bucket);

    const url = `${this.config.supabaseUrl}/storage/v1/object/${bucket}/${path}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: file as unknown as BodyInit,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upload file: ${error}`);
    }

    return this.getPublicUrl(bucket, path);
  }

  /**
   * Download file from Supabase Storage
   * @param bucket Bucket name
   * @param path Storage path (including filename)
   * @returns File buffer
   */
  async downloadFile(bucket: string, path: string): Promise<Buffer> {
    const url = `${this.config.supabaseUrl}/storage/v1/object/${bucket}/${path}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Delete file from Supabase Storage
   * @param bucket Bucket name
   * @param path Storage path (including filename)
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    const url = `${this.config.supabaseUrl}/storage/v1/object/${bucket}/${path}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }
  }

  /**
   * Get public URL for a file
   * @param bucket Bucket name
   * @param path Storage path (including filename)
   * @returns Public URL
   */
  getPublicUrl(bucket: string, path: string): string {
    return `${this.config.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  }
}

/**
 * Singleton instance of StorageService
 */
let storageServiceInstance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService();
  }
  return storageServiceInstance;
}

export default StorageService;
