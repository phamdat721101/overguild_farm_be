export const ITEM_METADATA = {
    // Seeds
    SEED_COMMON: {
        name: "Common Seed",
        rarity: "COMMON",
        category: "SEEDS",
        icon: "🌱",
    },
    SEED_RARE: {
        name: "Rare Seed",
        rarity: "RARE",
        category: "SEEDS",
        icon: "🌿",
    },
    SEED_EPIC: {
        name: "Epic Seed",
        rarity: "EPIC",
        category: "SEEDS",
        icon: "🌳",
    },
    SEED_LEGENDARY: {
        name: "Legendary Seed",
        rarity: "LEGENDARY",
        category: "SEEDS",
        icon: "🌲",
    },

    // Fruits
    FRUIT: { name: "Fruit", rarity: "COMMON", category: "FRUITS", icon: "🍎" },
    FRUIT_ALGAE: {
        name: "Bào tử Tảo",
        rarity: "COMMON",
        category: "FRUITS",
        icon: "🧫",
    },
    FRUIT_MUSHROOM: {
        name: "Nấm",
        rarity: "RARE",
        category: "FRUITS",
        icon: "🍄",
    },
    FRUIT_TREE: {
        name: "Trái Cây",
        rarity: "EPIC",
        category: "FRUITS",
        icon: "🌳",
    },

    // Fertilizers
    FERTILIZER_COMMON: {
        name: "Common Fertilizer",
        rarity: "COMMON",
        category: "FERTILIZERS",
        icon: "💩",
    },
    FERTILIZER_RARE: {
        name: "Rare Fertilizer",
        rarity: "RARE",
        category: "FERTILIZERS",
        icon: "✨",
    },
    FERTILIZER_EPIC: {
        name: "Epic Fertilizer",
        rarity: "EPIC",
        category: "FERTILIZERS",
        icon: "💎",
    },
    FERTILIZER_LEGENDARY: {
        name: "Legendary Fertilizer",
        rarity: "LEGENDARY",
        category: "FERTILIZERS",
        icon: "👑",
    },

    // Event rewards
    EVENT_CHECKIN_REWARD: {
        name: "Event Check-in Reward",
        rarity: "COMMON",
        category: "EVENT_REWARDS",
        icon: "🎟️",
    },
};

export const PLANT_CONFIGS = {
    ALGAE: {
        name: "Tảo",
        nameVi: "Tảo",
        source: "Shop/Starter",
        diggingHours: 1,
        growingHours: 12,
        totalHours: 13,
        baseYield: 3,
        stages: {
            SEED: { name: "Hạt", nameVi: "Hạt", duration: 0 },
            SPROUT: { name: "Mầm", nameVi: "Mầm", duration: 3 },
            GROWING: { name: "Cây", nameVi: "Cây", duration: 8 },
            BLOOM: { name: "Hoa", nameVi: "Hoa", duration: 12 },
            FRUIT: { name: "Quả", nameVi: "Quả", duration: 13 },
        },
    },
    MUSHROOM: {
        name: "Nấm",
        nameVi: "Nấm",
        source: "Craft (5 Tảo)",
        diggingHours: 10,
        growingHours: 72,
        totalHours: 82,
        baseYield: 5,
        craftCost: { ALGAE: 5 },
        stages: {
            SEED: { name: "Bào tử", nameVi: "Bào tử", duration: 0 },
            SPROUT: { name: "Sợi nấm", nameVi: "Sợi nấm", duration: 10 },
            GROWING: { name: "Thân nấm", nameVi: "Thân nấm", duration: 30 },
            BLOOM: { name: "Nấm trưởng thành", nameVi: "Nấm trưởng thành", duration: 60 },
            FRUIT: { name: "Nấm thu hoạch", nameVi: "Nấm thu hoạch", duration: 82 },
        },
    },
    TREE: {
        name: "Cây",
        nameVi: "Cây",
        source: "NFT Seed",
        diggingHours: 72,
        growingHours: 720,
        totalHours: 792,
        baseYield: 10,
        stages: {
            SEED: { name: "Hạt giống", nameVi: "Hạt giống", duration: 0 },
            SPROUT: { name: "Mầm non", nameVi: "Mầm non", duration: 72 },
            GROWING: { name: "Cây con", nameVi: "Cây con", duration: 240 },
            BLOOM: { name: "Cây ra hoa", nameVi: "Cây ra hoa", duration: 480 },
            FRUIT: { name: "Cây có quả", nameVi: "Cây có quả", duration: 792 },
        },
    },
};

export const STAGE_THRESHOLDS = {
    SEED: 0,
    SPROUT: 3,
    GROWING: 8,
    BLOOM: 12,
    FRUIT: 15,
};

export const PLANT_CONSTANTS = {
    DAILY_WATER_LIMIT: 1,
    WILT_HOURS: 72,
    WATER_COOLDOWN_HOURS: 1,
};
