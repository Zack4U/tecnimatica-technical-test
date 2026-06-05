import type { FastifyInstance } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { readingService } from '../services/reading.service.js';
import { ErrorResponseSchema } from '../schemas.js';

const ReadingResponseSchema = z.object({
  id: z.string(),
  monitoring_id: z.string(),
  value: z.number(),
  recorded_at: z.string(),
});

// UUID relajado: valida formato hex sin exigir versión/variante (compatibilidad con IDs de seed)
const uuidLike = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'El monitoring_id debe ser un UUID válido'
  );

const CreateReadingBodySchema = z.object({
  monitoring_id: uuidLike,
  value: z.number(),
  recorded_at: z.string().datetime().optional(),
});

const CreateReadingsBatchBodySchema = z.object({
  readings: z
    .array(
      z.object({
        monitoring_id: uuidLike,
        value: z.number(),
        recorded_at: z.string().datetime().optional(),
      })
    )
    .min(1, 'El array de lecturas no puede estar vacío'),
});

const BatchResponseSchema = z.object({
  created: z.number(),
  skipped: z.number(),
  readings: z.array(ReadingResponseSchema),
});

export async function readingsRoutes(
  fastify: FastifyInstance
): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/monitorings/:id/readings',
    {
      schema: {
        tags: ['readings'],
        summary: 'Historial de lecturas de un monitoreo',
        description:
          'Retorna las últimas N lecturas ordenadas de más antigua a más reciente (para chart).',
        params: z.object({ id: z.string() }),
        querystring: z.object({
          limit: z.coerce.number().min(1).max(100).default(20),
        }),
        response: {
          200: z.array(ReadingResponseSchema),
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const result = await readingService.getHistory(
        req.params.id,
        req.query.limit
      );
      return reply.send(result);
    }
  );

  app.get(
    '/monitorings/:id/readings/latest',
    {
      schema: {
        tags: ['readings'],
        summary: 'Última lectura de un monitoreo',
        description: 'Retorna la lectura más reciente del monitoreo indicado.',
        params: z.object({ id: z.string() }),
        response: {
          200: ReadingResponseSchema.nullable(),
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const result = await readingService.getLatest(req.params.id);
      return reply.send(result);
    }
  );

  app.get(
    '/readings/latest',
    {
      schema: {
        tags: ['readings'],
        summary: 'Última lectura de todos los monitoreos activos',
        description:
          'Retorna un objeto indexado por monitoring_id con la lectura más reciente de cada monitoreo activo. Usado por el frontend al cargar el canvas inicial.',
        response: {
          200: z.record(z.string(), ReadingResponseSchema),
          500: ErrorResponseSchema,
        },
      },
    },
    async (_req, reply) => {
      const result = await readingService.getLatestAll();
      return reply.send(result);
    }
  );

  app.post(
    '/readings',
    {
      schema: {
        tags: ['readings'],
        summary: 'Registrar una lectura individual',
        description:
          'Crea una lectura y actualiza current_value en el monitoring. Retorna 422 si el monitoreo está pausado.',
        body: CreateReadingBodySchema,
        response: {
          201: ReadingResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          422: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const result = await readingService.createOne(req.body);
      return reply.status(201).send(result);
    }
  );

  app.post(
    '/readings/batch',
    {
      schema: {
        tags: ['readings'],
        summary: 'Registrar lecturas de múltiples sensores en una sola petición',
        description:
          'Endpoint optimizado para el simulador del frontend. ' +
          'Los monitoreos pausados se ignoran silenciosamente.',
        body: CreateReadingsBatchBodySchema,
        response: {
          201: BatchResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const result = await readingService.createBatch(req.body);
      return reply.status(201).send(result);
    }
  );
}
