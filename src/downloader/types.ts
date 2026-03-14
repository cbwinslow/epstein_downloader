/**
 * Types for the downloader module
 */

export enum DownloadStatus {
  PENDING = 'pending',
  DOWNLOADING = 'downloading',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused'
}

export interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  size?: number; // in bytes
  status: DownloadStatus;
  retryCount: number;
  createdAt: Date;
  workerId?: number;
  startTime?: Date;
  endTime?: Date;
  errorMessage?: string;
}