import { useEffect, useState } from "react"

const DISMISS_KEY = "fielize:install-banner-dismissed"

function isIosSafari(ua: string): boolean {
  const isIos = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window)
  if (!isIos) return false
  // CriOS = Chrome on iOS, FxiOS = Firefox on iOS — those embed Safari
  // but use a different prompt UX. Limit to actual Safari.
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  return isSafari
}

function isStandalone(): boolean {
  // iOS exposes navigator.standalone; modern browsers expose
  // matchMedia("(display-mode: standalone)").
  const mql = window.matchMedia("(display-mode: standalone)")
  if (mql.matches) return true
  return Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  )
}

export function InstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (isStandalone()) return
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return
    if (!isIosSafari(window.navigator.userAgent)) return
    setVisible(true)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1")
    } catch {
      // localStorage may be disabled; just hide the banner for this session.
    }
    setVisible(false)
  }

  return (
    <div
      className="fixed inset-x-0 bottom-3 z-40 mx-auto flex max-w-screen-sm items-start gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg sm:bottom-4"
      data-testid="ios-install-banner"
    >
      <div className="flex flex-1 flex-col gap-1">
        <span className="font-medium">Instale a Fielize</span>
        <span className="text-xs text-muted-foreground">
          Toque em <span aria-hidden>⎙</span> Compartilhar e depois em{" "}
          <span className="font-medium">Adicionar à Tela de Início</span>.
        </span>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
        data-testid="ios-install-dismiss"
        aria-label="Dispensar"
      >
        ✕
      </button>
    </div>
  )
}
