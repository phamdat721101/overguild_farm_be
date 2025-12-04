import { ITEM_TYPES } from "../inventory/constants/item-types";

export enum PhygitalResourceType {
  TREE = "TREE",
  MUSHROOM = "MUSHROOM",
  SPORE = "SPORE",
}

export enum PhygitalRewardKey {
  TOTE_BAG = "TOTE_BAG",
  LOTTERY_TICKET = "LOTTERY_TICKET",
  RAZER_HEADSET = "RAZER_HEADSET",
  VOUCHER_300 = "VOUCHER_300",
  GOLD_BAR_1_CHI = "GOLD_BAR_1_CHI",
  IPHONE_FLAGSHIP = "IPHONE_FLAGSHIP",
  SEED_NFT = "SEED_NFT",
}

export const RESOURCE_CONFIG = {
  [PhygitalResourceType.TREE]: {
    label: "Tree",
    icon: "🌳",
    itemType: ITEM_TYPES.FRUIT_TREE || "FRUIT_TREE",
  },
  [PhygitalResourceType.MUSHROOM]: {
    label: "Mushroom",
    icon: "🍄",
    itemType: ITEM_TYPES.FRUIT_MUSHROOM || "FRUIT_MUSHROOM",
  },
  [PhygitalResourceType.SPORE]: {
    label: "Spore",
    icon: "🧫",
    itemType: ITEM_TYPES.FRUIT_ALGAE || "FRUIT_ALGAE",
  },
} as const;

export type RewardCostOption = {
  resource: PhygitalResourceType;
  amount: number;
};

export type PhygitalRewardConfig = {
  key: PhygitalRewardKey;
  name: string;
  description: string;
  costs: RewardCostOption[];
  image?: string;
};

export const PHYGITAL_REWARD_CATALOG: PhygitalRewardConfig[] = [
  {
    key: PhygitalRewardKey.TOTE_BAG,
    name: "Tote Bag",
    description: "OverGuild tote bag for carrying your laptop and merch.",
    costs: [
      { resource: PhygitalResourceType.TREE, amount: 1 },
      { resource: PhygitalResourceType.MUSHROOM, amount: 7 },
      { resource: PhygitalResourceType.SPORE, amount: 14 },
    ],
  },
  {
    key: PhygitalRewardKey.LOTTERY_TICKET,
    name: "Lottery Ticket",
    description: "Special community lottery ticket for raffles and giveaways.",
    costs: [
      { resource: PhygitalResourceType.TREE, amount: 5 },
      { resource: PhygitalResourceType.MUSHROOM, amount: 50 },
      { resource: PhygitalResourceType.SPORE, amount: 100 },
    ],
  },
  {
    key: PhygitalRewardKey.RAZER_HEADSET,
    name: "Razer Headset",
    description: "Razer gaming headset for hardcore farmers.",
    costs: [
      { resource: PhygitalResourceType.TREE, amount: 10 },
      { resource: PhygitalResourceType.MUSHROOM, amount: 200 },
      { resource: PhygitalResourceType.SPORE, amount: 400 },
    ],
  },
  {
    key: PhygitalRewardKey.VOUCHER_300,
    name: "$300 Voucher",
    description: "$300 voucher for tooling / Web3 services.",
    costs: [
      { resource: PhygitalResourceType.TREE, amount: 50 },
      { resource: PhygitalResourceType.MUSHROOM, amount: 1000 },
      { resource: PhygitalResourceType.SPORE, amount: 2000 },
    ],
  },
  {
    key: PhygitalRewardKey.GOLD_BAR_1_CHI,
    name: "1 Chi Gold 9999",
    description: "Physical gold reward for top-tier farmers.",
    costs: [
      { resource: PhygitalResourceType.TREE, amount: 100 },
      { resource: PhygitalResourceType.MUSHROOM, amount: 2000 },
      { resource: PhygitalResourceType.SPORE, amount: 4000 },
    ],
  },
  {
    key: PhygitalRewardKey.IPHONE_FLAGSHIP,
    name: "Latest iPhone",
    description: "Flagship iPhone for outstanding farmers.",
    costs: [
      { resource: PhygitalResourceType.TREE, amount: 150 },
      { resource: PhygitalResourceType.MUSHROOM, amount: 3000 },
      { resource: PhygitalResourceType.SPORE, amount: 6000 },
    ],
  },
  {
    key: PhygitalRewardKey.SEED_NFT,
    name: "Seed NFT",
    description: "Rare Seed NFT in the OverGuild ecosystem.",
    costs: [
      { resource: PhygitalResourceType.MUSHROOM, amount: 5000 },
      { resource: PhygitalResourceType.SPORE, amount: 10000 },
    ],
  },
];
