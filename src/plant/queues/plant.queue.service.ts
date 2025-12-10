import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import type { Queue } from "bull";
import {
  PLANT_QUEUE,
  PlantJobType,
  PlantJobData,
  UpdatePlantStagesJobData,
  UpdateSoilQualityJobData,
} from "./plant.queue.constants";

@Injectable()
export class PlantQueueService {
  private readonly logger = new Logger(PlantQueueService.name);

  constructor(@InjectQueue(PLANT_QUEUE) private readonly plantQueue: Queue) {}

  async addPlantCreatedJob(data: PlantJobData) {
    const job = await this.plantQueue.add(
      PlantJobType.PROCESS_PLANT_CREATED,
      data,
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      }
    );

    this.logger.log(`Added plant created job: ${job.id}`);
    return job.id;
  }

  async addPlantWateredJob(data: PlantJobData) {
    const job = await this.plantQueue.add(
      PlantJobType.PROCESS_PLANT_WATERED,
      data,
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      }
    );

    this.logger.log(`Added plant watered job: ${job.id}`);
    return job.id;
  }

  async addPlantInteractedJob(data: PlantJobData) {
    const job = await this.plantQueue.add(
      PlantJobType.PROCESS_PLANT_INTERACTED,
      data,
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      }
    );

    this.logger.log(`Added plant interacted job: ${job.id}`);
    return job.id;
  }

  async addUpdatePlantStagesJob(data: UpdatePlantStagesJobData = {}) {
    const job = await this.plantQueue.add(
      PlantJobType.UPDATE_PLANT_STAGES,
      data,
      {
        attempts: 2,
        backoff: {
          type: "fixed",
          delay: 5000,
        },
      }
    );

    this.logger.log(`Added update plant stages job: ${job.id}`);
    return job.id;
  }

  async addUpdateSinglePlantStageJob(data: PlantJobData) {
    const job = await this.plantQueue.add(
      PlantJobType.UPDATE_SINGLE_PLANT_STAGE,
      data,
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      }
    );

    this.logger.log(`Added update single plant stage job: ${job.id}`);
    return job.id;
  }

  async addUpdateSoilQualityJob(data: UpdateSoilQualityJobData) {
    const job = await this.plantQueue.add(
      PlantJobType.UPDATE_SOIL_QUALITY,
      data,
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      }
    );

    this.logger.log(`Added update soil quality job: ${job.id}`);
    return job.id;
  }

  async getJobStatus(jobId: string) {
    const job = await this.plantQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    return {
      id: job.id,
      name: job.name,
      data: job.data,
      state,
      progress: job.progress(),
      attemptsMade: job.attemptsMade,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
    };
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.plantQueue.getWaitingCount(),
      this.plantQueue.getActiveCount(),
      this.plantQueue.getCompletedCount(),
      this.plantQueue.getFailedCount(),
      this.plantQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  async clearQueue() {
    await this.plantQueue.empty();
    this.logger.log("Plant queue cleared");
  }

  async retryFailedJobs() {
    const failedJobs = await this.plantQueue.getFailed();
    let retriedCount = 0;

    for (const job of failedJobs) {
      await job.retry();
      retriedCount++;
    }

    this.logger.log(`Retried ${retriedCount} failed jobs`);
    return retriedCount;
  }
}
