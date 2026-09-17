import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return formatDate(d);
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename);

  const mimeTypes: Record<string, string> = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    ico: "image/x-icon",
    // Videos
    mp4: "video/mp4",
    webm: "video/webm",
    ogg: "video/ogg",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    flac: "audio/flac",
    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    // Text
    txt: "text/plain",
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    // Archives
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",
  };

  return mimeTypes[ext] || "application/octet-stream";
}

export function isImageFile(filename: string): boolean {
  const mime = getMimeType(filename);
  return mime.startsWith("image/");
}

export function isVideoFile(filename: string): boolean {
  const mime = getMimeType(filename);
  return mime.startsWith("video/");
}

export function isAudioFile(filename: string): boolean {
  const mime = getMimeType(filename);
  return mime.startsWith("audio/");
}

export function isPdfFile(filename: string): boolean {
  return getMimeType(filename) === "application/pdf";
}

export function isMarkdownFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext === "md" || ext === "markdown";
}

/**
 * Files that can be opened in the text viewer/editor: anything with a
 * text/* MIME type plus common plain-text extensions (case-insensitive).
 */
export function isTextFile(filename: string): boolean {
  const mime = getMimeType(filename);
  if (mime.startsWith("text/")) return true;

  const ext = filename.split(".").pop()?.toLowerCase();
  return (
    ext === "txt" ||
    ext === "md" ||
    ext === "markdown" ||
    ext === "log" ||
    ext === "csv" ||
    ext === "json" ||
    ext === "js" ||
    ext === "css" ||
    ext === "html"
  );
}

export function isPreviewable(filename: string): boolean {
  return isImageFile(filename) || isVideoFile(filename) || isAudioFile(filename) || isPdfFile(filename);
}

const OFFICE_EDITABLE_EXTS = new Set([
  "docx", "xlsx", "pptx",
  "odt", "ods", "odp",
  "csv", "txt",
]);

/**
 * Files that can be edited in the online office editor (Collabora CODE
 * via WOPI). Kept in sync with lib/wopi.ts — legacy binary formats
 * (doc/xls/ppt) are excluded because saving them would convert the format.
 */
export function isOfficeFile(filename: string): boolean {
  return OFFICE_EDITABLE_EXTS.has(getFileExtension(filename));
}
