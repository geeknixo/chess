# Kingdom of Chess - Live Match Platform
**Developer:** Nikhil Sharma

A full-stack, real-time chess tournament platform built with **Next.js 14**, **NestJS 11**, **Socket.IO**, and **PostgreSQL** (via **Drizzle ORM**). This project fulfills the requirements of the "Kingdom of Chess" take-home assignment, prioritizing a robust, server-authoritative live match loop over secondary features.

## 🏗️ System Architecture & Tech Stack Justification

Every tool in this stack was chosen for a specific reason to satisfy the assignment constraints securely and scalably:
- **Next.js 14:** Chosen for the frontend to easily handle complex state (via `react-query` & sockets) while keeping the routing structure clean and modular.
- **NestJS 11 (TypeScript):** Provides strict typing and robust dependency injection. This is crucial for a real-time backend where Socket.IO logic, Matchmaking queues, and REST controllers need to share data seamlessly.
- **Socket.IO:** Used instead of raw WebSockets because of its built-in broadcasting (rooms), auto-reconnection, and seamless integration with NestJS Gateways.
- **PostgreSQL & Drizzle ORM:** Chosen for absolute data integrity. Matchmaking requires strict transactional safety (ACID properties) which Postgres excels at.

## 🌟 Key Features & "Why They Matter"

### 1. Role-Based Access Control (RBAC)
- **What it is:** Distinct `COACH` (Admin) and `STUDENT` (Player) dashboards. Protected routes via JWT HTTP-Only cookies.
- **Why it's necessary:** Pure security. A student should never be able to call the API to alter tournament rules or start a tournament. Backend Guards strictly enforce this.

### 2. Transactional Matchmaking (Concurrency Safe)
- **What it is:** A queueing system using Postgres row-level locks (`SELECT ... FOR UPDATE`).
- **Why it's necessary:** In a live system, hundreds of players might click "Find Opponent" at the exact same millisecond. Without database-level locking, the system suffers from race conditions (e.g., matching a single student into two different games simultaneously).

### 3. Server-Authoritative Real-Time Chess (Anti-Cheat)
- **What it is:** `chess.js` powers move validation entirely on the backend. The frontend (`react-chessboard`) acts strictly as a "dumb" visual client.
- **Why it's necessary:** If move validation is only done on the frontend, a malicious user could bypass the browser UI and send fake socket events to make illegal moves. Running the engine on the server guarantees 100% fair play.

### 4. Stateless Clock Calculation
- **What it is:** Clocks are not handled via `setInterval` loops on the server. Instead, the server calculates remaining time lazily on each move by comparing `Date.now()` against the previous turn's timestamp.
- **Why it's necessary:** Running `setInterval` timers for thousands of concurrent chess matches would completely block the Node.js event loop and crash the server. Lazy calculation is highly performant and scalable.

### 5. Live Leaderboard & Match History
- **What it is:** Automated result reporting, score tracking (1 for win, 0.5 for draw), and winner declarations.
- **Why it's necessary:** Removes manual overhead for the Coach. When a checkmate or timeout happens, the system updates the database and leaderboard instantly, maintaining a true real-time competitive experience.

## 🚀 Setup Instructions (Docker + Local)

### 1. Requirements
- Docker & Docker Compose (Required for 1-click database setup)
- Node.js (v18+)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Ensure your `.env` (in the root and `apps/api/.env`) looks like this. It is pre-configured for local testing:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/chess
JWT_SECRET=super-secret-key-change-in-prod
JWT_EXPIRES_IN=24h
```

### 4. Database Setup & Seeding
```bash
# Start PostgreSQL via Docker (Port 5432)
docker-compose up -d

# Push the database schema
npm run --workspace=apps/api drizzle-kit push

# Seed the database with test users
npx tsx apps/api/src/db/seed.ts
```
**Test Credentials:**
- Coach: `coach@kingdomofchess.com` / `password123`
- Student: `student1@kingdomofchess.com` / `password123` (up to student4)

### 5. Run Servers
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🏗️ Architecture & Trade-offs

- **Matchmaking Queue (Postgres vs Redis):** The queue is stored in the database rather than Redis. This guarantees safety across concurrent requests via PostgreSQL transaction row-level locking (`LIMIT 1 FOR UPDATE`), preventing race conditions where multiple users match the same person simultaneously. For scale, this would be moved to Redis, but for the MVP, Postgres ensures strict consistency.
- **Server-Authoritative Clock:** Clocks are not handled via `setInterval` loops on the server (which would block the event loop at scale). Instead, the server calculates remaining time lazily on each move by comparing `Date.now()` against the exact timestamp the previous turn ended.
- **Socket Authentication:** Sockets are notoriously hard to secure with cookies since browsers don't always pass them automatically to WebSockets on cross-origins. I implemented a robust `cookie-parser` mechanism inside the Socket Gateway's `handleConnection` to extract and verify the JWT before allowing room entry.
- **Tiebreaks:** The leaderboard ranks purely by points descending. For a 48-hour MVP, complex tiebreaks (like Buchholz or Sonneborn-Berger) were omitted in favor of deterministic sorting based on points.

## 🔌 Socket.IO Events

| Direction | Event Name | Payload | Purpose |
|---|---|---|---|
| Client -> Server | `match:join` | `{ matchId }` | Authenticates room entry and starts state sync. |
| Client -> Server | `match:move` | `{ matchId, from, to, promotion }` | Client attempts to make a move. |
| Client -> Server | `match:resign` | `{ matchId }` | Client resigns the match. |
| Server -> Client | `match:state` | `{ fen, pgn, whiteTime, blackTime, turn }` | Authoritative sync pushed to all in room. |
| Server -> Client | `match:end` | `{ winnerId, reason, pgn }` | Triggered on checkmate, timeout, draw, resign. |
| Server -> Client | `match:error` | `{ message }` | Illegal move, unauthorized access, etc. |
| Server -> Client | `matchmaking:matched`| `{ matchId }` | Dispatched to queued users when match is ready. |
