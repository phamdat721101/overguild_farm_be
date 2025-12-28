import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { TradeService } from "./trade.service";
import {
  CreateTradeDto,
  AddTradeItemDto,
  AddTradeCurrencyDto,
  CreateListingDto,
} from "./dto";
import { CurrencyType } from "./dto/add-trade-currency.dto";

@ApiTags("Trade")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
@Controller("trade")
export class TradeController {
  constructor(private readonly tradeService: TradeService) {}

  // ==================== P2P TRADE ====================

  @Post("request")
  @ApiOperation({ summary: "Create trade request (click on player)" })
  async createTradeRequest(
    @CurrentUser() user: any,
    @Body() dto: CreateTradeDto
  ) {
    return this.tradeService.createTradeRequest(user.sub, dto.receiverId);
  }

  @Post(":tradeId/accept")
  @ApiOperation({ summary: "Accept trade request" })
  async acceptTrade(
    @CurrentUser() user: any,
    @Param("tradeId") tradeId: string
  ) {
    return this.tradeService.acceptTradeRequest(user.sub, tradeId);
  }

  @Post(":tradeId/cancel")
  @ApiOperation({ summary: "Cancel/reject trade" })
  async cancelTrade(
    @CurrentUser() user: any,
    @Param("tradeId") tradeId: string
  ) {
    return this.tradeService.cancelTrade(user.sub, tradeId);
  }

  @Post(":tradeId/item")
  @ApiOperation({ summary: "Add item to trade" })
  async addItem(
    @CurrentUser() user: any,
    @Param("tradeId") tradeId: string,
    @Body() dto: AddTradeItemDto
  ) {
    return this.tradeService.addItemToTrade(user.sub, tradeId, dto);
  }

  @Delete(":tradeId/item/:itemType")
  @ApiOperation({ summary: "Remove item from trade" })
  @ApiQuery({ name: "amount", required: true, type: Number })
  async removeItem(
    @CurrentUser() user: any,
    @Param("tradeId") tradeId: string,
    @Param("itemType") itemType: string,
    @Query("amount") amount: string
  ) {
    return this.tradeService.removeItemFromTrade(
      user.sub,
      tradeId,
      itemType,
      parseInt(amount)
    );
  }

  @Post(":tradeId/currency")
  @ApiOperation({ summary: "Add currency (gold/gem) to trade" })
  async addCurrency(
    @CurrentUser() user: any,
    @Param("tradeId") tradeId: string,
    @Body() dto: AddTradeCurrencyDto
  ) {
    return this.tradeService.addCurrencyToTrade(user.sub, tradeId, dto);
  }

  @Delete(":tradeId/currency/:currencyType")
  @ApiOperation({ summary: "Remove currency from trade" })
  @ApiQuery({ name: "amount", required: true, type: Number })
  async removeCurrency(
    @CurrentUser() user: any,
    @Param("tradeId") tradeId: string,
    @Param("currencyType") currencyType: CurrencyType,
    @Query("amount") amount: string
  ) {
    return this.tradeService.removeCurrencyFromTrade(
      user.sub,
      tradeId,
      currencyType,
      parseInt(amount)
    );
  }

  @Post(":tradeId/confirm")
  @ApiOperation({ summary: "Confirm trade (both must confirm to execute)" })
  async confirmTrade(
    @CurrentUser() user: any,
    @Param("tradeId") tradeId: string
  ) {
    return this.tradeService.confirmTrade(user.sub, tradeId);
  }

  @Post(":tradeId/unconfirm")
  @ApiOperation({ summary: "Remove confirmation" })
  async unconfirmTrade(
    @CurrentUser() user: any,
    @Param("tradeId") tradeId: string
  ) {
    return this.tradeService.unconfirmTrade(user.sub, tradeId);
  }

  @Get("active")
  @ApiOperation({ summary: "Get active trades" })
  async getActiveTrades(@CurrentUser() user: any) {
    return this.tradeService.getActiveTrades(user.sub);
  }

  @Get("history")
  @ApiOperation({ summary: "Get trade history" })
  async getTradeHistory(
    @CurrentUser() user: any,
    @Query("limit") limit?: string
  ) {
    return this.tradeService.getTradeHistory(
      user.sub,
      limit ? parseInt(limit) : 20
    );
  }

  // ==================== MARKETPLACE ====================

  @Post("market/listing")
  @ApiOperation({ summary: "Create marketplace listing" })
  async createListing(@CurrentUser() user: any, @Body() dto: CreateListingDto) {
    return this.tradeService.createListing(user.sub, dto);
  }

  @Delete("market/listing/:listingId")
  @ApiOperation({ summary: "Cancel listing" })
  async cancelListing(
    @CurrentUser() user: any,
    @Param("listingId") listingId: string
  ) {
    return this.tradeService.cancelListing(user.sub, listingId);
  }

  @Post("market/listing/:listingId/buy")
  @ApiOperation({ summary: "Buy from marketplace" })
  @ApiQuery({ name: "payWithGem", required: false, type: Boolean })
  async buyListing(
    @CurrentUser() user: any,
    @Param("listingId") listingId: string,
    @Query("payWithGem") payWithGem?: string
  ) {
    return this.tradeService.buyListing(
      user.sub,
      listingId,
      payWithGem === "true"
    );
  }

  @Get("market/listings")
  @ApiOperation({ summary: "Get marketplace listings" })
  @ApiQuery({ name: "itemType", required: false })
  @ApiQuery({ name: "sellerId", required: false })
  async getListings(
    @Query("itemType") itemType?: string,
    @Query("sellerId") sellerId?: string
  ) {
    return this.tradeService.getListings({ itemType, sellerId });
  }

  @Get("market/my-listings")
  @ApiOperation({ summary: "Get my listings" })
  async getMyListings(@CurrentUser() user: any) {
    return this.tradeService.getMyListings(user.sub);
  }
}
