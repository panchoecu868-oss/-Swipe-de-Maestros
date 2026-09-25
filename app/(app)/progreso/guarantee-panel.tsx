import Link from "next/link";
import { GUARANTEE } from "@/config/guarantee";
import { requireUserContext } from "@/lib/cards/server";
import { getGuaranteeView } from "@/lib/guarantee/service";

const STATUS_TEXT = {
  in_progress: "En curso",
  goal_reached: "¡Meta alcanzada!",
  refund_eligible: "Calificas para el reembolso",
  refund_not_eligible: "No calificas para el reembolso",
  claim_expired: "Venció el plazo para reclamar",
} as const;

export async function GuaranteePanel() {
  const ctx = await requireUserContext();
  const view = await getGuaranteeView(ctx.db, ctx.userId, ctx.today);
  return (
    <section aria-labelledby="g-title" className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <h2 id="g-title" className="font-semibold">Garantía +{GUARANTEE.TARGET_DELTA} en {GUARANTEE.WINDOW_DAYS} días</h2>
      {view.kind === "none" && <p className="text-sm text-muted">Se activa con tu suscripción: leemos tu rating público inicial en ese momento.</p>}
      {view.kind === "pending" && (
        <p className="text-sm text-muted">
          Aún no pudimos leer tu rating inicial de {GUARANTEE.PLATFORMS[view.platform]}. El plazo empieza cuando lo consigamos.
          {view.error && <span className="block text-xs">Detalle: {view.error}</span>}
        </p>
      )}
      {view.kind === "active" && (
        <>
          <p className="text-sm">
            {GUARANTEE.PLATFORMS[view.platform]} · {view.username} · {GUARANTEE.TIME_CONTROLS[view.timeControl]} · {view.startedOn} → {view.endsOn}
          </p>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div><dt className="text-xs text-muted">Inicial</dt><dd className="text-xl font-bold">{view.report.startRating}</dd></div>
            <div><dt className="text-xs text-muted">Actual</dt><dd className="text-xl font-bold">{view.report.currentRating ?? "—"}</dd></div>
            <div><dt className="text-xs text-muted">Meta</dt><dd className="text-xl font-bold">{view.report.targetRating}</dd></div>
          </dl>
          <ul className="flex flex-col gap-1 text-sm">
            {view.report.checks.map((c) => (
              <li key={c.id} className="flex justify-between">
                <span>{c.ok ? "✓" : "·"} {c.label}</span>
                <span className="text-muted">{c.detail}</span>
              </li>
            ))}
          </ul>
          <p className={`font-semibold ${view.report.status === "refund_not_eligible" || view.report.status === "claim_expired" ? "text-danger" : "text-accent"}`}>
            {STATUS_TEXT[view.report.status]}
          </p>
          {view.lastError && <p className="text-xs text-muted">Última lectura con error: {view.lastError}</p>}
        </>
      )}
      <Link href="/garantia/terminos" className="text-sm underline">Términos de la garantía</Link>
    </section>
  );
}
