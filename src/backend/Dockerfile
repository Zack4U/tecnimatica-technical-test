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

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/dist ./dist

COPY --from=builder /app/src/db ./src/db
COPY drizzle.config.ts package.json ./

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
 && chmod +x /usr/local/bin/docker-entrypoint.sh \
 && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
