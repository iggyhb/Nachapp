import {
  pgTable,
  varchar,
  timestamp,
  integer,
  json,
  text,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './auth';

/**
 * Tabla de libros electrónicos - almacena metadatos y estado de libros
 */
export const books = pgTable(
  'books',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 500 }).notNull(),
    author: varchar('author', { length: 255 }),
    sourceType: varchar('source_type', { length: 50 }).default('manual'), // 'upload' | 'agent' | 'manual'
    sourcePath: varchar('source_path', { length: 500 }), // original path if from agent
    originalFilename: varchar('original_filename', { length: 500 }).notNull(),
    fileHash: varchar('file_hash', { length: 128 }).notNull(), // SHA-256 for deduplication
    mimeType: varchar('mime_type', { length: 100 }).notNull(), // 'application/epub+zip' | 'application/pdf'
    fileSize: integer('file_size').notNull(), // bytes
    storagePath: varchar('storage_path', { length: 500 }).notNull(), // Supabase storage path
    totalPages: integer('total_pages'),
    totalWords: integer('total_words'),
    totalChapters: integer('total_chapters'),
    extractedTextStatus: varchar('extracted_text_status', { length: 20 }).default('pending'), // pending | processing | completed | failed
    readingStatus: varchar('reading_status', { length: 20 }).default('not_started'), // not_started | reading | completed | abandoned
    currentProgressPercent: integer('current_progress_percent').default(0), // 0-100
    coverUrl: varchar('cover_url', { length: 500 }),
    language: varchar('language', { length: 10 }).default('es'),
    publisher: varchar('publisher', { length: 255 }),
    publishedDate: varchar('published_date', { length: 20 }), // year or date string
    isbn: varchar('isbn', { length: 30 }),
    description: text('description'),
    tags: json('tags').$type<string[]>(), // string array
    metadataJson: json('metadata_json').$type<Record<string, unknown>>(), // extra metadata from EPUB/PDF
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index('books_user_id_idx').on(table.userId),
      fileHashIdx: uniqueIndex('books_file_hash_idx').on(table.fileHash),
      readingStatusIdx: index('books_reading_status_idx').on(table.readingStatus),
      createdAtIdx: index('books_created_at_idx').on(table.createdAt),
    };
  },
);

/**
 * Tabla de capítulos de libros - estructura de capítulos
 */
export const bookChapters = pgTable(
  'book_chapters',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    bookId: varchar('book_id', { length: 36 })
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    chapterIndex: integer('chapter_index').notNull(),
    title: varchar('title', { length: 500 }),
    startOffset: integer('start_offset'), // word or page offset
    endOffset: integer('end_offset'),
    wordCount: integer('word_count'),
    pageStart: integer('page_start'),
    pageEnd: integer('page_end'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      bookIdIdx: index('book_chapters_book_id_idx').on(table.bookId),
      bookChapterIdx: uniqueIndex('book_chapters_book_id_chapter_idx').on(
        table.bookId,
        table.chapterIndex,
      ),
    };
  },
);

/**
 * Relaciones de Drizzle para queries con `with`
 */
export const booksRelations = relations(books, ({ many }) => ({
  bookChapters: many(bookChapters),
}));

export const bookChaptersRelations = relations(bookChapters, ({ one }) => ({
  book: one(books, {
    fields: [bookChapters.bookId],
    references: [books.id],
  }),
}));
