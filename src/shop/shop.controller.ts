import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ShopService } from "./shop.service";
import { GoldShopPurchaseDto } from "./dto/gold-shop-purchase.dto";
import { GemShopPurchaseDto } from "./dto/gem-shop-purchase.dto";
import { CashShopPurchaseDto } from "./dto/cash-shop-purchase.dto";

@ApiTags("Shop")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
@Controller("shop")
export class ShopController {
  constructor(private readonly shopService: ShopService) { }

  @Get("water/status")
  @ApiOperation({ summary: "Get status of free water claim" })
  @ApiResponse({ status: 200, description: "Returns claim status including next claim time" })
  getFreeWaterStatus(@CurrentUser() user: any) {
    return this.shopService.getFreeWaterStatus(user.sub);
  }

  @Post("water/free")
  @ApiOperation({ summary: "Claim free water (The Well)" })
  @ApiResponse({ status: 200, description: "Water claimed successfully" })
  claimFreeWater(@CurrentUser() user: any) {
    return this.shopService.claimFreeWater(user.sub);
  }

  @Get("gold")
  @ApiOperation({ summary: "Get Gold Shop catalog and current gold balance" })
  @ApiResponse({
    status: 200,
    description: "Returns user gold balance and Gold Shop items",
  })
  getGoldShop(@CurrentUser() user: any) {
    return this.shopService.getGoldShop(user.sub);
  }

  @Post("gold/purchase")
  @ApiOperation({ summary: "Purchase an item from the Gold Shop" })
  @ApiResponse({ status: 201, description: "Purchase completed" })
  purchaseGoldItem(@CurrentUser() user: any, @Body() dto: GoldShopPurchaseDto) {
    return this.shopService.purchaseGoldShopItem(user.sub, dto);
  }

  @Get("gem")
  @ApiOperation({ summary: "Get Gem Shop catalog and current gem balance" })
  @ApiResponse({
    status: 200,
    description: "Returns user gem balance and Gem Shop items",
  })
  getGemShop(@CurrentUser() user: any) {
    return this.shopService.getGemShop(user.sub);
  }

  @Post("gem/purchase")
  @ApiOperation({ summary: "Purchase an item from the Gem Shop" })
  @ApiResponse({ status: 201, description: "Purchase completed" })
  purchaseGemItem(@CurrentUser() user: any, @Body() dto: GemShopPurchaseDto) {
    return this.shopService.purchaseGemShopItem(user.sub, dto);
  }

  @Get("cash")
  @ApiOperation({ summary: "Get Cash Shop catalog and current status" })
  @ApiResponse({
    status: 200,
    description: "Returns Cash Shop items and user status",
  })
  getCashShop(@CurrentUser() user: any) {
    return this.shopService.getCashShop(user.sub);
  }

  @Post("cash/purchase")
  @ApiOperation({ summary: "Purchase an item from the Cash Shop" })
  @ApiResponse({ status: 201, description: "Purchase completed" })
  purchaseCashItem(@CurrentUser() user: any, @Body() dto: CashShopPurchaseDto) {
    return this.shopService.purchaseCashShopItem(user.sub, dto);
  }
}
