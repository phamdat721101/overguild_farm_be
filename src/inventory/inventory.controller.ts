import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  Param,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { InventoryService } from "./inventory.service";
import { QueryInventoryDto, ItemCategory } from "./dto/query-inventory.dto";
import { AddItemDto, RemoveItemDto, TransferItemDto } from "./dto/add-item.dto";

@ApiTags("Inventory")
@Controller("inventory")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({
    summary: "Get user inventory",
    description:
      "Get complete inventory with optional filtering by category or search term",
  })
  @ApiQuery({ name: "category", enum: ItemCategory, required: false })
  @ApiQuery({ name: "search", type: String, required: false })
  @ApiResponse({
    status: 200,
    description: "Returns user inventory",
    schema: {
      example: {
        userId: "uuid",
        inventory: [
          {
            id: "uuid",
            itemType: "SEED_COMMON",
            amount: 15,
            name: "Common Seed",
            rarity: "COMMON",
            category: "SEEDS",
            icon: "🌱",
            createdAt: "2025-12-03T...",
            updatedAt: "2025-12-03T...",
          },
        ],
        grouped: {
          SEEDS: [],
          FRUITS: [],
          FERTILIZERS: [],
        },
        summary: {
          totalItems: 50,
          totalTypes: 8,
          categories: 3,
        },
      },
    },
  })
  async getInventory(
    @CurrentUser("sub") userId: string,
    @Query() query: QueryInventoryDto
  ) {
    return this.inventoryService.getInventory(
      userId,
      query.category,
      query.search
    );
  }

  @Get("summary")
  @ApiOperation({
    summary: "Get inventory summary",
    description: "Quick overview of inventory totals by category",
  })
  @ApiResponse({
    status: 200,
    description: "Returns inventory summary",
    schema: {
      example: {
        seeds: 20,
        fruits: 15,
        fertilizers: 5,
        eventRewards: 3,
        total: 43,
      },
    },
  })
  async getInventorySummary(@CurrentUser("sub") userId: string) {
    return this.inventoryService.getInventorySummary(userId);
  }

  @Post("add")
  @ApiOperation({
    summary: "Add item to inventory (Admin/System)",
    description:
      "Manually add items to user inventory. Used for admin operations or system rewards.",
  })
  @ApiResponse({ status: 201, description: "Item added successfully" })
  @ApiResponse({ status: 400, description: "Invalid item type or amount" })
  async addItem(@CurrentUser("sub") userId: string, @Body() dto: AddItemDto) {
    return this.inventoryService.addItem(userId, dto);
  }

  @Delete("remove")
  @ApiOperation({
    summary: "Remove item from inventory",
    description:
      "Remove items from inventory. Used for consuming items or admin operations.",
  })
  @ApiResponse({ status: 200, description: "Item removed successfully" })
  @ApiResponse({ status: 400, description: "Not enough items" })
  async removeItem(
    @CurrentUser("sub") userId: string,
    @Body() dto: RemoveItemDto
  ) {
    return this.inventoryService.removeItem(userId, dto);
  }

  @Post("transfer")
  @ApiOperation({
    summary: "Transfer item to another user",
    description:
      "Send items to another user. Recipient can be specified by user ID or wallet address.",
  })
  @ApiResponse({
    status: 201,
    description: "Item transferred successfully",
    schema: {
      example: {
        success: true,
        transfer: {
          from: "sender-uuid",
          to: "recipient-uuid",
          toWallet: "0x...",
          itemType: "FRUIT",
          amount: 10,
          message: "Thanks for helping!",
        },
        message: "Successfully transferred 10x FRUIT to Alice",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Not enough items or invalid recipient",
  })
  @ApiResponse({ status: 404, description: "Recipient not found" })
  async transferItem(
    @CurrentUser("sub") userId: string,
    @Body() dto: TransferItemDto
  ) {
    return this.inventoryService.transferItem(userId, dto);
  }

  @Get("check/:itemType/:amount")
  @ApiOperation({
    summary: "Check if user has enough of an item",
    description:
      "Utility endpoint to check item availability before performing actions",
  })
  @ApiResponse({
    status: 200,
    description: "Returns availability status",
    schema: {
      example: {
        itemType: "SEED_COMMON",
        amount: 5,
        hasEnough: true,
      },
    },
  })
  async checkItem(
    @CurrentUser("sub") userId: string,
    @Param("itemType") itemType: string,
    @Param("amount") amount: string
  ) {
    const hasEnough = await this.inventoryService.hasItem(
      userId,
      itemType,
      parseInt(amount)
    );
    return {
      itemType,
      amount: parseInt(amount),
      hasEnough,
    };
  }
}
