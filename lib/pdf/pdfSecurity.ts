import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

export interface PdfValidationResult {
  isValid: boolean;
  error?: string;
  fileHash?: string;
  fileSize?: number;
  mimeType?: string;
  sanitizedFileName?: string;
  isEncrypted?: boolean;
}

export class PdfSecurityService {
  public static readonly MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
  public static readonly MIN_FILE_SIZE_BYTES = 64; // Minimum valid PDF size
  public static readonly UPLOADS_BASE_DIR = path.join(process.cwd(), "uploads", "pdfs");

  /**
   * Validates raw uploaded buffer against PDF magic bytes, file size, and integrity.
   */
  static validatePdfBuffer(buffer: Buffer, originalFilename: string): PdfValidationResult {
    if (!buffer || buffer.length === 0) {
      return { isValid: false, error: "Empty file provided. Please upload a valid PDF document." };
    }

    // Check PDF magic bytes: '%PDF-' = 0x25, 0x50, 0x44, 0x46, 0x2D
    const magic = buffer.subarray(0, 5).toString("latin1");
    if (!magic.startsWith("%PDF-")) {
      return {
        isValid: false,
        error: "Invalid file format: File header does not match standard PDF specifications (%PDF-).",
      };
    }

    if (buffer.length < this.MIN_FILE_SIZE_BYTES) {
      return { isValid: false, error: "File is too small to be a valid PDF document." };
    }

    if (buffer.length > this.MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        error: `File size exceeds the 25MB limit. Uploaded size: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB`,
      };
    }

    // Check for standard PDF EOF marker in the last 1024 bytes (corrupted or truncated PDFs)
    const endChunk = buffer.subarray(Math.max(0, buffer.length - 1024)).toString("latin1");
    if (!endChunk.includes("%%EOF")) {
      return {
        isValid: false,
        error: "Corrupted or truncated PDF file: Missing end-of-file (%%EOF) marker.",
      };
    }

    // Check if document is password protected / encrypted
    const isEncrypted = buffer.includes(Buffer.from("/Encrypt")) || buffer.includes(Buffer.from("/Standard"));

    const sanitizedFileName = this.sanitizeFileName(originalFilename);
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

    return {
      isValid: true,
      fileHash,
      fileSize: buffer.length,
      mimeType: "application/pdf",
      sanitizedFileName,
      isEncrypted,
    };
  }

  /**
   * Sanitizes uploaded filename to prevent directory traversal or control characters.
   */
  static sanitizeFileName(fileName: string): string {
    if (!fileName) return "document.pdf";
    // Strip path components (guards against ../ or C:\)
    const base = path.basename(fileName);
    // Remove dangerous or non-printable characters, retain unicode letters (Bengali/English) and digits
    const cleaned = base
      .replace(/[\0\r\n\t\x00-\x1f\x7f]/g, "")
      .replace(/[\\/:*?"<>|]/g, "_")
      .trim();

    const withExt = cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
    return withExt.length > 200 ? withExt.slice(-200) : withExt;
  }

  /**
   * Ensures upload directory exists and returns a safe, sandboxed file path.
   */
  static async getSecureStoragePath(fileHash: string): Promise<string> {
    const yearMonth = new Date().toISOString().slice(0, 7); // e.g., "2026-10"
    const targetDir = path.join(this.UPLOADS_BASE_DIR, yearMonth);

    // Verify targetDir is strictly inside UPLOADS_BASE_DIR
    const resolvedBase = path.resolve(this.UPLOADS_BASE_DIR);
    const resolvedTarget = path.resolve(targetDir);
    if (!resolvedTarget.startsWith(resolvedBase)) {
      throw new Error("Security violation: Insecure storage path detected.");
    }

    if (!existsSync(targetDir)) {
      await fs.mkdir(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, `${fileHash}.pdf`);
    return filePath;
  }

  /**
   * Securely saves PDF buffer to isolated server disk.
   */
  static async savePdfFile(buffer: Buffer, fileHash: string): Promise<string> {
    const storagePath = await this.getSecureStoragePath(fileHash);
    await fs.writeFile(storagePath, buffer);
    return storagePath;
  }

  /**
   * Securely deletes an uploaded PDF from server disk.
   */
  static async deletePdfFile(storagePath: string): Promise<boolean> {
    try {
      const resolvedBase = path.resolve(this.UPLOADS_BASE_DIR);
      const resolvedPath = path.resolve(storagePath);
      if (!resolvedPath.startsWith(resolvedBase)) {
        throw new Error("Security violation: Target file path is outside allowed uploads storage.");
      }

      if (existsSync(storagePath)) {
        await fs.unlink(storagePath);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to delete PDF file:", err);
      return false;
    }
  }

  /**
   * Securely reads an uploaded PDF from server disk.
   */
  static async readPdfFile(storagePath: string): Promise<Buffer> {
    const resolvedBase = path.resolve(this.UPLOADS_BASE_DIR);
    const resolvedPath = path.resolve(storagePath);
    if (!resolvedPath.startsWith(resolvedBase)) {
      throw new Error("Security violation: Target file path is outside allowed uploads storage.");
    }

    if (!existsSync(storagePath)) {
      throw new Error("PDF file does not exist on disk.");
    }
    return fs.readFile(storagePath);
  }
}

