import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from "fastify-type-provider-zod";
import { env } from "./config/env.js";
import { isAppError } from "./errors/index.js";
import { sensorsRoutes } from "./routes/sensors.routes.js";
import { zonesRoutes } from "./routes/zones.routes.js";
import { monitoringsRoutes } from "./routes/monitorings.routes.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(cors, { origin: env.CORS_ORIGIN });

  app.register(swagger, {
    openapi: {
      info: {
        title: "API de Monitoreo Industrial",
        description:
          "Sistema de gestión de sensores y zonas de monitoreo para planta industrial.",
        version: "1.0.0",
      },
      tags: [
        { name: "sensors", description: "Gestión de sensores" },
        { name: "zones", description: "Gestión de zonas de planta" },
        {
          name: "monitorings",
          description: "Asignaciones sensor-zona y monitoreos",
        },
      ],
    },
    transform: jsonSchemaTransform,
  });

  app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
  });

  // Manejador global — traduce errores de dominio a respuestas HTTP estándar
  app.setErrorHandler((error: FastifyError, _req, reply) => {
    if (isAppError(error)) {
      app.log.error({ msg: error.message, name: error.name });
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.errorName,
        message: error.message,
      });
    }

    // Errores de Fastify/Zod (validación de schema, rutas inexistentes, etc.)
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    app.log.error(error);
    return reply.status(statusCode).send({
      statusCode,
      error: error.name ?? "Error",
      message: error.message ?? "Error interno del servidor",
    });
  });

  app.register(sensorsRoutes, { prefix: "/api/v1" });
  app.register(zonesRoutes, { prefix: "/api/v1" });
  app.register(monitoringsRoutes, { prefix: "/api/v1" });

  return app;
}
