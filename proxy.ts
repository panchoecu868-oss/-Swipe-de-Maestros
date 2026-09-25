import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-session";

// Next 16: "middleware" pasó a llamarse "proxy" (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|stockfish/|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wasm)$).*)"],
};
