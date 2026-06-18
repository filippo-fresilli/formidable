import { io } from 'socket.io-client'

const CONFIGURED_URL = import.meta.env.VITE_SERVER_URL as string | undefined
const SERVER_URL = CONFIGURED_URL ?? 'http://localhost:3001'

// Online play is available in local dev (defaults to localhost) or whenever a
// server URL is configured at build time. In production without VITE_SERVER_URL
// the feature stays hidden so we never ship a button pointing at localhost.
export const ONLINE_ENABLED = import.meta.env.DEV || !!CONFIGURED_URL

// Singleton — autoConnect:false so we only connect when the player chooses online mode.
// Bounded retries + per-attempt timeout so an unreachable server fails fast
// instead of hanging on "Connessione…" forever.
export const socket = io(SERVER_URL, {
  autoConnect: false,
  timeout: 7000,
  reconnectionAttempts: 3,
})
