declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
  }
  function parse(buffer: Buffer): Promise<PDFData>;
  export = parse;
}
