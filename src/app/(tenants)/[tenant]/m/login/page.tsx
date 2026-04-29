import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenant";
import { MerchantLoginForm } from "./login-form";

type Props = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function MerchantLogin({ params, searchParams }: Props) {
  const [{ tenant: slug }, { error }] = await Promise.all([params, searchParams]);
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {tenant.name}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Acesso comerciante
          </h1>
          <p className="text-sm text-muted-foreground">
            Você recebeu um link mágico no e-mail. Se ainda não, peça à CDL para
            convidá-lo.
          </p>
        </div>
        <MerchantLoginForm initialError={error} />
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
