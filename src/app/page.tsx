import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="flex max-w-2xl flex-col items-center gap-6 text-center">
        <Badge variant="secondary">Pre-launch · Pilot CDL Jaguarão</Badge>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Fielize
        </h1>
        <p className="text-lg text-muted-foreground">
          Plataforma multi-tenant de campanhas para CDLs. Selos, sorteios e
          cartões fidelidade num só QR code por loja.
        </p>
        <div className="flex gap-3">
          <Link href="https://fielize.com" className={buttonVariants({ size: "lg" })}>
            fielize.com
          </Link>
          <Link
            href="/admin"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            CDL admin
          </Link>
        </div>
      </div>
    </main>
  );
}
