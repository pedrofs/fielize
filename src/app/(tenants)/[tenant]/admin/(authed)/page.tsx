import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminHome() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Bem-vindo</h2>
        <p className="text-muted-foreground">
          Painel pronto. Campanhas, comerciantes e dashboard chegam nas próximas slices.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Campanhas ativas</CardTitle>
            <CardDescription>Slice 4 em diante</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">0</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Comerciantes</CardTitle>
            <CardDescription>Slice 2</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">0</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Identificados</CardTitle>
            <CardDescription>Slice 3</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">0</CardContent>
        </Card>
      </div>
    </main>
  );
}
