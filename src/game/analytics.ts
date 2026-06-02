// ── Analytics ───────────────────────────────────────────────────────────────
// Thin wrapper around Umami (https://umami.is). The Umami script in index.html
// exposes a global `umami` object once it loads and registers pageviews
// automatically. Custom game events go through track() below.
//
// Every call is a no-op when the script is absent (local dev, offline, or
// blocked by an ad-blocker) and is wrapped in try/catch, so analytics can never
// throw into game logic.

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void
    }
  }
}

type EventProps = Record<string, string | number | boolean>

export function track(event: string, props?: EventProps): void {
  try {
    window.umami?.track(event, props)
  } catch {
    /* analytics must never break the game */
  }
}

// ── Typed event helpers ───────────────────────────────────────────────────────

export function trackGameStarted(p: { difficulty: string; players: number; lang: string }): void {
  track('game_started', p)
}

export function trackGameCompleted(
  p: { won: boolean; score: number; turns: number; difficulty: string; players: number },
): void {
  track('game_completed', p)
}

export function trackPwaInstalled(): void {
  track('pwa_installed')
}
