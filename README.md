# Swipe de Maestros

App de entrenamiento de ajedrez en español con mecánica de swipe: cada carta es una lección de ~1 minuto sacada de un libro (con cita), con 3 gestos: **→ recibir** (lección + puzzle de control, entra a repetición espaciada), **← descartar** (ganar una ronda de 3 puzzles en 10 s) y **↑ jugar** (la posición contra Stockfish ajustado a tu nivel).

Stack: Next.js 16 (App Router) · TypeScript estricto · Tailwind 4 · Supabase (Postgres + Auth) · chess.js · react-chessboard · framer-motion · Stockfish 19 Lite WASM · Vitest · Playwright. Instalable como PWA.

**Regla de contenido:** nada de ajedrez se escribe de memoria. Todo sale de la base de puzzles de Lichess (CC0), de Stockfish o del pipeline de libros con revisión humana.

---

## 1. Instalación

Requisitos: Node 22.15+ (usa zstd nativo de `node:zlib`) y un proyecto de Supabase.

```bash
npm install                 # también copia Stockfish a public/stockfish (postinstall)
cp .env.example .env.local  # completa las variables (sección 2)
npm run db:push             # aplica supabase/migrations/*.sql a tu proyecto
npm run import:puzzles      # ~20k puzzles para la beta (sección 3)
npm run dev                 # http://localhost:3000
```

En Supabase:
1. **Authentication → Providers**: activa Email (magic link) y Google (con tu Client ID/Secret de Google Cloud).
2. **Authentication → URL Configuration**: agrega `http://localhost:3000/auth/callback` y la URL de producción `/auth/callback` a *Redirect URLs*.
3. Hazte admin (una sola vez, en el SQL editor): `update public.profiles set is_admin = true where email = 'tu@email.com';` y pon ese mismo email en `ADMIN_EMAIL`.

## 2. Variables de entorno

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente de Supabase (Project Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Escrituras validadas en servidor (progreso, descartes, pagos). Nunca al cliente |
| `SUPABASE_DB_URL` | Connection string de Postgres para `db:push`, `import:puzzles` y `build:lessons` |
| `NEXT_PUBLIC_SITE_URL` | URL pública (redirects de pago) |
| `ADMIN_EMAIL` | Único email con acceso a `/admin/review` (además de `profiles.is_admin`) |
| `ANTHROPIC_API_KEY`, `LESSONS_MODEL` | Pipeline de libros (por defecto `claude-opus-5`) |
| `WHOP_API_KEY`, `WHOP_WEBHOOK_SECRET`, `WHOP_PLAN_MONTHLY`, `WHOP_PLAN_YEARLY`, `WHOP_ACCOUNT_ID` | Pagos (sección 6) |
| `CRON_SECRET` | Protege `GET /api/cron/guarantee` |
| `TEST_DATABASE_URL` | Postgres desechable para `npm run test:db` |
| `E2E_SUPABASE_*` | Proyecto Supabase de **test** para el E2E completo |

## 3. Importar puzzles de Lichess

Formato oficial verificado (https://database.lichess.org/#puzzles): `PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate`. El **FEN es la posición antes de la jugada del rival** y el primer movimiento de `Moves` es del rival: la app lo anima y el usuario juega desde el segundo. El script valida el header y la legalidad de cada fila con chess.js.

```bash
npm run import:puzzles                                   # descarga lichess_db_puzzle.csv.zst
npm run import:puzzles -- --file data/lichess_db_puzzle.csv.zst --max 50000
```

Filtros en `config/import.ts` (beta: 20.000 filas, popularidad ≥ 90, ≥ 500 jugadas, rating 800–2500, RD ≤ 90 y tope por tema para que no domine `mateIn1`). Es idempotente (upsert por `PuzzleId`).

Mapeo ELO → rango de puzzles: `config/elo-to-puzzle-rating.ts` (**provisional**, ajústalo con datos). Si faltan puzzles de un tema, el rango se ensancha en pasos configurables.

## 4. Cargar libros y generar lecciones

1. Pon el PDF en `/books` (carpeta ignorada por git: **nunca se sube**) y al lado un JSON con el mismo nombre:
   ```json
   { "title": "Chess Fundamentals", "author": "José Raúl Capablanca", "year": 1921, "license_note": "Dominio público (EE. UU.)" }
   ```
2. Genera:
   ```bash
   npm run build:lessons -- --file books/chess-fundamentals.pdf --max 5          # 5 lecciones semilla
   npm run build:lessons -- --file books/mi-libro.pdf --chapters 1,3-5 --dry-run  # sin escribir en la BD
   ```
   El script extrae el texto por capítulo (índice del PDF → encabezados → bloques de páginas), pide a Claude lecciones en palabras propias y **valida de forma determinista** cada una: ≤150 palabras, ninguna racha de más de 10 palabras copiada del libro, cita literal de la posición presente en las páginas citadas, FEN reconstruido jugando las jugadas con chess.js, temas oficiales de Lichess y rango ELO. Lo que no pasa se descarta y queda en `logs/build-lessons-*.jsonl`.
3. Todo entra con `reviewed=false`: **no aparece en la app hasta que lo apruebes**.

## 5. Revisar lecciones

Entra con tu cuenta admin a **`/admin/review`**: ves el tablero, la cita (libro, capítulo, página), la cita literal de la posición y el texto de las páginas citadas. Puedes aprobar (con ediciones, que se re-validan), o rechazar con notas. El texto fuente del libro vive en `lesson_sources`, tabla sin acceso para usuarios.

## 6. Pagos (Whop) y garantía

- Crea en Whop un producto con dos planes (25 USD/mes y 125 USD/año) y pon sus ids en `WHOP_PLAN_MONTHLY/YEARLY`.
- Crea el webhook apuntando a `https://TU_DOMINIO/api/webhooks/whop` con los eventos `membership.activated`, `membership.deactivated`, `membership.went_valid`, `membership.went_invalid`; copia su secreto (`ws_…`) a `WHOP_WEBHOOK_SECRET`.
- `/suscribirse?plan=monthly|yearly` crea el checkout con `metadata.supabase_user_id`; el webhook verifica la firma (Standard Webhooks) y consulta el estado real con `memberships.retrieve`.
- Garantía: `config/guarantee.ts` es la única fuente de verdad; `/garantia/terminos` se genera desde ahí. Programa un cron diario: `curl -H "Authorization: Bearer $CRON_SECRET" https://TU_DOMINIO/api/cron/guarantee`.

## 7. Tests

```bash
npm run lint && npm run typecheck
npm test                     # Vitest: lógica, parser de Lichess, SM-2, pesos, Whop, Stockfish real en Node
npm run test:db              # esquema, RLS, apply_gesture, import y pipeline contra Postgres real
npm run e2e                  # Playwright: landing, PWA, accesibilidad (axe), gestos, puzzles, descarte, Stockfish en navegador
```

- `test:db` usa cualquier Postgres 16 desechable; `tests/db/supabase-stub.sql` recrea roles y `auth.uid()` de Supabase. **Borra los schemas `public` y `auth` de esa base.**
- El E2E completo (`e2e/full-flow.spec.ts`: onboarding → 10 cartas → descarte ganado y perdido → partida contra Stockfish, y el paywall de demo) corre contra un **proyecto Supabase de test**: aplica migraciones, importa puzzles, define `E2E_SUPABASE_*` y apunta la app al mismo proyecto. Sin esas variables se salta explícitamente.
- `/dev/harness` solo existe con `ENABLE_TEST_HARNESS=1` (Playwright lo activa).

## 8. Configuración que conviene ajustar con datos

| Archivo | Qué |
|---|---|
| `config/game.ts` | `DISCARD_ROUND_SIZE=3`, `DISCARD_TIME_LIMIT_SECONDS=10`, margen de red, 10 cartas/día, 3 de demo |
| `config/elo-to-puzzle-rating.ts` | ELO → rating de puzzles (provisional) |
| `config/engine.ts` | UCI_Elo (motor verificado: 1320–3190), tabla de Skill Level < 1320 (provisional), umbrales de objetivos |
| `config/theme-map.ts` | Autoevaluación → temas de Lichess (borrador) |
| `config/personalization.ts` | Pesos por nota, factores de descarte, offset de rating declarado (provisional) |
| `config/guarantee.ts` | Condiciones de la garantía |

Los descartes registran `elapsed_ms` y `per_puzzle_ms` reales (`discard_rounds`) para calibrar el límite de tiempo.

## 9. Licencias

Ver `LICENSES.md` y `/licencias`. Stockfish es GPL-3.0: se sirve el binario con su licencia y enlace al código fuente de la versión exacta; la app no pasa a ser GPL mientras el motor siga siendo un programa separado que habla UCI.

## 10. Pendiente (lista honesta)

1. **Lecciones semilla**: el pipeline está completo y probado con PDF sintético, pero las 5 lecciones reales no se generaron: en el entorno de desarrollo no había `ANTHROPIC_API_KEY` y `gutenberg.org` está bloqueado. Es un comando (sección 4) cuando tengas el PDF y la clave.
2. **Chess.com**: su documentación oficial no fue accesible, así que el proveedor de rating está marcado como no verificado y falla explícitamente; el seguimiento de la garantía solo funciona con Lichess hasta implementarlo leyendo la doc.
3. **Whop**: checkout, firma y estado salen del SDK oficial; la forma exacta del payload del webhook no está tipada en el SDK y `docs.whop.com` no fue accesible. Por eso solo se extrae el id `mem_…` y el estado se consulta a la API. Conviene confirmar con la doc y hacer una compra de prueba.
4. **Import real de puzzles**: probado con las 4 filas oficiales de muestra; la descarga completa no se pudo ejecutar aquí (dominio bloqueado).
5. **E2E completo**: escrito, pero no ejecutado aquí por falta del proyecto Supabase de test.
6. **Tablas provisionales** (ELO→puzzles, Skill Level, offset de rating declarado, theme-map): no existe fuente oficial; se ajustan con datos reales.
7. **Límite de 10 s para 3 puzzles**: muy exigente (≈3,3 s por puzzle con la animación del rival); revisar con los tiempos registrados.
8. **Revisión legal** de los términos de la garantía antes de vender.
9. La partida contra Stockfish se juzga en el cliente (el servidor re-juega y valida legalidad y mates, pero no las evaluaciones del motor); no afecta la garantía, que usa el rating público.
