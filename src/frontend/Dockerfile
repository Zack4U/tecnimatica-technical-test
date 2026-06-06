# ── Etapa 1: construcción de la SPA ──────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_URL se recibe como argumento de build (docker-compose args).
# Vite lo incrusta en el bundle en tiempo de compilación; no existe en runtime.
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ── Etapa 2: servidor de archivos estáticos ───────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Configuración personalizada: SPA fallback + gzip + cache headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Archivos estáticos generados por Vite
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
