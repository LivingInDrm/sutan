import { z } from 'zod/v4';
import { UnlockConditionSchema } from './scene.schema';

const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const RuntimeLocationSchema = z.object({
  location_id: z.string().min(1),
  name: z.string().min(1),
  icon_image: z.string().min(1),
  backdrop_image: z.string().min(1).optional(),
  scene_ids: z.array(z.string().min(1)),
  unlock_conditions: UnlockConditionSchema.optional().default({}),
});

const LocationRefSchema = z.object({
  location_id: z.string().min(1),
  position: PositionSchema,
});

export const RuntimeMapSchema = z.object({
  map_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  background_image: z.string().min(1),
  location_refs: z.array(LocationRefSchema),
});

export const LocationConfigSchema = z.object({
  location_id: z.string().min(1),
  name: z.string().min(1),
  icon_image: z.string().min(1),
  backdrop_image: z.string().min(1).optional(),
  position: PositionSchema,
  scene_ids: z.array(z.string().min(1)),
  unlock_conditions: UnlockConditionSchema.default({}),
});

export const MapSchema = z.object({
  map_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  background_image: z.string().min(1),
  locations: z.array(LocationConfigSchema),
});

export function parseRuntimeLocation(raw: unknown) {
  return RuntimeLocationSchema.parse(raw);
}

export function parseRuntimeMap(raw: unknown) {
  return RuntimeMapSchema.parse(raw);
}

export function parseMap(raw: unknown) {
  return MapSchema.parse(raw);
}