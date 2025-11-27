import { LandGrowthStage } from '../enums/growth-stage.enum';

export interface LandEntity {
  id?: string;
  wallet_address: string;
  plot_index: number;
  soil_quality: Record<string, unknown> | null;
  seed_type: string | null;
  growth_stage: LandGrowthStage;
  growth_points: number;
  task_status: Record<string, unknown> | null;
  planted_at: string | null;
  last_progress_at: string | null;
  ready_at: string | null;
  bounty_claimed_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface LandSummary {
  land: LandEntity;
  tasks?: Record<string, unknown>;
}
