import { useForm, usePage } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function PasswordResetPage() {
  const { props } = usePage()
  const token = (window.location.pathname.split("/").pop() || "") as string

  const { data, setData, put, processing, errors } = useForm({
    password: "",
    password_confirmation: "",
    token,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    put(`/passwords/${token}`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Nova senha</h1>
          <p className="text-sm text-muted-foreground">
            Digite sua nova senha abaixo
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              value={data.password}
              onChange={(e) => setData("password", e.target.value)}
              required
              autoFocus
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password_confirmation">Confirmar senha</Label>
            <Input
              id="password_confirmation"
              type="password"
              value={data.password_confirmation}
              onChange={(e) => setData("password_confirmation", e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={processing}>
            Redefinir senha
          </Button>
        </form>
      </div>
    </div>
  )
}
