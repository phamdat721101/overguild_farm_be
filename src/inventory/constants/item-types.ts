/**
 * Item type constants for inventory system
 */

export const ITEM_TYPES = {
  // Seeds
  SEED_COMMON: "SEED_COMMON",
  SEED_RARE: "SEED_RARE",
  SEED_EPIC: "SEED_EPIC",
  SEED_LEGENDARY: "SEED_LEGENDARY",

  // Fruits
  FRUIT: "FRUIT",

  // Fertilizers
  FERTILIZER_COMMON: "FERTILIZER_COMMON",
  FERTILIZER_RARE: "FERTILIZER_RARE",
  FERTILIZER_EPIC: "FERTILIZER_EPIC",
  FERTILIZER_LEGENDARY: "FERTILIZER_LEGENDARY",

  // Event Rewards
  EVENT_CHECKIN_REWARD: "EVENT_CHECKIN_REWARD",
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

  // Event Rewards
  [ITEM_TYPES.EVENT_CHECKIN_REWARD]: {
    name: "Event Check-in Reward",
    rarity: RARITY.COMMON,
    category: "EVENT_REWARDS",
    icon: "🎟️",
    description: "Reward received from event check-ins",
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
