# Kingdom of Chess - Project Walkthrough

This document serves as a step-by-step guide on how to navigate the platform, detailing how every feature works under the hood. You can follow these exact steps to test the application.

---

## 1. Authentication & Login Flow
The platform relies on HTTP-Only JWT cookies for session management. When you land on `http://localhost:3000/login`, you will see a unified login portal.

**Test Credentials:**
- **Coach (Admin):** `coach@kingdomofchess.com` | Password: `password123`
- **Student (Player):** `student1@kingdomofchess.com` (up to `student4`) | Password: `password123`

*How it works:* The backend authenticates the user and sets an encrypted HTTP-Only cookie. The frontend reads the `role` payload and dynamically redirects the user to either the Coach Dashboard or Student Dashboard. Protected routes on the frontend and backend ensure students cannot access coach capabilities.

---

## 2. The Coach Workflow (Admin)
Log in using the **Coach** credentials to access the `Coach Dashboard`.

### A. Creating a Tournament
- **Action:** Enter a tournament name (e.g., "Winter Arena") and click **Create (5+0)**.
- **Behind the scenes:** A new tournament is created in PostgreSQL with a `DRAFT` status and a default Rapid time control (5 minutes, 0 increment).

### B. Managing Tournament Lifecycle
You will see buttons dynamically appear based on the tournament's state:
- **Open:** Transitions the tournament from `DRAFT` to `OPEN`. Students can now register.
- **Start:** Transitions the tournament from `OPEN` to `ONGOING`. Registered students can now queue for matchmaking.
- **Complete:** Closes the tournament. A winner is immediately calculated and announced.

### C. Viewing Stats
- **Action:** Click the **Stats** button on any tournament.
- **Behind the scenes:** You are taken to a tabbed view. The **Leaderboard** tab ranks students by points. The **Match History** tab provides an audit log of every game played, showing White/Black player emails, who won, and the termination reason (Checkmate, Resignation, Timeout).

---

## 3. The Student Workflow (Player)
Open two separate browser windows (or an Incognito window) and log in as `student1` and `student2`.

### A. Registering for a Tournament
- **Action:** Students see a list of `OPEN` and `ONGOING` tournaments. Click **Register**.
- **Behind the scenes:** The system checks if the user is already registered. The UI will instantly update, removing the Register button and unlocking the matchmaking controls.

### B. Finding an Opponent
- **Action:** Click the glowing **Find Opponent ⚔️** button.
- **Behind the scenes (Crucial Mechanism):** The backend places the student in the Postgres `matchmaking_queue`. The system utilizes a `SELECT ... FOR UPDATE` database transaction. This row-level locking guarantees that if 100 students click "Find Opponent" at the exact same millisecond, the database resolves them safely in pairs, entirely preventing race conditions or double-booking.

### C. The Live Match Experience
Once matched, both students are automatically redirected to the Live Match screen.
- **Email Visibility:** The opponent's actual email is dynamically fetched and displayed above their clock.
- **Board Orientation:** The board is automatically flipped so that the player playing Black always sees the board from Black's perspective.
- **Move Validation (Anti-Cheat):** Try making an illegal move (e.g., jumping a pawn over another piece). The frontend will reject it, but more importantly, the **Server** validates it using `chess.js` in memory. Any injected or tampered socket payloads are rejected, guaranteeing 100% fair play.
- **Stateless Clocks:** Time is calculated by the server lazily on every move by comparing timestamps, preventing server lag.

### D. Game Over & Scoring
- **Action:** Play a game until Checkmate, let the time run out (Timeout), or click the **Resign** button.
- **Behind the scenes:** The Socket Gateway detects the end-state, calculates points (1 for Win, 0.5 for Draw), and writes the final PGN directly to the database. The match is instantly terminated, and players are prompted to return to the dashboard.

### E. Leaderboard
- Navigate back to the Tournament Leaderboard. You will instantly see the points updated. If the coach marks the tournament as `COMPLETED`, a **🏆 Winner** badge dynamically appears next to the top-ranking player.

---

## 4. Future Enhancements & Roadmap (What's Next?)
For the scope of this take-home assignment, priority was heavily given to the **core live-match loop** and **concurrency safety**. However, if this platform were to be developed into a production-ready application, the following features would be implemented next:

### A. Comprehensive Authentication
- **Current State:** Seeded accounts are used to easily jump into the app.
- **Future:** A complete Signup & Onboarding system with email verification, password reset, and OAuth (Google/GitHub login) for students and coaches.

### B. Extended Admin & Coach Portal
- **Current State:** Coaches can create tournaments, change their states, and view stats.
- **Future:** A fully-fledged admin dashboard to manage users (ban/mute players), modify matchmaking parameters, handle disputes, and export tournament results to CSV/PDF.

### C. Advanced Chess Mechanics & Tiebreakers
- **Future:** Implementation of standard chess tiebreakers (e.g., Buchholz or Sonneborn-Berger) when players have the same points, rather than relying solely on raw points. Elo rating integration (modifying global ranks based on match outcomes) would also be added.

### D. Redis for Matchmaking Queueing
- **Current State:** PostgreSQL row-level locks (`FOR UPDATE`) are used. This is 100% safe but can bottleneck if scaling to tens of thousands of simultaneous users.
- **Future:** Migrating the `matchmaking_queue` to **Redis** using sorted sets and pub/sub for massive-scale concurrent matching.

### E. Social Features
- **Future:** Live chat integration during matches, global lobbies for tournaments, and the ability to send direct friend requests or custom challenges.
