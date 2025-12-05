import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { StreakService } from "./streak.service";

@Injectable()
export class StreakScheduler {
  private readonly logger = new Logger(StreakScheduler.name);

  constructor(private readonly streakService: StreakService) {}

  /**
   * Run every hour to reset expired streaks
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleStreakReset() {
    this.logger.log("Running streak reset job...");
    const resetCount = await this.streakService.resetExpiredStreaks();
    this.logger.log(`Streak reset job completed. Reset ${resetCount} streaks.`);
  }
}
