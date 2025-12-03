import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class SoulboundTokenService {
  private readonly logger = new Logger(SoulboundTokenService.name);

  // Predefined badge types and their requirements
  private readonly BADGE_CONFIGS = {
    FIRST_PLANT: {
      name: 'First Sprout',
      description: 'Planted your first seed',
      metadata: { rarity: 'COMMON', category: 'gardening' },
    },
    HARVEST_MASTER: {
      name: 'Harvest Master',
      description: 'Harvested 10 plants',
      metadata: { rarity: 'RARE', category: 'gardening', requirement: 10 },
    },
    SOCIAL_BUTTERFLY: {
      name: 'Social Butterfly',
      description: 'Watered 50 plants',
      metadata: { rarity: 'RARE', category: 'social', requirement: 50 },
    },
    EVENT_EXPLORER: {
      name: 'Event Explorer',
      description: 'Attended 5 events',
      metadata: { rarity: 'EPIC', category: 'events', requirement: 5 },
    },
    TOKEN2049_VETERAN: {
      name: 'Token2049 Veteran',
      description: 'Attended Token2049 event',
      metadata: { rarity: 'LEGENDARY', category: 'events', event: 'Token2049' },
    },
    SOLIDITY_EXPERT: {
      name: 'Solidity Expert',
      description: 'Made 100 GitHub commits',
      metadata: { rarity: 'EPIC', category: 'development', requirement: 100 },
    },
    MISSION_COMPLETER: {
      name: 'Mission Completer',
      description: 'Completed 20 missions',
      metadata: { rarity: 'RARE', category: 'missions', requirement: 20 },
    },
    GOLD_BRANCH_OWNER: {
      name: 'Gold Branch Owner',
      description: 'Grew a plant with gold branch',
      metadata: { rarity: 'LEGENDARY', category: 'gardening' },
    },
  };

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Get all soulbound tokens for a user
   */
  async getUserTokens(userId: string) {
    const tokens = await this.prisma.soulboundToken.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
    });

    return {
      tokens,
      total: tokens.length,
      byCategory: this.groupByCategory(tokens),
    };
  }

  /**
   * Issue a soulbound token to a user
   * Prevents duplicates for the same badge name
   */
  async issueToken(userId: string, name: string, metadata?: Record<string, any>) {
    // Check if user already has this token
    const existing = await this.prisma.soulboundToken.findFirst({
      where: {
        userId,
        name,
      },
    });

    if (existing) {
      throw new BadRequestException(`User already has the "${name}" badge`);
    }

    const token = await this.prisma.soulboundToken.create({
      data: {
        userId,
        name,
        metadata: metadata || {},
      },
    });

    this.logger.log(`Issued soulbound token "${name}" to user ${userId}`);

    return {
      token,
      message: `🎖️ Badge "${name}" issued!`,
    };
  }

  /**
   * Issue a predefined badge by type
   */
  async issueBadge(userId: string, badgeType: keyof typeof this.BADGE_CONFIGS) {
    const config = this.BADGE_CONFIGS[badgeType];
    if (!config) {
      throw new BadRequestException(`Invalid badge type: ${badgeType}`);
    }

    return this.issueToken(userId, config.name, {
      ...config.metadata,
      description: config.description,
      badgeType,
    });
  }

  /**
   * Check and issue badges based on user achievements
   * Called after significant actions (harvest, water, check-in, etc.)
   */
  async checkAndIssueBadges(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        lands: {
          include: { 
            plant: true, // This will now include isGoldBranch field
          },
        },
        missions: {
          where: { status: 'CLAIMED' },
        },
        missionLogs: {
          where: { status: 'CLAIMED' },
        },
        inventoryItems: true,
        soulboundTokens: true,
      },
    });

    if (!user) {
      return { issued: [], message: 'User not found' };
    }

    const issuedBadges: string[] = [];
    const existingBadgeNames = new Set(user.soulboundTokens.map(t => t.name));

    // Check FIRST_PLANT badge
    if (user.lands.some(l => l.plant) && !existingBadgeNames.has(this.BADGE_CONFIGS.FIRST_PLANT.name)) {
      try {
        await this.issueBadge(userId, 'FIRST_PLANT');
        issuedBadges.push('FIRST_PLANT');
      } catch (error) {
        // Already has badge, ignore
      }
    }

    // Check HARVEST_MASTER badge
    const fruitItem = user.inventoryItems.find(i => i.itemType === 'FRUIT');
    const harvestCount = fruitItem?.amount || 0;
    if (harvestCount >= 10 && !existingBadgeNames.has(this.BADGE_CONFIGS.HARVEST_MASTER.name)) {
      try {
        await this.issueBadge(userId, 'HARVEST_MASTER');
        issuedBadges.push('HARVEST_MASTER');
      } catch (error) {
        // Already has badge, ignore
      }
    }

    // Check MISSION_COMPLETER badge
    const completedMissions = user.missionLogs.length;
    if (completedMissions >= 20 && !existingBadgeNames.has(this.BADGE_CONFIGS.MISSION_COMPLETER.name)) {
      try {
        await this.issueBadge(userId, 'MISSION_COMPLETER');
        issuedBadges.push('MISSION_COMPLETER');
      } catch (error) {
        // Already has badge, ignore
      }
    }

    // Check GOLD_BRANCH_OWNER badge (now works because isGoldBranch field exists)
    const hasGoldBranch = user.lands.some(l => l.plant?.isGoldBranch);
    if (hasGoldBranch && !existingBadgeNames.has(this.BADGE_CONFIGS.GOLD_BRANCH_OWNER.name)) {
      try {
        await this.issueBadge(userId, 'GOLD_BRANCH_OWNER');
        issuedBadges.push('GOLD_BRANCH_OWNER');
      } catch (error) {
        // Already has badge, ignore
      }
    }

    if (issuedBadges.length > 0) {
      this.logger.log(`Auto-issued ${issuedBadges.length} badges to user ${userId}: ${issuedBadges.join(', ')}`);
    }

    return {
      issued: issuedBadges,
      message: issuedBadges.length > 0 
        ? `🎖️ ${issuedBadges.length} new badge(s) earned!` 
        : 'No new badges earned',
    };
  }

  /**
   * Group tokens by category
   */
  private groupByCategory(tokens: any[]) {
    const grouped: Record<string, any[]> = {};
    
    tokens.forEach(token => {
      const category = (token.metadata as any)?.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(token);
    });

    return grouped;
  }

  /**
   * Get badge configurations (for frontend)
   */
  getBadgeConfigs() {
    return Object.entries(this.BADGE_CONFIGS).map(([type, config]) => ({
      type,
      name: config.name,
      description: config.description,
      metadata: config.metadata,
    }));
  }
}

