import { GUARANTEE } from "./guarantee";

/** Hitos de racha (días seguidos cumpliendo el mazo). Incluye el mínimo de la garantía. */
export const STREAK_MILESTONES: { days: number; label: string }[] = [
  { days: 3, label: "Arranque" },
  { days: 7, label: "Una semana" },
  { days: 14, label: "Dos semanas" },
  { days: 30, label: "Un mes" },
  { days: 60, label: "Dos meses" },
  { days: GUARANTEE.MIN_COMPLETED_DAYS, label: "Mínimo de la garantía" },
  { days: GUARANTEE.WINDOW_DAYS, label: "Plazo completo" },
].sort((a, b) => a.days - b.days);

/** Desde esta hora local, si hoy no se cumplió el día, la racha se muestra "en riesgo". */
export const STREAK_AT_RISK_HOUR = 20;
