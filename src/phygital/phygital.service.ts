import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { RedeemRewardDto } from "./dto/redeem-reward.dto";
import {
  PHYGITAL_REWARD_CATALOG,
  PhygitalResourceType,
  PhygitalRewardKey,
  RESOURCE_CONFIG,
} from "./phygital.constants";

type ResourceBalances = Record<PhygitalResourceType, number>;

@Injectable()
export class PhygitalService {
  private readonly rewardMap = new Map(
    PHYGITAL_REWARD_CATALOG.map((reward) => [reward.key, reward]),
  );

  constructor(private readonly prisma: PrismaClient) {}

  async getRewardCatalog(userId: string) {
    const balances = await this.getResourceBalances(userId);

    const rewards = PHYGITAL_REWARD_CATALOG.map((reward) => ({
      ...reward,
      costs: reward.costs.map((cost) => {
        const resourceMeta = RESOURCE_CONFIG[cost.resource];
        return {
          ...cost,
          label: resourceMeta.label,
          icon: resourceMeta.icon,
          itemType: resourceMeta.itemType,
          userBalance: balances[cost.resource],
          affordable: balances[cost.resource] >= cost.amount,
        };
      }),
    }));

    return {
      resources: balances,
      rewards,
    };
  }

  async redeemReward(userId: string, dto: RedeemRewardDto) {
    const reward = this.rewardMap.get(dto.rewardKey);
    if (!reward) {
      throw new NotFoundException("Reward not found");
    }

    const costOption = reward.costs.find(
      (cost) => cost.resource === dto.paymentType,
    );
    if (!costOption) {
      throw new BadRequestException(
        "This reward does not support the selected resource type",
      );
    }

    const resourceMeta = RESOURCE_CONFIG[dto.paymentType];
    if (!resourceMeta) {
      throw new BadRequestException("Invalid resource type");
    }

    const { redemption } = await this.prisma.$transaction(async (tx) => {
      const inventoryItem = await tx.inventoryItem.findUnique({
        where: {
          userId_itemType: { userId, itemType: resourceMeta.itemType },
        },
      });

      if (!inventoryItem || inventoryItem.amount < costOption.amount) {
        throw new BadRequestException(
          `Not enough ${resourceMeta.label}. Required ${costOption.amount}, you have ${inventoryItem?.amount || 0}`,
        );
      }

      if (inventoryItem.amount === costOption.amount) {
        await tx.inventoryItem.delete({ where: { id: inventoryItem.id } });
      } else {
        await tx.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: { amount: { decrement: costOption.amount } },
        });
      }

      const record = await tx.phygitalRedemption.create({
        data: {
          userId,
          rewardKey: dto.rewardKey,
          paymentType: dto.paymentType,
          costAmount: costOption.amount,
          metadata: {
            contact: dto.contact,
            shippingAddress: dto.shippingAddress,
            note: dto.note,
          },
        },
      });

      return { redemption: record };
    });

    const balances = await this.getResourceBalances(userId);

    return {
      success: true,
      message: `Successfully redeemed ${reward.name} using ${RESOURCE_CONFIG[dto.paymentType].label}`,
      reward,
      payment: {
        resource: dto.paymentType,
        label: RESOURCE_CONFIG[dto.paymentType].label,
        icon: RESOURCE_CONFIG[dto.paymentType].icon,
        cost: costOption.amount,
        remaining: balances[dto.paymentType],
      },
      redemption,
      resources: balances,
    };
  }

  async getRedemptionHistory(userId: string) {
    return this.prisma.phygitalRedemption.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  private async getResourceBalances(userId: string): Promise<ResourceBalances> {
    const defaultBalances: ResourceBalances = {
      [PhygitalResourceType.TREE]: 0,
      [PhygitalResourceType.MUSHROOM]: 0,
      [PhygitalResourceType.SPORE]: 0,
    };

    const itemTypes = Object.values(RESOURCE_CONFIG).map(
      (config) => config.itemType,
    );

    const items = await this.prisma.inventoryItem.findMany({
      where: {
        userId,
        itemType: { in: itemTypes },
      },
    });

    const balances = { ...defaultBalances };

    Object.entries(RESOURCE_CONFIG).forEach(([resourceKey, meta]) => {
      const item = items.find((i) => i.itemType === meta.itemType);
      balances[resourceKey as PhygitalResourceType] = item?.amount || 0;
    });

    return balances;
  }
}
