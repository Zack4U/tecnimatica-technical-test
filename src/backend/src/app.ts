import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { env } from "./config/env";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(cors, { origin: env.CORS_ORIGIN });

  // Manejador global de errores
  app.setErrorHandler((error: FastifyError, _req, reply) => {
    const statusCode = error.statusCode ?? 500;
    reply.status(statusCode).send({
      statusCode,
      error: error.name ?? "Error",
      message: error.message ?? "Error interno del servidor",
    });
  });

  return app;
}
