// lib/document-extract.ts — server-side only, in-memory, never writes to disk
import "server-only";

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB
const MAX_EXTRACTED_CHARS = 60_000;
const MIN_EXTRACTED_CHARS = 20;

const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "txt", "md", "csv"]);

type ExtractOk = {
  ok: true;
  text: string;
  truncated: boolean;
  pageCount?: number;
};

type ExtractFail = {
  ok: false;
  message: string;
};

export type ExtractResult = ExtractOk | ExtractFail;

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return "";
  return filename.slice(dot + 1).toLowerCase();
}

/**
 * Validate magic bytes for binary file types.
 * Returns the detected file type or null if unknown / mismatched.
 */
function validateMagicBytes(
  buffer: Uint8Array,
  ext: string
): { valid: boolean; reason?: string } {
  if (ext === "pdf") {
    // PDF starts with %PDF (hex: 25 50 44 46)
    if (
      buffer[0] !== 0x25 ||
      buffer[1] !== 0x50 ||
      buffer[2] !== 0x44 ||
      buffer[3] !== 0x46
    ) {
      return { valid: false, reason: "This file type is not supported or the file looks invalid." };
    }
  } else if (ext === "docx") {
    // DOCX is a ZIP: starts with PK (hex: 50 4B)
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      return { valid: false, reason: "This file type is not supported or the file looks invalid." };
    }
  } else if (ext === "txt" || ext === "md" || ext === "csv") {
    // Must be valid UTF-8 with no NUL bytes
    try {
      const decoder = new TextDecoder("utf-8", { fatal: true });
      const decoded = decoder.decode(buffer);
      if (decoded.includes("\x00")) {
        return { valid: false, reason: "This file type is not supported or the file looks invalid." };
      }
    } catch {
      return { valid: false, reason: "This file type is not supported or the file looks invalid." };
    }
  }
  return { valid: true };
}

/**
 * Extract text from a File object in memory.
 * Validates extension and magic bytes before parsing.
 * Never writes to disk; never includes file content in errors or logs.
 */
export async function extractText(file: File): Promise<ExtractResult> {
  // Extension check
  const ext = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { ok: false, message: "This file type is not supported or the file looks invalid." };
  }

  // Size check
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, message: "File is too large. Maximum allowed size is 4 MB." };
  }

  // Read into memory
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  // Magic-byte validation
  const magic = validateMagicBytes(buffer, ext);
  if (!magic.valid) {
    return { ok: false, message: magic.reason! };
  }

  let rawText = "";
  let pageCount: number | undefined;

  try {
    if (ext === "pdf") {
      const { extractText: unpdfExtract } = await import("unpdf");
      const { text, totalPages } = await unpdfExtract(buffer, { mergePages: true });
      rawText = typeof text === "string" ? text : Array.isArray(text) ? (text as string[]).join("\n") : String(text);
      pageCount = totalPages;
    } else if (ext === "docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      rawText = result.value;
    } else {
      // txt, md, csv — decode as UTF-8
      const decoder = new TextDecoder("utf-8", { fatal: true });
      rawText = decoder.decode(buffer);
    }
  } catch {
    // Never log file content
    return { ok: false, message: "The file could not be read. It may be corrupted or in an unsupported format." };
  }

  // Empty or near-empty check
  const trimmed = rawText.trim();
  if (trimmed.length < MIN_EXTRACTED_CHARS) {
    return {
      ok: false,
      message: "No selectable text found. Scanned or image-only files are not supported.",
    };
  }

  // Truncate if needed
  const truncated = trimmed.length > MAX_EXTRACTED_CHARS;
  const text = truncated ? trimmed.slice(0, MAX_EXTRACTED_CHARS) : trimmed;

  return { ok: true, text, truncated, ...(pageCount !== undefined ? { pageCount } : {}) };
}
