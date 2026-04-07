/**
 * Metadata Extractor Service for ebooks
 *
 * Dependencies needed:
 * - jszip: for EPUB ZIP parsing
 * - pdf-parse: for PDF text extraction
 *
 * Install with: npm install jszip pdf-parse
 */

export interface ChapterInfo {
  index: number;
  title: string;
  wordCount?: number;
  pageStart?: number;
  pageEnd?: number;
}

export interface BookMetadata {
  title?: string;
  author?: string;
  language?: string;
  publisher?: string;
  description?: string;
  isbn?: string;
  publishedDate?: string;
  totalPages?: number;
  totalWords?: number;
  totalChapters?: number;
  chapters: ChapterInfo[];
  coverBuffer?: Buffer;
  coverMimeType?: string;
  rawMetadata: Record<string, unknown>;
}

/**
 * Extract text content from XML string using regex
 * Simple implementation without heavy XML parser
 */
function extractTextFromXml(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}


/**
 * Count words in text
 */
function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

/**
 * Extract metadata from EPUB file
 * EPUB files are ZIP archives containing XML
 */
export async function extractEpubMetadata(buffer: Buffer): Promise<BookMetadata> {
  try {
    // Dynamically import jszip
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const epubData = await zip.loadAsync(buffer);

    const metadata: BookMetadata = {
      chapters: [],
      rawMetadata: {},
    };

    // Find and parse OPF (metadata) file
    let opfContent: string | null = null;
    let opfPath: string | null = null;

    // Look for container.xml to find OPF path
    if (epubData.files['META-INF/container.xml']) {
      const containerData = await epubData.files['META-INF/container.xml'].async(
        'string',
      );
      const opfMatch = containerData.match(/rootfile[^>]*full-path="([^"]+)"/);
      if (opfMatch) {
        opfPath = opfMatch[1];
      }
    }

    // Default OPF path if not found
    if (!opfPath) {
      for (const path of Object.keys(epubData.files)) {
        if (path.endsWith('.opf')) {
          opfPath = path;
          break;
        }
      }
    }

    // Parse OPF file
    if (opfPath && epubData.files[opfPath]) {
      opfContent = await epubData.files[opfPath].async('string');

      // Extract metadata from OPF
      metadata.title = extractTextFromXml(opfContent, 'dc:title') ?? undefined;
      metadata.author = extractTextFromXml(opfContent, 'dc:creator') ?? undefined;
      metadata.language = extractTextFromXml(opfContent, 'dc:language') ?? undefined;
      metadata.publisher = extractTextFromXml(opfContent, 'dc:publisher') ?? undefined;
      metadata.description = extractTextFromXml(opfContent, 'dc:description') ?? undefined;
      metadata.isbn = extractTextFromXml(opfContent, 'dc:identifier') ?? undefined;
      metadata.publishedDate = extractTextFromXml(opfContent, 'dc:date') ?? undefined;

      metadata.rawMetadata = {
        opfPath,
        hasMetadata: true,
      };
    }

    // Try to extract cover image
    let coverMimeType: string | undefined;
    for (const path of Object.keys(epubData.files)) {
      if (
        path.includes('cover') &&
        (path.endsWith('.jpg') ||
          path.endsWith('.jpeg') ||
          path.endsWith('.png') ||
          path.endsWith('.gif'))
      ) {
        const ext = path.split('.').pop()?.toLowerCase();
        if (ext === 'jpg' || ext === 'jpeg') {
          coverMimeType = 'image/jpeg';
        } else if (ext === 'png') {
          coverMimeType = 'image/png';
        } else if (ext === 'gif') {
          coverMimeType = 'image/gif';
        }

        if (coverMimeType) {
          metadata.coverBuffer = await epubData.files[path].async('arraybuffer').then(
            (ab: ArrayBuffer) => Buffer.from(ab),
          );
          metadata.coverMimeType = coverMimeType;
          break;
        }
      }
    }

    // Extract text content to count words
    let totalText = '';
    for (const path of Object.keys(epubData.files)) {
      if (path.endsWith('.xhtml') || path.endsWith('.html')) {
        try {
          const content = await epubData.files[path].async('string');
          // Remove XML tags
          const text = content.replace(/<[^>]*>/g, ' ');
          totalText += text + ' ';
        } catch {
          // Skip files that can't be read
        }
      }
    }

    if (totalText) {
      metadata.totalWords = countWords(totalText);
    }

    // Try to extract chapter structure
    // Look for NCX or navigation file
    let navContent: string | null = null;
    if (epubData.files['toc.ncx']) {
      navContent = await epubData.files['toc.ncx'].async('string');
    } else {
      for (const path of Object.keys(epubData.files)) {
        if (path.includes('nav') && (path.endsWith('.xhtml') || path.endsWith('.html'))) {
          navContent = await epubData.files[path].async('string');
          break;
        }
      }
    }

    // Parse navigation for chapters
    if (navContent) {
      const navItemRegex = /<navPoint[^>]*>\s*<navLabel>\s*<text>([^<]+)<\/text>/g;
      let match;
      let chapterIndex = 0;

      while ((match = navItemRegex.exec(navContent)) !== null) {
        metadata.chapters.push({
          index: chapterIndex,
          title: match[1].trim(),
        });
        chapterIndex++;
      }

      metadata.totalChapters = metadata.chapters.length;
    }

    return metadata;
  } catch (error) {
    console.error('Error extracting EPUB metadata:', error);
    return {
      chapters: [],
      rawMetadata: { error: 'Failed to extract EPUB metadata' },
    };
  }
}

/**
 * Extract metadata from PDF file
 */
export async function extractPdfMetadata(buffer: Buffer): Promise<BookMetadata> {
  try {
    // Dynamically import pdf-parse
    const pdfParse = (await import('pdf-parse')).default;

    const pdfData = await pdfParse(buffer);

    const metadata: BookMetadata = {
      chapters: [],
      totalPages: pdfData.numpages,
      rawMetadata: {
        pdfInfo: pdfData.info,
      },
    };

    // Extract metadata from PDF info
    if (pdfData.info) {
      metadata.title = (pdfData.info.Title as string | undefined) ?? undefined;
      metadata.author = (pdfData.info.Author as string | undefined) ?? undefined;
      metadata.description = (pdfData.info.Subject as string | undefined) ?? undefined;
      metadata.publisher = (pdfData.info.Creator as string | undefined) ?? undefined;
    }

    // Count words from extracted text
    if (pdfData.text) {
      metadata.totalWords = countWords(pdfData.text);
    }

    // PDFs don't have chapters, but we could create page-based "chapters"
    // For now, just return the basic metadata
    metadata.chapters = [];

    return metadata;
  } catch (error) {
    console.error('Error extracting PDF metadata:', error);
    return {
      chapters: [],
      rawMetadata: { error: 'Failed to extract PDF metadata' },
    };
  }
}

/**
 * Extract metadata from ebook file based on MIME type
 */
export async function extractMetadata(
  buffer: Buffer,
  mimeType: string,
): Promise<BookMetadata> {
  if (mimeType === 'application/epub+zip') {
    return extractEpubMetadata(buffer);
  } else if (mimeType === 'application/pdf') {
    return extractPdfMetadata(buffer);
  } else {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }
}
