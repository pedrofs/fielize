"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";

const errorCopy: Record<string, string> = {
  not_a_merchant: "Esta conta não é um comerciante cadastrado.",
  wrong_tenant: "Esta conta pertence a outra CDL.",
  insufficient_role: "Conta sem permissão de comerciante.",
  tenant_not_found: "CDL não encontrada.",
};

export function MerchantLoginForm({ initialError }: { initialError?: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(
    initialError ? errorCopy[initialError] ?? initialError : null,
  );
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/m/onboarding`
              : undefined,
        },
      });
      if (error) {
        setError(error.message);
        return;
      }
      setSent(true);
    });
  };

  if (sent) {
    return (
      <Alert>
        <AlertTitle>Link enviado</AlertTitle>
        <AlertDescription>
          Confira sua caixa de entrada e clique no link mágico para entrar.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isPending}
        style={{ backgroundColor: "var(--cdl-primary)" }}
      >
        {isPending ? "Enviando…" : "Receber link mágico"}
      </Button>
    </form>
  );
}
