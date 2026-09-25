import { FALLBACK_PUZZLE_THEMES, THEME_MAP } from "@/config/theme-map";
import { TOPIC_IDS, type TopicId } from "@/config/self-assessment";

/** Temas de Lichess para buscar puzzles del "mismo motivo" que la lección. */
export function puzzleThemesForLesson(l: { lichess_themes: string[]; topics: string[] }): string[] {
  if (l.lichess_themes.length > 0) return l.lichess_themes;
  const fromTopics = l.topics.filter((t): t is TopicId => (TOPIC_IDS as string[]).includes(t)).flatMap((t) => THEME_MAP[t]);
  return fromTopics.length > 0 ? [...new Set(fromTopics)] : [...FALLBACK_PUZZLE_THEMES];
}
