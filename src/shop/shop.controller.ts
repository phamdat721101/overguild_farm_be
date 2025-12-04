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

@ApiTags("Shop")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
@Controller("shop")
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

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
}


