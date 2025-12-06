import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AssignSeedDto } from "./dto/assign-seed.dto";

@Injectable()
export class LandService {
  private readonly logger = new Logger(LandService.name);

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Get user's land by wallet address
   * Creates default land if it doesn't exist
   */
  async getLand(walletAddress: string) {
    const wallet = walletAddress.toLowerCase();

    // Find user by wallet
    const user = await this.prisma.user.findUnique({
      where: { walletAddress: wallet },
      include: {
        lands: {
          include: { plant: true },
          orderBy: { plotIndex: "asc" },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found. Please register first.");
    }

    // Return first land (plot 0) for backward compatibility
    const land = user.lands[0];

    if (!land) {
      throw new NotFoundException("No land found for this user");
    }

    // Transform to legacy format for backward compatibility
    return {
      id: land.id,
      wallet_address: user.walletAddress,
      plot_index: land.plotIndex,
      soil_quality: land.soilQuality,
      seed_type: land.plant?.type || null,
      growth_stage: this.mapPlantStageToGrowthStage(land.plant?.stage),
      growth_points: land.plant?.interactions || 0,
      task_status: {},
      planted_at: land.plant?.plantedAt?.toISOString() || null,
      last_progress_at: land.plant?.lastInteractedAt?.toISOString() || null,
      ready_at: land.plant?.isHarvestable ? new Date().toISOString() : null,
      bounty_claimed_at: null,
      metadata: {},
      created_at: land.createdAt.toISOString(),
      updated_at: land.updatedAt.toISOString(),
    };
  }

  /**
   * Assign seed to land (legacy endpoint - prefer using POST /plant/plant instead)
   * @deprecated Use POST /plant/plant for new features
   */
  async assignSeed(dto: AssignSeedDto) {
    const wallet = dto.walletAddress.toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { walletAddress: wallet },
      include: {
        lands: {
          include: { plant: true },
          orderBy: { plotIndex: "asc" },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const land = user.lands[0];
    if (!land) {
      throw new NotFoundException("No land found for this user");
    }

    if (land.plant) {
      throw new BadRequestException(
        "Land already has a plant. Harvest it first!",
      );
    }

    // ✅ Only allow new plant types
    const allowedTypes = ["ALGAE", "MUSHROOM", "TREE"];
    if (!allowedTypes.includes(dto.seedType)) {
      throw new BadRequestException(
        `Invalid seed type. Must be one of: ${allowedTypes.join(", ")}`
      );
    }

    const now = new Date();
    const plant = await this.prisma.plant.create({
      data: {
        landId: land.id,
        type: dto.seedType,
        stage: "DIGGING",
        plantedAt: now,
        lastInteractedAt: now,
        diggingStartedAt: now,
        diggingDuration: this.getDiggingDuration(dto.seedType),
        growingDuration: this.getGrowingDuration(dto.seedType),
        diggingCompleted: false,
        interactions: 0,
        waterCount: 0,
        githubCommits: 0,
        isGoldBranch: false,
      },
    });

    return {
      id: land.id,
      wallet_address: user.walletAddress,
      plot_index: land.plotIndex,
      soil_quality: land.soilQuality,
      seed_type: plant.type,
      growth_stage: "seeded",
      growth_points: 0,
      task_status: {},
      planted_at: plant.plantedAt.toISOString(),
      last_progress_at: plant.lastInteractedAt.toISOString(),
      ready_at: null,
      bounty_claimed_at: null,
      metadata: {},
      created_at: land.createdAt.toISOString(),
      updated_at: land.updatedAt.toISOString(),
    };
  }

  private mapPlantStageToGrowthStage(stage?: string): string {
    if (!stage) return "empty";

    const stageMap: Record<string, string> = {
      DIGGING: "seeded",
      GROWING: "sprout",
      MATURE: "fruit",
      HARVESTED: "harvested",
    };

    return stageMap[stage] || "empty";
  }

  private getDiggingDuration(seedType: string): number {
    const durations: Record<string, number> = {
      ALGAE: 1,
      MUSHROOM: 10,
      TREE: 72,
    };
    return durations[seedType] || 1;
  }

  private getGrowingDuration(seedType: string): number {
    const durations: Record<string, number> = {
      ALGAE: 12,
      MUSHROOM: 72,
      TREE: 720,
    };
    return durations[seedType] || 12;
  }
}
