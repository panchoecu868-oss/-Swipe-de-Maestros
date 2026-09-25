import { GUARANTEE } from "@/config/guarantee";

/** Términos generados desde config/guarantee.ts (una sola fuente de verdad). */
export function guaranteeTerms(cfg = GUARANTEE): { title: string; clauses: string[] } {
  const platforms = Object.values(cfg.PLATFORMS).join(" o ");
  const tcs = Object.values(cfg.TIME_CONTROLS).join(" o ");
  return {
    title: `Sube ${cfg.TARGET_DELTA} puntos de ELO en ${cfg.WINDOW_DAYS} días en ${platforms} o te devolvemos tu dinero`,
    clauses: [
      `El plazo es de ${cfg.WINDOW_DAYS} días corridos desde el momento en que leemos tu rating público inicial, que hacemos al activar tu suscripción.`,
      `Se mide en la plataforma (${platforms}) y el ritmo (${tcs}) que declaraste en el registro, con los datos públicos de su API oficial. Nunca leemos ni guardamos tus partidas: solo tu rating y tu número de partidas en ese ritmo.`,
      `La meta es tu rating inicial + ${cfg.TARGET_DELTA} puntos. Si la alcanzas en cualquier momento del plazo, la garantía se da por cumplida.`,
      `Para calificar al reembolso debes, dentro del plazo: completar al menos ${cfg.MIN_COMPLETED_DAYS} días cumplidos (un día cumplido es resolver tu mazo diario completo, por cualquier gesto) y jugar al menos ${cfg.MIN_GAMES} partidas en tu ritmo declarado.`,
      ...(cfg.REQUIRE_CONTINUOUS_SUBSCRIPTION ? ["Tu suscripción debe mantenerse activa sin interrupciones durante todo el plazo."] : []),
      `Si al terminar el plazo no alcanzaste la meta y cumpliste las condiciones, te reembolsamos ${cfg.REFUND_SCOPE}.`,
      `Puedes solicitarlo durante los ${cfg.CLAIM_WINDOW_DAYS} días siguientes al cierre del plazo escribiendo a ${cfg.CLAIM_CONTACT}. Tu pantalla de progreso muestra en todo momento tu rating inicial, actual, la meta, tus días cumplidos y si calificas.`,
      "Si la API pública de la plataforma no está disponible, reintentamos la lectura; nunca usamos un rating estimado.",
    ],
  };
}
