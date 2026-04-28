import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ tenant: string }>;
};

export default async function TenantHome({ params }: Props) {
  const { tenant } = await params;

  if (!tenant) notFound();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="flex max-w-2xl flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Tenant: <span className="font-mono">{tenant}</span>
        </h1>
        <p className="text-muted-foreground">
          Branded tenant routes land here. Schema, RLS, and themed admin shell
          arrive in Phase 1.
        </p>
      </div>
    </main>
  );
}
