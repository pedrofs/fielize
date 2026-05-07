import { useForm, Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function PasswordResetRequestPage() {
  const { data, setData, post, processing } = useForm({
    email: "",
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/passwords")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Redefinir senha</h1>
          <p className="text-sm text-muted-foreground">
            Digite seu email e enviaremos as instruções
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="voce@exemplo.com"
              value={data.email}
              onChange={(e) => setData("email", e.target.value)}
              required
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={processing}>
            Enviar instruções
          </Button>
        </form>
        <div className="text-center text-sm">
          <Link href="/session/new" className="underline hover:text-foreground">
            Voltar para entrar
          </Link>
        </div>
      </div>
    </div>
  )
}
