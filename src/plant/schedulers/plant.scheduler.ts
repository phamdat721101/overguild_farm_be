import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PlantQueueService } from "../queues/plant.queue.service";

@Injectable()
export class PlantScheduler {
  private readonly logger = new Logger(PlantScheduler.name);

  constructor(private readonly plantQueueService: PlantQueueService) {}

  /**
   * Run every 5 minutes to update plant stages
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handlePlantStageUpdates() {
    this.logger.log("Running scheduled plant stage updates...");

    try {
      const jobId = await this.plantQueueService.addUpdatePlantStagesJob({
        batchSize: 100,
      });

      this.logger.log(`Scheduled plant stage update job: ${jobId}`);
    } catch (error) {
      this.logger.error(
        `Failed to schedule plant stage updates: ${error.message}`
      );
    }
  }

  /**
   * Run every hour to clean up old completed jobs
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleQueueCleanup() {
    this.logger.log("Running queue cleanup...");

    try {
      const stats = await this.plantQueueService.getQueueStats();
      this.logger.log(`Queue stats before cleanup: ${JSON.stringify(stats)}`);

      // Note: Actual cleanup logic would go here
      // For now, just log the stats
    } catch (error) {
      this.logger.error(`Failed to run queue cleanup: ${error.message}`);
    }
  }
}
