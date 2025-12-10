export enum PlantEventType {
  PLANT_CREATED = "plant.created",
  PLANT_WATERED = "plant.watered",
  PLANT_INTERACTED = "plant.interacted",
  PLANT_HARVESTED = "plant.harvested",
  PLANT_STAGE_UPDATED = "plant.stage.updated",
}

export interface PlantEventPayload {
  plantId: string;
  userId: string;
  landId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PlantCreatedEvent extends PlantEventPayload {
  type: string;
  stage: string;
}

export interface PlantWateredEvent extends PlantEventPayload {
  wateredBy: string;
  waterCount: number;
}

export interface PlantInteractedEvent extends PlantEventPayload {
  interactionType: string;
  interactions: number;
}

export interface PlantHarvestedEvent extends PlantEventPayload {
  fruitYield: number;
  rewards: {
    fruits: number;
    xp: number;
  };
}

export interface PlantStageUpdatedEvent extends PlantEventPayload {
  oldStage: string;
  newStage: string;
  progress: number;
}
