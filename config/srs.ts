/** Calidad SM-2 (0–5) según el gesto y su resultado. */
export const SM2_QUALITY = {
  receive_checkpoint_solved: 4,
  receive_checkpoint_failed: 2,
  play_objective_met: 5,
  play_objective_failed: 2,
} as const;
export const SM2_MIN_EF = 1.3;
