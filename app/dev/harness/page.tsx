import { notFound } from "next/navigation";
import { HarnessClient } from "./harness-client";

/** Harness de componentes para Playwright. No existe salvo con ENABLE_TEST_HARNESS=1. */
export default async function HarnessPage({ searchParams }: PageProps<"/dev/harness">) {
  if (process.env.ENABLE_TEST_HARNESS !== "1") notFound();
  const sp = await searchParams;
  const view = typeof sp.view === "string" ? sp.view : "swipe";
  const limit = typeof sp.limit === "string" ? Number(sp.limit) : 10_000;
  const forced = sp.forced === "1";
  return <HarnessClient view={view} limitMs={limit} forced={forced} />;
}
