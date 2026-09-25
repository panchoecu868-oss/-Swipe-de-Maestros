"use client";
import Link from "next/link";
import { useState } from "react";
import { EngineGame, type GameResult } from "@/components/game/EngineGame";
import { Citation, type CardLesson } from "@/components/feed/LessonCard";
import type { EngineMode } from "@/lib/engine/strength";
import { saveEngineGame } from "../actions";

export function PlayClient({ lesson, engineMode }: { lesson: CardLesson; engineMode: EngineMode }) {
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFinished(r: GameResult) {
    try {
      const res = await saveEngineGame({ lessonId: lesson.id, engineMode, ...r });
      setSaved(`Resultado guardado. Hoy llevas ${res.cardsResolved} cartas${res.dayCompleted ? " — día cumplido" : ""}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4 py-4">
      <Link href="/feed" className="text-sm underline-offset-2 hover:underline">← Volver al mazo</Link>
      <h1 className="text-xl font-bold">{lesson.title}</h1>
      <Citation lesson={lesson} />
      <EngineGame startFen={lesson.fen} lessonType={lesson.type} engineMode={engineMode} onFinished={onFinished} />
      {saved && <p role="status" className="text-sm text-accent">{saved}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {(saved || error) && <Link href="/feed" className="btn-primary text-center">Siguiente carta</Link>}
    </main>
  );
}
