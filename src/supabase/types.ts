import { LandGrowthStage } from "../land/enums/growth-stage.enum";

export interface Database {
  public: {
    Tables: {
      lands: {
        Row: {
          id: string;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          plot_index?: number;
          soil_quality?: Record<string, unknown> | null;
          seed_type?: string | null;
          growth_stage?: LandGrowthStage;
          growth_points?: number;
          task_status?: Record<string, unknown> | null;
          planted_at?: string | null;
          last_progress_at?: string | null;
          ready_at?: string | null;
          bounty_claimed_at?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          wallet_address?: string;
          plot_index?: number;
          soil_quality?: Record<string, unknown> | null;
          seed_type?: string | null;
          growth_stage?: LandGrowthStage;
          growth_points?: number;
          task_status?: Record<string, unknown> | null;
          planted_at?: string | null;
          last_progress_at?: string | null;
          ready_at?: string | null;
          bounty_claimed_at?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      land_tasks: {
        Row: {
          id: string;
          wallet_address: string;
          task_code: string;
          progress: number;
          target: number;
          status: string;
          last_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          task_code: string;
          progress?: number;
          target?: number;
          status?: string;
          last_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          wallet_address?: string;
          task_code?: string;
          progress?: number;
          target?: number;
          status?: string;
          last_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
