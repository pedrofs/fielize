import { requireSuperAdmin } from "@/lib/platform-auth";
import { OnboardForm } from "./form";

export default async function NewTenant() {
  await requireSuperAdmin();
  return (
    <main className="mx-auto w-full max-w-xl space-y-6 px-6 py-10">
      <header>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          P-02 · onboarding
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Nova CDL</h1>
        <p className="text-muted-foreground">
          Cria a association, o admin de CDL, e envia link de acesso por
          e-mail.
        </p>
      </header>
      <OnboardForm />
    </main>
  );
}

export const dynamic = "force-dynamic";
