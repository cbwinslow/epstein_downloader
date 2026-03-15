import { Logger } from '../utils/logger';
import { RetryStrategy, RetryStrategies } from './retry-strategy';

export interface LoadBalancerConfig {
  maxConcurrentDownloads: number;
  queueTimeout: number;
  retryStrategy: RetryStrategy;
  enableFairDistribution: boolean;
}

export interface DownloadTask {
  id: string;
  dataSetNumber: number;
  pageNumber: number;
  fileIndex: number;
  filename: string;
  url: string;
  priority: number;
  createdAt: Date;
  assignedWorker?: number;
  startTime?: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  retries: number;
}

export interface WorkerStats {
  id: number;
  isActive: boolean;
  currentTask?: DownloadTask;
  completedTasks: number;
  failedTasks: number;
  totalDownloadedBytes: number;
  averageSpeed: number;
  lastActivity: Date;
}

export class LoadBalancer {
  private logger: Logger;
  private config: LoadBalancerConfig;
  private workers: Map<number, WorkerStats> = new Map();
  private taskQueue: DownloadTask[] = [];
  private activeTasks: Map<string, DownloadTask> = new Map();
  private isRunning: boolean = false;
  private processingInterval?: NodeJS.Timeout;

  constructor(config?: Partial<LoadBalancerConfig>) {
    this.logger = Logger.getInstance();
    this.config = {
      maxConcurrentDownloads: 5,
      queueTimeout: 300000, // 5 minutes
      retryStrategy: RetryStrategies.download(),
      enableFairDistribution: true,
      ...config
    };

    this.initializeWorkers();
  }

  /**
   * Initialize worker pool
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.config.maxConcurrentDownloads; i++) {
      this.workers.set(i, {
        id: i,
        isActive: true,
        completedTasks: 0,
        failedTasks: 0,
        totalDownloadedBytes: 0,
        averageSpeed: 0,
        lastActivity: new Date()
      });
    }
    this.logger.info(`Load balancer initialized with ${this.config.maxConcurrentDownloads} workers`);
  }

  /**
   * Add a download task to the queue
   */
  public addTask(task: Omit<DownloadTask, 'id' | 'createdAt' | 'status' | 'retries'>): string {
    const fullTask: DownloadTask = {
      ...task,
      id: this.generateTaskId(),
      createdAt: new Date(),
      status: 'pending',
      retries: 0
    };

    this.taskQueue.push(fullTask);
    this.taskQueue.sort((a, b) => a.priority - b.priority); // Higher priority first
    
    this.logger.debug(`Task ${fullTask.id} added to queue: ${fullTask.filename}`);
    return fullTask.id;
  }

  /**
   * Start processing tasks
   */
  public start(): void {
    if (this.isRunning) {
      this.logger.warn('Load balancer is already running');
      return;
    }

    this.isRunning = true;
    this.processingInterval = setInterval(() => this.processTasks(), 1000);
    this.logger.info('Load balancer started');
  }

  /**
   * Stop processing tasks
   */
  public stop(): void {
    if (!this.isRunning) {
      this.logger.warn('Load balancer is not running');
      return;
    }

    this.isRunning = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    this.logger.info('Load balancer stopped');
  }

  /**
   * Process pending tasks
   */
  private async processTasks(): Promise<void> {
    if (!this.isRunning) return;

    // Find available workers
    const availableWorkers = Array.from(this.workers.values())
      .filter(worker => worker.isActive && !worker.currentTask)
      .sort((a, b) => a.completedTasks - b.completedTasks); // Fair distribution

    // Assign tasks to available workers
    for (const worker of availableWorkers) {
      const task = this.getNextTask(worker.id);
      if (task) {
        this.assignTaskToWorker(worker, task);
        this.executeTask(worker, task);
      }
    }

    // Check for timed out tasks
    this.checkForTimeouts();
  }

  /**
   * Get next task for a worker
   */
  private getNextTask(workerId: number): DownloadTask | undefined {
    if (this.taskQueue.length === 0) return undefined;

    if (this.config.enableFairDistribution) {
      // Find task that hasn't been attempted by this worker recently
      const task = this.taskQueue.find(t => 
        !t.assignedWorker || t.assignedWorker === workerId
      );
      return task;
    }

    return this.taskQueue.shift();
  }

  /**
   * Assign task to worker
   */
  private assignTaskToWorker(worker: WorkerStats, task: DownloadTask): void {
    task.assignedWorker = worker.id;
    task.startTime = new Date();
    task.status = 'running';
    worker.currentTask = task;
    this.activeTasks.set(task.id, task);
    this.logger.info(`Worker ${worker.id} assigned task ${task.id}: ${task.filename}`);
  }

  /**
   * Execute a task with retry logic
   */
  private async executeTask(worker: WorkerStats, task: DownloadTask): Promise<void> {
    try {
      const result = await this.config.retryStrategy.executeWithRetry(
        () => this.downloadFile(task),
        `download-${task.id}`
      );

      this.completeTask(worker, task, result);
    } catch (error) {
      this.handleTaskFailure(worker, task, error as Error);
    }
  }

  /**
   * Simulate file download (to be replaced with actual download logic)
   */
  private async downloadFile(task: DownloadTask): Promise<{ size: number; speed: number }> {
    // Simulate download time based on file size
    const fileSize = Math.floor(Math.random() * 10000000) + 1000000; // 1-10MB
    const downloadTime = fileSize / 1000000; // Simulate 1MB/s speed
    
    await new Promise(resolve => setTimeout(resolve, downloadTime * 1000));
    
    const speed = fileSize / downloadTime;
    return { size: fileSize, speed };
  }

  /**
   * Complete a task successfully
   */
  private completeTask(worker: WorkerStats, task: DownloadTask, result: { size: number; speed: number }): void {
    task.status = 'completed';
    task.endTime = new Date();
    task.assignedWorker = undefined;
    worker.currentTask = undefined;
    worker.completedTasks++;
    worker.totalDownloadedBytes += result.size;
    worker.averageSpeed = (worker.averageSpeed + result.speed) / 2;
    worker.lastActivity = new Date();
    this.activeTasks.delete(task.id);

    this.logger.info(`✅ Task ${task.id} completed by worker ${worker.id}: ${task.filename} (${this.formatBytes(result.size)})`);
  }

  /**
   * Handle task failure
   */
  private handleTaskFailure(worker: WorkerStats, task: DownloadTask, error: Error): void {
    task.retries++;
    task.error = error.message;
    task.assignedWorker = undefined;
    worker.currentTask = undefined;
    worker.failedTasks++;
    worker.lastActivity = new Date();

    if (task.retries < this.config.retryStrategy.getConfig().maxRetries) {
      // Re-queue task with lower priority
      task.priority = Math.max(1, task.priority - 1);
      task.status = 'pending';
      this.taskQueue.push(task);
      this.logger.warn(`⚠️ Task ${task.id} failed (${task.retries} retries), re-queuing: ${error.message}`);
    } else {
      task.status = 'failed';
      this.activeTasks.delete(task.id);
      this.logger.error(`❌ Task ${task.id} failed permanently after ${task.retries} retries: ${error.message}`);
    }
  }

  /**
   * Check for timed out tasks
   */
  private checkForTimeouts(): void {
    const now = new Date();
    for (const [taskId, task] of this.activeTasks.entries()) {
      if (task.startTime && (now.getTime() - task.startTime.getTime()) > this.config.queueTimeout) {
        this.logger.warn(`⏰ Task ${taskId} timed out, cancelling`);
        this.cancelTask(taskId, 'Timeout');
      }
    }
  }

  /**
   * Cancel a specific task
   */
  public cancelTask(taskId: string, reason: string): boolean {
    const task = this.activeTasks.get(taskId);
    if (!task) return false;

    const worker = Array.from(this.workers.values()).find(w => w.currentTask?.id === taskId);
    if (worker) {
      worker.currentTask = undefined;
      worker.lastActivity = new Date();
    }

    task.status = 'cancelled';
    task.error = reason;
    this.activeTasks.delete(taskId);
    this.logger.info(`Cancelled task ${taskId}: ${reason}`);
    return true;
  }

  /**
   * Get load balancer statistics
   */
  public getStats(): {
    queueSize: number;
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    workers: WorkerStats[];
    utilization: number;
  } {
    const totalCompleted = Array.from(this.workers.values()).reduce((sum, w) => sum + w.completedTasks, 0);
    const totalFailed = Array.from(this.workers.values()).reduce((sum, w) => sum + w.failedTasks, 0);
    const activeTasks = this.activeTasks.size;
    const queueSize = this.taskQueue.length;
    const utilization = this.workers.size > 0 ? activeTasks / this.workers.size : 0;

    return {
      queueSize,
      activeTasks,
      completedTasks: totalCompleted,
      failedTasks: totalFailed,
      workers: Array.from(this.workers.values()),
      utilization
    };
  }

  /**
   * Get task by ID
   */
  public getTask(taskId: string): DownloadTask | undefined {
    return this.activeTasks.get(taskId) || this.taskQueue.find(t => t.id === taskId);
  }

  /**
   * Clear all pending tasks
   */
  public clearQueue(): void {
    this.taskQueue = [];
    this.logger.info('Task queue cleared');
  }

  /**
   * Update load balancer configuration
   */
  public updateConfig(newConfig: Partial<LoadBalancerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info(`Load balancer configuration updated: maxConcurrentDownloads=${this.config.maxConcurrentDownloads}, queueTimeout=${this.config.queueTimeout}ms`);
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}