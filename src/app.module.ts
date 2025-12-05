import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { SupabaseModule } from "./supabase/supabase.module";
import { LandModule } from "./land/land.module";
import { AuthModule } from "./auth/auth.module";
import { UserModule } from "./user/user.module";
import { SeedModule } from "./seed/seed.module";
import { PlantModule } from "./plant/plant.module";
import { EventModule } from "./event/event.module";
import { MissionModule } from "./mission/mission.module";
import { FertilizerModule } from "./fertilizer/fertilizer.module";
import { SoulboundTokenModule } from "./soulbound-token/soulbound-token.module";
import { ProgressionModule } from "./progression/progression.module";
import { InventoryModule } from "./inventory/inventory.module";
import { PhygitalModule } from "./phygital/phygital.module";
import { ShopModule } from "./shop/shop.module";
import { StreakModule } from "./streak/streak.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    SupabaseModule,
    AuthModule,
    UserModule,
    LandModule,
    SeedModule,
    PlantModule,
    EventModule,
    MissionModule,
    FertilizerModule,
    SoulboundTokenModule,
    ProgressionModule,
    InventoryModule,
    PhygitalModule,
    ShopModule,
    StreakModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
