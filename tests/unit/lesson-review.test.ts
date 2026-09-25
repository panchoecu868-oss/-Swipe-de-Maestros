import { describe, expect, it } from "vitest";
import { LessonEditSchema, splitList } from "@/lib/lessons/review";

const ok = {
  title: "t",
  summary: "s",
  body: "b",
  fen: "4k3/8/8/8/8/8/8/R3K3 w - - 0 1",
  lichess_themes: ["rookEndgame"],
  opening_tags: [],
  elo_min: 1000,
  elo_max: 1400,
};

describe("LessonEditSchema", () => {
  it("acepta una edición válida", () => expect(LessonEditSchema.safeParse(ok).success).toBe(true));
  it("rechaza FEN inválido, temas no oficiales y >150 palabras", () => {
    expect(LessonEditSchema.safeParse({ ...ok, fen: "xx" }).success).toBe(false);
    expect(LessonEditSchema.safeParse({ ...ok, lichess_themes: ["inventado"] }).success).toBe(false);
    expect(LessonEditSchema.safeParse({ ...ok, body: Array(151).fill("w").join(" ") }).success).toBe(false);
    expect(LessonEditSchema.safeParse({ ...ok, elo_min: 1800 }).success).toBe(false);
  });
  it("splitList separa por comas y espacios", () => expect(splitList("fork, pin  skewer")).toEqual(["fork", "pin", "skewer"]));
});
