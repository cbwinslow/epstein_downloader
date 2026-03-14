/**
 * Types for the downloader module
 */
export declare enum DownloadStatus {
    PENDING = "pending",
    DOWNLOADING = "downloading",
    COMPLETED = "completed",
    FAILED = "failed",
    PAUSED = "paused"
}
export interface DownloadItem {
    id: string;
    url: string;
    filename: string;
    size?: number;
    status: DownloadStatus;
    retryCount: number;
    createdAt: Date;
    workerId?: number;
    startTime?: Date;
    endTime?: Date;
    errorMessage?: string;
}
