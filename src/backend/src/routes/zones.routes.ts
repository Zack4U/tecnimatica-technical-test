import type { FastifyInstance } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { zoneService } from '../services/zone.service.js';
import {
  ZoneResponseSchema,
  SensorResponseSchema,
  ErrorResponseSchema,
} from '../schemas.js';

export async function zonesRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/zones',
    {
      schema: {
        tags: ['zones'],
        summary: 'Listar todas las zonas',
        description:
          'Retorna el listado completo de zonas de planta registradas. Necesario para el selector del formulario en el frontend.',
        response: {
          200: z.array(ZoneResponseSchema),
          500: ErrorResponseSchema,
        },
      },
    },
    async (_req, reply) => {
      const result = await zoneService.getAll();
      return reply.send(result);
    }
  );

  app.get(
    '/zones/:id/sensors',
    {
      schema: {
        tags: ['zones'],
        summary: 'Sensores activos de una zona',
        description:
          'Retorna los sensores con monitoreos activos asignados a la zona indicada.',
        params: z.object({ id: z.string() }),
        response: {
          200: z.array(SensorResponseSchema),
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const result = await zoneService.getSensorsByZoneId(req.params.id);
      return reply.send(result);
    }
  );
}
