# ReactPing

A web application that measures TCP connection latency to remote hosts using server-side Azure Functions. Displays real-time latency charts and maintains a history of ping sessions.

## Features

- **Real TCP ping measurements** — Server-side Azure Function opens raw TCP connections to port 443 and times the handshake (SYN, SYN-ACK, ACK)
- **Live chart** — Recharts-powered line chart showing latency over time with a rolling window of 20 data points
- **Session history** — Table of completed ping runs showing target, duration, average, min, and max latency
- **Warm-up handling** — Discards first measurement to account for Azure Functions cold-start cost
- **Cross-origin safe** — All measurements happen server-side, avoiding browser CORS restrictions
- **Dark mode support** — Respects OS-level dark mode preference

## Architecture

```
┌─────────────────────────┐     ┌──────────────────────────┐
│   Browser (React SPA)     │────▶│  Azure Static Web App      │
│         client/          │     │      (serves HTML/JS)     │
└─────────────────────────┘     └──────────────────────────┘
                                           │
                                           ▼
                                     ┌─────────────────────┐
                                     │  Azure Function      │
                                     │  /api/ping           │
                                     │  (Node.js backend)   │
                                     └─────────────────────┘
                                           │
                                           ▼
                                 ┌────────────────────────┐
                                 │  Target Host :443       │
                                 │  (TCP handshake timing) │
                                 └────────────────────────┘
```

The frontend sends a `GET /api/ping?host={hostname}` request to the Azure Function, which performs the actual TCP connection measurement and returns the latency in milliseconds.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite 8 |
| Charting | [Recharts](https://recharts.org/) 3.x |
| Backend | Azure Functions v4 (Node.js) |
| Hosting | Azure Static Web Apps |
| Linting | [Oxlint](https://oxc.rs/) |
| Package Manager | npm |

## Project Structure

```
ReactPing/
├── src/
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # Entry point (React root render)
│   ├── PingChart.tsx     # Recharts line chart component
│   ├── SessionList.tsx   # Session history table component
│   ├── types.ts          # TypeScript interfaces
│   ├── App.css           # Application styles
│   └── index.css         # Global styles (theme, dark mode)
├── api/
│   └── src/functions/
│       └── ping.ts       # Azure Function: TCP latency measurement
├── .github/workflows/    # SWA CI/CD pipeline
├── vite.config.ts        # Vite configuration
├── package.json          # Frontend dependencies
└── api/package.json      # Azure Functions dependencies
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm (comes with Node.js)
- [Azure Functions Core Tools](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=linux%2Cnodejs%2Cbash) (for local backend testing)

### Local Development

#### Frontend only (hot-reload)
```bash
npm install
npm run dev
```

Opens the app at `http://localhost:5173`. Note: ping functionality requires the backend to be running.

#### Full stack (frontend + backend)
```bash
# Terminal 1: Start Azure Functions backend
cd api
npm install
npm run start

# Terminal 2: Start frontend with SWA CLI
npm install
npm run dev:full
```

The `dev:full` script uses `@azure/static-web-apps-cli` to proxy API requests to the local Functions runtime.

### Build for Production

```bash
npm run build
```

This runs TypeScript compilation and Vite bundling, outputting to `dist/`.

## Usage

1. Enter a hostname (e.g., `example.com`, `google.com`) in the input field
2. Click **Start** or press Enter to begin polling
3. Latency measurements appear in real-time on the chart
4. Click **Stop** to end the session — it will be added to the history table
5. Start new sessions to new or existing hosts at any time

### Notes on Measurements

- Latency values represent **TCP connection time**, not ICMP ping
- Measurements are taken server-side by an Azure Function connecting to port 443
- Each measurement crosses two network hops: browser → Azure Function → target host
- Expect higher values than system `ping` (which uses ICMP and only one hop)
- First measurement of each session is discarded to account for cold-start overhead

## Configuration

### Frontend

| Setting | Location | Default | Description |
|---------|----------|---------|-------------|
| Poll interval | `src/App.tsx:POLL_INTERVAL_MS` | 2000ms | How often to measure latency |
| Max chart points | `src/App.tsx:MAX_POINTS` | 20 | Rolling window size for chart |

### Backend

| Setting | Location | Default | Description |
|---------|----------|---------|-------------|
| Connect port | `api/src/functions/ping.ts:CONNECT_PORT` | 443 | TCP port to connect to |
| Connection timeout | `api/src/functions/ping.ts:CONNECT_TIMEOUT_MS` | 5000ms | Max time to wait for TCP handshake |

## Deployment

This project is configured for **Azure Static Web Apps** deployment with automatic CI/CD.

### Azure Static Web Apps Setup

1. Create a new Static Web App resource in the Azure Portal
2. Connect your GitHub repository
3. Use the following build configuration:
   - **App location**: `/`
   - **API location**: `api`
   - **Output location**: `dist`

The GitHub Actions workflow (`.github/workflows/azure-static-web-apps-*.yml`) is auto-generated by Azure and handles deployment on push to `main` branch.

### Manual Deployment

```bash
# Build both frontend and backend
npm run build
cd api
npm run build

# Deploy using SWA CLI
npx @azure/static-web-apps-cli deploy \
  --app-location . \
  --api-location api \
  --output-location dist \
  --deployment-token YOUR_DEPLOYMENT_TOKEN
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (frontend only) |
| `npm run dev:full` | Start with SWA CLI for full-stack local dev |
| `npm run build` | Build frontend for production |
| `npm run lint` | Run Oxlint on source files |
| `npm run preview` | Preview production build locally |

**Azure Functions (in `api/` directory)**
| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript functions |
| `npm run start` | Start local Functions runtime |
| `npm run watch` | Start with hot-reload for function code |

## License

MIT License — see [LICENSE](LICENSE) for details.
