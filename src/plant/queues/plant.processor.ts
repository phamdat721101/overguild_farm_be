import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import type { Job } from "bull";
import { PrismaClient } from "@prisma/client";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  PLANT_QUEUE,
  PlantJobType,
  type PlantJobData,
  type UpdatePlantStagesJobData,
  type UpdateSoilQualityJobData,
} from "./plant.queue.constants";
import { PlantEventType } from "../events/plant.events";

@Processor(PLANT_QUEUE)
export class PlantProcessor {
  private readonly logger = new Logger(PlantProcessor.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventEmitter: EventEmitter2
  ) { }

  @Process(PlantJobType.PROCESS_PLANT_CREATED)
  async handlePlantCreated(job: Job<PlantJobData>) {
    this.logger.log(`Processing plant created: ${job.data.plantId}`);

    try {
      const plant = await this.prisma.plant.findUnique({
        where: { id: job.data.plantId },
      });

      if (!plant) {
        throw new Error(`Plant ${job.data.plantId} not found`);
      }

      // Initialize plant timers
      await this.prisma.plant.update({
        where: { id: plant.id },
        data: {
          diggingStartedAt: new Date(),
          lastInteractedAt: new Date(),
        },
      });

      this.logger.log(`Plant ${job.data.plantId} initialized successfully`);
      return { success: true, plantId: job.data.plantId };
    } catch (error) {
      this.logger.error(`Failed to process plant created: ${error.message}`);
      throw error;
    }
  }

  @Process(PlantJobType.PROCESS_PLANT_WATERED)
  async handlePlantWatered(job: Job<PlantJobData>) {
    this.logger.log(`Processing plant watered: ${job.data.plantId}`);

    try {
      const plant = await this.prisma.plant.findUnique({
        where: { id: job.data.plantId },
        include: { land: true },
      });

      if (!plant) {
        throw new Error(`Plant ${job.data.plantId} not found`);
      }

      // Update soil hydration
      const currentSoil = plant.land.soilQuality as any;
      const newHydration = Math.min(100, (currentSoil.hydration || 50) + 10);

      await this.prisma.land.update({
        where: { id: plant.landId },
        data: {
          soilQuality: {
            ...currentSoil,
            hydration: newHydration,
          },
        },
      });

      this.logger.log(
        `Plant ${job.data.plantId} watered, hydration: ${newHydration}`
      );
      return {
        success: true,
        plantId: job.data.plantId,
        hydration: newHydration,
      };
    } catch (error) {
      this.logger.error(`Failed to process plant watered: ${error.message}`);
      throw error;
    }
  }

  @Process(PlantJobType.UPDATE_PLANT_STAGES)
  async handleUpdatePlantStages(job: Job<UpdatePlantStagesJobData>) {
    this.logger.log("Processing plant stage updates...");

    try {
      const batchSize = job.data.batchSize || 100;
      const now = new Date();

      // Find plants in DIGGING stage that are ready to grow
      const diggingPlants = await this.prisma.plant.findMany({
        where: {
          stage: "DIGGING",
          diggingCompleted: false,
        },
        take: batchSize,
      });

      let updatedCount = 0;

      for (const plant of diggingPlants) {
        if (!plant.diggingStartedAt) continue;

        const elapsedMs = now.getTime() - plant.diggingStartedAt.getTime();
        const elapsedSeconds = Math.floor(elapsedMs / 1000);

        if (elapsedSeconds >= plant.diggingDuration) {
          // Transition to GROWING stage
          await this.prisma.plant.update({
            where: { id: plant.id },
            data: {
              stage: "GROWING",
              diggingCompleted: true,
              growingStartedAt: now,
            },
          });

          // Emit stage updated event
          this.eventEmitter.emit(PlantEventType.PLANT_STAGE_UPDATED, {
            plantId: plant.id,
            oldStage: "DIGGING",
            newStage: "GROWING",
            timestamp: now,
          });

          updatedCount++;
        }
      }

      // Note: GROWING -> HARVESTABLE is now handled by PlantService based on Hydration (activeGrowthHours)
      // We removed the time-based logic here to avoid conflict.

      this.logger.log(`Updated ${updatedCount} plant stages (Digging -> Growing)`);
      return { success: true, updatedCount };
    } catch (error) {
      this.logger.error(`Failed to update plant stages: ${error.message}`);
      throw error;
    }
  }

  @Process(PlantJobType.UPDATE_SINGLE_PLANT_STAGE)
  async handleUpdateSinglePlantStage(job: Job<PlantJobData>) {
    this.logger.log(
      `Processing single plant stage update: ${job.data.plantId}`
    );

    try {
      const plant = await this.prisma.plant.findUnique({
        where: { id: job.data.plantId },
      });

      if (!plant) {
        throw new Error(`Plant ${job.data.plantId} not found`);
      }

      const now = new Date();
      let updated = false;
      let oldStage = plant.stage;
      let newStage = plant.stage;

      if (
        plant.stage === "DIGGING" &&
        !plant.diggingCompleted &&
        plant.diggingStartedAt
      ) {
        const elapsedMs = now.getTime() - plant.diggingStartedAt.getTime();
        const elapsedSeconds = Math.floor(elapsedMs / 1000);

        if (elapsedSeconds >= plant.diggingDuration) {
          await this.prisma.plant.update({
            where: { id: plant.id },
            data: {
              stage: "GROWING",
              diggingCompleted: true,
              growingStartedAt: now,
            },
          });
          newStage = "GROWING";
          updated = true;
        }
      }

      // Note: GROWING -> HARVESTABLE is handled by PlantService (Hydration)
      // We skip it here.

      if (updated) {
        this.eventEmitter.emit(PlantEventType.PLANT_STAGE_UPDATED, {
          plantId: plant.id,
          oldStage,
          newStage,
          timestamp: now,
        });
      }

      return { success: true, updated, oldStage, newStage };
    } catch (error) {
      this.logger.error(
        `Failed to update single plant stage: ${error.message}`
      );
      throw error;
    }
  }

  @Process(PlantJobType.UPDATE_SOIL_QUALITY)
  async handleUpdateSoilQuality(job: Job<UpdateSoilQualityJobData>) {
    this.logger.log(
      `Processing soil quality update for land: ${job.data.landId}`
    );

    try {
      const land = await this.prisma.land.findUnique({
        where: { id: job.data.landId },
      });

      if (!land) {
        throw new Error(`Land ${job.data.landId} not found`);
      }

      const currentSoil = land.soilQuality as any;
      const newSoil = {
        fertility: currentSoil.fertility || 50,
        hydration: currentSoil.hydration || 50,
      };

      if (job.data.changes.fertility !== undefined) {
        newSoil.fertility = Math.max(
          0,
          Math.min(100, newSoil.fertility + job.data.changes.fertility)
        );
      }

      if (job.data.changes.hydration !== undefined) {
        newSoil.hydration = Math.max(
          0,
          Math.min(100, newSoil.hydration + job.data.changes.hydration)
        );
      }

      await this.prisma.land.update({
        where: { id: job.data.landId },
        data: { soilQuality: newSoil },
      });

      this.logger.log(`Soil quality updated for land ${job.data.landId}`);
      return { success: true, landId: job.data.landId, soilQuality: newSoil };
    } catch (error) {
      this.logger.error(`Failed to update soil quality: ${error.message}`);
      throw error;
    }
  }
}
