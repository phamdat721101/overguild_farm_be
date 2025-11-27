import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { LandGrowthStage } from './enums/growth-stage.enum';
import { LandEntity } from './interfaces/land.interface';
import { AssignSeedDto } from './dto/assign-seed.dto';

// Tạm dùng kiểu rộng để tránh lỗi TS với Supabase generated types
type LandInsert = Record<string, unknown>;
type LandUpdate = Record<string, unknown>;

@Injectable()
export class LandService {
  private readonly logger = new Logger(LandService.name);
  private readonly landsTable = 'lands';

  constructor(private readonly supabaseService: SupabaseService) {}

  async getLand(walletAddress: string): Promise<LandEntity> {
    const wallet = this.normalizeWallet(walletAddress);
    const client = this.supabaseService.getClient() as any;

    const response = await client
      .from(this.landsTable as any)
      .select('*')
      .eq('wallet_address', wallet)
      .maybeSingle();

    if (response.error) {
      this.logger.error('Failed to fetch land', response.error);
      throw new InternalServerErrorException('Unable to fetch land');
    }

    if (response.data) {
      return response.data as LandEntity;
    }

    return this.createDefaultLand(wallet);
  }

  async assignSeed(dto: AssignSeedDto): Promise<LandEntity> {
    const wallet = this.normalizeWallet(dto.walletAddress);
    const land = await this.getLand(wallet);

    if (
      land.growth_stage !== LandGrowthStage.EMPTY &&
      land.growth_stage !== LandGrowthStage.HARVESTED
    ) {
      throw new BadRequestException(
        `Land must be empty or harvested before assigning a new seed`,
      );
    }

    const now = new Date().toISOString();
    const payload: LandUpdate = {
      seed_type: dto.seedType,
      growth_stage: LandGrowthStage.SEEDED,
      planted_at: now,
      last_progress_at: now,
      task_status: land.task_status ?? {},
    };

    const client = this.supabaseService.getClient() as any;
    const response = await client
      .from(this.landsTable as any)
      .update(payload as any)
      .eq('wallet_address', wallet)
      .select('*')
      .single();

    if (response.error) {
      this.logger.error('Failed to assign seed', response.error);
      throw new InternalServerErrorException('Unable to assign seed');
    }

    return response.data as LandEntity;
  }

  private async createDefaultLand(wallet: string): Promise<LandEntity> {
    const client = this.supabaseService.getClient() as any;
    const defaultLand: LandInsert = {
      wallet_address: wallet,
      plot_index: 0,
      soil_quality: { fertility: 50, hydration: 50 },
      seed_type: null,
      growth_stage: LandGrowthStage.EMPTY,
      growth_points: 0,
      task_status: {},
      planted_at: null,
      last_progress_at: null,
      ready_at: null,
      bounty_claimed_at: null,
      metadata: {},
    };

    const response = await client
      .from(this.landsTable as any)
      .insert(defaultLand as any)
      .select('*')
      .single();

    if (response.error) {
      this.logger.error('Failed to create default land', response.error);
      throw new InternalServerErrorException('Unable to create land');
    }

    return response.data as LandEntity;
  }

  private normalizeWallet(wallet: string): string {
    return wallet?.trim().toLowerCase();
  }
}
