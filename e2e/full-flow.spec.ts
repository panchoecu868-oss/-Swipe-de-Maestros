/**
 * Flujo completo: onboarding → 10 cartas → descarte ganado y perdido → partida contra Stockfish.
 * Corre contra un proyecto Supabase de TEST; sin sus claves se salta (ver README → E2E completo).
 * La app bajo prueba debe apuntar al mismo proyecto (NEXT_PUBLIC_SUPABASE_* = E2E_SUPABASE_*).
 */
import { expect, test, type Page } from "@playwright/test";
import { Chess } from "chess.js";
import { admin, createTestUser, e2eEnabled, loginContext, puzzleMoves, seedLessons } from "./support/supabase";

test.skip(!e2eEnabled, "Faltan E2E_SUPABASE_URL / E2E_SUPABASE_ANON_KEY / E2E_SUPABASE_SERVICE_ROLE_KEY");
test.setTimeout(240_000);

async function click(page: Page, uci: string) {
  await page.locator(`[data-square="${uci.slice(0, 2)}"]`).first().click();
  await page.locator(`[data-square="${uci.slice(2, 4)}"]`).first().click();
}

/** Resuelve el puzzle visible con la solución oficial (jugadas del usuario = índices impares). */
async function solveVisiblePuzzle(page: Page, solve: boolean) {
  const player = page.locator("[data-puzzle-id]").last();
  const id = await player.getAttribute("data-puzzle-id");
  const moves = await puzzleMoves(admin(), id!);
  const mine = moves.filter((_, i) => i % 2 === 1);
  for (const [k, uci] of mine.entries()) {
    await expect(player).toHaveAttribute("data-phase", "playing", { timeout: 5000 });
    if (!solve && k === 0) {
      // Jugada legal que no es la solución ni da mate → fallo.
      const fen = (await player.locator("[data-fen]").getAttribute("data-fen"))!;
      const c = new Chess(fen);
      const wrong = c.moves({ verbose: true }).find((m) => `${m.from}${m.to}` !== uci.slice(0, 4) && !m.san.includes("#") && (!m.promotion || m.promotion === "q"))!;
      await click(page, `${wrong.from}${wrong.to}`);
      return;
    }
    await click(page, uci);
  }
}

async function resolvedToday(page: Page): Promise<number> {
  const t = await page.getByText(/Hoy:/).textContent();
  return Number(/Hoy:\s*(\d+)/.exec(t ?? "")?.[1] ?? 0);
}

test("onboarding → 10 cartas → descarte ganado y perdido → Stockfish", async ({ page, context, baseURL }) => {
  const db = admin();
  const { count } = await db.from("puzzles").select("id", { count: "exact", head: true });
  expect(count ?? 0, "Importa puzzles al proyecto de test: npm run import:puzzles").toBeGreaterThan(100);
  await seedLessons(db);
  const user = await createTestUser(db);
  try {
    await db.from("subscriptions").insert({ user_id: user.id, provider: "e2e", provider_membership_id: `e2e-${user.id}`, status: "active", plan: "monthly" });
    await loginContext(context, baseURL!, user.email, user.password);

    // ── Onboarding ──
    await page.goto("/onboarding");
    await page.getByLabel("ELO FIDE", { exact: true }).fill("1500");
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByLabel("Lichess", { exact: true }).check();
    await page.getByLabel("Usuario").fill("e2e_usuario");
    await page.getByRole("button", { name: "Empezar" }).click();
    await expect(page).toHaveURL(/\/feed/);
    const { data: weights } = await db.from("theme_weights").select("theme").eq("user_id", user.id);
    expect(weights?.length).toBeGreaterThanOrEqual(14);

    const plan = ["receive", "discard-win", "discard-lose", "play"] as const;
    let step = 0;
    for (let guard = 0; guard < 25 && (await resolvedToday(page)) < 10; guard++) {
      const forced = await page.getByText("Vuelta forzada").isVisible();
      const action = forced ? "receive" : (plan[step] ?? "receive");
      if (!forced) step++;

      if (action === "receive") {
        await page.getByRole("button", { name: "Recibir →" }).click();
        await page.getByRole("button", { name: /Ir al puzzle de control|Hecho/ }).click();
        if (await page.locator("[data-puzzle-id]").count()) await solveVisiblePuzzle(page, true);
        await expect(page.getByRole("heading", { name: /Checkpoint/ })).toBeVisible();
        await page.getByRole("button", { name: "Siguiente carta" }).click();
      } else if (action === "discard-win" || action === "discard-lose") {
        await page.getByRole("button", { name: "← Descartar" }).click();
        await expect(page.getByRole("timer")).toBeVisible();
        if (action === "discard-win") {
          for (let k = 0; k < 3; k++) {
            await expect(page.getByText(`Puzzle ${k + 1} de 3`)).toBeVisible();
            await solveVisiblePuzzle(page, true);
          }
          await expect(page.getByRole("heading", { name: "Carta descartada" })).toBeVisible();
        } else {
          await solveVisiblePuzzle(page, false);
          await expect(page.getByRole("heading", { name: "Ronda perdida" })).toBeVisible();
        }
        await page.getByRole("button", { name: "Siguiente carta" }).click();
      } else {
        await page.getByRole("button", { name: "↑ Jugar" }).click();
        await expect(page).toHaveURL(/\/jugar\//);
        const game = page.locator("[data-game-status]");
        await expect(game).toHaveAttribute("data-game-status", "player", { timeout: 30_000 });
        for (let m = 0; m < 45 && (await game.getAttribute("data-game-status")) !== "done"; m++) {
          const fen = (await page.locator('[data-board-id="engine-game"]').getAttribute("data-fen"))!;
          const legal = new Chess(fen).moves({ verbose: true }).filter((x) => !x.promotion || x.promotion === "q");
          const mv = legal[m % legal.length];
          await click(page, `${mv.from}${mv.to}`);
          await expect(game).not.toHaveAttribute("data-game-status", "engine", { timeout: 20_000 });
        }
        await expect(page.getByText(/Resultado guardado/)).toBeVisible({ timeout: 15_000 });
        await page.getByRole("link", { name: "Siguiente carta" }).click();
        await expect(page).toHaveURL(/\/feed/);
      }
    }

    expect(await resolvedToday(page)).toBe(10);
    const { data: day } = await db.from("daily_log").select("completed, cards_resolved").eq("user_id", user.id).single();
    expect(day).toMatchObject({ completed: true, cards_resolved: 10 });
    const { data: rounds } = await db.from("discard_rounds").select("won, elapsed_ms, per_puzzle_ms").eq("user_id", user.id).order("started_at");
    expect(rounds?.map((r) => r.won)).toEqual([true, false]);
    expect(rounds?.[0].elapsed_ms).toBeLessThanOrEqual(11_500);
    const { data: games } = await db.from("engine_games").select("objective, objective_met, pgn").eq("user_id", user.id);
    expect(games).toHaveLength(1);
  } finally {
    await db.auth.admin.deleteUser(user.id);
  }
});

test("sin suscripción: 3 cartas de demo y paywall", async ({ page, context, baseURL }) => {
  const db = admin();
  await seedLessons(db);
  const user = await createTestUser(db);
  try {
    await loginContext(context, baseURL!, user.email, user.password);
    await page.goto("/onboarding");
    await page.getByLabel("ELO FIDE", { exact: true }).fill("1500");
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByLabel("Usuario").fill("e2e_demo");
    await page.getByRole("button", { name: "Empezar" }).click();
    await expect(page.getByText(/te quedan 3 cartas gratis/)).toBeVisible();
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: "Recibir →" }).click();
      await page.getByRole("button", { name: /Ir al puzzle de control|Hecho/ }).click();
      if (await page.locator("[data-puzzle-id]").count()) await solveVisiblePuzzle(page, false);
      await page.getByRole("button", { name: "Siguiente carta" }).click();
    }
    await page.getByRole("button", { name: "Recibir →" }).click();
    await expect(page.getByRole("heading", { name: "Terminaste tus cartas de demo" })).toBeVisible();
  } finally {
    await db.auth.admin.deleteUser(user.id);
  }
});
