import { Form, router } from "@inertiajs/react"
import { type ReactNode } from "react"
import { CheckIcon, SparklesIcon } from "lucide-react"

import { CustomerLayout } from "@/layouts/customer-layout"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Profile = {
  recognized: boolean
  name?: string | null
  phoneMasked?: string | null
  verified?: boolean
}

type Props = {
  profile: Profile
}

function NameForm({ name }: { name: string | null | undefined }) {
  return (
    <Form
      method="patch"
      action="/me/perfil"
      className="flex flex-col gap-2"
      data-testid="profile-name-form"
    >
      {({ errors, processing, recentlySuccessful }) => (
        <>
          <Label htmlFor="profile-name">Nome</Label>
          <Input
            id="profile-name"
            name="profile[name]"
            defaultValue={name ?? ""}
            data-testid="profile-name-input"
          />
          {errors.name && (
            <span className="text-sm text-destructive" data-testid="profile-name-error">
              {errors.name}
            </span>
          )}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              size="sm"
              disabled={processing}
              data-testid="profile-name-save"
            >
              {processing ? "Salvando…" : "Salvar"}
            </Button>
            {recentlySuccessful && (
              <span className="text-sm text-muted-foreground" data-testid="profile-name-saved">
                Salvo!
              </span>
            )}
          </div>
        </>
      )}
    </Form>
  )
}

function PhoneField({ phoneMasked }: { phoneMasked: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-1" data-testid="profile-phone">
      <span className="text-sm font-medium">WhatsApp</span>
      <span className="text-sm text-muted-foreground">{phoneMasked ?? "—"}</span>
    </div>
  )
}

function VerifiedBanner() {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border bg-success/10 px-4 py-3 text-sm text-success"
      data-testid="profile-verified-banner"
    >
      <CheckIcon aria-hidden className="size-4 shrink-0" />
      <span>WhatsApp confirmado</span>
    </div>
  )
}

function ResendBanner() {
  return (
    <Form
      method="post"
      action="/me/verification_requests"
      className="flex flex-col gap-3 rounded-lg border bg-warning/10 px-4 py-3 text-sm text-warning"
    >
      {({ processing }) => (
        <>
          <span>
            Seu WhatsApp ainda não foi confirmado. Toque para reenviar o link.
          </span>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={processing}
            data-testid="profile-verification-resend"
          >
            Reenviar confirmação
          </Button>
        </>
      )}
    </Form>
  )
}

function PrivacyLink() {
  return (
    <a
      href="/privacy"
      target="_blank"
      rel="noreferrer"
      className="text-sm underline underline-offset-4 hover:text-foreground"
      data-testid="profile-privacy-link"
    >
      Termos de privacidade (LGPD)
    </a>
  )
}

function ForgetMeDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="pt-4 text-left text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          data-testid="profile-forget-me"
        >
          Esquecer este dispositivo
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Esquecer este dispositivo?</AlertDialogTitle>
          <AlertDialogDescription>
            Seus cartões ficarão indisponíveis neste aparelho até você entrar
            novamente com o seu WhatsApp.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="profile-forget-me-cancel">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => router.delete("/me/session")}
            data-testid="profile-forget-me-confirm"
          >
            Esquecer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function Placeholder() {
  return (
    <article
      className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center"
      data-testid="profile-placeholder"
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SparklesIcon className="size-8" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">Bem-vindo à Fielize</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Participe de uma campanha para criar seu perfil. Acesse a página de uma
        organização e toque em <span className="font-medium">Quero participar</span>{" "}
        para começar.
      </p>
    </article>
  )
}

export default function CustomerProfileShow({ profile }: Props) {
  if (!profile.recognized) {
    return <Placeholder />
  }

  return (
    <article className="flex flex-col gap-6 py-6" data-testid="profile">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Seus dados nesta conta Fielize.
        </p>
      </header>

      <NameForm name={profile.name} />
      <PhoneField phoneMasked={profile.phoneMasked} />

      {profile.verified ? <VerifiedBanner /> : <ResendBanner />}

      <PrivacyLink />
      <ForgetMeDialog />
    </article>
  )
}

CustomerProfileShow.layout = (page: ReactNode) => (
  <CustomerLayout>{page}</CustomerLayout>
)
