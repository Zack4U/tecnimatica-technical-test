#!/bin/sh
set -e

echo "→ Aplicando esquema a la base de datos..."

./node_modules/.bin/drizzle-kit push

echo "→ Iniciando servidor..."

exec node dist/server.js
