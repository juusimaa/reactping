# Project Handover: React Ping-Latency Graph (Learning Project)

**Purpose of this document:** Context for picking this project back up in VS Code with Claude Code (or Claude in chat). Paste this whole file into a new conversation, or point Claude Code at it, to resume without re-explaining the plan.

---

## 1. Goal

Learn React by building a small web app that measures and graphs network latency ("ping") over time. Secondary goal: touch a bit of Azure + GitHub CI/CD along the way, using free tiers only.

## 2. Key constraint (why this isn't literally ICMP ping)

Browsers cannot send raw ICMP packets — there's no browser API for it, and it's blocked by sandboxing. So "ping" has to mean one of two things:

- **Real ping** — a backend does the actual ICMP ping (or shells out to the OS `ping` command) and exposes it via an HTTP API. The frontend polls that API.
- **Simulated ping** — the frontend times its own HTTP round-trips (e.g. `fetch()` + `performance.now()`) as a latency proxy. Not literal ICMP, but a legitimate measurement, and needs no backend at all.

**Decision needed from you:** which one to build first. Recommendation below.

## 3. Recommended path

Start with **simulated ping (frontend-only)** to learn core React concepts fast with zero backend complexity. Add a **real-ping backend via Azure Functions** as a stretch goal once the frontend works, since it's a natural excuse to touch Azure.

## 4. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | React + TypeScript | TS catches bugs early and is the dominant real-world pairing with React |
| Scaffolding tool | Vite (`npm create vite@latest`) | Modern standard; Create React App is deprecated |
| Charting | Recharts (or Chart.js) | Teaching-friendly, well-documented React charting library |
| Hosting | Azure Static Web Apps (free tier) | Free SSL, custom domain, and automatic GitHub Actions CI/CD on every push |
| Backend (stretch goal) | Azure Functions, Node.js/TypeScript, HTTP trigger | Can live inside the same Static Web App resource ("managed functions"); consumption plan free grant is 1M requests + 400,000 GB-s/month — a hobby project won't come close |
| Source control | GitHub (free) | Connects directly to Azure Static Web Apps for CI/CD |

## 5. Build order (React learning progression)

1. **Scaffold**: `npm create vite@latest` → React + TypeScript template. Confirm `npm run dev` works locally.
2. **Static UI first**: build the chart component with hardcoded fake data points. No async, no state updates yet — just learn JSX, props, component structure.
3. **Add live polling**: introduce `useState` (array of data points) + `useEffect` + `setInterval` to add a new point every N seconds. This is the core React concept the whole project hinges on — state updates driving re-renders.
4. **Real measurement**: replace fake data with actual `fetch()` timing (Option A: simulated ping).
5. **Deploy**: push to GitHub, connect repo to Azure Static Web Apps, watch first CI/CD deploy happen automatically.
6. **Stretch — real ping**: add an Azure Function (Node/TypeScript) that does a real ping and swap the frontend's fetch target to call it.

## 6. Open decisions to make with Claude Code next session

- [ ] Simulated ping only, or build the Azure Functions backend too?
- [ ] Recharts vs Chart.js?
- [ ] Single target host to ping, or a list of user-configurable targets?
- [ ] How much history to keep in the chart (rolling window vs all-time)?
- [ ] Any auth needed, or fully public app? (Free tier defaults to public — fine for a learning project.)

## 7. Environment notes

- VS Code with the standard TypeScript/ESLint extensions is sufficient — no special tooling needed beyond Node.js installed locally.
- Azure Static Web Apps deployment is normally set up via the Azure Portal (or VS Code's Azure Static Web Apps extension), which auto-generates the GitHub Actions workflow file in your repo.
- No credit card charges expected if usage stays within free tier limits described above — but this is not a guarantee against Microsoft's terms changing; worth a quick check of current limits before deploying if a lot of time has passed since this was written.

## 8. Sources verified at time of writing (Aug 2026)

- Azure Static Web Apps free tier — automatic GitHub Actions CI/CD, free SSL: https://kloudschool.com/azure-static-web-apps-2026
- Azure Functions consumption plan free grant (1M requests / 400,000 GB-s per month): https://azure.microsoft.com/en-us/pricing/details/functions/
