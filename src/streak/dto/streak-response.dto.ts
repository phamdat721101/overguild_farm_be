import { ApiProperty } from "@nestjs/swagger";

export class ItemRewardDto {
  @ApiProperty({ example: "SEED_COMMON" })
  itemType: string;

  @ApiProperty({ example: 1 })
  amount: number;

  @ApiProperty({ example: "Common Seed" })
  name: string;

  @ApiProperty({ example: "COMMON" })
  rarity: string;

  @ApiProperty({ example: "🌱" })
  icon: string;
}

export class RewardDto {
  @ApiProperty({ example: 10 })
  gold: number;

  @ApiProperty({ example: 0 })
  ruby: number;

  @ApiProperty({ type: [ItemRewardDto] })
  items: ItemRewardDto[];
}

export class CheckinResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 1 })
  streakDay: number;

  @ApiProperty({ example: 1 })
  currentStreak: number;

  @ApiProperty({ example: 0 })
  totalCycles: number;

  @ApiProperty({ type: RewardDto })
  rewards: RewardDto;

  @ApiProperty({ example: "2024-12-06T10:00:00Z", nullable: true })
  nextCheckinAt: Date | null;

  @ApiProperty({ example: "Check-in successful! Day 1 of 7" })
  message: string;
}

export class StreakStatusDto {
  @ApiProperty({ example: 1 })
  currentStreak: number;

  @ApiProperty({ example: "2024-12-05T10:00:00Z", nullable: true })
  lastCheckinAt: Date | null;

  @ApiProperty({ example: "2024-12-06T10:00:00Z", nullable: true })
  nextCheckinAt: Date | null;

  @ApiProperty({ example: 0 })
  totalCycles: number;

  @ApiProperty({ example: true })
  canCheckinNow: boolean;

  @ApiProperty({ type: RewardDto })
  nextRewards: RewardDto;

  @ApiProperty({ example: 6 })
  daysUntilCycleComplete: number;
}

export class CheckinRecordDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 1 })
  streakDay: number;

  @ApiProperty({ type: RewardDto })
  rewards: RewardDto;

  @ApiProperty()
  checkinAt: Date;
}

export class CheckinHistoryDto {
  @ApiProperty({ type: [CheckinRecordDto] })
  checkins: CheckinRecordDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
