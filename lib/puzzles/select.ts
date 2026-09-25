import type { SupabaseClient } from "@supabase/supabase-js";
import { PUZZLE_RANGE_WIDEN_MAX_STEPS, PUZZLE_RANGE_WIDEN_STEP } from "@/config/elo-to-puzzle-rating";
import { puzzleRatingRange } from "./rating-range";

export interface PuzzleRecord {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
  opening_tags: string[];
  game_url: string | null;
}

export interface SelectPuzzlesInput {
  themes: string[];
  elo: number;
  count: number;
  exclude?: string[];
}

export async function selectPuzzles(supabase: SupabaseClient, input: SelectPuzzlesInput): Promise<PuzzleRecord[]> {
  const range = puzzleRatingRange(input.elo);
  const { data, error } = await supabase.rpc("pick_puzzles", {
    p_themes: input.themes,
    p_rating_min: range.min,
    p_rating_max: range.max,
    p_limit: input.count,
    p_exclude: input.exclude ?? [],
    p_widen_step: PUZZLE_RANGE_WIDEN_STEP,
    p_widen_max_steps: PUZZLE_RANGE_WIDEN_MAX_STEPS,
  });
  if (error) throw new Error(`pick_puzzles: ${error.message}`);
  return (data ?? []) as PuzzleRecord[];
}
