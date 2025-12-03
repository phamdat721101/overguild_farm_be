# Inventory Module

Comprehensive inventory management system for OverGuild GameFi platform.

## Structure

```
inventory/
├── constants/
│   └── item-types.ts          # Item type definitions and metadata
├── dto/
│   ├── query-inventory.dto.ts # Query and filter DTOs
│   └── add-item.dto.ts        # Add/Remove/Transfer DTOs
├── inventory.controller.ts     # REST API endpoints
├── inventory.service.ts        # Business logic
├── inventory.module.ts         # Module definition
└── README.md                   # This file
```

## Quick Start

### 1. Import the module

```typescript
import { InventoryModule } from "./inventory/inventory.module";

@Module({
  imports: [InventoryModule],
})
export class AppModule {}
```

### 2. Use the service

```typescript
import { InventoryService } from "./inventory/inventory.service";

@Injectable()
export class MyService {
  constructor(private inventoryService: InventoryService) {}

  async example() {
    // Get user inventory
    const inventory = await this.inventoryService.getInventory(userId);

    // Add item
    await this.inventoryService.addItem(userId, {
      itemType: "SEED_COMMON",
      amount: 5,
    });

    // Check availability
    const hasSeeds = await this.inventoryService.hasItem(
      userId,
      "SEED_COMMON",
      1
    );
  }
}
```

## API Endpoints

| Method | Endpoint                         | Description              |
| ------ | -------------------------------- | ------------------------ |
| GET    | `/inventory`                     | Get complete inventory   |
| GET    | `/inventory/summary`             | Get inventory summary    |
| POST   | `/inventory/add`                 | Add item (admin)         |
| DELETE | `/inventory/remove`              | Remove item              |
| POST   | `/inventory/transfer`            | Transfer to another user |
| GET    | `/inventory/check/:type/:amount` | Check availability       |

## Features

### ✅ Filtering & Search

```typescript
// Filter by category
GET /inventory?category=SEEDS

// Search by item type
GET /inventory?search=COMMON

// Combine filters
GET /inventory?category=FERTILIZERS&search=RARE
```

### ✅ Item Transfer

```typescript
POST /inventory/transfer
{
  "recipientId": "0xWallet or UUID",
  "itemType": "FRUIT",
  "amount": 10,
  "message": "Thanks!"
}
```

### ✅ Grouped View

Items are automatically grouped by category:

- SEEDS
- FRUITS
- FERTILIZERS
- EVENT_REWARDS

### ✅ Rich Metadata

Each item includes:

- Name
- Rarity (COMMON, RARE, EPIC, LEGENDARY)
- Category
- Icon emoji
- Description

## Integration Examples

### With Plant Module

```typescript
// Before planting, check seed availability
const hasSeeds = await inventoryService.hasItem(userId, "SEED_COMMON", 1);
if (!hasSeeds) {
  throw new BadRequestException("No seeds available");
}

// Plant consumes seed
await seedService.consumeSeed(userId, "COMMON");
```

### With Event Module

```typescript
// After event check-in, add rewards
await inventoryService.addItem(userId, {
  itemType: "SEED_COMMON",
  amount: 3,
});
```

### With Fertilizer Module

```typescript
// Apply fertilizer (consumes from inventory)
await inventoryService.removeItem(userId, {
  itemType: "FERTILIZER_COMMON",
  amount: 1,
});
```

## Item Types

See `constants/item-types.ts` for complete list:

- **Seeds**: SEED_COMMON, SEED_RARE, SEED_EPIC, SEED_LEGENDARY
- **Fruits**: FRUIT
- **Fertilizers**: FERTILIZER_COMMON, FERTILIZER_RARE, FERTILIZER_EPIC, FERTILIZER_LEGENDARY
- **Event Rewards**: EVENT_CHECKIN_REWARD

## Testing

```bash
# Start dev server
npm run start:dev

# Open Swagger UI
open http://localhost:3000/api

# Test endpoints in "Inventory" section
```

## Notes

- All transfers are atomic (transaction-based)
- Items auto-delete when amount reaches 0
- Recipient can be user ID or wallet address
- All operations are logged

## Future Enhancements

- Transaction history
- Item expiration
- Crafting system
- Trading marketplace
- Bulk operations
