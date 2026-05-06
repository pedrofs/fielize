import { useForm, Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SignUpPage() {
  const { data, setData, post, processing, errors } = useForm({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    passwordConfirmation: "",
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/registration")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
          <p className="text-sm text-muted-foreground">
            Preencha seus dados para começar
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nome</Label>
              <Input
                id="first_name"
                value={data.firstName}
                onChange={(e) => setData("firstName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Sobrenome</Label>
              <Input
                id="last_name"
                value={data.lastName}
                onChange={(e) => setData("lastName", e.target.value)}
              />
            </div>
          </div>
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
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
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
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="passwordConfirmation">Confirmar senha</Label>
            <Input
              id="passwordConfirmation"
              type="password"
              value={data.passwordConfirmation}
              onChange={(e) => setData("passwordConfirmation", e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={processing}>
            Criar conta
          </Button>
        </form>
        <div className="text-center text-sm">
          Já tem uma conta?{" "}
          <Link href="/session/new" className="underline hover:text-foreground">
            Entrar
          </Link>
        </div>
      </div>
    </div>
  )
}
