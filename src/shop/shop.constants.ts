export enum GoldShopItemKey {
  SHOVEL = "SHOVEL",
  BUG_GLOVE = "BUG_GLOVE",
  GROWTH_WATER = "GROWTH_WATER",
  FISH_FOOD = "FISH_FOOD",
  EXCHANGE_SPORE_MUSHROOM = "EXCHANGE_SPORE_MUSHROOM",
}

export type GoldShopItemConfig = {
  key: GoldShopItemKey;
  name: string;
  description: string;
  priceGold: number;
  period?: "DAY" | "WEEK";
  limitPerPeriod?: number;
};

export const GOLD_SHOP_ITEMS: GoldShopItemConfig[] = [
  {
    key: GoldShopItemKey.SHOVEL,
    name: "Shovel",
    description: "Unlocks advanced digging mechanics (1 per week).",
    priceGold: 500,
    period: "WEEK",
    limitPerPeriod: 1,
  },
  {
    key: GoldShopItemKey.BUG_GLOVE,
    name: "Bug Catch Glove",
    description: "Special glove to catch bugs around your plants.",
    priceGold: 30,
  },
  {
    key: GoldShopItemKey.GROWTH_WATER,
    name: "Growth Water",
    description: "Special water that speeds up plant growth (-1h, 1 per day).",
    priceGold: 100,
    period: "DAY",
    limitPerPeriod: 1,
  },
  {
    key: GoldShopItemKey.FISH_FOOD,
    name: "Fish Food",
    description: "Food for ecosystem pets (used in future events/features).",
    priceGold: 20,
  },
  {
    key: GoldShopItemKey.EXCHANGE_SPORE_MUSHROOM,
    name: "Mushroom Spore Exchange",
    description:
      "Convert 5 Algae Spores (FRUIT_ALGAE) into 1 Mushroom (FRUIT_MUSHROOM). Limit 2 per week.",
    priceGold: 0,
    period: "WEEK",
    limitPerPeriod: 2,
  },
];


