import { useForm } from "@inertiajs/react"
import { ChevronDownIcon, ChevronUpIcon, SparklesIcon } from "lucide-react"
import { useState, type FormEvent, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WalletCard, type WalletCardData } from "@/components/wallet-card"
import { CustomerLayout } from "@/layouts/customer-layout"
import { formatBrazilianPhone, isPlausibleBrazilianPhone } from "@/lib/phone"

type Card = WalletCardData

type Sections = {
  paraResgatar: Card[]
  ativas: Card[]
  encerradas: Card[]
}

type Wallet = {
  recognized: boolean
  sections: Sections
}

type Props = {
  wallet: Wallet
}

function Section({
  title,
  cards,
  testId,
}: {
  title: string
  cards: Card[]
  testId: string
}) {
  if (cards.length === 0) return null

  return (
    <section className="flex flex-col gap-3" data-testid={testId}>
      <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
        {title}
      </h2>
      <div className="flex flex-col gap-3">
        {cards.map((card) => (
          <WalletCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  )
}

function CollapsibleSection({
  title,
  cards,
  testId,
}: {
  title: string
  cards: Card[]
  testId: string
}) {
  const [open, setOpen] = useState(false)

  if (cards.length === 0) return null

  return (
    <section className="flex flex-col gap-3" data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center justify-between text-sm font-semibold tracking-tight text-muted-foreground"
      >
        <span>
          {title} ({cards.length})
        </span>
        {open ? (
          <ChevronUpIcon className="size-4" />
        ) : (
          <ChevronDownIcon className="size-4" />
        )}
      </button>
      {open && (
        <div className="flex flex-col gap-3">
          {cards.map((card) => (
            <WalletCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </section>
  )
}

function RestoreForm() {
  const { data, setData, post, processing } = useForm({
    walletRecovery: { phone: "" },
  })
  const [clientError, setClientError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!isPlausibleBrazilianPhone(data.walletRecovery.phone)) {
      setClientError("Informe um número de WhatsApp válido com DDD.")
      return
    }
    setClientError(null)
    post("/wallet_recoveries")
  }

  return (
    <form
      onSubmit={submit}
      className="mt-2 flex w-full max-w-xs flex-col gap-3 text-left"
      data-testid="wallet-restore-form"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wallet-recovery-phone">WhatsApp</Label>
        <Input
          id="wallet-recovery-phone"
          name="wallet_recovery[phone]"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(53) 99999-1111"
          value={data.walletRecovery.phone}
          onChange={(e) =>
            setData("walletRecovery", { phone: formatBrazilianPhone(e.target.value) })
          }
          required
          data-testid="wallet-restore-phone-input"
        />
        {clientError && (
          <p className="text-xs text-destructive" data-testid="wallet-restore-error">
            {clientError}
          </p>
        )}
      </div>
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={processing}
        data-testid="wallet-restore-cta"
      >
        Entrar com WhatsApp
      </Button>
    </form>
  )
}

function Placeholder() {
  return (
    <article
      className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center"
      data-testid="wallet-placeholder"
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SparklesIcon className="size-8" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">Bem-vindo à Fielize</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Suas inscrições em campanhas vão aparecer aqui. Acesse a página de uma
        organização e toque em <span className="font-medium">Quero participar</span>{" "}
        para começar.
      </p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Já participa em outro aparelho? Recupere seus cartões pelo WhatsApp.
      </p>
      <RestoreForm />
    </article>
  )
}

export default function CustomerCardsIndex({ wallet }: Props) {
  const { paraResgatar, ativas, encerradas } = wallet.sections
  const isEmpty =
    paraResgatar.length === 0 &&
    ativas.length === 0 &&
    encerradas.length === 0

  if (!wallet.recognized || isEmpty) {
    return <Placeholder />
  }

  return (
    <article className="flex flex-col gap-6 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Meus cartões</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe suas campanhas em todas as organizações.
        </p>
      </header>

      <div className="flex flex-col gap-6" data-testid="wallet-sections">
        <Section
          title="Para resgatar"
          cards={paraResgatar}
          testId="wallet-section-para-resgatar"
        />
        <Section title="Ativas" cards={ativas} testId="wallet-section-ativas" />
        <CollapsibleSection
          title="Encerradas"
          cards={encerradas}
          testId="wallet-section-encerradas"
        />
      </div>
    </article>
  )
}

CustomerCardsIndex.layout = (page: ReactNode) => (
  <CustomerLayout>{page}</CustomerLayout>
)
