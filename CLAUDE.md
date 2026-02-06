# Claude Instructions for Sheepshead Online

## Project Overview
Sheepshead Online is a real-time multiplayer card game application for 5 players. It implements the traditional Wisconsin Sheepshead card game with web-based multiplayer capabilities.

## Tech Stack
- **Backend**: Node.js, Express, Socket.IO (real-time gameplay)
- **Database**: SQLite via sql.js
- **Authentication**: bcrypt password hashing, express-session
- **Frontend**: Vanilla HTML/CSS/JavaScript (served from `/public`)

## File Structure
- `src/server.js` - Main server entry point
- `src/` - Server-side game logic and API endpoints
- `public/` - Client-side HTML, CSS, and JavaScript
- `data/` - SQLite database directory (gitignored)
- `.gitignore` - Excludes: `node_modules/`, `data/`, `*.db`, `.env`, `.DS_Store`, `.claude/settings.local.json`

## Working Style
- **Make changes directly** - implement fixes and features without requesting approval first
- **Keep solutions simple** - prefer straightforward implementations over complex architectures
- **Follow existing patterns** - maintain consistency with current codebase structure

## Code Guidelines

### Game Logic
- Game rules may evolve - follow what's currently implemented in the code
- Key game mechanics include:
  - Call-an-Ace partner mode
  - Schwanzer (Leasters) when all players pass
  - Scoring with Schneider and Schwarz multipliers
- Reference [DEPLOY.md](DEPLOY.md) for current game rules documentation

### Real-Time Features
- Socket.IO handles all real-time game state updates
- Ensure game state stays synchronized across all connected clients
- Consider WebSocket performance for responsive gameplay

### Database
- SQLite stores user accounts, rooms, and game state
- Use sql.js for database operations
- Be aware of `lastInsertRowid` behavior with sql.js
- Handle null/falsy userId values carefully (userId 0 is valid)
- **Database Migrations**: Use try-catch blocks for ALTER TABLE commands in `database.js` to handle existing databases gracefully
- **Stats Tracking**: Dual tracking system - lifetime stats (`player_stats`) and daily stats (`daily_stats` with date-based uniqueness)
- **Key Stats Columns**:
  - `hands_called_as_partner` - tracks when player was called as partner (regardless of win/loss)
  - `hands_alone` - tracks when picker went alone (didn't call partner)
  - `hands_won_as_alone` - tracks wins when going alone
  - All three exist in both `player_stats` and `daily_stats` tables

### Authentication
- User sessions managed via express-session with memorystore
- Passwords hashed with bcryptjs
- Session middleware required for authenticated routes

## Common Tasks
- **Bug fixes**: Directly implement and test fixes
- **New features**: Add functionality following existing patterns
- **Refactoring**: Improve code quality while maintaining behavior
- **Performance**: Optimize real-time gameplay and database queries

## Deployment
- Project deploys to Railway
- Environment variables: `SESSION_SECRET`, `NODE_ENV`, `DATABASE_PATH`
- Requires persistent volume for SQLite database
- See [DEPLOY.md](DEPLOY.md) for full deployment instructions

## Development
```bash
npm install
npm run dev  # Runs with --watch flag (automatic restart on file changes)
# OR
npm start    # Manual restart workflow (Ctrl+C to stop, restart to see changes)
```
Server runs on http://localhost:3000

### Development Workflow
- **With `npm run dev`**: Server automatically restarts when server-side files change (uses Node.js `--watch` flag)
- **With `npm start`**: Stop server with Ctrl+C and restart manually to see changes
- **Client-side changes**: Always require browser refresh after server is running
- **Database migrations**: Run automatically on server startup via `initDb()` in [database.js](src/models/database.js)

## Important Notes
- userId 0 is a valid value (don't treat as falsy)
- sql.js `lastInsertRowid` returns BigInt, needs proper handling
- Session cookies must be enabled for authentication
- 5 players required to start a game

## Key Files for Stats System
- [src/models/database.js](src/models/database.js) - Database schema and migration logic
- [src/models/User.js](src/models/User.js) - Stats retrieval and update methods (`getStats()`, `updateStats()`, `getDailyStats()`)
- [src/server.js](src/server.js) - Constructs `handResult` objects with all tracking flags in `updatePlayerStats()`

## Testing

### Test Documentation Approach
Test cases are documented in markdown files before being converted to Jest tests. This provides:
- Living documentation of game rules
- Easy review and editing of test cases
- Source of truth for expected behavior

### Test Documentation Files
- [docs/testing/README.md](docs/testing/README.md) - Testing workflow and file format
- [docs/testing/test-checklist.md](docs/testing/test-checklist.md) - Master checklist tracking all test coverage
### Collaborators
- **schmo33** — smoriearty's GitHub username
- **valinor808** — friend/collaborator's GitHub username

### Session Notes
**At the start of a new session**: Ask the user if they'd like you to read the latest session notes to get context on recent work.

**At the end of each session**: Create a summary file in `docs/sessions/` with the format `SESSION-YYYY-MM-DD-username.md` (use GitHub username). Include:
- What was accomplished
- Open issues or questions
- Recommended next steps
- Files changed

This helps the next person (and Claude) pick up where you left off.

**Recent sessions:**
- [docs/sessions/SESSION-2026-02-06-valinor808.md](docs/sessions/SESSION-2026-02-06-valinor808.md) - Added calling test F3, fixed under card waste bug (205 total)
- [docs/sessions/SESSION-2025-02-06-schmo33.md](docs/sessions/SESSION-2025-02-06-schmo33.md) - Schwanzer tests, all unit test categories complete (204 total)
- [docs/sessions/SESSION-2025-02-05-schmo33-2.md](docs/sessions/SESSION-2025-02-05-schmo33-2.md) - Burying & scoring tests, fixed Q/J burial and Schneider bugs (179 total)
- [docs/sessions/SESSION-2025-02-05-schmo33.md](docs/sessions/SESSION-2025-02-05-schmo33.md) - Fixed Under/Call 10 bugs, added calling tests (90 total)

### Running Tests
```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
```

### Workflow
1. Document test cases in `docs/testing/*.md`
2. Review and update as game rules evolve
3. Generate Jest tests from documentation
4. Run `npm test` to verify implementation
