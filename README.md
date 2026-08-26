# NADI — Network Activity & Data Insight

Internal Network Bandwidth Monitor and Traffic Diagnostic Dashboard for Mikrotik Hotspot and WiFi Mesh environments.

---

## Overview

NADI (Network Activity & Data Insight) is an on-premises web dashboard engineered to provide real-time per-user bandwidth monitoring, historical traffic visualization, aggregate office network saturation tracking, and security attempt auditing directly from Mikrotik RouterOS.

The application is purpose-built for enterprise and office environments operating dynamic simple queues, captive portal hotspots, and WiFi mesh distributions.

---

## Key Features

1. Real-Time Per-User Live Monitor
   - Queries Mikrotik RouterOS API (`/ip/hotspot/active` and `/queue/simple`) at 5-second intervals.
   - Automatically maps dynamic hotspot users to their dynamic simple queues by target IP address.
   - Displays real-time download speed, upload speed, cumulative session transfer, and session uptime.
   - Pushes live updates to connected browsers using WebSocket without browser-side polling.

2. Top Bandwidth Consumer Identification and Traffic Breakdown
   - Automatically detects and highlights the highest bandwidth-consuming user or device in the network.
   - Calculates the user's traffic share relative to the total office consumption.
   - Deep traffic inspection: classifies active firewall connections (`/ip firewall connection`) into service categories (Streaming, Web/HTTPS, File Transfer, VoIP/Conferencing, Gaming) to determine root causes of bandwidth spikes.

3. Aggregate Network Saturation vs. ISP Capacity
   - Compares cumulative bandwidth consumption against the office ISP capacity (such as 200 Mbps).
   - Features critical saturation threshold indicators (85%) to identify ISP bottlenecks versus localized WiFi mesh interference.

4. Network Access and Security Attempt Monitoring
   - Discovers unauthenticated devices associated with the WiFi mesh network sitting at the captive portal (`/ip/hotspot/host`).
   - Audits failed hotspot authentication attempts, duplicate session rejections, and unauthorized router access attempts from system logs (`/log`).

5. Three-Tier Data Retention Policy
   - Tier 1 (Raw Samples): 5-second resolution, retained for 48 hours with automated hourly purging.
   - Tier 2 (Hourly Aggregates): 1-hour resolution, retained for 90 days with automated daily purging.
   - Tier 3 (Daily Aggregates): 1-day resolution, retained permanently for long-term capacity planning.

6. Local-Only On-Premises Architecture
   - Self-contained single Docker container deployment.
   - No external cloud dependencies, third-party analytics, or external telemetry.
   - Embedded SQLite database running in Write-Ahead Logging (WAL) mode for high-concurrency read/write operations.

---

## System Architecture

```
[Mikrotik RouterOS API :8728]
        │
        │ Poll every 5 seconds
        ▼
[Poller Service] ── Query /ip/hotspot/active (user <-> IP <-> MAC mapping)
        │          ── Query /queue/simple (rate tx/rx, cumulative bytes)
        │          ── Query /ip/hotspot/host (unauthenticated hosts)
        │          ── Query /ip/firewall/connection (traffic breakdown)
        ▼
[SQLite: raw_samples] ──► Broadcast via WebSocket ──► [React Frontend: Live View]
        │
        ▼ (Hourly Cron)
[Aggregation Job] ────► [SQLite: hourly_aggregates] ──► [REST API] ──► [React Frontend: History View]
        │
        ▼ (Purge Cron)
[Auto Purge Job] ─────► Purge raw_samples > 48 hours & hourly_aggregates > 90 days
```

---

## Directory Structure

```
nadi/
├── docker-compose.yml       # Production Docker Compose orchestration
├── Dockerfile               # Multi-stage production container build (Node 22 Alpine)
├── .env.example             # Configuration template
├── .gitignore               # Version control ignore definitions
├── package.json             # Application dependencies and build scripts
├── tsconfig.json            # Frontend TypeScript configuration
├── tsconfig.server.json     # Server TypeScript compiler configuration
├── vite.config.ts           # Frontend bundler and proxy configuration
├── SECURITY.md              # Security policies and configuration hardening
│
├── data/                    # SQLite database persistence volume
│   └── nadi.db
│
└── src/
    ├── server/              # Fastify backend service
    │   ├── config.ts        # Environment variable loader and schema validator
    │   ├── types.ts         # Shared TypeScript domain contracts
    │   ├── index.ts         # Server bootstrap, WebSocket setup, static asset handler
    │   ├── mikrotik/        # RouterOS protocol and API engine
    │   │   ├── protocol.ts  # Binary sentence encoder and stream decoder
    │   │   ├── client.ts    # RouterOS client with authentication state machine
    │   │   ├── poller.ts    # Poller loop and hotspot/queue data correlation
    │   │   └── mock.ts      # Offline development simulation generator
    │   ├── db/              # Database persistence layer
    │   │   ├── connection.ts# SQLite connection singleton (WAL mode)
    │   │   ├── schema.ts    # Database DDL migrations
    │   │   ├── raw-samples.ts
    │   │   └── aggregates.ts
    │   ├── ws/
    │   │   └── handler.ts   # WebSocket client connection registry and broadcaster
    │   ├── jobs/            # Scheduled background tasks
    │   │   ├── aggregation.ts# Hourly and daily rollup cron jobs
    │   │   └── purge.ts     # Data retention enforcement cron jobs
    │   └── routes/          # REST API endpoints
    │       ├── users.ts     # GET /api/users/active & GET /api/users/:ip/traffic-breakdown
    │       ├── history.ts   # GET /api/history/:username
    │       ├── aggregate.ts # GET /api/aggregate
    │       ├── security.ts  # GET /api/security/hosts & GET /api/security/logs
    │       └── status.ts    # GET /api/status
    │
    └── client/              # React 19 Single Page Application
        ├── index.html       # Application entry point
        ├── index.css        # Tailwind CSS and layout styling
        ├── main.tsx         # React bootstrap
        ├── App.tsx          # Shell layout and view controller
        ├── hooks/
        │   └── useWebSocket.ts# Reconnecting WebSocket client hook
        ├── lib/
        │   ├── api.ts       # REST client abstractions
        │   └── format.ts    # Number, speed, byte, and timestamp formatters
        ├── components/
        │   ├── Header.tsx   # Top navigation and status indicators
        │   ├── SummaryCards.tsx # Aggregate bandwidth metrics and ISP gauge
        │   ├── TopConsumerCard.tsx# Top consumer card with traffic breakdown trigger
        │   ├── LiveTable.tsx# Sortable, searchable active user table
        │   ├── BandwidthChart.tsx # Recharts user history visualizer
        │   ├── AggregateChart.tsx # Total network vs. ISP capacity visualizer
        │   ├── TrafficInspectorModal.tsx # Traffic category and connection modal
        │   └── SecurityView.tsx # Access attempts and unauthorized hosts view
        └── pages/
            ├── DashboardPage.tsx
            ├── HistoryPage.tsx
            ├── AggregatePage.tsx
            ├── SecurityPage.tsx
            └── DiagnosticsPage.tsx
```

---

## Deployment Guide (Docker Compose)

### 1. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` to configure your Mikrotik router connection:
```env
# Mikrotik RouterOS API Configuration
MIKROTIK_HOST=192.168.41.1
MIKROTIK_PORT=8728
MIKROTIK_USER=nadi_monitor
MIKROTIK_PASSWORD=your_secure_password_here
MIKROTIK_TLS=false
MIKROTIK_TIMEOUT_MS=5000

# Polling Interval (in milliseconds, default: 5000 = 5 seconds)
POLL_INTERVAL_MS=5000

# Server Port and Host
PORT=3100
HOST=0.0.0.0

# Database Storage Location
DB_PATH=./data/nadi.db

# Office ISP Capacity in Mbps (used for saturation calculations)
CAPACITY_MBPS=200

# Simulation Mode (set to false for production hardware)
MOCK_MODE=false
```

### 2. Configure Mikrotik RouterOS
Log in to your Mikrotik router via Winbox or Terminal and execute the following commands:

```routeros
# 1. Enable RouterOS API service (default port 8728)
/ip service enable api

# 2. Create a restricted user group with read and api permissions only
/user group add name=nadi_group policy=read,api,!local,!telnet,!ssh,!ftp,!reboot,!write,!policy,!test,!winbox,!password,!web,!sniff,!sensitive,!romon,!rest-api

# 3. Create the dedicated monitoring user
/user add name=nadi_monitor group=nadi_group password="your_secure_password_here" comment="NADI Monitoring Service Account"
```

### 3. Build and Run Container
```bash
# Build image and start in background
docker compose up -d

# View real-time logs
docker compose logs -f
```

Access the dashboard in your browser at:
`http://<SERVER-IP>:3100`

---

## Local Development Workflow

```bash
# 1. Install dependencies
npm install

# 2. Compile client and server
npm run build

# 3. Start production server
npm start
```

For live development with hot module reloading:
```bash
# Terminal 1: Backend Fastify server with auto-reload
npm run dev:server

# Terminal 2: Frontend Vite development server
npm run dev:client
```

---

## REST API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users/active` | Retrieve list of active hotspot users and current bandwidth rates |
| `GET` | `/api/users/:ip/traffic-breakdown` | Inspect active connections and service categories for a specific IP |
| `GET` | `/api/history/:username?range=1h\|24h\|7d\|30d` | Retrieve historical bandwidth data points for a user |
| `GET` | `/api/aggregate?range=1h\|24h\|7d\|30d` | Retrieve aggregate network bandwidth against ISP capacity |
| `GET` | `/api/security/hosts` | Retrieve unauthenticated and captive portal host records |
| `GET` | `/api/security/logs` | Retrieve hotspot login failures and security audit logs |
| `GET` | `/api/security/threat-map` | Retrieve global threat intelligence summary and active intrusion vectors |
| `GET` | `/api/config` | Retrieve configurable runtime parameters (ISP capacity, etc.) |
| `PATCH` | `/api/config` | Update runtime configuration dynamically |
| `GET` | `/api/status` | Retrieve system diagnostics, SQLite row counts, and memory usage |
| `WS` | `/ws` | Real-time WebSocket feed broadcasting live snapshots every 5 seconds |

---

## License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0-or-later)**.  
See the [LICENSE](LICENSE) file for the full license text.

