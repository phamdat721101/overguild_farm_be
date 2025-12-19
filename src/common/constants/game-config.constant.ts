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
        totalHours: 12, // 12h Total
        baseYield: 3,
        waterCapacityDrops: 3, // 3 drops max
        stages: {
            SEED: { name: "Hạt", nameVi: "Hạt", duration: 0 },
            SPROUT: { name: "Mầm", nameVi: "Mầm", duration: 2 },
            GROWING: { name: "Cây", nameVi: "Cây", duration: 6 },
            BLOOM: { name: "Hoa", nameVi: "Hoa", duration: 10 },
            FRUIT: { name: "Quả", nameVi: "Quả", duration: 12 },
        },
    },
    MUSHROOM: {
        name: "Nấm",
        nameVi: "Nấm",
        source: "Craft (5 Tảo)",
        diggingHours: 10,
        growingHours: 72,
        totalHours: 72, // 72h Total
        baseYield: 5,
        craftCost: { ALGAE: 5 },
        waterCapacityDrops: 5, // 5 drops max
        stages: {
            SEED: { name: "Bào tử", nameVi: "Bào tử", duration: 0 },
            SPROUT: { name: "Sợi nấm", nameVi: "Sợi nấm", duration: 12 },
            GROWING: { name: "Thân nấm", nameVi: "Thân nấm", duration: 36 },
            BLOOM: { name: "Nấm trưởng thành", nameVi: "Nấm trưởng thành", duration: 60 },
            FRUIT: { name: "Nấm thu hoạch", nameVi: "Nấm thu hoạch", duration: 72 },
        },
    },
    TREE: {
        name: "Cây",
        nameVi: "Cây",
        source: "NFT Seed",
        diggingHours: 72,
        growingHours: 720,
        totalHours: 720, // 30 Days (30 * 24 = 720h)
        baseYield: 10,
        waterCapacityDrops: 8, // 8 drops max
        stages: {
            SEED: { name: "Hạt giống", nameVi: "Hạt giống", duration: 0 },
            SPROUT: { name: "Mầm (5 ngày)", nameVi: "Mầm", duration: 120 }, // 5 days * 24h = 120h
            GROWING: { name: "Cây Non (7 ngày)", nameVi: "Cây Non", duration: 288 }, // 120 + 7*24 = 120 + 168 = 288h
            BLOOM: { name: "Ra Hoa", nameVi: "Ra Hoa", duration: 648 }, // 288 + 15*24 (actually wait, let's map correctly)
            // User Requirements:
            // Quy trình Cây (Tree): Mầm (5 ngày) -> Cây Non (7 ngày – Ra Hoa) -> Quả (15 ngày – Chín).
            // Total = 5 + 7 + 15 = 27 days? Or is it cumulative?
            // "Mầm (5 ngày)" -> Sprout lasts 5 days.
            // "Cây Non (7 ngày - Ra Hoa)" -> Sapling lasts 7 days, then Blooms.
            // "Quả (15 ngày - Chín)" -> Fruits take 15 days to ripen?
            // Total: 5 + 7 + 15 = 27 Days. But "Tổng Thời Gian Lớn" says "30 Ngày".
            // Let's assume there's a 3 day gap or digging time included?
            // The prompt says "Growing Phase" table: Tree = 30 Days.
            // Let's stick to 30 Days Total = 720h.
            // Let's map stages proportionally or as close as possible.
            // Stage 1 (SEED): 0
            // Stage 2 (SPROUT): 0 -> 5 days (120h)
            // Stage 3 (GROWING): 5 -> 12 days (288h) [Duration 7 days]
            // Stage 4 (BLOOM): 12 -> 27 days (648h) [Duration 15 days]
            // Stage 5 (FRUIT/CHIN): 27 -> 30 days (720h) [Duration 3 days remaining to fully mature?]
            // Actually, let's set thresholds for *entering* the next stage.
            FRUIT: { name: "Quả Chín", nameVi: "Quả Chín", duration: 720 },
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
