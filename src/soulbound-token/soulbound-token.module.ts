import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SoulboundTokenController } from './soulbound-token.controller';
import { SoulboundTokenService } from './soulbound-token.service';

@Module({
  controllers: [SoulboundTokenController],
  providers: [
    SoulboundTokenService,
    { provide: PrismaClient, useValue: new PrismaClient() },
  ],
  exports: [SoulboundTokenService],
})
export class SoulboundTokenModule {}

