export interface ItemReward {
  itemType: string;
  amount: number;
}

export interface DailyReward {
  gold: number;
  gem: number;
  items: ItemReward[];
}

// ✅ NEW: 7-day Vietnamese streak rewards
export const STREAK_REWARDS: Record<number, DailyReward> = {
  1: {
    // Thứ 2 (Monday)
    gold: 100,
    gem: 0,
    items: [],
  },
  2: {
    // Thứ 3 (Tuesday)
    gold: 0,
    gem: 0,
    items: [{ itemType: "BUG_GLOVE", amount: 1 }], // Găng Tay Bắt Sâu
  },
  3: {
    // Thứ 4 (Wednesday)
    gold: 0,
    gem: 20,
    items: [], // Gem as currency, not inventory
  },
  4: {
    // Thứ 5 (Thursday)
    gold: 0,
    gem: 0,
    items: [{ itemType: "SEED_ALGAE", amount: 2 }], // 2 Mầm Tảo
  },
  5: {
    // Thứ 6 (Friday)
    gold: 0,
    gem: 0,
    items: [{ itemType: "PESTICIDE", amount: 1 }], // Thuốc Trừ Sâu
  },
  6: {
    // Thứ 7 (Saturday)
    gold: 200,
    gem: 0,
    items: [],
  },
  7: {
    // CN (Sunday)
    gold: 0,
    gem: 0,
    items: [{ itemType: "SEED_MUSHROOM", amount: 1 }], // Bào Tử Nấm
  },
};

export const MAX_STREAK_DAYS = 7;
export const STREAK_EXPIRY_HOURS = 24; // Must check-in within 24 hours
export const STREAK_RESET_HOURS = 48; // Streak resets if > 48 hours
