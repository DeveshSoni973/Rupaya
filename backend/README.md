# Rupaya Backend

FastAPI backend for the Rupaya expense splitting application.

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL (via Prisma)
- **Cache**: Redis
- **ORM**: Prisma
- **Migrations**: Alembic
- **Package Manager**: UV

## Local Development

### Prerequisites

- Python 3.11+
- UV package manager
- Docker & Docker Compose (for database)

### Setup

1. **Install dependencies**
   ```bash
   uv sync
   ```

2. **Start services** (PostgreSQL, Redis)
   ```bash
   docker-compose up -d postgres redis
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run migrations**
   ```bash
   uv run alembic upgrade head
   ```

5. **Start development server**
   ```bash
   uv run python start.py
   ```

The API will be available at `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

## Production Deployment

### Deploy to Render

See [DEPLOYMENT.md](../DEPLOYMENT.md) for detailed instructions.

**Quick steps:**

1. Push code to GitHub
2. Create new Web Service on Render
3. Configure:
   - Runtime: Docker
   - Dockerfile: `./Dockerfile.prod`
   - Add PostgreSQL database
   - Add Redis instance
   - Set environment variables
4. Deploy!

### Environment Variables

Required for production:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ALLOWED_ORIGINS=https://your-frontend.vercel.app
HOST=0.0.0.0
PORT=8000
```

## Project Structure

```
backend/
├── app/
│   ├── core/           # Core configuration and utilities
│   ├── db/             # Database models and connection
│   ├── models/         # Pydantic models
│   ├── routers/        # API endpoints
│   ├── services/       # Business logic
│   └── main.py         # FastAPI application
├── alembic/            # Database migrations
├── Dockerfile          # Development Docker image
├── Dockerfile.prod     # Production Docker image
├── render.yaml         # Render deployment config
├── pyproject.toml      # Python dependencies
└── start.py            # Application entry point
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token

### Users
- `GET /api/v1/users/me` - Get current user
- `GET /api/v1/users/search` - Search users

### Groups
- `GET /api/v1/groups` - List user's groups
- `POST /api/v1/groups` - Create group
- `GET /api/v1/groups/{id}` - Get group details
- `PUT /api/v1/groups/{id}` - Update group
- `DELETE /api/v1/groups/{id}` - Delete group
- `POST /api/v1/groups/{id}/members` - Add member
- `DELETE /api/v1/groups/{id}/members/{user_id}` - Remove member

### Bills
- `GET /api/v1/groups/{id}/bills` - List group bills
- `POST /api/v1/groups/{id}/bills` - Create bill
- `PUT /api/v1/bills/{id}` - Update bill
- `DELETE /api/v1/bills/{id}` - Delete bill

### Summary
- `GET /api/v1/users/summary` - Get user financial summary
- `GET /api/v1/groups/{id}/summary` - Get group summary

## Database Migrations

```bash
# Create new migration
uv run alembic revision --autogenerate -m "description"

# Apply migrations
uv run alembic upgrade head

# Rollback migration
uv run alembic downgrade -1
```

## Testing

```bash
# Run tests (when implemented)
uv run pytest

# Run with coverage
uv run pytest --cov=app
```

## Troubleshooting

### Database connection issues
- Ensure PostgreSQL is running
- Check `DATABASE_URL` is correct
- Verify network connectivity

### Migration errors
- Check Alembic configuration
- Ensure database is accessible
- Review migration files for conflicts

### CORS errors
- Set `ALLOWED_ORIGINS` environment variable
- Include your frontend URL in allowed origins

## License

MIT
