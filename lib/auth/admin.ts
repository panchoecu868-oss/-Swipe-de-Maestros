import "server-only";
import { redirect } from "next/navigation";
import { serverEnv } from "@/lib/env";
import { createServiceClient, getCurrentUser } from "@/lib/supabase/server";

/**
 * Admin = email igual a ADMIN_EMAIL **y** profiles.is_admin = true (doble llave:
 * aunque alguien cambie la variable de entorno, sin el flag en BD no entra, y viceversa).
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/review");
  const { adminEmail } = serverEnv();
  if (!adminEmail || user.email?.toLowerCase() !== adminEmail) redirect("/");
  const { data } = await createServiceClient().from("profiles").select("is_admin").eq("id", user.id).single();
  if (!data?.is_admin) redirect("/");
  return user;
}
