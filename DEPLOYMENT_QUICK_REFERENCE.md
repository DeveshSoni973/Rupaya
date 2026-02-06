# Quick Deployment Reference

## 🎯 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR APPLICATION                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐         ┌──────────────────┐     │
│  │    FRONTEND      │         │     BACKEND      │     │
│  │                  │         │                  │     │
│  │    Next.js       │────────▶│    FastAPI       │     │
│  │                  │  API    │                  │     │
│  │   Vercel.com     │ Calls   │   Render.com     │     │
│  └──────────────────┘         └──────────────────┘     │
│                                        │                │
│                                        │                │
│                                ┌───────┴────────┐       │
│                                │                 │      │
│                          ┌─────▼─────┐   ┌──────▼────┐ │
│                          │ PostgreSQL│   │   Redis   │ │
│                          │           │   │           │ │
│                          │  Render   │   │  Render   │ │
│                          └───────────┘   └───────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 📋 Pre-Deployment Checklist

- [ ] Code is in GitHub repository
- [ ] Backend and frontend are in separate directories
- [ ] Environment variables are documented
- [ ] Database migrations are up to date
- [ ] CORS is configured for production
- [ ] Health check endpoint exists (`/health`)

## 🚀 Backend Deployment (Render)

### Files You Need
- ✅ `backend/Dockerfile.prod` (created)
- ✅ `backend/render.yaml` (created, optional)
- ✅ `backend/.env.production` (template created)

### Steps
1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Create Web Service**:
   - Click "New +" → "Web Service"
   - Connect GitHub repo
   - Select `Rupaya` repository
3. **Configure**:
   - Name: `rupaya-backend`
   - Root Directory: `backend`
   - Runtime: **Docker**
   - Dockerfile: `./Dockerfile.prod`
   - Instance Type: Free (or paid)
4. **Add Database**:
   - New → PostgreSQL
   - Name: `rupaya-db`
   - Copy **Internal Database URL**
5. **Add Redis**:
   - New → Redis
   - Name: `rupaya-redis`
   - Copy **Internal Redis URL**
6. **Environment Variables** (in Web Service):
   ```
   DATABASE_URL=<paste from step 4>
   REDIS_URL=<paste from step 5>
   SECRET_KEY=<click Generate>
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   REFRESH_TOKEN_EXPIRE_DAYS=7
   ALLOWED_ORIGINS=https://your-app.vercel.app
   HOST=0.0.0.0
   PORT=8000
   PYTHONUNBUFFERED=1
   ```
7. **Deploy**: Click "Create Web Service"
8. **Copy URL**: Save your backend URL (e.g., `https://rupaya-backend.onrender.com`)

## 🎨 Frontend Deployment (Vercel)

### Files You Need
- ✅ `frontend/vercel.json` (created)
- ✅ `frontend/.env.production` (template created)

### Steps
1. **Go to Vercel**: https://vercel.com/dashboard
2. **Import Project**:
   - Click "Add New..." → "Project"
   - Select GitHub repository
3. **Configure**:
   - Framework: Next.js (auto-detected)
   - Root Directory: `frontend`
   - Build Command: `bun run build` (default)
   - Install Command: `bun install`
4. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://rupaya-backend.onrender.com/api/v1
   NEXT_TELEMETRY_DISABLED=1
   ```
   ⚠️ Replace `rupaya-backend.onrender.com` with YOUR backend URL from step 8 above
5. **Deploy**: Click "Deploy"
6. **Copy URL**: Save your frontend URL (e.g., `https://rupaya.vercel.app`)

## 🔄 Update Backend CORS

After deploying frontend, update backend CORS:

1. **Go to Render Dashboard** → Your Web Service
2. **Environment Variables** → Edit `ALLOWED_ORIGINS`
3. **Set to**: `https://your-app.vercel.app` (your actual Vercel URL)
4. **Save** → Backend will auto-redeploy

## ✅ Verify Deployment

### Backend Health Check
```bash
curl https://rupaya-backend.onrender.com/health
# Should return: {"status":"healthy","service":"rupaya-api"}
```

### Frontend Connection
1. Visit your Vercel URL
2. Try to register/login
3. Check browser console (F12) for errors
4. If CORS error: verify `ALLOWED_ORIGINS` in backend

## 🔧 Common Issues

### ❌ CORS Error
**Problem**: Frontend can't connect to backend
**Solution**: 
- Add frontend URL to `ALLOWED_ORIGINS` in Render
- Format: `https://your-app.vercel.app` (no trailing slash)

### ❌ Database Connection Failed
**Problem**: Backend can't connect to database
**Solution**:
- Verify `DATABASE_URL` is the **Internal** URL from Render
- Check database is in same region as web service

### ❌ Build Failed (Backend)
**Problem**: Docker build fails on Render
**Solution**:
- Check Render logs for specific error
- Verify `Dockerfile.prod` exists in `backend/` directory
- Ensure `pyproject.toml` and `uv.lock` are committed

### ❌ Build Failed (Frontend)
**Problem**: Next.js build fails on Vercel
**Solution**:
- Check Vercel build logs
- Verify all dependencies in `package.json`
- Check for TypeScript errors

### ❌ Environment Variables Not Working
**Problem**: App can't read environment variables
**Solution**:
- Vercel: Prefix with `NEXT_PUBLIC_` for client-side
- Redeploy after adding new variables
- Check spelling and format

## 💰 Cost Breakdown

### Free Tier (Good for testing)
- Render: 750 hours/month web service
- Render: PostgreSQL (free tier)
- Render: Redis (free tier)
- Vercel: Unlimited deployments
- **Total: $0/month**

⚠️ **Limitations**:
- Backend sleeps after 15 min inactivity (cold starts)
- No database backups
- Limited resources

### Paid Tier (Recommended for production)
- Render Web Service: $7/month
- Render PostgreSQL: $7/month
- Render Redis: $5/month
- Vercel Pro: $20/month
- **Total: ~$39/month**

✅ **Benefits**:
- No cold starts
- Database backups
- Better performance
- Custom domains
- Priority support

## 📚 Additional Resources

- **Full Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Backend README**: [backend/README.md](./backend/README.md)
- **Frontend README**: [frontend/README.md](./frontend/README.md)
- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs

## 🎉 Success!

Once deployed:
1. ✅ Backend running on Render
2. ✅ Frontend running on Vercel
3. ✅ Database and Redis on Render
4. ✅ CORS configured
5. ✅ Environment variables set

Your app is live! 🚀

---

**Questions?** Check the full [DEPLOYMENT.md](./DEPLOYMENT.md) guide or open an issue on GitHub.
