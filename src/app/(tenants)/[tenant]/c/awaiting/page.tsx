import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AwaitingWhatsApp() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Aguardando confirmação
        </h1>
        <Alert>
          <AlertTitle>Verifique o WhatsApp</AlertTitle>
          <AlertDescription>
            Enviamos um link mágico. Toque para confirmar a participação. O link
            expira em 30 minutos.
          </AlertDescription>
        </Alert>
        <p className="text-xs text-muted-foreground">
          Se o link expirar, volte ao QR e tente novamente.
        </p>
      </div>
    </main>
  );
}
