import type { FastifyInstance } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { sensorService } from '../services/sensor.service.js';
import {
  SensorResponseSchema,
  ZoneResponseSchema,
  ErrorResponseSchema,
} from '../schemas.js';

export async function sensorsRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/sensors',
    {
      schema: {
        tags: ['sensors'],
        summary: 'Listar todos los sensores',
        description:
          'Retorna el listado completo de sensores registrados en el sistema.',
        response: {
          200: z.array(SensorResponseSchema),
          500: ErrorResponseSchema,
        },
      },
    },
    async (_req, reply) => {
      const result = await sensorService.getAll();
      return reply.send(result);
    }
  );

  app.get(
    '/sensors/:id/zones',
    {
      schema: {
        tags: ['sensors'],
        summary: 'Zonas activas de un sensor',
        description:
          'Retorna las zonas donde el sensor tiene monitoreos activos.',
        params: z.object({ id: z.string() }),
        response: {
          200: z.array(ZoneResponseSchema),
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const result = await sensorService.getZonesBySensorId(req.params.id);
      return reply.send(result);
    }
  );
}
