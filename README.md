# Sistema de Monitoreo Industrial — Gemelo Digital

Plataforma web para gestionar sensores y zonas de una planta industrial, con visualización
en tiempo real sobre un plano 2D interactivo de la fábrica.

- **Visibilidad inmediata** — plano de planta interactivo con zoom, pan y posicionamiento automático de sensores sobre sus zonas asignadas.
- **Alertas en tiempo real** — detección visual instantánea cuando el valor de un sensor supera su umbral configurado.
- **Simulador integrado** — genera lecturas con distintos modos (aleatorio, incremental, decremental, pico) para probar el sistema sin hardware físico.
- **Historial de lecturas** — gráfico por monitoreo con las últimas N lecturas para analizar tendencias.
- **Gestión completa** — alta de sensores, asignación a zonas, configuración de umbrales y pausa/reanudación de monitoreos desde la propia interfaz.
- **Despliegue en un comando** — `docker compose up --build` levanta base de datos, backend y frontend con datos de prueba precargados.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js 18 · Fastify 4 · TypeScript |
| Base de datos | PostgreSQL 15 · Drizzle ORM |
| Frontend | React 18 · Vite 5 · TypeScript · Tailwind CSS · Framer Motion |
| Canvas | SVG nativo |
| Infraestructura | Docker · Docker Compose |

---

## Modos de ejecución

- **[Docker](#-modo-docker-recomendado)** — un solo comando, sin instalar nada más que Docker.
- **[Manual](#-modo-manual)** — Node.js y PostgreSQL en la máquina local.

---

## 🐳 Modo Docker (recomendado)

### Prerrequisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose v2)

### Puesta en marcha

```bash
# 1. Copiar y configurar variables de entorno
cp .env.example .env
```

Abre `.env` y establece una contraseña segura para `POSTGRES_PASSWORD`.
El resto de valores funciona tal cual para un entorno local.

```bash
# 2. Construir imágenes y levantar todos los servicios
docker compose up --build
```

Docker Compose levanta los tres servicios en orden:
1. **postgres** — espera a estar listo (healthcheck)
2. **backend** — aplica el schema automáticamente y arranca Fastify
3. **frontend** — sirve la SPA compilada con nginx

| Servicio | Puerto por defecto | URL / conexión |
|----------|--------------------|----------------|
| Frontend (nginx) | 80 | <http://localhost> |
| API REST | 3000 | <http://localhost:3000/api/v1> |
| Swagger UI | 3000 | <http://localhost:3000/docs> |
| PostgreSQL | 5432 | `localhost:5432` · DB: `monitoring_db` · usuario: `postgres` |

> Los puertos son configurables en `.env` con `FRONTEND_PORT`, `BACKEND_PORT` y `POSTGRES_PORT`.

### Datos de prueba

Se cargan **automáticamente** en el primer arranque. `schema.sql` está montado en
`/docker-entrypoint-initdb.d/` del contenedor de postgres, por lo que PostgreSQL
lo ejecuta al inicializar el volumen (tablas + 10 sensores, 6 zonas, 15 monitoreos
y 150 lecturas de ejemplo).

> Si el volumen `postgres_data` ya existe (arranques posteriores), el script no se
> vuelve a ejecutar. Para resetear los datos: `docker compose down -v` y luego
> `docker compose up --build`.

### Comandos útiles — Docker

```bash
# Levantar en segundo plano
docker compose up --build -d

# Ver logs de todos los servicios
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Detener sin borrar datos
docker compose stop

# Detener y eliminar contenedores
docker compose down

# Detener, eliminar contenedores Y volúmenes (resetea la BD por completo)
docker compose down -v

# Reconstruir solo un servicio (tras cambios de código)
docker compose up --build backend
docker compose up --build frontend

# Abrir una shell en el contenedor del backend
docker compose exec backend sh

# Conectarse a PostgreSQL dentro del contenedor
docker compose exec postgres psql -U postgres -d monitoring_db
```

---

## 🛠 Modo Manual

### Prerrequisitos

- [Node.js](https://nodejs.org/) v18 o superior
- [PostgreSQL 15](https://www.postgresql.org/download/) corriendo localmente

### Puesta en marcha

#### Base de datos

```bash
# Crear la base de datos (si no existe)
psql -U postgres -c "CREATE DATABASE monitoring_db;"

# Cargar schema y datos de prueba
psql -U postgres -d monitoring_db -f schema.sql
```

#### Backend

```bash
cd src/backend

# Configurar variables de entorno
cp .env.example .env   # ajusta DATABASE_URL si tu PostgreSQL usa otro usuario/puerto

# Instalar dependencias
npm install

# Arrancar en modo desarrollo (recarga automática)
npm run dev
```

El backend quedará disponible en <http://localhost:3000>.

#### Frontend

En una terminal nueva:

```bash
cd src/frontend

# Configurar variables de entorno
cp .env.example .env   # VITE_API_URL=http://localhost:3000 por defecto

# Instalar dependencias
npm install

# Arrancar en modo desarrollo (HMR)
npm run dev
```

El frontend quedará disponible en <http://localhost:5173>.

### Variables de entorno — Manual

**`src/backend/.env`**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/monitoring_db
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

**`src/frontend/.env`**
```env
VITE_API_URL=http://localhost:3000
```

### Comandos útiles — Manual

```bash
# ── Backend ────────────────────────────────────────────────────────────────
cd src/backend

# Aplicar cambios de schema a la BD (Drizzle push)
npm run db:push

# Abrir Drizzle Studio (explorador visual de la BD)
npm run db:studio

# Compilar para producción
npm run build

# Ejecutar el build de producción
npm start

# ── Frontend ───────────────────────────────────────────────────────────────
cd src/frontend

# Build de producción
npm run build

# Previsualizar el build de producción localmente
npm run preview
```

---

## Endpoints de la API

Prefijo: `/api/v1`. Documentación interactiva en `/docs` (Swagger UI).

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/sensors` | Listar todos los sensores |
| `GET` | `/sensors/:id/zones` | Zonas monitoreadas por un sensor |
| `GET` | `/zones` | Listar todas las zonas |
| `GET` | `/zones/:id/sensors` | Sensores activos en una zona |
| `POST` | `/monitorings` | Asignar un sensor a una zona |
| `PATCH` | `/monitorings/:id` | Actualizar umbral o estado |
| `GET` | `/monitorings?status=active\|paused` | Listar monitoreos con filtro opcional |
| `GET` | `/readings/latest` | Última lectura de cada monitoreo activo |
| `POST` | `/readings/batch` | Registrar lecturas de múltiples sensores |

---

## Estructura del proyecto

```
/
├── docker-compose.yml          # Orquestación Docker (postgres + backend + frontend)
├── .env.example                # Plantilla de variables para Docker
├── schema.sql                  # Schema SQL + datos de prueba
├── DECISIONS.md                # Decisiones técnicas del proyecto
└── src/
    ├── backend/
    │   ├── Dockerfile
    │   ├── docker-entrypoint.sh  # Aplica schema y arranca el servidor
    │   ├── .env.example
    │   ├── drizzle.config.ts
    │   └── src/
    │       ├── config/           # Validación de variables de entorno (Zod)
    │       ├── db/               # Conexión Drizzle + schema
    │       ├── errors/           # Clases de error personalizadas
    │       ├── types/            # Interfaces y DTOs por entidad
    │       ├── repositories/     # Queries Drizzle (acceso a datos)
    │       ├── services/         # Lógica de negocio y validaciones de dominio
    │       └── routes/           # Rutas Fastify + schemas Zod
    └── frontend/
        ├── Dockerfile
        ├── nginx.conf            # SPA fallback + gzip + cache headers
        ├── .env.example
        └── src/
            ├── components/
            │   ├── factory/      # Canvas SVG: zonas, sensores, anillos de selección
            │   ├── panel/        # Panel lateral: detalle, filtros, acciones
            │   └── ui/           # Componentes reutilizables: formularios, modales, toasts
            ├── hooks/            # Estado del canvas, simulador, media queries
            ├── pages/            # FactoryPage (única vista)
            ├── services/         # Capa de llamadas HTTP centralizada
            ├── types/            # Tipos TypeScript por entidad
            └── utils/            # Utilidades: formato de tiempo, etc.
```
