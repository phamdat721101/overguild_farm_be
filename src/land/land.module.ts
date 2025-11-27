import { Module } from '@nestjs/common';
import { LandController } from './land.controller';
import { LandService } from './land.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [LandController],
  providers: [LandService],
  exports: [LandService],
})
export class LandModule {}
