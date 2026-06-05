# AI_RULES_DB.md — Reglas para base de datos

> Complementa [`AI_RULES.md`](./AI_RULES.md).

---

## Motor y herramientas

- Base de datos: **PostgreSQL 15** exclusivamente.
- ORM: **Drizzle ORM**. No usar `pg` directamente salvo en `/db/index.ts`.
- Prohibido usar Prisma, Sequelize, TypeORM u otro ORM.
- SQL crudo solo en `schema.sql` (entregable documentado). En código, siempre Drizzle.

---

## Schema (`src/backend/src/db/schema.ts`)

El schema de Drizzle es la única fuente de verdad del modelo en código.
Nunca definir tablas o columnas fuera de ese archivo.

### Reglas obligatorias por tabla

- Clave primaria `id` de tipo `uuid` con `defaultRandom()`.
- Columna `created_at` con `defaultNow()` y `notNull()`.
- Nombres de tablas en `snake_case` plural: `sensors`, `zones`, `monitorings`.
- Nombres de columnas en `snake_case`: `sensor_id`, `threshold_value`, `created_at`.
- Claves foráneas con patrón `{tabla_singular}_id`: `sensor_id`, `zone_id`.

### ENUMs — valores fijos, no strings libres

```typescript
// sensor_type y reading_type
export const sensorTypeEnum = pgEnum('sensor_type', [
  'temperature', 'pressure', 'vibration', 'flow'
]);

// monitoring_status
export const monitoringStatusEnum = pgEnum('monitoring_status', [
  'active', 'paused'
]);
```

No agregar valores a los ENUMs sin aprobación. No usar `varchar` donde corresponde un ENUM.

### Constraint obligatorio en `monitorings`

```typescript
// Impide que el mismo sensor se asigne dos veces a la misma zona
uniqueIndex('uq_sensor_zone').on(monitorings.sensorId, monitorings.zoneId)
```

Este constraint **nunca** se omite. Es la regla de negocio más crítica del sistema.

---

## Drizzle — patrones obligatorios

### Selects explícitos

```typescript
// ✅ Correcto — columnas explícitas
const result = await db
  .select({ id: sensors.id, name: sensors.name })
  .from(sensors);

// ❌ Incorrecto — select implícito o SQL crudo
const result = await db.execute(sql`SELECT * FROM sensors`);
```

### Filtros con helpers de Drizzle

```typescript
// ✅ Correcto
.where(eq(monitorings.status, 'active'))
.where(and(eq(monitorings.sensorId, id), eq(monitorings.status, 'active')))

// ❌ Incorrecto — interpolación directa
.where(sql`status = '${status}'`)
```

### JOINs

Usar `.leftJoin()` o `.innerJoin()` de Drizzle. Nunca queries anidadas en strings.

---

## Datos de prueba (`schema.sql`)

- Mínimo 10 registros distribuidos entre las tres tablas.
- Datos industriales realistas: `Sensor de temperatura caldera 1`, `Zona de prensas`, etc.
- Incluir obligatoriamente:
  - Al menos 1 monitoreo con `status = 'paused'`.
  - Al menos 1 sensor cuyo valor actual supere el umbral (para probar alertas visuales).
  - Al menos 1 sensor asignado a múltiples zonas (para probar posicionamiento en colindancias).

---

## Lo que la IA NO debe hacer en esta área

- ❌ Usar `serial` o `integer` como PK — siempre `uuid`.
- ❌ Usar strings libres donde hay ENUMs definidos.
- ❌ Omitir el `uniqueIndex` en `(sensor_id, zone_id)`.
- ❌ Escribir SQL crudo en repositorios o servicios.
- ❌ Modificar `schema.ts` sin actualizar `schema.sql` en consecuencia.
- ❌ Acceder a la base de datos desde fuera de la capa de repositorio.