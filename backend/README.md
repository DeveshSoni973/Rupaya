# Rupaya Backend

## Quick Start with Docker (Recommended)

The easiest way to get started is using Docker Compose, which sets up PostgreSQL and Redis automatically.

1.  **Set up environment variables**:
    ```bash
    cp .env.example .env
    ```
    Then edit `.env` and set your own secure passwords for `POSTGRES_PASSWORD` and `SECRET_KEY`.

2.  **Start the services**:
    ```bash
    docker-compose -f docker-compose-dev.yml up -d
    ```

3.  **Verify services are running**:
    ```bash
    docker-compose -f docker-compose-dev.yml ps
    ```

4.  **View logs** (optional):
    ```bash
    docker-compose -f docker-compose-dev.yml logs -f
    ```

5.  **Stop the services**:
    ```bash
    docker-compose -f docker-compose-dev.yml down
    ```

6.  **Stop and remove volumes** (⚠️ deletes all data):
    ```bash
    docker-compose -f docker-compose-dev.yml down -v
    ```

### Docker Services

The `docker-compose-dev.yml` includes:

- **PostgreSQL 16** (Alpine)
  - Port: `5432`
  - User: Set via `POSTGRES_USER` in `.env` (default: `postgres`)
  - Password: Set via `POSTGRES_PASSWORD` in `.env`
  - Database: Set via `POSTGRES_DB` in `.env` (default: `rupaya`)
  - Container: `rupaya-postgres`

- **Redis 7.2** (Alpine)
  - Port: `6379`
  - Persistence: Enabled (AOF)
  - Container: `rupaya-redis`

- **pgAdmin 4** (Latest)
  - Web UI: `http://localhost:5050`
  - Email: Set via `PGADMIN_EMAIL` in `.env` (default: `admin@admin.com`)
  - Password: Set via `PGADMIN_PASSWORD` in `.env` (default: `admin`)
  - Container: `rupaya-pgadmin`

### Accessing pgAdmin

1. Open your browser and go to: `http://localhost:5050`
2. Login with the credentials from your `.env` file (default: `admin@admin.com` / `admin`)
3. Add a new server connection:
   - **General Tab:**
     - Name: `Rupaya Local`
   - **Connection Tab:**
     - Host: `rupaya-postgres` (or `postgres` - the container name)
     - Port: `5432`
     - Maintenance database: `rupaya` (or your `POSTGRES_DB` value)
     - Username: `postgres` (or your `POSTGRES_USER` value)
     - Password: Your `POSTGRES_PASSWORD` value
     - Save password: ✅ (optional)

### Connection Strings for Docker

When using Docker Compose, use these connection strings in your `.env`:

```env
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}"
REDIS_URL="redis://localhost:6379"
```

## Manual Setup (Without Docker)

1.  **Install Dependencies**:
    ```bash
    uv sync
    ```

2.  **Start the Server**:
    ```bash
    uv run start.py
    ```
    This will start the server on the port specified in your `.env` file.

    Alternative methods:
    ```bash
    uv run fastapi dev app/main.py
    ```
    Or using uvicorn directly:
    ```bash
    uv run uvicorn app.main:app --reload --port 8000
    ```

## Environment Variables

Make sure you have a `.env` file with:
- `DATABASE_URL` - PostgreSQL database connection string
- `SECRET_KEY` - Secret key for JWT tokens
- `REDIS_URL` - Redis connection URL
- `PORT` - Port number for the backend server (default: 8000)
- `HOST` - Host address to bind to (default: 0.0.0.0)

## Code Quality

**Lint** (check for issues):
```bash
uv run ruff check .
```

**Format** (auto-fix formatting):
```bash
uv run ruff format .
```

**Lint and auto-fix**:
```bash
uv run ruff check --fix .
```

**Run both lint and format**:
```bash
uv run ruff check --fix . && uv run ruff format .
```
