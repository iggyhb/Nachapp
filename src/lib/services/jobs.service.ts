import { db } from '@/lib/db/client';
import { jobRuns } from '@/lib/db/schema';
import { eq, and, desc, lt } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface JobRun {
  id: string;
  jobType: string;
  entityType?: string;
  entityId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  finishedAt?: Date;
  logJson?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: Date;
}

/**
 * Servicio de gestión de trabajos en segundo plano
 */
export const jobsService = {
  /**
   * Crea un nuevo trabajo
   */
  async createJob(
    jobType: string,
    entityType?: string,
    entityId?: string,
  ): Promise<JobRun> {
    const job = {
      id: randomUUID(),
      jobType,
      entityType,
      entityId,
      status: 'pending' as const,
      startedAt: new Date(),
      createdAt: new Date(),
    };

    await db.insert(jobRuns).values(job);

    return job;
  },

  /**
   * Actualiza el estado de un trabajo
   */
  async updateJobStatus(
    jobId: string,
    status: 'running' | 'completed' | 'failed',
    errorMessage?: string,
    logJson?: Record<string, unknown>,
  ): Promise<JobRun | null> {
    await db
      .update(jobRuns)
      .set({
        status,
        finishedAt: status !== 'running' ? new Date() : undefined,
        errorMessage,
        logJson,
      })
      .where(eq(jobRuns.id, jobId));

    return this.getJob(jobId);
  },

  /**
   * Obtiene un trabajo por ID
   */
  async getJob(jobId: string): Promise<JobRun | null> {
    const job = await db.query.jobRuns.findFirst({
      where: eq(jobRuns.id, jobId),
    });

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      jobType: job.jobType,
      entityType: job.entityType ?? undefined,
      entityId: job.entityId ?? undefined,
      status: job.status as JobRun['status'],
      startedAt: job.startedAt,
      finishedAt: job.finishedAt ?? undefined,
      logJson: (job.logJson as Record<string, unknown> | undefined) ?? undefined,
      errorMessage: job.errorMessage ?? undefined,
      createdAt: job.createdAt,
    };
  },

  /**
   * Obtiene trabajos recientes
   */
  async getRecentJobs(maxResults: number = 50): Promise<JobRun[]> {
    const jobs = await db.query.jobRuns.findMany({
      orderBy: desc(jobRuns.createdAt),
      limit: maxResults,
    });

    return jobs.map((job) => ({
      id: job.id,
      jobType: job.jobType,
      entityType: job.entityType ?? undefined,
      entityId: job.entityId ?? undefined,
      status: job.status as JobRun['status'],
      startedAt: job.startedAt,
      finishedAt: job.finishedAt ?? undefined,
      logJson: (job.logJson as Record<string, unknown> | undefined) ?? undefined,
      errorMessage: job.errorMessage ?? undefined,
      createdAt: job.createdAt,
    }));
  },

  /**
   * Obtiene trabajos por tipo
   */
  async getJobsByType(jobType: string, maxResults: number = 50): Promise<JobRun[]> {
    const jobs = await db.query.jobRuns.findMany({
      where: eq(jobRuns.jobType, jobType),
      orderBy: desc(jobRuns.createdAt),
      limit: maxResults,
    });

    return jobs.map((job) => ({
      id: job.id,
      jobType: job.jobType,
      entityType: job.entityType ?? undefined,
      entityId: job.entityId ?? undefined,
      status: job.status as JobRun['status'],
      startedAt: job.startedAt,
      finishedAt: job.finishedAt ?? undefined,
      logJson: (job.logJson as Record<string, unknown> | undefined) ?? undefined,
      errorMessage: job.errorMessage ?? undefined,
      createdAt: job.createdAt,
    }));
  },

  /**
   * Obtiene trabajos pendientes
   */
  async getPendingJobs(): Promise<JobRun[]> {
    const jobs = await db.query.jobRuns.findMany({
      where: eq(jobRuns.status, 'pending'),
      orderBy: jobRuns.createdAt,
    });

    return jobs.map((job) => ({
      id: job.id,
      jobType: job.jobType,
      entityType: job.entityType ?? undefined,
      entityId: job.entityId ?? undefined,
      status: job.status as JobRun['status'],
      startedAt: job.startedAt,
      finishedAt: job.finishedAt ?? undefined,
      logJson: (job.logJson as Record<string, unknown> | undefined) ?? undefined,
      errorMessage: job.errorMessage ?? undefined,
      createdAt: job.createdAt,
    }));
  },

  /**
   * Limpia trabajos completados antiguos
   */
  async cleanupOldJobs(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await db
      .delete(jobRuns)
      .where(
        jobRuns.finishedAt
          ? and(
              eq(jobRuns.status, 'completed'),
              lt(jobRuns.finishedAt, cutoffDate),
            )
          : eq(jobRuns.status, 'completed'),
      );

    return result.count || 0;
  },
};
