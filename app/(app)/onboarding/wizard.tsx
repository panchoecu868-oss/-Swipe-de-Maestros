"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { BLACK_VS_D4, BLACK_VS_E4, WHITE_FIRST_MOVE, type RepertoireOption } from "@/config/openings";
import { ENDGAME_TOPICS, MIDDLEGAME_TOPICS } from "@/config/self-assessment";
import { saveOnboarding } from "./actions";

const STEPS = ["Tu ELO", "Aperturas", "Medio juego", "Finales", "Tu cuenta"] as const;

function Chips({ name, options, legend }: { name: string; options: RepertoireOption[]; legend: string }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o, i) => (
          <label key={o.id} className="cursor-pointer">
            <input type="radio" name={name} value={o.id} defaultChecked={i === 0} className="peer sr-only" required />
            <span className="block rounded-full border border-border px-3 py-2 text-sm peer-checked:bg-accent peer-checked:text-accent-contrast peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Scale({ id, label }: { id: string; label: string }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm">{label}</legend>
      <div className="flex gap-1" role="radiogroup">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="flex-1 cursor-pointer">
            <input type="radio" name={`score_${id}`} value={n} defaultChecked={n === 3} className="peer sr-only" aria-label={`${label}: ${n}`} />
            <span className="block rounded-lg border border-border py-2 text-center text-sm peer-checked:bg-accent peer-checked:text-accent-contrast peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
              {n}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [eloSource, setEloSource] = useState<"fide" | "chesscom" | "lichess">("fide");
  const tzRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(saveOnboarding, null);
  useEffect(() => {
    if (tzRef.current) tzRef.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  }, []);

  const show = (i: number) => (i === step ? "flex" : "hidden");

  return (
    <form action={action} className="flex flex-col gap-6" aria-labelledby="onb-title">
      <header>
        <p className="text-sm text-muted">
          Paso {step + 1} de {STEPS.length}
        </p>
        <h1 id="onb-title" className="text-2xl font-bold">{STEPS[step]}</h1>
        <div className="mt-2 h-1 rounded bg-border" aria-hidden>
          <div className="h-1 rounded bg-accent transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </header>
      <input ref={tzRef} type="hidden" name="timezone" defaultValue="UTC" />

      {/* Todas las secciones quedan en el DOM (hidden) para que el form envíe todo junto. */}
      <section className={`${show(0)} flex-col gap-4`}>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold">¿Tienes ELO FIDE?</legend>
          {(
            [
              ["fide", "Sí, tengo ELO FIDE"],
              ["chesscom", "No, uso mi rating de Chess.com"],
              ["lichess", "No, uso mi rating de Lichess"],
            ] as const
          ).map(([v, l]) => (
            <label key={v} className="flex items-center gap-2">
              <input type="radio" name="elo_source" value={v} checked={eloSource === v} onChange={() => setEloSource(v)} />
              {l}
            </label>
          ))}
        </fieldset>
        {eloSource === "fide" ? (
          <label className="flex flex-col gap-1 text-sm">ELO FIDE<input type="number" name="fide_elo" min={0} max={3000} inputMode="numeric" className="input" /></label>
        ) : (
          <label className="flex flex-col gap-1 text-sm">Rating estimado<input type="number" name="declared_elo" min={100} max={3500} inputMode="numeric" className="input" /></label>
        )}
        <p className="text-xs text-muted">Trabajamos en el rango 1000–2200: si estás fuera, usamos el extremo más cercano.</p>
      </section>

      <section className={`${show(1)} flex-col gap-6`}>
        <Chips name="white_first" legend="Con blancas juegas…" options={WHITE_FIRST_MOVE} />
        <Chips name="black_vs_e4" legend="Con negras contra 1.e4…" options={BLACK_VS_E4} />
        <Chips name="black_vs_d4" legend="Con negras contra 1.d4…" options={BLACK_VS_D4} />
      </section>

      <section className={`${show(2)} flex-col gap-4`}>
        <p className="text-sm text-muted">1 = muy flojo · 5 = muy fuerte. Lo que marques bajo aparecerá más.</p>
        {MIDDLEGAME_TOPICS.map((t) => <Scale key={t.id} id={t.id} label={t.label} />)}
      </section>

      <section className={`${show(3)} flex-col gap-4`}>
        {ENDGAME_TOPICS.map((t) => <Scale key={t.id} id={t.id} label={t.label} />)}
      </section>

      <section className={`${show(4)} flex-col gap-4`}>
        <p className="text-sm text-muted">Solo leemos tu rating público al activar la suscripción y al cierre de la garantía. Nunca tus partidas.</p>
        <fieldset className="flex gap-4">
          <legend className="mb-2 font-semibold">Plataforma</legend>
          <label className="flex items-center gap-2"><input type="radio" name="platform" value="chesscom" defaultChecked /> Chess.com</label>
          <label className="flex items-center gap-2"><input type="radio" name="platform" value="lichess" /> Lichess</label>
        </fieldset>
        <label className="flex flex-col gap-1 text-sm">Usuario<input name="platform_username" autoComplete="username" className="input" /></label>
        <fieldset className="flex gap-4">
          <legend className="mb-2 font-semibold">Ritmo principal</legend>
          <label className="flex items-center gap-2"><input type="radio" name="time_control" value="blitz" defaultChecked /> Blitz</label>
          <label className="flex items-center gap-2"><input type="radio" name="time_control" value="rapid" /> Rápidas</label>
        </fieldset>
      </section>

      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}

      <nav className="flex gap-3">
        {step > 0 && (
          <button type="button" className="btn-secondary flex-1" onClick={() => setStep((s) => s - 1)}>
            Atrás
          </button>
        )}
        {/* Keys distintas: si React reutilizara el mismo <button>, el clic en "Siguiente" del paso 4
            lo convertiría en submit antes de la acción por defecto y enviaría el formulario incompleto. */}
        {step < STEPS.length - 1 ? (
          <button key="next" type="button" className="btn-primary flex-1" onClick={() => setStep((s) => s + 1)}>
            Siguiente
          </button>
        ) : (
          <button key="submit" type="submit" className="btn-primary flex-1" disabled={pending}>
            {pending ? "Guardando…" : "Empezar"}
          </button>
        )}
      </nav>
    </form>
  );
}
