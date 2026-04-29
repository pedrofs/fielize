import { PlatformLoginForm } from "./form";

export default function PlatformLogin() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <header className="text-center">
          <p className="text-sm font-medium text-muted-foreground">Fielize</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Plataforma · super-admin
          </h1>
        </header>
        <PlatformLoginForm />
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
