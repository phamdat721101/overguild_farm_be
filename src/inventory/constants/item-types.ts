/**
 * Item type constants for inventory system
 */

export const ITEM_TYPES = {
  // Seeds
  SEED_COMMON: "SEED_COMMON",
  SEED_RARE: "SEED_RARE",
  SEED_EPIC: "SEED_EPIC",
  SEED_LEGENDARY: "SEED_LEGENDARY",
  SEED_ALGAE: "SEED_ALGAE",
  SEED_MUSHROOM: "SEED_MUSHROOM",
  SEED_TREE: "SEED_TREE",

  // Fruits
  FRUIT: "FRUIT",

  // Fertilizers
  FERTILIZER_COMMON: "FERTILIZER_COMMON",
  FERTILIZER_RARE: "FERTILIZER_RARE",
  FERTILIZER_EPIC: "FERTILIZER_EPIC",
  FERTILIZER_LEGENDARY: "FERTILIZER_LEGENDARY",

  // Currency
  GOLD: "GOLD",
  GEM: "GEM",

  // Reward boxes
  REWARD_BOX: "REWARD_BOX",

  // Event Rewards
  EVENT_CHECKIN_REWARD: "EVENT_CHECKIN_REWARD",

  // Additional Types
  BUCKET: "BUCKET",
  FRUIT_ALGAE: "FRUIT_ALGAE",
  FRUIT_MUSHROOM: "FRUIT_MUSHROOM",
  FRUIT_TREE: "FRUIT_TREE",
} as const;

export type ItemType = (typeof ITEM_TYPES)[keyof typeof ITEM_TYPES];

export const RARITY = {
  COMMON: "COMMON",
  RARE: "RARE",
  EPIC: "EPIC",
  LEGENDARY: "LEGENDARY",
} as const;

export type Rarity = (typeof RARITY)[keyof typeof RARITY];

/**
 * Item metadata interface
 */
export interface ItemMetadata {
  name: string;
  rarity: Rarity;
  category: string;
  icon: string;
  description?: string;
}

/**
 * Complete item metadata registry
 */
export const ITEM_REGISTRY: Record<string, ItemMetadata> = {
  // Seeds
  [ITEM_TYPES.SEED_COMMON]: {
    name: "Common Seed",
    rarity: RARITY.COMMON,
    category: "SEEDS",
    icon: "🌱",
    description: "A basic seed for growing social plants",
  },
  [ITEM_TYPES.SEED_RARE]: {
    name: "Rare Seed",
    rarity: RARITY.RARE,
    category: "SEEDS",
    icon: "🌿",
    description: "A rare seed with enhanced growth potential",
  },
  [ITEM_TYPES.SEED_EPIC]: {
    name: "Epic Seed",
    rarity: RARITY.EPIC,
    category: "SEEDS",
    icon: "🌳",
    description: "An epic seed that grows magnificent plants",
  },
  [ITEM_TYPES.SEED_LEGENDARY]: {
    name: "Legendary Seed",
    rarity: RARITY.LEGENDARY,
    category: "SEEDS",
    icon: "🌲",
    description: "The rarest seed with extraordinary properties",
  },
  [ITEM_TYPES.SEED_ALGAE]: {
    name: "Algae Sprout",
    rarity: RARITY.COMMON,
    category: "SEEDS",
    icon: "🌿",
    description: "Fast-growing algae seed. 1h dig + 12h grow = 13h total.",
  },
  [ITEM_TYPES.SEED_MUSHROOM]: {
    name: "Mushroom Spore",
    rarity: RARITY.RARE,
    category: "SEEDS",
    icon: "🍄",
    description: "Mushroom spore. 10h dig + 72h grow = 82h total. Craft from 5 algae fruits.",
  },
  [ITEM_TYPES.SEED_TREE]: {
    name: "Tree Seed (NFT)",
    rarity: RARITY.LEGENDARY,
    category: "SEEDS",
    icon: "🌳",
    description: "Rare NFT tree seed. 3 days dig + 27 days grow = 30 days total.",
  },

  // Fruits
  [ITEM_TYPES.FRUIT]: {
    name: "Fruit",
    rarity: RARITY.COMMON,
    category: "FRUITS",
    icon: "🍎",
    description: "Harvested fruit that can be composted into fertilizer",
  },

  // Fertilizers
  [ITEM_TYPES.FERTILIZER_COMMON]: {
    name: "Common Fertilizer",
    rarity: RARITY.COMMON,
    category: "FERTILIZERS",
    icon: "💩",
    description: "Basic fertilizer that boosts plant growth by 1 level",
  },
  [ITEM_TYPES.FERTILIZER_RARE]: {
    name: "Rare Fertilizer",
    rarity: RARITY.RARE,
    category: "FERTILIZERS",
    icon: "✨",
    description: "Rare fertilizer that boosts plant growth by 2 levels",
  },
  [ITEM_TYPES.FERTILIZER_EPIC]: {
    name: "Epic Fertilizer",
    rarity: RARITY.EPIC,
    category: "FERTILIZERS",
    icon: "💎",
    description: "Epic fertilizer that boosts plant growth by 3 levels",
  },
  [ITEM_TYPES.FERTILIZER_LEGENDARY]: {
    name: "Legendary Fertilizer",
    rarity: RARITY.LEGENDARY,
    category: "FERTILIZERS",
    icon: "👑",
    description: "Legendary fertilizer that boosts plant growth by 5 levels",
  },

  // Currency
  [ITEM_TYPES.GOLD]: {
    name: "Gold",
    rarity: RARITY.COMMON,
    category: "CURRENCY",
    icon: "🪙",
    description: "In-game currency for marketplace trades.",
  },
  [ITEM_TYPES.GEM]: {
    name: "Gem",
    rarity: RARITY.EPIC,
    category: "CURRENCY",
    icon: "💎",
    description: "Premium currency for special items and boosts.",
  },

  // Reward boxes
  [ITEM_TYPES.REWARD_BOX]: {
    name: "Reward Box",
    rarity: RARITY.RARE,
    category: "EVENT_REWARDS",
    icon: "🎁",
    description: "Mystery box from event check-in. Open to reveal random rewards!",
  },

  // Event Rewards
  [ITEM_TYPES.EVENT_CHECKIN_REWARD]: {
    name: "Event Check-in Reward",
    rarity: RARITY.COMMON,
    category: "EVENT_REWARDS",
    icon: "🎟️",
    description: "Reward received from event check-ins",
  },

  // Additional Items
  [ITEM_TYPES.BUCKET]: {
    name: "Bucket (Xẻng)",
    rarity: RARITY.COMMON,
    category: "TOOLS",
    icon: "🪣",
    description: "Required for digging and planting. One bucket per plant.",
  },
  [ITEM_TYPES.FRUIT_ALGAE]: {
    name: "Algae Fruit",
    rarity: RARITY.COMMON,
    category: "FRUITS",
    icon: "🌿",
    description: "Harvested from Algae plants. 5 = 1 Mushroom seed.",
  },
  [ITEM_TYPES.FRUIT_MUSHROOM]: {
    name: "Mushroom",
    rarity: RARITY.RARE,
    category: "FRUITS",
    icon: "🍄",
    description: "Harvested from Mushroom plants.",
  },
  [ITEM_TYPES.FRUIT_TREE]: {
    name: "Tree Fruit",
    rarity: RARITY.EPIC,
    category: "FRUITS",
    icon: "🍎",
    description: "Harvested from Tree plants after 30 days.",
  },
};

/**
 * Get item metadata by type
 */
export function getItemMetadata(itemType: string): ItemMetadata {
  return (
    ITEM_REGISTRY[itemType] || {
      name: itemType,
      rarity: RARITY.COMMON,
      category: "OTHER",
      icon: "📦",
      description: "Unknown item",
    }
  );
}

/**
 * Check if item type is valid
 */
export function isValidItemType(itemType: string): boolean {
  return itemType in ITEM_REGISTRY;
}

/**
 * Get all item types by category
 */
export function getItemTypesByCategory(category: string): string[] {
  return Object.entries(ITEM_REGISTRY)
    .filter(([_, metadata]) => metadata.category === category)
    .map(([itemType]) => itemType);
}
