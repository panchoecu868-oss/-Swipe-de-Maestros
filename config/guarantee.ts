/**
 * Garantía — ÚNICA fuente de verdad: la usan el seguimiento (/progreso), la evaluación de reembolso
 * y la página pública de términos (/garantia/terminos). Cambia aquí y cambia en todas partes.
 *
 * AVISO: los textos y condiciones son del dueño del producto; se recomienda revisión legal
 * (ley de protección al consumidor del país de venta) antes de publicarlos.
 */
export type Platform = "chesscom" | "lichess";
export type TimeControl = "blitz" | "rapid";

export interface GuaranteeConfig {
  TARGET_DELTA: number;
  WINDOW_DAYS: number;
  MIN_COMPLETED_DAYS: number;
  MIN_GAMES: number;
  PLATFORMS: Record<Platform, string>;
  TIME_CONTROLS: Record<TimeControl, string>;
  REQUIRE_CONTINUOUS_SUBSCRIPTION: boolean;
  CLAIM_WINDOW_DAYS: number;
  REFUND_SCOPE: string;
  CLAIM_CONTACT: string;
}

export const GUARANTEE: GuaranteeConfig = {
  /** Promesa: subir esta cantidad de puntos… */
  TARGET_DELTA: 300,
  /** …en este plazo desde la activación de la suscripción. */
  WINDOW_DAYS: 90,
  /** Días cumplidos mínimos dentro del plazo (día cumplido = mazo diario completo). */
  MIN_COMPLETED_DAYS: 75,
  /** Partidas mínimas jugadas en el ritmo declarado dentro del plazo (según la API pública). */
  MIN_GAMES: 60,
  /** Plataformas y ritmos aceptados. */
  PLATFORMS: { chesscom: "Chess.com", lichess: "Lichess" },
  TIME_CONTROLS: { blitz: "blitz", rapid: "rápidas" },
  /** La suscripción debe mantenerse activa sin interrupciones durante todo el plazo. */
  REQUIRE_CONTINUOUS_SUBSCRIPTION: true,
  /** Días tras el cierre del plazo para solicitar el reembolso. */
  CLAIM_WINDOW_DAYS: 14,
  /** Qué se reembolsa. */
  REFUND_SCOPE: "el importe pagado por la suscripción durante el plazo de la garantía",
  /** Contacto para solicitarlo. */
  CLAIM_CONTACT: "soporte@swipedemaestros.com",
};
