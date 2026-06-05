# AI_RULES.md — Reglas generales para asistentes de IA

> Aplica a: Claude (claude.ai), GitHub Copilot, Antigravity.
> Estas reglas son **estrictas**. No se sugieren alternativas de stack ni se omiten sin aprobación explícita.

---

## Contexto del proyecto

Sistema de monitoreo industrial con gemelo digital 2D de planta. Monorepo con backend en
`src/backend` y frontend en `src/frontend`.

---

## Stack — no negociable

| Capa | Tecnología |
|------|-----------|
| Lenguaje | TypeScript 5.x (ambos lados) |
| Backend | Node.js 18+ · Fastify 4 |
| ORM | Drizzle ORM |
| Base de datos | PostgreSQL 15 |
| Frontend | React 18 · Vite 5 |
| Estilos | Tailwind CSS |
| Animaciones | Framer Motion |
| Canvas | SVG nativo (dentro de React) |
| HTTP cliente | `fetch` nativo — sin Axios ni similares |
| Linting | ESLint + Prettier (config del repo) |

**Nunca sugerir ni usar:** Express, NestJS, Prisma, Sequelize, Next.js, Vue, Angular,
Three.js, React Flow, Konva, Axios, Lodash, Moment.js, ni librerías UI externas
(MUI, Chakra, Ant Design) sin aprobación explícita.

---

## TypeScript

- Modo estricto siempre. Cero `any` — usar `unknown` y validar.
- Todas las funciones con tipo de retorno explícito.
- Preferir `type` para objetos simples; `interface` solo si se necesita extensión.
- Prohibido `// @ts-ignore` y `// @ts-nocheck`. Resolver el tipo correctamente.

---

## Estilo y nombrado

- `camelCase` para variables y funciones.
- `PascalCase` para tipos, interfaces y componentes React.
- `kebab-case` para nombres de archivos (`sensor.repository.ts`, `zone-detail.tsx`).
- Sin abreviaciones: `monitoring` no `mon`, `sensor` no `s`, `repository` no `repo`.
- Máximo 80 caracteres por línea.

---

## Comentarios

- No comentar lo obvio. Sí comentar lógica no evidente, decisiones de negocio o workarounds.
- Comentarios en **español**. Nombres de variables, funciones y archivos en **inglés**.

---

## Manejo de errores

- Sin `console.log` — usar el logger de Fastify en backend.
- Errores con mensajes descriptivos. Nunca `"Something went wrong"` ni `"Error interno"` a secas.
- Manejar `null` y `undefined` explícitamente siempre.
- En frontend: todo error de API debe ser visible al usuario.

---

## Git

- Un commit = un cambio atómico y coherente.
- Mensajes en **español**, en imperativo presente:
  `Agrega endpoint de sensores` · `Corrige validación de umbral` · `Refactoriza capa de repositorio`
- No hacer commits que mezclen múltiples funcionalidades.

---

## Lo que la IA NO debe hacer

- ❌ Reescribir archivos completos cuando se pidió modificar una función.
- ❌ Agregar dependencias al `package.json` sin indicarlo explícitamente al usuario.
- ❌ Cambiar la estructura de carpetas definida.
- ❌ Generar tests sin pedido explícito.
- ❌ Usar `any` bajo ninguna circunstancia.
- ❌ Sugerir migración de stack o "alternativas mejores".
- ❌ Dejar `TODO` o `FIXME` sin explicación de por qué no se resuelve en el momento.

---

## Referencias

- [`AI_RULES_DB.md`](./.docs/AI_RULES_DB.md) — Base de datos y Drizzle ORM
- [`AI_RULES_BACKEND.md`](./.docs/AI_RULES_BACKEND.md) — Fastify, capas, endpoints
- [`AI_RULES_FRONTEND.md`](./.docs/AI_RULES_FRONTEND.md) — React, SVG, Framer Motion