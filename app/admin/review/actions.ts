"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { LessonEditSchema, splitList } from "@/lib/lessons/review";
import { createServiceClient } from "@/lib/supabase/server";

export type ReviewState = { error?: string; ok?: string } | null;

function editFromForm(form: FormData) {
  return LessonEditSchema.safeParse({
    title: form.get("title"),
    summary: form.get("summary"),
    body: form.get("body"),
    fen: String(form.get("fen") ?? "").trim(),
    topics: splitList(String(form.get("topics") ?? "")),
    lichess_themes: splitList(String(form.get("lichess_themes") ?? "")),
    opening_tags: splitList(String(form.get("opening_tags") ?? "")),
    elo_min: Number(form.get("elo_min")),
    elo_max: Number(form.get("elo_max")),
  });
}

export async function approveLesson(_prev: ReviewState, form: FormData): Promise<ReviewState> {
  await requireAdmin();
  const id = String(form.get("id"));
  const parsed = editFromForm(form);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ") };
  const { error } = await createServiceClient()
    .from("lessons")
    .update({ ...parsed.data, reviewed: true, rejected: false, reviewer_notes: form.get("notes") || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/review");
  return { ok: "Aprobada" };
}

export async function rejectLesson(_prev: ReviewState, form: FormData): Promise<ReviewState> {
  await requireAdmin();
  const id = String(form.get("id"));
  const { error } = await createServiceClient()
    .from("lessons")
    .update({ rejected: true, reviewed: false, reviewer_notes: form.get("notes") || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/review");
  return { ok: "Rechazada" };
}
