# Deployment Guide

This guide explains how to deploy the Rupaya application with the backend on Render and the frontend on Vercel.

## Architecture

- **Backend**: FastAPI + PostgreSQL + Redis on Render
- **Frontend**: Next.js on Vercel

## Prerequisites

1. GitHub account with your repository
2. Render account (https://render.com)
3. Vercel account (https://vercel.com)

---

## Part 1: Deploy Backend to Render

### Option A: Using Render Dashboard (Recommended for beginners)

1. **Create a new Web Service**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `Rupaya` repository

2. **Configure the service**
   - **Name**: `rupaya-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `./Dockerfile.prod`
   - **Instance Type**: `Free` (or paid plan)

3. **Add PostgreSQL Database**
   - In Render Dashboard, click "New +" → "PostgreSQL"
   - **Name**: `rupaya-db`
   - **Database**: `rupaya`
   - **User**: `rupaya`
   - **Region**: Same as your web service
   - **Plan**: `Free` (or paid plan)
   - Copy the **Internal Database URL** after creation

4. **Add Redis**
   - In Render Dashboard, click "New +" → "Redis"
   - **Name**: `rupaya-redis`
   - **Region**: Same as your web service
   - **Plan**: `Free` (or paid plan)
   - Copy the **Internal Redis URL** after creation

5. **Configure Environment Variables**
   - Go to your web service → "Environment"
   - Add the following variables:
   
   ```
   DATABASE_URL=<paste Internal Database URL from step 3>
   REDIS_URL=<paste Internal Redis URL from step 4>
   SECRET_KEY=<click "Generate" to auto-generate>
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   REFRESH_TOKEN_EXPIRE_DAYS=7
   HOST=0.0.0.0
   PORT=8000
   PYTHONUNBUFFERED=1
   ```

6. **Deploy**
   - Click "Create Web Service"
   - Wait for the build to complete (5-10 minutes)
   - Your backend will be available at: `https://rupaya-backend.onrender.com`

### Option B: Using render.yaml (Infrastructure as Code)

1. **Update render.yaml**
   - The `backend/render.yaml` file is already configured
   - Push it to your repository

2. **Create Blueprint**
   - Go to Render Dashboard → "Blueprints"
   - Click "New Blueprint Instance"
   - Connect your repository
   - Select `backend/render.yaml`
   - Render will automatically create all services

3. **Configure Database URLs**
   - After creation, go to each service and link the database/redis
   - Render will automatically populate the URLs

---

## Part 2: Deploy Frontend to Vercel

### Using Vercel Dashboard

1. **Import Project**
   - Go to https://vercel.com/dashboard
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Select the `Rupaya` repository

2. **Configure Project**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `bun run build` (or leave default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `bun install`

3. **Environment Variables**
   - Click "Environment Variables"
   - Add the following:
   
   ```
   NEXT_PUBLIC_API_URL=https://rupaya-backend.onrender.com/api/v1
   NEXT_TELEMETRY_DISABLED=1
   ```
   
   **Important**: Replace `rupaya-backend.onrender.com` with your actual Render backend URL from Part 1

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (2-5 minutes)
   - Your frontend will be available at: `https://your-project.vercel.app`

---

## Part 3: Connect Frontend to Backend

### Update CORS Settings

1. **Check backend CORS configuration**
   - Make sure your backend allows requests from your Vercel domain
   - Update `backend/app/main.py` or wherever CORS is configured:
   
   ```python
   from fastapi.middleware.cors import CORSMiddleware
   
   app.add_middleware(
       CORSMiddleware,
       allow_origins=[
           "https://your-project.vercel.app",
           "http://localhost:3000",  # for local development
       ],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

2. **Redeploy backend** if you made changes

### Verify Connection

1. Visit your Vercel frontend URL
2. Try to login/register
3. Check browser console for any CORS or connection errors
4. Check Render logs if backend issues occur

---

## Part 4: Post-Deployment

### Custom Domains (Optional)

**Vercel Frontend:**
- Go to Project Settings → Domains
- Add your custom domain
- Follow DNS configuration instructions

**Render Backend:**
- Go to Service Settings → Custom Domain
- Add your custom domain
- Update `NEXT_PUBLIC_API_URL` in Vercel to use your custom backend domain

### Monitoring

**Render:**
- View logs in real-time from the dashboard
- Set up health checks and alerts

**Vercel:**
- View deployment logs and analytics
- Monitor performance and errors

### Database Backups

**Render PostgreSQL:**
- Free tier: No automatic backups
- Paid tier: Daily automatic backups
- Manual backup: Use `pg_dump` via Render Shell

---

## Troubleshooting

### Backend Issues

**Build fails:**
- Check Render logs for errors
- Verify `Dockerfile.prod` is correct
- Ensure all dependencies are in `pyproject.toml`

**Database connection fails:**
- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL service is running
- Ensure database and web service are in same region

**Migrations fail:**
- Check Alembic configuration
- Manually run migrations via Render Shell:
  ```bash
  uv run alembic upgrade head
  ```

### Frontend Issues

**Build fails:**
- Check Vercel build logs
- Verify all dependencies are in `package.json`
- Check for TypeScript errors

**API connection fails:**
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS settings on backend
- Ensure backend is running and accessible

**Environment variables not working:**
- Vercel requires `NEXT_PUBLIC_` prefix for client-side variables
- Redeploy after adding new environment variables

---

## Development vs Production

### Local Development
```bash
# Backend
cd backend
docker-compose up

# Frontend
cd frontend
bun dev
```

### Production
- Backend: Automatically deploys on push to `main` branch (Render)
- Frontend: Automatically deploys on push to `main` branch (Vercel)

---

## Cost Estimates

### Free Tier
- **Render**: 750 hours/month web service + PostgreSQL + Redis (free)
- **Vercel**: Unlimited deployments, 100GB bandwidth (free)
- **Total**: $0/month

### Paid Tier (Recommended for production)
- **Render**: $7/month (Starter) + $7/month (PostgreSQL) + $5/month (Redis) = $19/month
- **Vercel**: $20/month (Pro)
- **Total**: ~$39/month

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong `SECRET_KEY` (auto-generated by Render)
- [ ] Enable HTTPS (automatic on both platforms)
- [ ] Configure CORS properly
- [ ] Set up environment variables (never commit secrets)
- [ ] Enable database backups (paid tier)
- [ ] Set up monitoring and alerts
- [ ] Use custom domains with SSL

---

## Next Steps

1. Deploy backend to Render
2. Deploy frontend to Vercel
3. Test the application end-to-end
4. Set up custom domains (optional)
5. Configure monitoring and alerts
6. Set up CI/CD pipelines (optional)

For questions or issues, check the logs on both platforms and refer to their documentation:
- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
