# Rupaya - Expense Splitting Backend

Rupaya is a backend service for a bill-splitting and expense-tracking application. It provides a robust API to manage users, groups, bills, and shared expenses.

## Features

*   **User Management:** Secure user registration and authentication using JWT.
*   **Group Creation:** Create and manage groups for sharing expenses.
*   **Bill Tracking:** Add bills to groups and track who has paid.
*   **Expense Splitting:** Divide expenses among group members.
*   **Real-time Updates:** (Future-ready with Supabase integration)

## Tech Stack

*   **Framework:** [FastAPI](https://fastapi.tiangolo.com/)
*   **Database:** [PostgreSQL](https://www.postgresql.org/)
*   **ORM:** [Prisma Client Python](https://prisma-client-py.readthedocs.io/en/stable/)
*   **Authentication:** [python-jose](https://github.com/mpdavis/python-jose) for JWT handling
*   **Dependencies:** See `backend/pyproject.toml` for a full list.

## Database Schema

The database schema is defined using Prisma in `backend/prisma/schema.prisma`. The main models are:

*   `User`: Stores user information, including authentication details.
*   `Group`: Represents a group of users for sharing bills.
*   `GroupMember`: Manages the relationship between users and groups, including roles.
*   `Bill`: Represents a single bill or expense.
*   `BillShare`: Tracks each user's share of a bill.

## Getting Started

### Prerequisites

*   Python 3.11+
*   [Poetry](https://python-poetry.org/) for dependency management
*   A running PostgreSQL database

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/Rupaya.git
    cd Rupaya/backend
    ```

2.  **Set up the environment:**

    Create a `.env` file in the `backend` directory. You can use `.env.example` as a template.
    ```
    DATABASE_URL="postgresql://user:password@localhost:5432/mydatabase"
    SECRET_KEY="your-secret-key"
    JWT_ALGORITHM="HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    ```

3.  **Install dependencies:**
    ```bash
    uv install
    ```

4.  **Generate the Prisma client:**
    ```bash
    uv run prisma generate
    ```

5.  **Run database migrations:**
    ```bash
    uv run prisma db push
    ```

### Running the Application

To start the development server, run:

```bash
uv run uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

## API Endpoints

The application currently includes the following high-level endpoints:

*   `/`: Root endpoint with a welcome message.
*   `/auth`: User authentication routes (e.g., login, register).
*   (Other routers for bills, groups, etc. will be added)

You can access the interactive API documentation at `http://127.0.0.1:8000/docs`.

Added the Nextjs based frontend

## Testing


The project is set up for testing using `pytest`. To run the tests:

```bash
poetry run pytest
```
