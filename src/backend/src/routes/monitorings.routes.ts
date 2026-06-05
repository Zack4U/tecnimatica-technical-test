import type { FastifyInstance } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { monitoringService } from '../services/monitoring.service.js';
import {
  MonitoringResponseSchema,
  MonitoringStatusSchema,
  ReadingTypeSchema,
  ErrorResponseSchema,
} from '../schemas.js';
import type { MonitoringStatus } from '../types/Monitoring.js';

const CreateMonitoringBodySchema = z.object({
  sensor_id: z.string(),
  zone_id: z.string(),
  installation_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido, use YYYY-MM-DD'),
  reading_type: ReadingTypeSchema,
  threshold_value: z.number().positive('El umbral debe ser mayor que cero'),
  current_value: z.number().optional(),
  status: MonitoringStatusSchema.optional(),
});

const UpdateMonitoringBodySchema = z
  .object({
    threshold_value: z
      .number()
      .positive('El umbral debe ser mayor que cero')
      .optional(),
    current_value: z.number().nullable().optional(),
    status: MonitoringStatusSchema.optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: 'Debe enviar al menos un campo para actualizar' }
  );

export async function monitoringsRoutes(
  fastify: FastifyInstance
): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/monitorings',
    {
      schema: {
        tags: ['monitorings'],
        summary: 'Listar monitoreos',
        description:
          'Retorna todos los monitoreos. Opcionalmente filtra por estado (active o paused).',
        querystring: z.object({
          status: MonitoringStatusSchema.optional(),
        }),
        response: {
          200: z.array(MonitoringResponseSchema),
          400: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const result = await monitoringService.getAll(
        req.query.status as MonitoringStatus | undefined
      );
      return reply.send(result);
    }
  );

  app.post(
    '/monitorings',
    {
      schema: {
        tags: ['monitorings'],
        summary: 'Crear monitoreo',
        description:
          'Asigna un sensor a una zona con parámetros de monitoreo. No permite duplicar la combinación sensor-zona.',
        body: CreateMonitoringBodySchema,
        response: {
          201: MonitoringResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const result = await monitoringService.create(req.body);
      return reply.status(201).send(result);
    }
  );

  app.patch(
    '/monitorings/:id',
    {
      schema: {
        tags: ['monitorings'],
        summary: 'Actualizar monitoreo',
        description:
          'Actualiza el umbral, valor actual o estado de un monitoreo existente. Requiere al menos un campo.',
        params: z.object({ id: z.string() }),
        body: UpdateMonitoringBodySchema,
        response: {
          200: MonitoringResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const result = await monitoringService.update(req.params.id, req.body);
      return reply.send(result);
    }
  );
}
