# TASKS.md — Plan de desarrollo
## Sensores y Zonas de Monitoreo Industrial — Tecnimatica

> Stack: Node.js + Fastify · TypeScript · Drizzle ORM · PostgreSQL · React + Vite

---

## Fase 0 — Configuración inicial del proyecto

> Antes de escribir una sola línea de lógica, dejar el entorno listo. Cada tarea es un commit.

- [ ] **0.1** Crear repositorio público en GitHub con `README.md` inicial → primer commit
- [ ] **0.2** Definir estructura de monorepo: `/backend` y `/frontend` como workspaces separados
- [ ] **0.3** Configurar `tsconfig.json` base compartido, ESLint y Prettier en ambos workspaces
- [ ] **0.4** Crear `docker-compose.yml` en la raíz para levantar PostgreSQL localmente
- [ ] **0.5** Verificar que la conexión a la base de datos funciona desde el backend

---

## Fase 1 — Diseño y modelado de base de datos

> La base de datos es el corazón del sistema. Un modelo correcto aquí evita refactors costosos.

- [ ] **1.1** Diseñar el modelo entidad-relación (ER): tablas `sensors`, `zones`, `monitorings`
  - `monitorings` es tabla intermedia con atributos propios (relación M:N enriquecida)
- [ ] **1.2** Definir ENUMs y constraints
  - ENUM `sensor_type`: `temperature | pressure | vibration | flow`
  - ENUM `reading_type`: `temperature | pressure | vibration | flow`
  - ENUM `monitoring_status`: `active | paused`
  - UNIQUE constraint en `(sensor_id, zone_id)` para evitar asignaciones duplicadas
- [ ] **1.3** Escribir `schema.sql` con:
  - `CREATE TYPE` para los ENUMs
  - `CREATE TABLE` con claves primarias, foráneas e índices
  - Al menos 10 registros de datos de prueba realistas
- [ ] **1.4** Traducir el schema a Drizzle ORM en `/backend/src/db/schema.ts`
- [ ] **1.5** Configurar la conexión a PostgreSQL con Drizzle en `/backend/src/db/index.ts`

---

## Fase 2 — Backend: estructura y capas

> Organizar el código en capas antes de escribir lógica. La arquitectura primero.

### 2.1 — Tipos e interfaces

- [ ] **2.1.1** Crear `/backend/src/types/Sensor.ts` con interfaces de request, response y DTO
- [ ] **2.1.2** Crear `/backend/src/types/Zone.ts` con interfaces de request, response y DTO
- [ ] **2.1.3** Crear `/backend/src/types/Monitoring.ts` con interfaces de request, response y DTO

### 2.2 — Configuración de Fastify

- [ ] **2.2.1** Configurar instancia de Fastify con `@fastify/cors`
- [ ] **2.2.2** Configurar validación de schemas con Zod (`fastify-type-provider-zod`)
- [ ] **2.2.3** Implementar manejador global de errores con códigos HTTP correctos (400, 404, 500) y mensajes descriptivos

### 2.3 — Capa de repositorio (`/repositories`)

- [ ] **2.3.1** `sensor.repository.ts` — queries Drizzle para sensores
- [ ] **2.3.2** `zone.repository.ts` — queries Drizzle para zonas
- [ ] **2.3.3** `monitoring.repository.ts` — queries Drizzle para monitoreos (incluyendo filtro por `status`)

### 2.4 — Capa de servicios (`/services`)

- [ ] **2.4.1** `sensor.service.ts` — lógica de negocio para sensores
- [ ] **2.4.2** `zone.service.ts` — lógica de negocio para zonas
- [ ] **2.4.3** `monitoring.service.ts` — validaciones: ¿existe el sensor?, ¿existe la zona?, ¿ya está asignado?, ¿el umbral es un número positivo?

### 2.5 — Endpoints (`/routes`)

| Método | Ruta | Tarea |
|--------|------|-------|
| GET | `/sensors` | **2.5.1** Listar todos los sensores |
| GET | `/sensors/:id/zones` | **2.5.2** Ver zonas monitoreadas por un sensor |
| GET | `/zones/:id/sensors` | **2.5.3** Ver sensores activos en una zona |
| POST | `/monitorings` | **2.5.4** Asignar un sensor a una zona |
| PATCH | `/monitorings/:id` | **2.5.5** Actualizar umbral o estado de un monitoreo |
| GET | `/monitorings` | **2.5.6** Listar monitoreos con filtro opcional por `status` |

- [ ] **2.5.1** `GET /sensors`
- [ ] **2.5.2** `GET /sensors/:id/zones`
- [ ] **2.5.3** `GET /zones/:id/sensors`
- [ ] **2.5.4** `POST /monitorings`
- [ ] **2.5.5** `PATCH /monitorings/:id`
- [ ] **2.5.6** `GET /monitorings?status=active|paused`

> **Checkpoint:** Probar todos los endpoints con un cliente HTTP (Bruno / Thunder Client) antes de pasar al frontend.

---

## Fase 3 — Frontend: vistas y componentes

> Con el backend funcionando, construir la UI es predecible. Seguir el orden del enunciado.

### 3.1 — Base del frontend

- [ ] **3.1.1** Configurar proyecto React + Vite + TypeScript
- [ ] **3.1.2** Crear capa de servicio `/src/services/api.ts` con todas las llamadas a la API (nunca `fetch` directo desde componentes)
- [ ] **3.1.3** Definir tipos compartidos en `/src/types/` (pueden reutilizarse del backend)
- [ ] **3.1.4** Configurar enrutamiento con React Router (`/zones`, `/zones/:id`, `/monitorings/new`)

### 3.2 — Vistas

- [ ] **3.2.1** **Listado de zonas** (`/zones`)
  - Tarjetas por zona con nombre, ubicación y estado operativo
  - Conteo de sensores activos por zona
- [ ] **3.2.2** **Detalle de zona** (`/zones/:id`)
  - Tabla con sensores asignados: nombre, tipo de lectura, valor umbral
  - Badge visual de estado del monitoreo: `activo` / `pausado`
  - Indicador visual cuando el valor actual supera el umbral configurado
- [ ] **3.2.3** **Formulario de asignación** (`/monitorings/new`)
  - Select de sensor (cargado desde `GET /sensors`)
  - Select de zona (cargado desde `GET /zones`)
  - Selector de tipo de lectura
  - Input de valor umbral con validación en frontend
  - Submit llama a `POST /monitorings`

---

## Fase 4 — Documentación

> No dejar para el final. Documentar las decisiones mientras se toman.

- [ ] **4.1** Escribir `DECISIONS.md` respondiendo las 4 preguntas del enunciado:
  1. ¿Cómo modelaste la relación entre sensores y zonas y por qué?
  2. ¿Qué validación o restricción consideras más importante y por qué?
  3. ¿Cómo organizaste la estructura del backend y por qué?
  4. ¿Qué mejorarías con un día adicional?
- [ ] **4.2** Escribir `README.md` con:
  - Prerrequisitos (Node, Docker)
  - Pasos para levantar con Docker Compose
  - Cómo aplicar el `schema.sql`
  - Cómo correr backend y frontend
  - Descripción breve de los endpoints disponibles

---

## Fase 5 — Revisión final y entrega

- [ ] **5.1** Verificar checklist de entregables:
  - [ ] Repositorio público en GitHub
  - [ ] Historial de commits progresivo (no un solo commit al final)
  - [ ] `README.md` con instrucciones completas
  - [ ] `DECISIONS.md` con las 4 preguntas respondidas
  - [ ] `schema.sql` con schema completo y 10+ registros de prueba
- [ ] **5.2** Clonar el repo en una carpeta limpia y seguir el `README.md` paso a paso para verificar que todo levanta correctamente
- [ ] **5.3** Probar el flujo completo: crear asignación desde el formulario → verla reflejada en el detalle de zona

---

## Notas de arquitectura

```
/backend
  /src
    /db
      index.ts          ← conexión Drizzle + PostgreSQL
      schema.ts         ← definición de tablas en Drizzle
    /types
      Sensor.ts
      Zone.ts
      Monitoring.ts
    /repositories       ← solo queries, sin lógica de negocio
    /services           ← lógica de negocio y validaciones
    /routes             ← controladores delgados (request → service → response)
    app.ts              ← configuración de Fastify y plugins
    server.ts           ← punto de entrada

/frontend
  /src
    /types              ← interfaces compartidas
    /services
      api.ts            ← todas las llamadas HTTP centralizadas
    /components         ← componentes reutilizables (Badge, Card, etc.)
    /pages
      ZoneList.tsx
      ZoneDetail.tsx
      MonitoringForm.tsx

schema.sql
docker-compose.yml
README.md
DECISIONS.md
```