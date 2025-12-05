import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./types";

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: SupabaseClient<Database>;

  constructor(private readonly configService: ConfigService) {
    // Ưu tiên ConfigService (đọc từ .env), nhưng fallback sang process.env
    const supabaseUrl =
      this.configService.get<string>("SUPABASE_URL") ??
      process.env.SUPABASE_URL;

    const supabaseKey =
      this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY") ??
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      this.configService.get<string>("SUPABASE_ANON_KEY") ??
      process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error(
        `Supabase credentials are not configured. hasUrl=${!!supabaseUrl}, hasKey=${!!supabaseKey}`,
      );
      throw new Error("Supabase credentials are not configured");
    }

    this.client = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    this.logger.log("Supabase client initialized");
  }

  getClient(): SupabaseClient<Database> {
    return this.client;
  }
}
