# Licencias de terceros

Este archivo lista el software y los datos de terceros que Swipe de Maestros distribuye o usa, con lo que cada licencia exige.

## Stockfish (motor) — GPL-3.0

- Paquete: [`stockfish`](https://www.npmjs.com/package/stockfish) (Stockfish.js, © Chess.com, LLC y los autores de Stockfish). Código fuente: https://github.com/nmrugg/stockfish.js y https://github.com/official-stockfish/Stockfish
- Se sirve al navegador el build *lite single-threaded* (`.js` + `.wasm`) y corre en un Web Worker aparte, comunicándose por el protocolo UCI.

**Qué implica distribuirlo** (servir el `.wasm` a los usuarios ES distribuir):

1. Hay que incluir el texto de la GPL-3.0 y el aviso de copyright junto al binario (lo hace `public/stockfish/COPYING` y la página `/licencias`).
2. Hay que ofrecer el código fuente correspondiente de ESA versión exacta: basta con el enlace al repositorio y al tag/versión usada, mantenido mientras se distribuya el binario.
3. Si se modifica el motor, las modificaciones deben publicarse bajo GPL-3.0.
4. El resto de la app NO pasa a ser GPL mientras el motor siga siendo un programa separado que se comunica por UCI (mismo modelo que usan las webs de ajedrez que embeben Stockfish). Si algún día se enlaza el código del motor dentro del bundle de la app de otra forma, hay que revisar esto con un abogado.

## Base de puzzles de Lichess — CC0

- Fuente: https://database.lichess.org/#puzzles — "Database exports are released under the Creative Commons CC0 license".
- Sin obligación legal de atribución; se atribuye igual por cortesía en `/licencias`.

## Librerías (npm)

| Paquete | Licencia |
|---|---|
| next, react, react-dom | MIT |
| react-chessboard | MIT |
| chess.js | BSD-2-Clause |
| framer-motion | MIT |
| @supabase/supabase-js, @supabase/ssr | MIT |
| zod | MIT |
| tailwindcss | MIT |

## Libros

Los PDFs de `/books` son propiedad del dueño del producto y **nunca** se suben al repositorio. Las lecciones son resúmenes en palabras propias con cita (libro, capítulo, página) y pasan revisión humana antes de publicarse.
