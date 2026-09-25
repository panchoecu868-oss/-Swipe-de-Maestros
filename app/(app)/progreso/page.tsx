import Link from "next/link";
import { GAME_CONFIG } from "@/config/game";
import { requireUserContext } from "@/lib/cards/server";
import { MilestoneStrip, StreakBadge } from "@/components/streak/Streak";
import { STREAK_MILESTONES } from "@/config/streak";
import { calendar, streakState } from "@/lib/deck/streak";
import { localHour } from "@/lib/time";
import { GuaranteePanel } from "./guarantee-panel";

export const metadata = { title: "Progreso · Swipe de Maestros" };

export default async function ProgressPage() {
  const ctx = await requireUserContext();
  const { data: log } = await ctx.db.from("daily_log").select("local_day, cards_resolved, completed").eq("user_id", ctx.userId).order("local_day");
  const completed = (log ?? []).filter((d) => d.completed).map((d) => d.local_day as string);
  const cal = calendar(completed, ctx.today, 91);
  const streak = streakState(completed, ctx.today, localHour(ctx.timezone));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-4">
      <Link href="/feed" className="text-sm underline-offset-2 hover:underline">← Volver al mazo</Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tu progreso</h1>
        <StreakBadge current={streak.current} completedToday={streak.completedToday} atRisk={streak.atRisk} href="/feed" />
      </div>
      <section className="grid grid-cols-3 gap-3 text-center" aria-label="Resumen">
        <div className="rounded-xl border border-border bg-surface p-3"><p className="text-2xl font-bold">{streak.current}</p><p className="text-xs text-muted">racha actual</p></div>
        <div className="rounded-xl border border-border bg-surface p-3"><p className="text-2xl font-bold">{streak.longest}</p><p className="text-xs text-muted">mejor racha</p></div>
        <div className="rounded-xl border border-border bg-surface p-3"><p className="text-2xl font-bold">{completed.length}</p><p className="text-xs text-muted">días cumplidos</p></div>
      </section>
      <MilestoneStrip milestones={STREAK_MILESTONES} longest={streak.longest} current={streak.current} />
      <section aria-labelledby="cal-title">
        <h2 id="cal-title" className="mb-2 font-semibold">Últimos 91 días</h2>
        <p className="mb-2 text-xs text-muted">Día cumplido = {GAME_CONFIG.DAILY_DECK_SIZE} cartas resueltas por cualquier gesto.</p>
        <ol className="grid grid-cols-13 gap-1" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
          {cal.map((d) => (
            <li key={d.day} title={`${d.day}${d.completed ? " — cumplido" : ""}`} aria-label={`${d.day}: ${d.completed ? "cumplido" : "no cumplido"}`} className={`aspect-square rounded-sm ${d.completed ? "bg-accent" : "bg-border"}`} />
          ))}
        </ol>
      </section>
      <GuaranteePanel />
    </main>
  );
}
