import { io } from 'socket.io-client'

const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? 'http://localhost:3001'

// Singleton — autoConnect:false so we only connect when the player chooses online mode.
export const socket = io(SERVER_URL, { autoConnect: false })
