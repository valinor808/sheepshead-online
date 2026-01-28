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
- `sheepshead.db` - SQLite database (gitignored)

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
npm run dev  # Runs with --watch flag
```
Server runs on http://localhost:3000

## Important Notes
- userId 0 is a valid value (don't treat as falsy)
- sql.js `lastInsertRowid` returns BigInt, needs proper handling
- Session cookies must be enabled for authentication
- 5 players required to start a game
