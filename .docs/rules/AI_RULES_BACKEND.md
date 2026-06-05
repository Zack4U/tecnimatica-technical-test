# AI_RULES_BACKEND.md — Reglas para el backend

> Complementa [`AI_RULES.md`](./AI_RULES.md).

---

## Framework y validación

- Framework: **Fastify 4** exclusivamente.
- Validación de entrada: **Zod** con `fastify-type-provider-zod`.
- Variables de entorno: validadas con Zod al arrancar. Si falta una, el proceso falla con mensaje claro.
- CORS: `@fastify/cors` configurado desde `.env`.

---

## Arquitectura de capas — flujo unidireccional

```
Route → Service → Repository → Drizzle → PostgreSQL
```

Ninguna capa puede saltarse la anterior. Un controlador no toca Drizzle.
Un repositorio no llama a otro servicio.

### Capa de rutas (`/routes`)

Responsabilidad única: recibir request, llamar al servicio, retornar respuesta HTTP.

```typescript
// ✅ Controlador correcto — delgado, sin lógica de negocio
fastify.post('/monitorings', { schema: createMonitoringSchema }, async (req, reply) => {
  const monitoring = await monitoringService.create(req.body);
  return reply.status(201).send(monitoring);
});
```

- Validación del body/params/query con schemas Zod definidos en el mismo archivo de ruta.
- Sin lógica de negocio. Sin queries a la base de datos.
- Sin `try/catch` individuales — el manejador global de Fastify los captura.

### Capa de servicios (`/services`)

Responsabilidad única: lógica de negocio y validaciones de dominio.

```typescript
// ✅ Servicio correcto — valida existencia y reglas de negocio
async create(data: CreateMonitoringDto): Promise<MonitoringResponse> {
  const sensor = await sensorRepository.findById(data.sensorId);
  if (!sensor) {
    throw new NotFoundError(`Sensor con id "${data.sensorId}" no existe`);
  }
  const exists = await monitoringRepository.findBySensorAndZone(
    data.sensorId, data.zoneId
  );
  if (exists) {
    throw new ConflictError(
      `El sensor "${data.sensorId}" ya está asignado a la zona "${data.zoneId}"`
    );
  }
  return monitoringRepository.create(data);
}
```

- Sin conocimiento de HTTP (sin `request`, `reply` ni códigos de estado).
- Sin acceso directo a Drizzle.

### Capa de repositorios (`/repositories`)

Responsabilidad única: queries de Drizzle. Cero lógica de negocio.

- Una función = una query.
- Retornan datos crudos sin transformar.
- No llaman a otros repositorios.

---

## Manejo de errores

Clases personalizadas en `/src/errors/`:

| Clase | HTTP |
|-------|------|
| `ValidationError` | 400 |
| `NotFoundError` | 404 |
| `ConflictError` | 409 |
| `InternalError` | 500 |

Formato de respuesta de error — obligatorio y consistente:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Sensor con id \"abc-123\" no existe"
}
```

- Nunca exponer stack traces al cliente.
- Todos los mensajes de error al cliente en **español**.

---

## Endpoints — códigos HTTP esperados

| Método | Ruta | Éxito | Errores posibles |
|--------|------|-------|-----------------|
| GET | `/sensors` | 200 | 500 |
| GET | `/sensors/:id/zones` | 200 | 404, 500 |
| GET | `/zones/:id/sensors` | 200 | 404, 500 |
| POST | `/monitorings` | 201 | 400, 404, 409, 500 |
| PATCH | `/monitorings/:id` | 200 | 400, 404, 500 |
| GET | `/monitorings` | 200 | 400, 500 |

---

## Tipos e interfaces (`/src/types/`)

Un archivo por entidad. Separar tipos de entrada (DTOs) de tipos de salida.

```typescript
// Monitoring.ts
export type CreateMonitoringDto  = { sensorId: string; zoneId: string; ... }
export type UpdateMonitoringDto  = { thresholdValue?: number; status?: MonitoringStatus }
export type MonitoringResponse   = { id: string; sensor: SensorResponse; zone: ZoneResponse; ... }
```

Los tipos inferidos de Drizzle **no** se exponen directamente como respuesta de API.

---

## Variables de entorno

```typescript
// src/config/env.ts — validación obligatoria al arrancar
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT:         z.coerce.number().default(3000),
  CORS_ORIGIN:  z.string().default('http://localhost:5173'),
});
export const env = envSchema.parse(process.env);
```

Todas las variables declaradas en `.env.example`. Nunca hardcodear valores en código.

---

## Lo que la IA NO debe hacer en esta área

- ❌ Poner lógica de negocio en rutas o repositorios.
- ❌ Acceder a Drizzle directamente desde una ruta o servicio.
- ❌ Usar `try/catch` en cada función — el manejador global de Fastify se encarga.
- ❌ Retornar errores genéricos sin contexto descriptivo.
- ❌ Crear endpoints fuera de los 6 definidos sin aprobación.
- ❌ Exponer tipos internos de Drizzle como respuesta de API.