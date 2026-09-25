import { goCommand, strengthCommands, type EngineMode } from "./strength";
import { parseBestMove, parseInfo, scoreToCp, type Score } from "./uci";

/** Transporte UCI: Web Worker en el navegador, módulo npm en Node (tests). */
export interface UciTransport {
  send(cmd: string): void;
  onLine(cb: (line: string) => void): void;
  terminate(): void;
}

export function workerTransport(url: string): UciTransport {
  const w = new Worker(url);
  return {
    send: (cmd) => w.postMessage(cmd),
    onLine: (cb) => {
      w.onmessage = (e: MessageEvent) => cb(String(e.data));
    },
    terminate: () => w.terminate(),
  };
}

/** Cliente UCI mínimo con cola: una búsqueda a la vez. */
export class Engine {
  private waiters: { match: (l: string) => boolean; resolve: (l: string) => void }[] = [];
  private listeners: ((l: string) => void)[] = [];
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private t: UciTransport) {
    t.onLine((line) => {
      for (const l of this.listeners) l(line);
      const i = this.waiters.findIndex((w) => w.match(line));
      if (i >= 0) this.waiters.splice(i, 1)[0].resolve(line);
    });
  }

  private waitFor(match: (l: string) => boolean): Promise<string> {
    return new Promise((resolve) => this.waiters.push({ match, resolve }));
  }

  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  init(): Promise<void> {
    return this.serial(async () => {
      const ok = this.waitFor((l) => l === "uciok");
      this.t.send("uci");
      await ok;
      await this.ready();
    });
  }

  private async ready() {
    const r = this.waitFor((l) => l === "readyok");
    this.t.send("isready");
    await r;
  }

  configure(mode: EngineMode): Promise<void> {
    return this.serial(async () => {
      for (const c of strengthCommands(mode)) this.t.send(c);
      this.t.send("ucinewgame");
      await this.ready();
    });
  }

  /** Mejor jugada con la fuerza configurada. */
  bestMove(fen: string, mode: EngineMode): Promise<string | null> {
    return this.serial(async () => {
      const done = this.waitFor((l) => l.startsWith("bestmove"));
      this.t.send(`position fen ${fen}`);
      this.t.send(goCommand(mode));
      return parseBestMove(await done);
    });
  }

  /** Evaluación a fuerza completa (este motor NO debe tener LimitStrength). cp desde el lado que mueve. */
  evaluate(fen: string, depth: number): Promise<{ cp: number; score: Score | null }> {
    return this.serial(async () => {
      let score: Score | null = null;
      const listener = (l: string) => {
        const info = parseInfo(l);
        if (info?.score && !l.includes(" lowerbound") && !l.includes(" upperbound")) score = info.score;
      };
      this.listeners.push(listener);
      const done = this.waitFor((l) => l.startsWith("bestmove"));
      this.t.send(`position fen ${fen}`);
      this.t.send(`go depth ${depth}`);
      await done;
      this.listeners = this.listeners.filter((x) => x !== listener);
      const s = score as Score | null;
      return { cp: s ? scoreToCp(s) : 0, score: s };
    });
  }

  quit() {
    this.t.send("quit");
    this.t.terminate();
  }
}
