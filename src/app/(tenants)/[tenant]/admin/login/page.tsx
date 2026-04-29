import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenant";
import { LoginForm } from "./login-form";

type Props = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function AdminLogin({ params, searchParams }: Props) {
  const [{ tenant: slug }, { error, next }] = await Promise.all([
    params,
    searchParams,
  ]);
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {tenant.name}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        </div>
        <LoginForm tenantSlug={tenant.slug} next={next} initialError={error} />
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
