import { notFound } from "next/navigation";
import { LESSON_PUBLIC_COLUMNS, requireUserContext } from "@/lib/cards/server";
import { engineModeFor } from "@/lib/engine/strength";
import { PlayClient } from "./play-client";
import type { CardLesson } from "@/components/feed/LessonCard";

export const metadata = { title: "Jugar contra Stockfish · Swipe de Maestros" };

export default async function PlayPage({ params }: PageProps<"/jugar/[lessonId]">) {
  const { lessonId } = await params;
  const ctx = await requireUserContext();
  const { data: lesson } = await ctx.db.from("lessons").select(LESSON_PUBLIC_COLUMNS).eq("id", lessonId).eq("reviewed", true).single();
  if (!lesson) notFound();
  return <PlayClient lesson={lesson as unknown as CardLesson} engineMode={engineModeFor(ctx.elo)} />;
}
