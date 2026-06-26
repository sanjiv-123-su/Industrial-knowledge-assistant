export type DocStatus = "processed" | "processing" | "failed" | "queued";

export interface ApiDocument {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  pages: number;
  chunks: number;
  status: DocStatus;
  sizeBytes?: number;
  mimeType?: string;
  preview?: string;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}