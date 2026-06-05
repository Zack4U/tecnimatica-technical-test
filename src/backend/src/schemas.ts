import { z } from 'zod';

export const SensorTypeSchema = z.enum([
  'temperature',
  'pressure',
  'vibration',
  'flow',
]);

export const ReadingTypeSchema = z.enum([
  'temperature',
  'pressure',
  'vibration',
  'flow',
]);

export const MonitoringStatusSchema = z.enum(['active', 'paused']);

export const SensorResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: SensorTypeSchema,
  manufacturer: z.string(),
  manufacture_date: z.string(),
  created_at: z.string(),
});

export const ZoneResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  location: z.string(),
  operational_status: z.enum(['active', 'inactive']),
  created_at: z.string(),
});

export const MonitoringResponseSchema = z.object({
  id: z.string(),
  sensor_id: z.string(),
  zone_id: z.string(),
  installation_date: z.string(),
  reading_type: ReadingTypeSchema,
  threshold_value: z.number(),
  current_value: z.number().nullable(),
  status: MonitoringStatusSchema,
  created_at: z.string(),
  sensor: SensorResponseSchema,
  zone: ZoneResponseSchema,
});

export const ErrorResponseSchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
});
