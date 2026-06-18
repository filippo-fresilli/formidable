# Deploy

Il **client** (React PWA) è già su GitHub Pages. Il **server multiplayer** (socket.io)
va ospitato a parte: GitHub Pages serve solo file statici e non supporta WebSocket.

```
client → GitHub Pages   (automatico al push su main)
server → Railway/Render  (da configurare una volta)
```

L'online resta nascosto in produzione finché non imposti `VITE_SERVER_URL` (vedi sotto),
quindi puoi mergiare in sicurezza prima di aver deployato il server.

---

## 1. Deploy del server su Railway (consigliato)

1. Vai su https://railway.app e accedi con GitHub.
2. **New Project → Deploy from GitHub repo →** seleziona `formidable`.
3. Railway rileva `railway.json`/`package.json` ed esegue `npm install` + `npm start`
   (= `tsx server/index.ts`). Non serve altra configurazione di build.
4. Variabili d'ambiente (tab **Variables**), opzionali ma consigliate:
   - `CLIENT_ORIGIN` = `https://filippo-fresilli.github.io` (restringe la CORS)
   - `PORT` è gestita in automatico da Railway.
5. Dopo il primo deploy, in **Settings → Networking → Generate Domain** ottieni un URL
   pubblico tipo `https://formidable-production.up.railway.app`. Annotalo.

> Alternativa: **Render** → New → Web Service → repo → Build `npm install`,
> Start `npm start`. Il `Procfile` incluso funziona anche qui.

---

## 2. Collegare il client al server

1. Su GitHub: **repo → Settings → Secrets and variables → Actions → Variables → New variable**
   - Name: `VITE_SERVER_URL`
   - Value: l'URL pubblico del server (es. `https://formidable-production.up.railway.app`)
2. Rilancia il deploy del client: **Actions → Deploy to GitHub Pages → Re-run**,
   oppure fai un qualsiasi push su `main`.
3. Da quel momento il pulsante **Gioca Online** compare in produzione e punta al server.

---

## 3. Verifica

- Apri il sito di produzione in due schede → ⚙️ → **Gioca Online** → **Crea partita**.
- Controlla i log del server su Railway/Render per le connessioni in ingresso.
- `https://<server-url>/health` deve rispondere `{"status":"ok"}`.

---

## Limiti noti

- Se un giocatore umano si disconnette a metà partita, il match termina per tutti
  (nessuna riconnessione automatica).
- Il free tier di Railway/Render può mettere il server in sleep dopo inattività:
  la prima connessione dopo una pausa può richiedere qualche secondo.
