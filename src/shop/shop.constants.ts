// Shop Types
export enum ShopType {
  GOLD = "GOLD",
  GEM = "GEM",
  CASH = "CASH",
}

// Gold Shop Items
export enum GoldShopItemKey {
  SHOVEL = "SHOVEL",
  BUG_GLOVE = "BUG_GLOVE",
  GROWTH_WATER = "GROWTH_WATER",
  FISH_FOOD = "FISH_FOOD",
  EXCHANGE_SPORE_MUSHROOM = "EXCHANGE_SPORE_MUSHROOM",
}

// Gem Shop Items
export enum GemShopItemKey {
  ALGAE_SEED = "ALGAE_SEED",
  MUSHROOM_SPORE = "MUSHROOM_SPORE",
  GROWTH_POTION_MID = "GROWTH_POTION_MID",
  GROWTH_POTION_HIGH = "GROWTH_POTION_HIGH",
  EXCHANGE_GOLD = "EXCHANGE_GOLD",
}

// Cash Shop Items
export enum CashShopItemKey {
  GEM_PACK_SMALL = "GEM_PACK_SMALL",
  GEM_PACK_MEDIUM = "GEM_PACK_MEDIUM",
  GEM_PACK_LARGE = "GEM_PACK_LARGE",
  GEM_PACK_MEGA = "GEM_PACK_MEGA",
  LAND_SLOT_2 = "LAND_SLOT_2",
  LAND_SLOT_3 = "LAND_SLOT_3",
  LAND_SLOT_4 = "LAND_SLOT_4",
  LAND_SLOT_5 = "LAND_SLOT_5",
}

// Base Shop Item Config
export type BaseShopItemConfig = {
  key: string;
  name: string;
  description: string;
  period?: "DAY" | "WEEK";
  limitPerPeriod?: number;
  icon?: string;
};

// Gold Shop Config
export type GoldShopItemConfig = BaseShopItemConfig & {
  key: GoldShopItemKey;
  priceGold: number;
  exchangeRequirement?: {
    itemType: string;
    amount: number;
  };
  exchangeReward?: {
    itemType: string;
    amount: number;
  };
};

// Gem Shop Config
export type GemShopItemConfig = BaseShopItemConfig & {
  key: GemShopItemKey;
  priceGem: number;
  reward?: {
    itemType?: string;
    amount?: number;
    gold?: number;
    effect?: string; // For potions
  };
};

// Cash Shop Config
export type CashShopItemConfig = BaseShopItemConfig & {
  key: CashShopItemKey;
  priceUSD: number;
  reward?: {
    gems?: number;
    landSlot?: number;
  };
};

// Gold Shop Items
export const GOLD_SHOP_ITEMS: GoldShopItemConfig[] = [
  {
    key: GoldShopItemKey.SHOVEL,
    name: "Shovel",
    description: "Professional digging tool (1/week)",
    priceGold: 500,
    period: "WEEK",
    limitPerPeriod: 1,
    icon: "🪓",
  },
  {
    key: GoldShopItemKey.BUG_GLOVE,
    name: "Bug Catching Gloves",
    description: "Special gloves for catching bugs",
    priceGold: 30,
    icon: "🧤",
  },
  {
    key: GoldShopItemKey.GROWTH_WATER,
    name: "Growth Water",
    description: "Special water that helps plants grow faster (-1h, 1/day)",
    priceGold: 100,
    period: "DAY",
    limitPerPeriod: 1,
    icon: "💧",
  },
  {
    key: GoldShopItemKey.FISH_FOOD,
    name: "Fish Food",
    description: "Food for aquatic ecosystem",
    priceGold: 20,
    icon: "🐟",
  },
  {
    key: GoldShopItemKey.EXCHANGE_SPORE_MUSHROOM,
    name: "Exchange Mushroom Spore",
    description: "Exchange 5 Mature Algae for 1 Mushroom Spore (2/week)",
    priceGold: 0,
    period: "WEEK",
    limitPerPeriod: 2,
    icon: "🍄",
    exchangeRequirement: {
      itemType: "FRUIT_ALGAE",
      amount: 5,
    },
    exchangeReward: {
      itemType: "FRUIT_MUSHROOM",
      amount: 1,
    },
  },
  // Wishing Well Items (Water)
  {
    key: GoldShopItemKey.GROWTH_WATER, // Reusing key but changing logic/price if needed
    name: "Water Drop (Wishing Well)",
    description: "1 Water Drop (3h Growth). Max 3/day. Level 5+ required.",
    priceGold: 50,
    period: "DAY",
    limitPerPeriod: 3, // Logic for price scaling (50->100->200) will be in Service
    icon: "💧",
  },
];

// Gem Shop Items
export const GEM_SHOP_ITEMS: GemShopItemConfig[] = [
  {
    key: GemShopItemKey.ALGAE_SEED,
    name: "Algae Seedling",
    description: "High-quality algae seeds",
    priceGem: 10,
    icon: "🌱",
    reward: {
      itemType: "SEED_COMMON",
      amount: 1,
    },
  },
  {
    key: GemShopItemKey.MUSHROOM_SPORE,
    name: "Mushroom Spore",
    description: "Rare mushroom spores",
    priceGem: 50,
    icon: "🍄",
    reward: {
      itemType: "SEED_RARE",
      amount: 1,
    },
  },
  {
    key: GemShopItemKey.GROWTH_POTION_MID,
    name: "Medium Growth Potion",
    description: "Reduces growth time by 12 hours",
    priceGem: 500,
    icon: "🧪",
    reward: {
      effect: "REDUCE_TIME_12H",
    },
  },
  {
    key: GemShopItemKey.GROWTH_POTION_HIGH,
    name: "Advanced Growth Potion",
    description: "Reduces growth time by 24 hours",
    priceGem: 1000,
    icon: "⚗️",
    reward: {
      effect: "REDUCE_TIME_24H",
    },
  },
  {
    key: GemShopItemKey.EXCHANGE_GOLD,
    name: "Exchange Gold",
    description: "Exchange 100 Gems for 1000 Gold",
    priceGem: 100,
    icon: "💰",
    reward: {
      gold: 1000,
    },
  },
];

// Cash Shop Items
export const CASH_SHOP_ITEMS: CashShopItemConfig[] = [
  {
    key: CashShopItemKey.GEM_PACK_SMALL,
    name: "Small Gem Pack",
    description: "100 Gems",
    priceUSD: 5,
    icon: "💎",
    reward: {
      gems: 100,
    },
  },
  {
    key: CashShopItemKey.GEM_PACK_MEDIUM,
    name: "Medium Gem Pack",
    description: "500 Gems (Bonus 50)",
    priceUSD: 20,
    icon: "💎",
    reward: {
      gems: 550,
    },
  },
  {
    key: CashShopItemKey.GEM_PACK_LARGE,
    name: "Large Gem Pack",
    description: "1200 Gems (Bonus 200)",
    priceUSD: 50,
    icon: "💎",
    reward: {
      gems: 1400,
    },
  },
  {
    key: CashShopItemKey.GEM_PACK_MEGA,
    name: "Mega Gem Pack",
    description: "2400 Gems (Bonus 600)",
    priceUSD: 100,
    icon: "💎",
    reward: {
      gems: 3000,
    },
  },
  {
    key: CashShopItemKey.LAND_SLOT_2,
    name: "Land Slot 2",
    description: "Unlock the 2nd land plot",
    priceUSD: 15,
    icon: "🏞️",
    reward: {
      landSlot: 2,
    },
  },
  {
    key: CashShopItemKey.LAND_SLOT_3,
    name: "Land Slot 3",
    description: "Unlock the 3rd land plot",
    priceUSD: 50,
    icon: "🏞️",
    reward: {
      landSlot: 3,
    },
  },
  {
    key: CashShopItemKey.LAND_SLOT_4,
    name: "Land Slot 4",
    description: "Unlock the 4th land plot",
    priceUSD: 150,
    icon: "🏞️",
    reward: {
      landSlot: 4,
    },
  },
  {
    key: CashShopItemKey.LAND_SLOT_5,
    name: "Land Slot 5",
    description: "Unlock the 5th land plot",
    priceUSD: 300,
    icon: "🏞️",
    reward: {
      landSlot: 5,
    },
  },
];
