# Swipe de Maestros

App de entrenamiento de ajedrez en español con mecánica de swipe. Next.js 16 (App Router) + TypeScript estricto + Tailwind + Supabase.

> README en construcción: se completa fase por fase (instalación, variables, import de puzzles, carga de libros, revisión de lecciones y pendientes).

## Arranque rápido

```bash
npm install
cp .env.example .env.local   # completa las claves de Supabase
npm run db:push              # aplica supabase/migrations a tu proyecto
npm run dev
```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run lint` / `npm run typecheck` | ESLint / tipos (genera tipos de rutas de Next) |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:db` | Tests de esquema y RLS contra un Postgres desechable (`TEST_DATABASE_URL`) |
| `npm run e2e` | Playwright (build + start) |
| `npm run db:push` | Migraciones a Supabase (`SUPABASE_DB_URL`) |

### Tests de base de datos

No necesitan Supabase ni Docker: usan cualquier Postgres 16 desechable. `tests/db/supabase-stub.sql` recrea lo mínimo de Supabase (roles `anon`/`authenticated`/`service_role`, `auth.users`, `auth.uid()`).

```bash
createdb swipe_test
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/swipe_test npm run test:db
```

**Ojo:** el test borra y recrea los schemas `public` y `auth` de esa base. Nunca lo apuntes a producción.
