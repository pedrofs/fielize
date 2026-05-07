import { useForm } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link } from "@inertiajs/react"

export default function SignInPage() {
  const { data, setData, post, processing, errors } = useForm({
    email: "",
    password: "",
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/session")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
          <p className="text-sm text-muted-foreground">
            Digite seu email para acessar sua conta
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
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={data.password}
              onChange={(e) => setData("password", e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={processing}>
            Entrar
          </Button>
        </form>
        <div className="text-center text-sm">
          <Link
            href="/passwords/new"
            className="text-muted-foreground hover:underline"
          >
            Esqueceu sua senha?
          </Link>
        </div>
        <div className="text-center text-sm">
          Não tem uma conta?{" "}
          <Link href="/registration/new" className="underline hover:text-foreground">
            Cadastre-se
          </Link>
        </div>
      </div>
    </div>
  )
}
