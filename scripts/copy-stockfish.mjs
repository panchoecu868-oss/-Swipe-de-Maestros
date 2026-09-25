// Copia el build lite single-threaded de Stockfish (GPL-3.0) a public/stockfish/ junto con su licencia.
// Se ejecuta en postinstall; los binarios no se versionan en git.
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const src = path.join("node_modules", "stockfish");
const dest = path.join("public", "stockfish");
const files = [["bin/stockfish-19-lite-single.js", "stockfish-19-lite-single.js"], ["bin/stockfish-19-lite-single.wasm", "stockfish-19-lite-single.wasm"], ["Copying.txt", "COPYING.txt"]];

if (!existsSync(src)) {
  console.warn("copy-stockfish: node_modules/stockfish no existe todavía, se omite.");
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
for (const [from, to] of files) copyFileSync(path.join(src, from), path.join(dest, to));
writeFileSync(
  path.join(dest, "SOURCE.txt"),
  "Stockfish 19 Lite WASM (stockfish.js 19.0.0), GPL-3.0.\nCódigo fuente correspondiente: https://github.com/nmrugg/stockfish.js/tree/v19.0.0\nMotor original: https://github.com/official-stockfish/Stockfish\n",
);
console.log("copy-stockfish: listo en public/stockfish/");
