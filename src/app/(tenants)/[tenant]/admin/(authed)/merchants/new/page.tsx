import { requireAssociationAdmin } from "@/lib/auth-helpers";
import { InviteForm } from "./invite-form";

type Props = { params: Promise<{ tenant: string }> };

export default async function NewMerchantPage({ params }: Props) {
  const { tenant: slug } = await params;
  await requireAssociationAdmin(slug);

  return (
    <main className="mx-auto w-full max-w-xl space-y-6 px-6 py-10">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Convidar comerciante
        </h2>
        <p className="text-muted-foreground">
          Vamos criar o cadastro e enviar um link de acesso por e-mail.
        </p>
      </div>
      <InviteForm />
    </main>
  );
}
