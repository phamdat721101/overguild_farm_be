export interface ItemReward {
  itemType: string;
  amount: number;
}

export interface DailyReward {
  gold: number;
  ruby: number;
  items: ItemReward[];
}

export const STREAK_REWARDS: Record<number, DailyReward> = {
  1: {
    gold: 10,
    ruby: 0,
    items: [{ itemType: "SEED_COMMON", amount: 1 }],
  },
  2: {
    gold: 15,
    ruby: 0,
    items: [{ itemType: "SEED_COMMON", amount: 1 }],
  },
  3: {
    gold: 20,
    ruby: 0,
    items: [{ itemType: "SEED_RARE", amount: 1 }],
  },
  4: {
    gold: 25,
    ruby: 0,
    items: [{ itemType: "FERTILIZER_COMMON", amount: 1 }],
  },
  5: {
    gold: 30,
    ruby: 0,
    items: [{ itemType: "SEED_EPIC", amount: 1 }],
  },
  6: {
    gold: 40,
    ruby: 0,
    items: [{ itemType: "FERTILIZER_RARE", amount: 1 }],
  },
  7: {
    gold: 50,
    ruby: 5,
    items: [{ itemType: "SEED_LEGENDARY", amount: 1 }],
  },
};

export const MAX_STREAK_DAYS = 7;
export const STREAK_EXPIRY_HOURS = 24;
export const STREAK_RESET_HOURS = 48;
