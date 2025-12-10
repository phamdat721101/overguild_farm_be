export const PLANT_QUEUE = "plant-queue";

export enum PlantJobType {
  PROCESS_PLANT_CREATED = "process-plant-created",
  PROCESS_PLANT_WATERED = "process-plant-watered",
  PROCESS_PLANT_INTERACTED = "process-plant-interacted",
  PROCESS_PLANT_HARVESTED = "process-plant-harvested",
  UPDATE_PLANT_STAGES = "update-plant-stages",
  UPDATE_SINGLE_PLANT_STAGE = "update-single-plant-stage",
  UPDATE_SOIL_QUALITY = "update-soil-quality",
}

export interface PlantJobData {
  plantId: string;
  userId: string;
  landId?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePlantStagesJobData {
  batchSize?: number;
}

export interface UpdateSoilQualityJobData {
  landId: string;
  changes: {
    fertility?: number;
    hydration?: number;
  };
}
