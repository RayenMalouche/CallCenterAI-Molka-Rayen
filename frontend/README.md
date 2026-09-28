# CallCenterAI — the switchboard

The frontend for the CallCenterAI agent. React 19 + TypeScript on Create React App,
Tailwind v3, framer-motion. It talks to the agent service only (`/predict`, `/health`).

```bash
npm install
npm start          # http://localhost:3000 — expects the agent at http://localhost:8000
npm run build      # production build → build/, served by nginx in Dockerfile.frontend
```

Point it at another agent with `REACT_APP_API_URL=http://host:8000` at build time.

## The design

The app is laid out as a **manual telephone exchange**, because that is what the
system does: a ticket is an incoming call, the agent is the operator deciding who
takes it, and the eight categories are the departments it can be put through to.
Every device on the page comes from a cord board rather than from generic dashboard
decoration:

- **The patch panel** (`components/switchboard/patch-panel.tsx`) — the signature
  element. Line 1 is patched through an operator position — *Local* (TF-IDF + SVM)
  or *Trunk* (DistilBERT) — into one of eight department jacks. The cord draws in
  that order, so the routing decision reads as a path. Each department's lamp burns
  as bright as its score in `all_scores`. Below 560px the board redraws as two rows
  of four instead of shrinking.
- **The toll ticket** (`toll-ticket.tsx`) — operators logged every call on one. It
  holds the agent's routing explanation: length, language, why that operator, the
  department and confidence. When the agent scrubbed caller details, the ticket shows
  the call *as the operator heard it*, with the scrubbed spans resolving into their
  `[EMAIL]` / `[PHONE]` placeholders.
- **Pilot lamps** in the nameplate poll `/health` every 15s for the agent and both
  model services.
- **The ledger** — held-out accuracy of both operators and DistilBERT's per-department F1,
  read from `models/`.
- **The directory** — every service in `docker-compose.yml`, listed with its number.

**Palette** — defined once in `tailwind.config.js`; each colour has one job:

| Token | Hex | Role |
| --- | --- | --- |
| `cream` | `#EDE4CF` | page ground, the enamel wall |
| `faceplate` | `#F7F1E3` | panels and cards |
| `bakelite` | `#2A1C13` | type, and the switchboard's mass |
| `walnut` | `#4A3426` | cabinet wood |
| `graphite` | `#6E6052` | secondary text |
| `brass` | `#A8833A` | hardware: jack collars, rules, borders |
| `lamp` | `#F0A73A` | a lit lamp — live and active states only |
| `cord` | `#9A3324` | patch cords and faults. Nothing else |

**Type** — three roles: *Big Shoulders Display* for the engraved plates and
headlines, *Public Sans* for reading, *Courier Prime* for anything an operator would
have typed (the call slip, the toll ticket, numbers). All self-hosted through
`@fontsource`, so the Docker image needs no network.

**Motion** — a call rings (the Line 1 lamp blinks), then the cords draw line →
operator → department and the lamps come up. Nothing moves otherwise. Under
`prefers-reduced-motion` everything appears in place.

## Reused from component-lab

| Component | Used for |
| --- | --- |
| `animated-ai-chat.tsx` | `ui/operator-line.tsx` — the call slip. Kept the auto-resizing textarea, `/` command palette and typing dots; the palette now picks the operator position (`force_model`: `/auto`, `/local`, `/trunk`) |
| `hyper-text.tsx` | scrubbed caller details resolving into their placeholders on the toll ticket |
| `stats-card.tsx` | the ledger's per-department F1 chart (comparison bar made optional, value labels added) |

Hand-built for this design instead: the patch panel, toll ticket, nameplate,
ledger layout and directory. Considered and rejected: `siri-wave` (a chromatic
WebGL glow has no place on a bakelite board), `agent-plan` (a task planner with
subtasks — the routing is four fixed checks, which the toll ticket states more
plainly), and `ai-loader` (the ringing lamp already says "working").

## Notes

- `lib/exchange.ts` mirrors the agent's `PII_PATTERNS` to show *which* words were
  scrubbed; the agent only reports *that* it scrubbed. Keep them in step.
- The ledger figures are copied from `models/tfidf/metadata.json` and
  `models/transformer/{training_results.json,classification_report.csv}`. Update
  them if the models are retrained.
