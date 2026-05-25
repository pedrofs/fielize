import { Deferred, useForm } from "@inertiajs/react"
import { ChevronDownIcon, ChevronUpIcon, SparklesIcon } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"

import { Confetti, StampThunk } from "@/components/celebrate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  WalletCard,
  type CardState,
  type WalletCardData,
} from "@/components/wallet-card"
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

// `wallet` is deferred (see Customer::CardsController#index): it is absent on the
// initial paint and arrives via a follow-up request, during which the skeleton shows.
type Props = {
  wallet?: Wallet
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

// A stamp-card placeholder shaped like a WalletCard (header row + body + caption)
// so the skeleton occupies the same footprint and the real cards don't shift in.
function WalletCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

function WalletSkeleton() {
  return (
    <article className="flex flex-col gap-6 py-6" data-testid="wallet-skeleton">
      <header className="flex flex-col gap-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-64" />
      </header>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <WalletCardSkeleton />
        <WalletCardSkeleton />
      </div>
    </article>
  )
}

function WalletContent({ wallet }: { wallet: Wallet }) {
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

const CELEBRATED_CARDS_KEY = "fielize:celebrated-cards"
const CELEBRATION_MS = 2600
const CELEBRATION_REDUCED_MS = 1200

// A won raffle prize or a loyalty card that just crossed its redemption
// threshold — the customer's biggest moments, worth a one-shot celebration.
const CELEBRATORY_STATES: CardState[] = ["won", "redeemable"]

function readCelebratedCards(): Set<string> {
  try {
    const raw = window.localStorage.getItem(CELEBRATED_CARDS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set<string>(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set<string>()
  }
}

function writeCelebratedCards(ids: Set<string>): void {
  try {
    window.localStorage.setItem(CELEBRATED_CARDS_KEY, JSON.stringify([...ids]))
  } catch {
    // Private mode / quota: degrade to no persistence (re-celebrate next load).
  }
}

// Fires the celebration the first time a won/redeemable card is seen, then
// records its id in localStorage so a refresh — where the card renders straight
// from the DB — never replays it. This is the wallet analogue of the merchant
// landing's transition-keyed celebration (see customer/merchants/show): the
// persisted id stands in for the in-session pending→confirmed edge the wallet
// never observes.
function useNewlyWonCelebration(wallet: Wallet | undefined) {
  const [celebrating, setCelebrating] = useState(false)
  const fired = useRef(false)

  useEffect(() => {
    if (!wallet || fired.current) return

    const { paraResgatar, ativas, encerradas } = wallet.sections
    const won = [...paraResgatar, ...ativas, ...encerradas].filter((card) =>
      CELEBRATORY_STATES.includes(card.state),
    )
    if (won.length === 0) return

    const seen = readCelebratedCards()
    const fresh = won.filter((card) => !seen.has(card.id))
    if (fresh.length === 0) return

    fired.current = true
    fresh.forEach((card) => seen.add(card.id))
    writeCelebratedCards(seen)
    setCelebrating(true)
  }, [wallet])

  const dismiss = useCallback(() => setCelebrating(false), [])
  return { celebrating, dismiss }
}

// Transient full-screen burst that auto-dismisses to reveal the wallet beneath.
// Degrades to an instant, static state under prefers-reduced-motion.
function CelebrationOverlay({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion()

  useEffect(() => {
    const id = window.setTimeout(onDone, reduced ? CELEBRATION_REDUCED_MS : CELEBRATION_MS)
    return () => window.clearTimeout(id)
  }, [onDone, reduced])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-reward/15 px-6 text-center backdrop-blur-sm"
      data-testid="wallet-celebration"
      role="status"
      aria-live="polite"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduced ? undefined : { opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Confetti />
      <StampThunk className="size-20" />
      <p className="text-2xl font-semibold">Você tem um prêmio!</p>
    </motion.div>
  )
}

export default function CustomerCardsIndex({ wallet }: Props) {
  const { celebrating, dismiss } = useNewlyWonCelebration(wallet)

  return (
    <>
      <Deferred data="wallet" fallback={<WalletSkeleton />}>
        <WalletContent wallet={wallet!} />
      </Deferred>
      <AnimatePresence>
        {celebrating && <CelebrationOverlay key="celebration" onDone={dismiss} />}
      </AnimatePresence>
    </>
  )
}

CustomerCardsIndex.layout = (page: ReactNode) => (
  <CustomerLayout>{page}</CustomerLayout>
)
