# ── Etapa 1: compilación TypeScript ──────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

# Instalar dependencias antes de copiar el código fuente para aprovechar
# la caché de capas de Docker cuando solo cambia el código, no las deps.
COPY package*.json ./
RUN npm ci

COPY tsconfig.json drizzle.config.ts ./
COPY src ./src
RUN npm run build

# ── Etapa 2: imagen de ejecución ──────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Usuario sin privilegios: el proceso de Node no necesita ser root.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copiamos node_modules completo desde el builder para incluir drizzle-kit
# (devDependency necesaria para aplicar el schema en el primer arranque).
COPY --from=builder /app/node_modules ./node_modules

# Código JavaScript compilado desde TypeScript
COPY --from=builder /app/dist ./dist

# Schema TypeScript y config de Drizzle que drizzle-kit push necesita leer.
# drizzle-kit incluye su propio parser de TypeScript (esbuild) así que no
# hace falta el compilador de TypeScript en esta etapa.
COPY --from=builder /app/src/db ./src/db
COPY drizzle.config.ts package.json ./

# Script de entrada: aplica schema y arranca el servidor.
# sed elimina posibles saltos de línea CRLF (Windows) para que sh lo ejecute
# correctamente en Linux sin necesitar dos2unix.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
 && chmod +x /usr/local/bin/docker-entrypoint.sh \
 && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
