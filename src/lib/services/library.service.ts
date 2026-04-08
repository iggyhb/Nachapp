/**
 * Library Service
 * Business logic for ebook management
 */

import { createHash, randomUUID } from 'crypto';
import { db } from '@/lib/db/client';
import { books, bookChapters } from '@/lib/db/schema';
import { eq, and, like, desc, asc, or, sql } from 'drizzle-orm';
import { getStorageService, EBOOK_BUCKET, COVERS_BUCKET } from './storage.service';
import { extractMetadata, BookMetadata } from './metadata.service';

export interface CreateBookInput {
  userId: string;
  title?: string;
  file: {
    buffer: Buffer;
    originalFilename: string;
    mimeType: string;
    size: number;
  };
  sourceType?: 'upload' | 'agent' | 'manual';
  sourcePath?: string;
}

export interface UpdateBookInput {
  title?: string;
  author?: string;
  tags?: string[];
  description?: string;
  readingStatus?: 'not_started' | 'reading' | 'completed' | 'abandoned';
  currentProgressPercent?: number;
  language?: string;
  publisher?: string;
  coverUrl?: string;
}

export interface BookFilters {
  status?: 'not_started' | 'reading' | 'completed' | 'abandoned';
  search?: string;
  sortBy?: 'title' | 'author' | 'createdAt' | 'updatedAt' | 'readingStatus' | 'currentProgressPercent';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface BookListResult {
  books: (typeof books.$inferSelect)[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Generate SHA-256 hash of buffer
 */
function generateFileHash(buffer: Buffer): string {
  const hash = createHash('sha256');
  hash.update(buffer);
  return hash.digest('hex');
}

/**
 * Generate UUID v4
 */
function generateId(): string {
  return randomUUID();
}

export const libraryService = {
  /**
   * Create and store a new book
   */
  async createBook(input: CreateBookInput) {
    const fileHash = generateFileHash(input.file.buffer);

    // Check for duplicate by hash
    const existingBook = await this.getBookByHash(fileHash);
    if (existingBook) {
      throw new Error('Book with this content already exists in your library');
    }

    const storage = getStorageService();
    const bookId = generateId();

    // Upload file to storage
    const storagePath = `${input.userId}/${bookId}/${input.file.originalFilename}`;
    await storage.uploadFile(
      EBOOK_BUCKET,
      storagePath,
      input.file.buffer,
      input.file.mimeType,
    );

    // Extract metadata
    let metadata: BookMetadata;
    try {
      metadata = await extractMetadata(input.file.buffer, input.file.mimeType);
    } catch (error) {
      console.error('Failed to extract metadata:', error);
      metadata = {
        chapters: [],
        rawMetadata: { extractionError: error instanceof Error ? error.message : 'Unknown error' },
      };
    }

    // Use provided title or extracted title or filename
    const title = input.title || metadata.title || input.file.originalFilename;

    // Upload cover if available
    let coverUrl: string | undefined;
    if (metadata.coverBuffer && metadata.coverMimeType) {
      try {
        const coverExt = metadata.coverMimeType === 'image/jpeg' ? 'jpg' : 'png';
        const coverPath = `${input.userId}/${bookId}/cover.${coverExt}`;
        coverUrl = await storage.uploadFile(
          COVERS_BUCKET,
          coverPath,
          metadata.coverBuffer,
          metadata.coverMimeType,
        );
      } catch (error) {
        console.error('Failed to upload cover:', error);
        // Continue without cover
      }
    }

    // Create book record in database
    const now = new Date();
    const bookRecord = {
      id: bookId,
      userId: input.userId,
      title,
      author: metadata.author || null,
      sourceType: input.sourceType || 'manual',
      sourcePath: input.sourcePath || null,
      originalFilename: input.file.originalFilename,
      fileHash,
      mimeType: input.file.mimeType,
      fileSize: input.file.size,
      storagePath,
      totalPages: metadata.totalPages || null,
      totalWords: metadata.totalWords || null,
      totalChapters: metadata.totalChapters || metadata.chapters.length || null,
      extractedTextStatus: metadata.totalWords ? 'completed' : 'pending',
      readingStatus: 'not_started' as const,
      currentProgressPercent: 0,
      coverUrl: coverUrl || null,
      language: (metadata.language || 'es').slice(0, 10),
      publisher: metadata.publisher || null,
      publishedDate: metadata.publishedDate
        ? metadata.publishedDate.slice(0, 20)  // varchar(20) — trim ISO datetimes
        : null,
      isbn: metadata.isbn || null,
      description: metadata.description || null,
      tags: [] as string[],
      metadataJson: metadata.rawMetadata,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(books).values(bookRecord);

    // Create chapter records
    if (metadata.chapters && metadata.chapters.length > 0) {
      const chapterRecords = metadata.chapters.map((chapter) => ({
        id: generateId(),
        bookId,
        chapterIndex: chapter.index,
        title: chapter.title || null,
        wordCount: chapter.wordCount || null,
        pageStart: chapter.pageStart || null,
        pageEnd: chapter.pageEnd || null,
        startOffset: null,
        endOffset: null,
        createdAt: now,
      }));

      await db.insert(bookChapters).values(chapterRecords);
    }

    return {
      id: bookId,
      title,
      author: metadata.author,
      totalPages: metadata.totalPages,
      totalWords: metadata.totalWords,
      totalChapters: metadata.totalChapters || metadata.chapters.length,
      coverUrl,
    };
  },

  /**
   * Get books with pagination and filtering
   */
  async getBooks(userId: string, filters: BookFilters = {}): Promise<BookListResult> {
    const {
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions: any[] = [eq(books.userId, userId)];

    if (status) {
      conditions.push(eq(books.readingStatus, status));
    }

    if (search) {
      conditions.push(
        or(
          like(books.title, `%${search}%`),
          like(books.author, `%${search}%`),
        ),
      );
    }

    // Build sort
    let orderBy;
    const sortDirection = sortOrder === 'desc' ? desc : asc;
    switch (sortBy) {
      case 'title':
        orderBy = sortDirection(books.title);
        break;
      case 'author':
        orderBy = sortDirection(books.author);
        break;
      case 'updatedAt':
        orderBy = sortDirection(books.updatedAt);
        break;
      case 'readingStatus':
        orderBy = sortDirection(books.readingStatus);
        break;
      case 'currentProgressPercent':
        orderBy = sortDirection(books.currentProgressPercent);
        break;
      case 'createdAt':
      default:
        orderBy = sortDirection(books.createdAt);
        break;
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(books)
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

    // Get paginated results
    const results = await db
      .select()
      .from(books)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);

    return {
      books: results,
      total,
      page,
      limit,
      totalPages,
    };
  },

  /**
   * Get single book with chapters
   */
  async getBookById(bookId: string, userId?: string) {
    const query = userId
      ? db.query.books.findFirst({
          where: and(eq(books.id, bookId), eq(books.userId, userId)),
          with: {
            bookChapters: {
              orderBy: (chapter) => asc(chapter.chapterIndex),
            },
          },
        })
      : db.query.books.findFirst({
          where: eq(books.id, bookId),
          with: {
            bookChapters: {
              orderBy: (chapter) => asc(chapter.chapterIndex),
            },
          },
        });

    return query;
  },

  /**
   * Update book metadata
   */
  async updateBook(bookId: string, userId: string, updates: UpdateBookInput) {
    // Verify ownership
    const book = await this.getBookById(bookId, userId);
    if (!book) {
      throw new Error('Book not found');
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.author !== undefined) updateData.author = updates.author;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.readingStatus !== undefined)
      updateData.readingStatus = updates.readingStatus;
    if (updates.currentProgressPercent !== undefined)
      updateData.currentProgressPercent = updates.currentProgressPercent;
    if (updates.language !== undefined) updateData.language = updates.language;
    if (updates.publisher !== undefined) updateData.publisher = updates.publisher;
    if (updates.coverUrl !== undefined) updateData.coverUrl = updates.coverUrl;

    await db.update(books).set(updateData).where(eq(books.id, bookId));

    return this.getBookById(bookId, userId);
  },

  /**
   * Delete book and associated files
   */
  async deleteBook(bookId: string, userId: string) {
    // Verify ownership
    const book = await this.getBookById(bookId, userId);
    if (!book) {
      throw new Error('Book not found');
    }

    const storage = getStorageService();

    // Delete files from storage
    try {
      await storage.deleteFile(EBOOK_BUCKET, book.storagePath);
    } catch (error) {
      console.error('Failed to delete ebook file:', error);
      // Continue with database deletion
    }

    if (book.coverUrl) {
      try {
        const coverPath = `${userId}/${bookId}/cover.jpg`;
        await storage.deleteFile(COVERS_BUCKET, coverPath);
      } catch (error) {
        console.error('Failed to delete cover file:', error);
        // Continue with database deletion
      }
    }

    // Delete from database (cascade will delete chapters)
    await db.delete(books).where(eq(books.id, bookId));
  },

  /**
   * Get book by file hash to check for duplicates
   */
  async getBookByHash(fileHash: string) {
    return db.query.books.findFirst({
      where: eq(books.fileHash, fileHash),
    });
  },
};
