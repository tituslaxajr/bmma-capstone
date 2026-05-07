/**
 * Client-side file validation for CapstonePH.
 * Enforces allowed MIME types and max file sizes before upload.
 */

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/* ── Allowed types by category ── */
const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const ARCHIVE_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
];

export const ALLOWED_MANUSCRIPT_TYPES = [...DOCUMENT_TYPES, ...ARCHIVE_TYPES];
export const ALLOWED_IMAGE_TYPES = IMAGE_TYPES;
export const ALLOWED_MEDIA_TYPES = [...VIDEO_TYPES, ...IMAGE_TYPES];
export const ALLOWED_ALL_TYPES = [...DOCUMENT_TYPES, ...IMAGE_TYPES, ...VIDEO_TYPES, ...ARCHIVE_TYPES];

/* ── Size limits ── */
export const MAX_FILE_SIZE = 25 * 1024 * 1024;        // 25 MB
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024;       // 5 MB
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;       // 10 MB

/* ── Helpers ── */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function friendlyType(mime: string): string {
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("word") || mime.includes("document")) return "Word Document";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "PowerPoint";
  if (mime.startsWith("image/")) return "Image";
  if (mime.startsWith("video/")) return "Video";
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z")) return "Archive";
  return mime;
}

/**
 * Validate a file against allowed MIME types and size limit.
 */
export function validateFile(
  file: File,
  options?: {
    allowedTypes?: string[];
    maxSize?: number;
  },
): FileValidationResult {
  const allowedTypes = options?.allowedTypes ?? ALLOWED_ALL_TYPES;
  const maxSize = options?.maxSize ?? MAX_FILE_SIZE;

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    const allowed = [...new Set(allowedTypes.map(friendlyType))].join(", ");
    return {
      valid: false,
      error: `"${file.name}" is not an allowed file type. Accepted: ${allowed}.`,
    };
  }

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `"${file.name}" (${formatBytes(file.size)}) exceeds the ${formatBytes(maxSize)} limit.`,
    };
  }

  // Check for empty files
  if (file.size === 0) {
    return { valid: false, error: `"${file.name}" is empty.` };
  }

  return { valid: true };
}

/**
 * Validate an avatar/profile image.
 */
export function validateAvatar(file: File): FileValidationResult {
  return validateFile(file, {
    allowedTypes: ALLOWED_IMAGE_TYPES,
    maxSize: MAX_AVATAR_SIZE,
  });
}

/**
 * Validate a manuscript/document upload.
 */
export function validateManuscript(file: File): FileValidationResult {
  return validateFile(file, {
    allowedTypes: ALLOWED_MANUSCRIPT_TYPES,
    maxSize: MAX_FILE_SIZE,
  });
}

/**
 * Get a human-readable accept string for <input type="file"> elements.
 */
export function getAcceptString(types: string[]): string {
  return types.join(",");
}
