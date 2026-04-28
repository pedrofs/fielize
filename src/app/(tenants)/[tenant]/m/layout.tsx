import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getTenantBySlug } from "@/lib/tenant";

type Props = {
  children: ReactNode;
  params: Promise<{ tenant: string }>;
};

export default async function MerchantSection({ children, params }: Props) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  return <div className="flex min-h-full flex-1 flex-col">{children}</div>;
}

export const dynamic = "force-dynamic";
