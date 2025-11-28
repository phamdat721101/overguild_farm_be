import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class SeedService {
  constructor(private readonly prisma: PrismaClient) {}

  async getUserSeeds(userId: string) {
    return this.prisma.seed.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addSeed(userId: string, type: string, rarity: string = 'COMMON') {
    const existingSeed = await this.prisma.seed.findFirst({
      where: { userId, type, rarity },
    });

    if (existingSeed) {
      return this.prisma.seed.update({
        where: { id: existingSeed.id },
        data: { quantity: { increment: 1 } },
      });
    }

    return this.prisma.seed.create({
      data: { userId, type, rarity, quantity: 1 },
    });
  }

  async consumeSeed(userId: string, type: string) {
    const seed = await this.prisma.seed.findFirst({
      where: { userId, type, quantity: { gt: 0 } },
    });

    if (!seed) {
      throw new NotFoundException(`No ${type} seed available`);
    }

    if (seed.quantity === 1) {
      await this.prisma.seed.delete({ where: { id: seed.id } });
      return null;
    }

    return this.prisma.seed.update({
      where: { id: seed.id },
      data: { quantity: { decrement: 1 } },
    });
  }
}