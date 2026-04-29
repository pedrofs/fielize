import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getTenantBySlug } from "@/lib/tenant";

type Props = {
  params: Promise<{ tenant: string }>;
};

export default async function TenantHome({ params }: Props) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const region = tenant.city ? `${tenant.city} / ${tenant.state}` : tenant.country;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="flex max-w-2xl flex-col items-center gap-6 text-center">
        <Badge
          variant="secondary"
          style={{ backgroundColor: "var(--cdl-primary)", color: "white" }}
        >
          {region}
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {tenant.name}
        </h1>
        <p className="text-lg text-muted-foreground">
          Plataforma de campanhas. Selos, sorteios e cartões fidelidade — num só
          QR code por loja.
        </p>
        <Link
          href="/admin"
          className={buttonVariants({ size: "lg" })}
          style={{ backgroundColor: "var(--cdl-primary)" }}
        >
          Entrar como admin
        </Link>
      </div>
    </main>
  );
}
