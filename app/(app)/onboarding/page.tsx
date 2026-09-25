import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { OnboardingWizard } from "./wizard";

export const metadata = { title: "Tu perfil · Swipe de Maestros" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/onboarding");
  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <OnboardingWizard />
    </main>
  );
}
