#!/bin/sh
set -e

echo "→ Aplicando esquema a la base de datos..."
# drizzle-kit push es idempotente: no hace nada si el schema ya está al día.
# En primer arranque crea todas las tablas; en reinicios verifica que no haya
# diferencias pendientes sin necesidad de intervención manual.
./node_modules/.bin/drizzle-kit push

echo "→ Iniciando servidor..."
# exec reemplaza el proceso shell con node para que las señales del SO
# (SIGTERM, SIGINT) lleguen directamente al proceso de Node.
exec node dist/server.js
