# Local Development Guide

## 🏠 Running Locally - Nothing Changed!

**Good news**: Your local development workflow is **exactly the same** as before! The deployment files we created don't affect local development at all.

## 📊 File Usage Breakdown

```
┌─────────────────────────────────────────────────────────────┐
│                    FILE USAGE                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LOCAL DEVELOPMENT          │  PRODUCTION DEPLOYMENT         │
│  ─────────────────          │  ─────────────────────         │
│                             │                                │
│  docker-compose.yml    ✅   │  ❌ Not used                   │
│  backend/Dockerfile    ✅   │  ❌ Not used                   │
│  frontend/Dockerfile   ✅   │  ❌ Not used                   │
│                             │                                │
│  backend/Dockerfile.prod ❌ │  ✅ Used by Render             │
│  backend/render.yaml     ❌ │  ✅ Used by Render (optional)  │
│  frontend/vercel.json    ❌ │  ✅ Used by Vercel             │
│                             │                                │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start (Same as Before!)

### Option 1: Full Docker Setup (Recommended)

**Everything in Docker** - Backend, Frontend, PostgreSQL, Redis, pgAdmin

```bash
# Start all services
docker compose up

# Or run in background
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

**Access:**
- 🎨 Frontend: http://localhost:3000
- 🔧 Backend API: http://localhost:8000
- 📚 API Docs: http://localhost:8000/docs
- 🗄️ pgAdmin: http://localhost:5050 (admin@admin.com / admin)
- ✅ Health Check: http://localhost:8000/health

### Option 2: Hybrid Setup (Backend in Docker, Frontend Native)

**Good for frontend development** - Faster hot reload

```bash
# 1. Start only backend services (PostgreSQL, Redis, Backend)
docker compose up postgres redis backend

# 2. In a new terminal, run frontend natively
cd frontend
bun install
bun dev
```

**Access:**
- 🎨 Frontend: http://localhost:3000
- 🔧 Backend API: http://localhost:8000

### Option 3: Fully Native (No Docker)

**Requires local PostgreSQL and Redis installed**

```bash
# Terminal 1: Start PostgreSQL and Redis
# (You need these installed locally)

# Terminal 2: Backend
cd backend
uv sync
uv run alembic upgrade head
uv run python start.py

# Terminal 3: Frontend
cd frontend
bun install
bun dev
```

## 🔧 Common Development Commands

### Docker Compose Commands

```bash
# Start all services
docker compose up

# Start specific services
docker compose up postgres redis backend

# Rebuild containers (after code changes)
docker compose up --build

# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes database data)
docker compose down -v

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f backend

# Restart a service
docker compose restart backend

# Execute command in running container
docker compose exec backend uv run alembic upgrade head
```

### Backend Commands (Native)

```bash
cd backend

# Install dependencies
uv sync

# Run migrations
uv run alembic upgrade head

# Create new migration
uv run alembic revision --autogenerate -m "description"

# Start development server
uv run python start.py

# Run tests (when implemented)
uv run pytest

# Format code
uv run ruff format .

# Lint code
uv run ruff check .
```

### Frontend Commands (Native)

```bash
cd frontend

# Install dependencies
bun install

# Start development server
bun dev

# Build for production (test locally)
bun run build

# Start production server (after build)
bun start

# Run linter
bun run lint

# Type check
bun run type-check
```

## 📁 Environment Variables

### Backend (.env)

Located at: `backend/.env`

```bash
# Copy example file
cd backend
cp .env.example .env
```

**For Docker Compose** (default values work):
```env
HOST=0.0.0.0
PORT=8000
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/rupaya?schema=public
REDIS_URL=redis://redis:6379/0
SECRET_KEY=super_secret_dev_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

**For Native Development** (adjust database host):
```env
HOST=0.0.0.0
PORT=8000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rupaya?schema=public
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=super_secret_dev_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### Frontend (.env.local)

Located at: `frontend/.env.local`

```bash
# Create file
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
```

**Content:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_TELEMETRY_DISABLED=1
```

## 🗄️ Database Management

### Using pgAdmin (Docker Compose)

1. Open http://localhost:5050
2. Login: `admin@admin.com` / `admin`
3. Add server:
   - **Name**: Rupaya Local
   - **Host**: `postgres` (if using Docker) or `localhost` (if native)
   - **Port**: `5432`
   - **Username**: `postgres`
   - **Password**: `postgres`
   - **Database**: `rupaya`

### Using psql (Command Line)

```bash
# Connect to database (Docker)
docker compose exec postgres psql -U postgres -d rupaya

# Connect to database (Native)
psql -U postgres -d rupaya

# Common commands
\dt              # List tables
\d table_name    # Describe table
\q               # Quit
```

### Database Migrations

```bash
# Apply all pending migrations
cd backend
uv run alembic upgrade head

# Create new migration (after changing models)
uv run alembic revision --autogenerate -m "add new field"

# Rollback last migration
uv run alembic downgrade -1

# View migration history
uv run alembic history

# View current version
uv run alembic current
```

## 🔍 Troubleshooting

### Port Already in Use

**Problem**: Port 3000, 8000, 5432, or 6379 already in use

**Solution**:
```bash
# Find process using port (Windows)
netstat -ano | findstr :3000

# Kill process (Windows)
taskkill /PID <process_id> /F

# Or change port in docker-compose.yml
ports:
  - "3001:3000"  # Use port 3001 instead
```

### Database Connection Failed

**Problem**: Backend can't connect to database

**Solution**:
```bash
# Check if PostgreSQL is running
docker compose ps

# Restart PostgreSQL
docker compose restart postgres

# Check logs
docker compose logs postgres

# If using native, ensure PostgreSQL service is running
```

### Frontend Can't Connect to Backend

**Problem**: API calls fail with network error

**Solution**:
1. Check backend is running: http://localhost:8000/health
2. Verify `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
3. Check browser console for CORS errors
4. Ensure backend CORS allows `http://localhost:3000`

### Hot Reload Not Working

**Problem**: Changes don't reflect automatically

**Solution**:

**Backend**:
```bash
# Restart backend service
docker compose restart backend

# Or run natively for better hot reload
cd backend
uv run python start.py
```

**Frontend**:
```bash
# Run natively for best hot reload
cd frontend
bun dev
```

### Docker Build Fails

**Problem**: `docker compose up --build` fails

**Solution**:
```bash
# Clear Docker cache
docker compose down
docker system prune -a

# Rebuild from scratch
docker compose up --build
```

## 🧪 Testing Your Setup

### 1. Health Check

```bash
# Backend health
curl http://localhost:8000/health

# Should return:
# {"status":"healthy","service":"rupaya-api"}
```

### 2. API Documentation

Visit: http://localhost:8000/docs

Try the endpoints:
- POST `/api/v1/auth/register` - Create test user
- POST `/api/v1/auth/login` - Login
- GET `/api/v1/users/me` - Get current user

### 3. Frontend

Visit: http://localhost:3000

- Register a new account
- Login
- Create a group
- Add an expense

## 📝 Development Workflow

### Typical Day-to-Day

```bash
# Morning: Start everything
docker compose up -d

# Work on backend
cd backend
# Make changes...
# Backend auto-reloads

# Work on frontend (run natively for faster reload)
cd frontend
bun dev
# Make changes...
# Frontend auto-reloads

# Evening: Stop everything
docker compose down
```

### Making Database Changes

```bash
# 1. Update models in backend/app/db/models.py
# 2. Create migration
cd backend
uv run alembic revision --autogenerate -m "description"

# 3. Review migration file in backend/alembic/versions/
# 4. Apply migration
uv run alembic upgrade head

# 5. Restart backend
docker compose restart backend
```

## 🆚 Development vs Production

| Aspect | Local Development | Production |
|--------|------------------|------------|
| **Backend** | `docker-compose.yml` + `Dockerfile` | Render + `Dockerfile.prod` |
| **Frontend** | `docker-compose.yml` + `Dockerfile` | Vercel (native Next.js) |
| **Database** | Local PostgreSQL (Docker) | Render PostgreSQL |
| **Redis** | Local Redis (Docker) | Render Redis |
| **CORS** | `allow_origins=["*"]` | Specific origins |
| **Secrets** | `.env` file | Platform environment variables |
| **Hot Reload** | ✅ Enabled | ❌ Disabled |
| **Debugging** | ✅ Full access | ⚠️ Limited (logs only) |

## 🎯 Summary

### What Changed?
- ✅ Added production deployment files
- ✅ Updated backend CORS to be environment-aware
- ✅ Added health check endpoint

### What Didn't Change?
- ✅ `docker-compose.yml` - Still works exactly the same!
- ✅ `backend/Dockerfile` - Still used for local development
- ✅ `frontend/Dockerfile` - Still used for local development
- ✅ All your development workflows

### Key Takeaway
**Local development is exactly the same as before!** Just run:

```bash
docker compose up
```

And you're good to go! 🚀

---

**Need help?** Check the main [README.md](./README.md) or open an issue.
