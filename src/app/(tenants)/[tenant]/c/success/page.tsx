import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyConsumerSession, SESSION_COOKIE_NAME } from "@/lib/session";

export default async function ConsumerSuccess() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifyConsumerSession(sessionCookie) : null;
  if (!session) redirect("/");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Identificação concluída ✓
        </h1>
        <p className="text-muted-foreground">
          A partir de agora seus selos, visitas e participações ficam registrados
          automaticamente. Volte ao QR da loja para continuar.
        </p>
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
