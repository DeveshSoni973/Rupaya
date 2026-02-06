# Rupaya - Expense Splitting Application

Rupaya is a modern bill-splitting and expense-tracking application built with FastAPI and Next.js. It provides a robust platform to manage users, groups, bills, and shared expenses with real-time collaboration features.

## Features

- **User Management:** Secure user registration and authentication using JWT
- **Group Creation:** Create and manage groups for sharing expenses
- **Bill Tracking:** Add bills to groups and track who has paid
- **Expense Splitting:** Divide expenses among group members (Equal, Exact, Percentage)
- **Real-time Updates:** (Planned)
- **Admin Dashboard:** pgAdmin for database management

## Tech Stack

### Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) - Modern, fast Python web framework
- **Database:** [PostgreSQL 16](https://www.postgresql.org/) - Reliable relational database
- **ORM:** [SQLAlchemy](https://www.sqlalchemy.org/) (Async) - Powerful Python SQL toolkit
- **Migrations:** [Alembic](https://alembic.sqlalchemy.org/) - Database migration tool
- **Authentication:** [python-jose](https://github.com/mpdavis/python-jose) - JWT handling
- **Package Manager:** [uv](https://github.com/astral-sh/uv) - Fast Python package installer
- **Cache:** [Redis 7.2](https://redis.io/) - In-memory data structure store

### Frontend
- **Framework:** [Next.js 16](https://nextjs.org/) - React framework with App Router
- **Runtime:** [Bun](https://bun.sh) - Fast all-in-one JavaScript runtime
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Icons:** [Lucide React](https://lucide.dev/)

### DevOps
- **Containerization:** Docker & Docker Compose
- **Database Admin:** pgAdmin 4

## Project Structure

```
Rupaya/
├── backend/           # FastAPI application
│   ├── app/          # Application code
│   ├── alembic/      # Database migrations
│   ├── Dockerfile    # Backend container config
│   └── pyproject.toml
├── frontend/         # Next.js application
│   ├── app/         # Next.js app directory
│   ├── Dockerfile   # Frontend container config
│   └── package.json
└── docker-compose.yml # Multi-container orchestration
```

## 📖 Documentation

**New to the project?** Start here:

- 🏠 **[LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)** - How to run locally (same as before!)
- 🚀 **[DEPLOYMENT_QUICK_REFERENCE.md](./DEPLOYMENT_QUICK_REFERENCE.md)** - Deploy to production
- 📊 **[LOCAL_VS_PRODUCTION.md](./LOCAL_VS_PRODUCTION.md)** - Understand the setup
- 📚 **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - Find any guide quickly

**Quick answers:**
- **Run locally?** → `docker compose up` (nothing changed!)
- **Deploy?** → Read [DEPLOYMENT_QUICK_REFERENCE.md](./DEPLOYMENT_QUICK_REFERENCE.md)
- **docker-compose.yml?** → Still used for local development only

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/Rupaya.git
   cd Rupaya
   ```

2. **Set up environment variables:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   cd ..
   ```

3. **Start all services:**
   ```bash
   docker compose up --build
   ```

   This will start:
   - **Backend API** at `http://localhost:8000`
   - **Frontend** at `http://localhost:3000`
   - **PostgreSQL** on port `5432`
   - **Redis** on port `6379`
   - **pgAdmin** at `http://localhost:5050`

4. **Access the application:**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
   - pgAdmin: [http://localhost:5050](http://localhost:5050)
     - Email: `admin@admin.com`
     - Password: `admin`

### Stopping the Application

```bash
docker compose down
```

To remove all data (volumes):
```bash
docker compose down -v
```

## Deployment

Rupaya is designed to be deployed with:
- **Backend** → [Render](https://render.com) (with Docker support)
- **Frontend** → [Vercel](https://vercel.com) (Next.js native support)

📖 **See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.**

### Quick Deployment Summary

**Backend (Render):**
1. Push code to GitHub
2. Create Web Service on Render
3. Use `backend/Dockerfile.prod`
4. Add PostgreSQL and Redis
5. Configure environment variables

**Frontend (Vercel):**
1. Import project from GitHub
2. Set root directory to `frontend`
3. Add `NEXT_PUBLIC_API_URL` environment variable
4. Deploy!

**Note:** Vercel does NOT support Docker for frontend deployments, but that's perfect since Next.js is natively supported.


## Development

### Backend Development

For local development without Docker:

```bash
cd backend

# Install dependencies
uv sync

# Run migrations
uv run alembic upgrade head

# Start development server
uv run python start.py
```

### Frontend Development

For local development without Docker:

```bash
cd frontend

# Install dependencies
bun install

# Start development server
bun dev
```

## Database Management

### Migrations with Alembic

The database schema is defined using SQLAlchemy models in `backend/app/db/models.py`.

**Create a new migration:**
```bash
cd backend
uv run alembic revision --autogenerate -m "description_of_changes"
```

**Apply migrations:**
```bash
uv run alembic upgrade head
```

**Rollback migration:**
```bash
uv run alembic downgrade -1
```

**View migration history:**
```bash
uv run alembic history
```

> **Note:** Migrations are automatically applied when starting the backend container.

### Using pgAdmin

1. Open [http://localhost:5050](http://localhost:5050)
2. Login with credentials (admin@admin.com / admin)
3. Add a new server:
   - **Host:** `postgres`
   - **Port:** `5432`
   - **Username:** `postgres`
   - **Password:** `postgres`
   - **Database:** `rupaya`

## Testing

The backend includes a test suite using `pytest`.

**Run tests:**
```bash
cd backend
uv run pytest
```

**Run tests with coverage:**
```bash
uv run pytest --cov=app --cov-report=html
```

## API Documentation

Once the backend is running, you can access:

- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

## Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/rupaya
REDIS_URL=redis://redis:6379/0
SECRET_KEY=your-secret-key-here
PORT=8000
HOST=0.0.0.0
```

### Frontend

Environment variables can be set in `docker-compose.yml` or `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Roadmap

- [ ] Real-time expense updates using WebSockets
- [ ] Mobile application
- [ ] Email notifications
- [ ] Export to CSV/PDF
- [ ] Multi-currency support
- [ ] Receipt image upload and OCR
- [ ] Settlement suggestions and optimization

## Support

For issues and questions, please open an issue on GitHub.
