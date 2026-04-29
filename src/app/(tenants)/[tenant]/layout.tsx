import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { getTenantBySlug } from "@/lib/tenant";

type Props = {
  children: ReactNode;
  params: Promise<{ tenant: string }>;
};

export default async function TenantLayout({ children, params }: Props) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const themeStyle: CSSProperties = {};
  if (tenant.brand.primary_color) {
    (themeStyle as Record<string, string>)["--cdl-primary"] =
      tenant.brand.primary_color;
  }
  if (tenant.brand.accent_color) {
    (themeStyle as Record<string, string>)["--cdl-accent"] =
      tenant.brand.accent_color;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col" style={themeStyle}>
      {children}
    </div>
  );
}
