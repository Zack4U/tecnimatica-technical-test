# Sistema de Monitoreo Industrial — Gemelo Digital

Plataforma web para gestionar sensores y zonas de una planta industrial, con visualización
en tiempo real sobre un plano 2D interactivo de la fábrica.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js 18 · Fastify 4 · TypeScript |
| Base de datos | PostgreSQL 15 · Drizzle ORM |
| Frontend | React 18 · Vite 5 · TypeScript · Tailwind CSS · Framer Motion |
| Canvas | SVG nativo |
| Infraestructura | Docker · Docker Compose |

---

## Prerrequisitos

- [Node.js](https://nodejs.org/) v18 o superior
- [Docker](https://www.docker.com/) y Docker Compose v2

---

## Inicio rápido

```bash
# 1. Clonar el repositorio
git clone https://github.com/<usuario>/<repo>.git
cd <repo>

# 2. Levantar PostgreSQL
docker compose up -d

# 3. Aplicar schema y datos de prueba
docker exec -i monitoring_db psql -U postgres -d monitoring_db < schema.sql

# 4. Backend
cd src/backend
cp .env.example .env      # editar si es necesario
npm install
npm run dev               # http://localhost:3000

# 5. Frontend (nueva terminal)
cd src/frontend
cp .env.example .env      # editar si es necesario
npm install
npm run dev               # http://localhost:5173
```

---

## Variables de entorno

### Backend (`src/backend/.env`)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/monitoring_db
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

### Frontend (`src/frontend/.env`)

```env
VITE_API_URL=http://localhost:3000
```

---

## Endpoints de la API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/sensors` | Listar todos los sensores |
| `GET` | `/sensors/:id/zones` | Zonas monitoreadas por un sensor |
| `GET` | `/zones/:id/sensors` | Sensores activos en una zona |
| `POST` | `/monitorings` | Asignar un sensor a una zona |
| `PATCH` | `/monitorings/:id` | Actualizar umbral o estado |
| `GET` | `/monitorings?status=active\|paused` | Listar monitoreos con filtro opcional |

---

## Estructura del proyecto

```
/
├── schema.sql              # Schema completo + datos de prueba
├── docker-compose.yml      # PostgreSQL
├── DECISIONS.md            # Decisiones técnicas del proyecto
├── .docs/
│   └── rules/
│       ├── AI_RULES.md
│       ├── AI_RULES_DB.md
│       ├── AI_RULES_BACKEND.md
│       └── AI_RULES_FRONTEND.md
└── src/
    ├── backend/
    │   ├── src/
    │   │   ├── config/     # Validación de variables de entorno
    │   │   ├── db/         # Conexión Drizzle + schema
    │   │   ├── errors/     # Clases de error personalizadas
    │   │   ├── types/      # Interfaces y DTOs
    │   │   ├── repositories/
    │   │   ├── services/
    │   │   └── routes/
    │   ├── .env.example
    │   └── package.json
    └── frontend/
        ├── src/
        │   ├── components/
        │   │   ├── factory/  # Canvas SVG, zonas, sensores
        │   │   └── panel/    # Panel lateral, filtros, formulario
        │   ├── hooks/
        │   ├── pages/
        │   ├── services/     # Capa de llamadas HTTP
        │   └── types/
        ├── .env.example
        └── package.json
```

---

## Comandos útiles

```bash
# Ver logs de la base de datos
docker compose logs -f db

# Detener contenedores
docker compose down

# Detener y borrar volúmenes (resetea la BD)
docker compose down -v

# Backend — compilar para producción
cd src/backend && npm run build

# Frontend — build para producción
cd src/frontend && npm run build
```