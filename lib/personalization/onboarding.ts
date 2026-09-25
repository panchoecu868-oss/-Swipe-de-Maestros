import { z } from "zod";
import { BLACK_VS_D4, BLACK_VS_E4, WHITE_FIRST_MOVE } from "@/config/openings";
import { TOPIC_IDS } from "@/config/self-assessment";

const ids = (l: { id: string }[]) => l.map((o) => o.id) as [string, ...string[]];
const score = z.coerce.number().int().min(1).max(5);

export const OnboardingSchema = z
  .object({
    elo_source: z.enum(["fide", "chesscom", "lichess"]),
    fide_elo: z.coerce.number().int().min(0).max(3000).optional(),
    declared_elo: z.coerce.number().int().min(100).max(3500).optional(),
    white_first: z.enum(ids(WHITE_FIRST_MOVE)),
    black_vs_e4: z.enum(ids(BLACK_VS_E4)),
    black_vs_d4: z.enum(ids(BLACK_VS_D4)),
    scores: z.object(Object.fromEntries(TOPIC_IDS.map((t) => [t, score])) as Record<(typeof TOPIC_IDS)[number], typeof score>),
    platform: z.enum(["chesscom", "lichess"]),
    platform_username: z.string().trim().regex(/^[A-Za-z0-9_-]{2,30}$/, "Usuario inválido"),
    time_control: z.enum(["blitz", "rapid"]),
    timezone: z.string().min(1).max(64).default("UTC"),
  })
  .superRefine((v, ctx) => {
    if (v.elo_source === "fide" && v.fide_elo === undefined) ctx.addIssue({ code: "custom", path: ["fide_elo"], message: "Ingresa tu ELO FIDE" });
    if (v.elo_source !== "fide" && v.declared_elo === undefined) ctx.addIssue({ code: "custom", path: ["declared_elo"], message: "Ingresa tu rating estimado" });
  });

export type OnboardingInput = z.infer<typeof OnboardingSchema>;
